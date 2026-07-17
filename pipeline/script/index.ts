import { getLlmModel, getLlmProviderName, getScriptService } from "@/lib/services";
import type { PipelineStage, ScriptOutput } from "../types";

/**
 * Thin wrapper over the configured ScriptService — this stage never knows
 * which LLM provider is behind the interface.
 */
export const scriptStage: PipelineStage<"script", ScriptOutput> = {
  step: "script",
  async run(state) {
    const brief = state.results.planner?.brief;
    if (!brief) throw new Error("script stage requires planner output");

    const { script, costUsd } = await getScriptService().generateScript({
      brief,
      generationId: state.generationId,
    });

    return {
      output: { script },
      cost: costUsd,
      provider: getLlmProviderName(),
      model: getLlmModel(),
    };
  },
};
