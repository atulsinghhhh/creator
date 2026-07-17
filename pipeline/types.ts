import type { ContentBrief } from "@/schemas/planner";
import type { StructuredScript } from "@/schemas/script";
import type { CaptionWord, MediaClip, SceneAudio } from "@/lib/services/types";

export type PipelineStep =
  | "moderation"
  | "planner"
  | "script"
  | "voice"
  | "captions"
  | "media"
  | "render"
  | "export";

/** Topologically sorted — safe to execute sequentially (used by `npm run stage`). */
export const PIPELINE_STEPS: readonly PipelineStep[] = [
  "moderation",
  "planner",
  "script",
  "voice",
  "media",
  "captions",
  "render",
  "export",
];

/**
 * Thrown by a stage when retrying cannot help (e.g. a prompt rejected by
 * moderation) — the orchestrator fails the step immediately, no retries.
 */
export class NonRetryableStageError extends Error {}

/** Fixed inputs every stage can read — the project's original brief. */
export interface PipelineContext {
  generationId: string;
  projectId: string;
  prompt: string;
  platform: string;
}

export interface ModerationOutput {
  allowed: boolean;
  reason?: string;
}

export interface PlannerOutput {
  brief: ContentBrief;
}

export interface ScriptOutput {
  script: StructuredScript;
}

export interface VoiceOutput {
  /** One audio file per scene — no combined track until the Renderer phase. */
  sceneAudios: SceneAudio[];
  totalDurationSeconds: number;
}

export interface CaptionsOutput {
  words: CaptionWord[];
  subtitleUrl: string;
  srtUrl?: string;
  wordsJsonUrl?: string;
}

export interface MediaOutput {
  clips: MediaClip[];
}

export interface RenderOutput {
  /** Local temp file — renderers (FFmpeg/Remotion) write files. Never persisted to DB; the Exporter uploads it. */
  draftVideoPath: string;
  durationSeconds: number;
}

export interface ExportOutput {
  videoUrl: string;
}

export interface StageOutputs {
  moderation: ModerationOutput;
  planner: PlannerOutput;
  script: ScriptOutput;
  voice: VoiceOutput;
  captions: CaptionsOutput;
  media: MediaOutput;
  render: RenderOutput;
  export: ExportOutput;
}

/**
 * Accumulated state threaded through the pipeline. Each stage reads whatever
 * prior outputs it needs from `results` and returns only its own output —
 * stages never reach into each other's internals, only this documented shape.
 */
export interface PipelineState extends PipelineContext {
  results: Partial<StageOutputs>;
}

export interface StageResult<Output> {
  output: Output;
  /** Cost contribution in USD, same unit as generations.cost. */
  cost: number;
  /** Provider that produced this output (e.g. "groq", "kokoro") — recorded on the jobs row and Asset.source. Omitted by mocks. */
  provider?: string;
  /** Model used, when the provider has one (e.g. "llama-3.3-70b-versatile"). */
  model?: string;
}

/**
 * The one shape every stage implements. This is what makes providers
 * swappable: the worker/orchestrator only ever calls `.run(state)` — it never
 * knows or cares whether a stage is mocked or backed by a real provider.
 */
export interface PipelineStage<Step extends PipelineStep, Output> {
  step: Step;
  run(state: PipelineState): Promise<StageResult<Output>>;
}
