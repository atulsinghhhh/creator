import { and, eq } from "drizzle-orm";
import { chargeGeneration } from "@/lib/billing/charge";
import { db } from "@/lib/db";
import { assets, generations, jobs, projects } from "@/lib/db/schema";
import { pipelineGraph } from "@/pipeline/registry";
import {
  NonRetryableStageError,
  type CaptionsOutput,
  type ExportOutput,
  type MediaOutput,
  type PipelineState,
  type PipelineStep,
  type RenderOutput,
  type ScriptOutput,
  type StageResult,
  type VoiceOutput,
} from "@/pipeline/types";

const ASSET_TYPE_BY_STEP: Partial<Record<PipelineStep, string>> = {
  voice: "voice",
  captions: "caption",
  media: "stock-visual",
  export: "final-video",
};

/** 2 automatic retries with backoff before a step surfaces as failed (ARCHITECTURE.md §5). */
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [1_000, 4_000];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs the pipeline dependency graph for a generation. Each stage starts the
 * moment its dependencies complete — voice and media run genuinely in
 * parallel — while this orchestrator stays generic: it only ever calls
 * `stage.run(state)`; nothing here changes when a stub is swapped for a real
 * provider.
 */
export async function runGenerationPipeline(generationId: string, bullJobId: string) {
  const [generation] = await db.select().from(generations).where(eq(generations.id, generationId));
  if (!generation) throw new Error(`Generation ${generationId} not found`);

  const [project] = await db.select().from(projects).where(eq(projects.id, generation.projectId));
  if (!project) {
    throw new Error(`Project ${generation.projectId} not found for generation ${generationId}`);
  }

  await db.update(generations).set({ status: "processing" }).where(eq(generations.id, generationId));

  // Pre-create every step's job row as "queued" so the Processing screen
  // shows the full step list from the first poll, not rows trickling in.
  const jobRowIds = new Map<PipelineStep, string>();
  for (const node of pipelineGraph) {
    const [row] = await db
      .insert(jobs)
      .values({
        generationId,
        // One BullMQ job runs the whole pipeline; jobs.bullJobId is unique per
        // row, so each step gets its own suffixed id while still linking back
        // to the parent BullMQ job.
        bullJobId: `${bullJobId}:${node.stage.step}`,
        step: node.stage.step,
        status: "queued",
        maxAttempts: MAX_ATTEMPTS,
      })
      .returning();
    jobRowIds.set(node.stage.step, row.id);
  }

  // Shared mutable pipeline state. Parallel branches write different keys of
  // `results`; single-threaded event loop makes this safe.
  const state: PipelineState = {
    generationId,
    projectId: project.id,
    prompt: project.prompt,
    platform: project.platform,
    results: {},
  };
  let accumulatedCost = Number(generation.cost ?? 0);

  const runStep = async (step: PipelineStep): Promise<StageResult<unknown>> => {
    const node = pipelineGraph.find((n) => n.stage.step === step)!;
    const jobRowId = jobRowIds.get(step)!;

    await db
      .update(jobs)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(jobs.id, jobRowId));

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await db.update(jobs).set({ attempts: attempt }).where(eq(jobs.id, jobRowId));
      try {
        const result = await node.stage.run(state);

        state.results[step] = result.output as never;
        accumulatedCost += result.cost;

        await db
          .update(jobs)
          .set({
            status: "completed",
            finishedAt: new Date(),
            progress: 100,
            metadata: result.output,
            provider: result.provider ?? null,
            model: result.model ?? null,
          })
          .where(eq(jobs.id, jobRowId));

        await persistStageOutput(generationId, step, result.output, accumulatedCost);

        const assetType = ASSET_TYPE_BY_STEP[step];
        if (assetType) {
          await persistStageAssets(generationId, step, assetType, result.output, result.provider ?? "stub");
        }
        return result;
      } catch (err) {
        lastError = err;
        const retryable = !(err instanceof NonRetryableStageError) && attempt < MAX_ATTEMPTS;
        console.error(
          `[pipeline] generation=${generationId} step=${step} attempt=${attempt} failed` +
            (retryable ? ` — retrying in ${RETRY_BACKOFF_MS[attempt - 1]}ms:` : ":"),
          err
        );
        if (!retryable) break;
        await delay(RETRY_BACKOFF_MS[attempt - 1]);
      }
    }

    await db
      .update(jobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: lastError instanceof Error ? lastError.message : String(lastError),
      })
      .where(eq(jobs.id, jobRowId));
    throw lastError;
  };

  // One promise per step, resolving after its dependencies — the graph runs
  // itself, with independent branches (voice ∥ media) genuinely concurrent.
  const stepPromises = new Map<PipelineStep, Promise<unknown>>();
  for (const node of pipelineGraph) {
    const step = node.stage.step;
    stepPromises.set(
      step,
      (async () => {
        await Promise.all(node.dependsOn.map((dep) => stepPromises.get(dep)!));
        return runStep(step);
      })()
    );
  }

  try {
    await Promise.all(stepPromises.values());
  } catch (err) {
    // Steps that never started (deps failed) stay "queued" — mark only those
    // cancelled; completed/failed/running rows keep their real status.
    for (const id of jobRowIds.values()) {
      await db
        .update(jobs)
        .set({ status: "cancelled", finishedAt: new Date() })
        .where(and(eq(jobs.id, id), eq(jobs.status, "queued")));
    }
    await db
      .update(generations)
      .set({ status: "failed", cost: accumulatedCost.toFixed(4) })
      .where(eq(generations.id, generationId));
    throw err;
  }

  await db
    .update(generations)
    .set({ status: "completed", cost: accumulatedCost.toFixed(4) })
    .where(eq(generations.id, generationId));

  // Last line of the success path only — a failed generation can never
  // reach this, so it can never cost the user a credit (CLAUDE.md Billing).
  await chargeGeneration(generationId);
}

