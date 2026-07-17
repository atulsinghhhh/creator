import { getProviderConfig } from "@/lib/config/providers";
import { getModerationService } from "@/lib/services";
import { NonRetryableStageError, type ModerationOutput, type PipelineStage } from "../types";

/**
 * Thin wrapper over the configured ModerationService. A rejected prompt is a
 * NonRetryableStageError — retrying can't make a disallowed prompt allowed.
 */
export const moderationStage: PipelineStage<"moderation", ModerationOutput> = {
  step: "moderation",
  async run(state) {
    const { allowed, reason, costUsd } = await getModerationService().moderate({
      prompt: state.prompt,
      generationId: state.generationId,
    });

    if (!allowed) {
      throw new NonRetryableStageError(`Prompt failed moderation${reason ? `: ${reason}` : ""}`);
    }

    return {
      output: { allowed, reason },
      cost: costUsd,
      provider: getProviderConfig().MODERATION_PROVIDER,
    };
  },
};
