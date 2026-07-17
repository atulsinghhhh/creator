import { getProviderConfig } from "@/lib/config/providers";
import { getVoiceService } from "@/lib/services";
import type { PipelineStage, VoiceOutput } from "../types";

/**
 * Thin wrapper over the configured VoiceService — this stage never knows
 * which TTS provider is behind the interface.
 */
export const voiceStage: PipelineStage<"voice", VoiceOutput> = {
  step: "voice",
  async run(state) {
    const scenes = state.results.script?.script.scenes;
    if (!scenes) throw new Error("voice stage requires script output");

    const { sceneAudios, costUsd } = await getVoiceService().generateSceneAudio({
      scenes: scenes.map((scene) => ({ index: scene.index, narration: scene.narration })),
      generationId: state.generationId,
    });

    return {
      output: {
        sceneAudios,
        totalDurationSeconds: sceneAudios.reduce((sum, s) => sum + s.durationSeconds, 0),
      },
      cost: costUsd,
      provider: getProviderConfig().VOICE_PROVIDER,
    };
  },
};