// Maps each stage's typed output onto the generations table's denormalized
// convenience columns. Deliberately untyped at the boundary (output varies per
// step) — this is orchestration glue, not part of the swappable stage contract.
async function persistStageOutput(
  generationId: string,
  step: PipelineStep,
  output: unknown,
  cost: number
) {
  const patch: Partial<typeof generations.$inferInsert> = { cost: cost.toFixed(4) };

  if (step === "script") {
    // The structured script (scenes with narration/visual direction) is the
    // canonical artifact — stored as JSON so downstream steps and future
    // features can re-read it losslessly.
    patch.script = JSON.stringify((output as ScriptOutput).script);
  } else if (step === "voice") {
    // Per-scene audio lives in Assets; generations.voiceUrl stays null until
    // a combined track exists (real Renderer phase).
    patch.duration = (output as VoiceOutput).totalDurationSeconds.toFixed(2);
  } else if (step === "captions") {
    patch.subtitleUrl = (output as CaptionsOutput).subtitleUrl;
  } else if (step === "render") {
    // draftVideoPath is a local temp file — never persisted; only duration is.
    patch.duration = (output as RenderOutput).durationSeconds.toFixed(2);
  } else if (step === "export") {
    patch.videoUrl = (output as ExportOutput).videoUrl;
  }

  await db.update(generations).set(patch).where(eq(generations.id, generationId));
}

async function persistStageAssets(
  generationId: string,
  step: PipelineStep,
  assetType: string,
  output: unknown,
  source: string
) {
  if (step === "voice") {
    const { sceneAudios } = output as VoiceOutput;
    await db.insert(assets).values(
      sceneAudios.map((audio) => ({
        generationId,
        type: assetType,
        url: audio.url,
        source,
        metadata: { sceneIndex: audio.sceneIndex, durationSeconds: audio.durationSeconds },
      }))
    );
  } else if (step === "captions") {
    const { subtitleUrl, words, srtUrl, wordsJsonUrl } = output as CaptionsOutput;
    await db.insert(assets).values({
      generationId,
      type: assetType,
      url: subtitleUrl,
      source,
      metadata: { wordCount: words.length, srtUrl, wordsJsonUrl },
    });
  } else if (step === "media") {
    const { clips } = output as MediaOutput;
    await db.insert(assets).values(
      clips.map((clip) => ({
        generationId,
        type: assetType,
        url: clip.url,
        source: clip.source,
        metadata: { sceneIndex: clip.sceneIndex, durationSeconds: clip.durationSeconds },
      }))
    );
  } else if (step === "export") {
    const { videoUrl } = output as ExportOutput;
    await db.insert(assets).values({ generationId, type: assetType, url: videoUrl, source });
  }
}
