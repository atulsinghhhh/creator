import { getProviderConfig } from "@/lib/config/providers";
import { getCaptionService } from "@/lib/services";
import type { CaptionsOutput, PipelineStage } from "../types";

/**
 * Thin wrapper over the configured CaptionService. Depends on Voice output —
 * captions are transcribed from real audio, never derived from script text
 * (resolved decision, ARCHITECTURE.md §4).
 */
export const captionsStage: PipelineStage<"captions", CaptionsOutput> = {
  step: "captions",
  async run(state) {
    const sceneAudios = state.results.voice?.sceneAudios;
    if (!sceneAudios) throw new Error("captions stage requires voice output");

    const { words, subtitleUrl, srtUrl, wordsJsonUrl, costUsd } =
      await getCaptionService().generateCaptions({
        sceneAudios,
        generationId: state.generationId,
      });

    return {
      output: { words, subtitleUrl, srtUrl, wordsJsonUrl },
      cost: costUsd,
      provider: getProviderConfig().CAPTION_PROVIDER,
    };
  },
};
