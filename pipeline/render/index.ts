import { getProviderConfig } from "@/lib/config/providers";
import { getRendererService } from "@/lib/services";
import type { PipelineStage, RenderOutput } from "../types";

/** Thin wrapper over the configured RendererService. Needs Voice + Captions + Media complete. */
export const renderStage: PipelineStage<"render", RenderOutput> = {
  step: "render",
  async run(state) {
    const scenes = state.results.script?.script.scenes;
    const sceneAudios = state.results.voice?.sceneAudios;
    const words = state.results.captions?.words;
    const clips = state.results.media?.clips;
    if (!scenes || !sceneAudios || !words || !clips) {
      throw new Error("render stage requires script, voice, captions, and media output");
    }

    const { draftVideoPath, durationSeconds, costUsd } = await getRendererService().render({
      scenes: scenes.map((s) => ({ index: s.index, narration: s.narration })),
      sceneAudios,
      words,
      clips,
      platform: state.platform,
      generationId: state.generationId,
    });

    return {
      output: { draftVideoPath, durationSeconds },
      cost: costUsd,
      provider: getProviderConfig().RENDERER_PROVIDER,
    };
  },
};
