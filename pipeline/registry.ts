import { moderationStage } from "./moderation";
import { plannerStage } from "./planner";
import { scriptStage } from "./script";
import { voiceStage } from "./voice";
import { captionsStage } from "./captions";
import { mediaStage } from "./media";
import { renderStage } from "./render";
import { exportStage } from "./export";
import type { PipelineStage, PipelineStep } from "./types";

export interface PipelineNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stage: PipelineStage<PipelineStep, any>;
  dependsOn: readonly PipelineStep[];
}

/**
 * The pipeline dependency graph — the ONLY place execution structure is
 * defined (ARCHITECTURE.md §4). The orchestrator executes it generically:
 * a stage starts as soon as everything it dependsOn has completed, so voice
 * and media genuinely run concurrently (both depend only on script), while
 * captions waits for real voice audio.
 */
export const pipelineGraph: readonly PipelineNode[] = [
  { stage: moderationStage, dependsOn: [] },
  { stage: plannerStage, dependsOn: ["moderation"] },
  { stage: scriptStage, dependsOn: ["planner"] },
  { stage: voiceStage, dependsOn: ["script"] },
  { stage: mediaStage, dependsOn: ["script"] },
  { stage: captionsStage, dependsOn: ["voice"] },
  { stage: renderStage, dependsOn: ["voice", "captions", "media"] },
  { stage: exportStage, dependsOn: ["render"] },
];
