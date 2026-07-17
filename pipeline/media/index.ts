import { getProviderConfig } from "@/lib/config/providers";
import { getMediaSearchService } from "@/lib/services";
import type { MediaOutput, PipelineStage } from "../types";

/**
 * Thin wrapper over the configured MediaSearchService. Builds each scene's
 * visualQuery from the script's visualDirection plus the brief's keywords —
 * the service only sees a query string, never the script/brief shapes.
 */
export const mediaStage: PipelineStage<"media", MediaOutput> = {
  step: "media",
  async run(state) {
    const scenes = state.results.script?.script.scenes;
    if (!scenes) throw new Error("media stage requires script output");
    const briefScenes = state.results.planner?.brief.scenes ?? [];

    const { clips, costUsd } = await getMediaSearchService().findVisuals({
      scenes: scenes.map((scene) => {
        const keywords = briefScenes.find((b) => b.index === scene.index)?.keywords ?? [];
        return {
          index: scene.index,
          visualQuery: [scene.visualDirection, ...keywords].join(", "),
        };
      }),
      platform: state.platform,
      generationId: state.generationId,
    });

    return {
      output: { clips },
      cost: costUsd,
      provider: getProviderConfig().MEDIA_SEARCH_PROVIDER,
    };
  },
};
