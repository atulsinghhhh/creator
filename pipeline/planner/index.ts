import { getLlmModel, getLlmProviderName, getPlannerService } from "@/lib/services";
import type { PipelineStage, PlannerOutput } from "../types";

/** V0 default: all three shorts platforms target ~30s until a duration picker exists. */
export const PLATFORM_DEFAULT_DURATION_SECONDS: Record<string, number> = {
  instagram: 30,
  tiktok: 30,
  youtube_shorts: 30,
};

export function defaultDurationFor(platform: string): number {
  return PLATFORM_DEFAULT_DURATION_SECONDS[platform] ?? 30;
}

/**
 * Thin wrapper over the configured PlannerService — this stage never knows
 * which LLM provider is behind the interface.
 */
export const plannerStage: PipelineStage<"planner", PlannerOutput> = {
  step: "planner",
  async run(state) {
    const { brief, costUsd } = await getPlannerService().generateBrief({
      prompt: state.prompt,
      platform: state.platform,
      targetDurationSeconds: defaultDurationFor(state.platform),
      generationId: state.generationId,
    });

    return {
      output: { brief },
      cost: costUsd,
      provider: getLlmProviderName(),
      model: getLlmModel(),
    };
  },
};
