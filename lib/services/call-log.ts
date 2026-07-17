import { db } from "@/lib/db";
import { providerCalls } from "@/lib/db/schema";
import type { PipelineStep } from "@/pipeline/types";

export interface ProviderCallLog {
  generationId: string;
  step: PipelineStep;
  provider: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  costUsd: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  attempt: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Records one external provider call (one row per attempt). Best-effort: a
 * logging failure must never fail the pipeline step it's describing.
 * Standalone stage runs use non-UUID generation ids, stored as null.
 */
export async function logProviderCall(log: ProviderCallLog): Promise<void> {
  const line =
    `[provider-call] generation=${log.generationId} step=${log.step} provider=${log.provider}` +
    ` model=${log.model ?? "-"} attempt=${log.attempt} tokens=${log.promptTokens ?? 0}/${log.completionTokens ?? 0}` +
    ` cost=$${log.costUsd.toFixed(6)} latency=${log.latencyMs}ms success=${log.success}` +
    (log.error ? ` error=${log.error}` : "");
  console.log(line);

  try {
    await db.insert(providerCalls).values({
      generationId: UUID_RE.test(log.generationId) ? log.generationId : null,
      step: log.step,
      provider: log.provider,
      model: log.model,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      costUsd: log.costUsd.toFixed(6),
      latencyMs: log.latencyMs,
      success: log.success,
      error: log.error,
      attempt: log.attempt,
    });
  } catch (err) {
    console.warn("[provider-call] failed to persist call log:", err);
  }
}
