import type { ProviderConfig } from "@/lib/config/providers";
import { logProviderCall } from "@/lib/services/call-log";
import type {
  SceneAudio,
  StorageService,
  VoiceInput,
  VoiceOutputResult,
  VoiceService,
} from "@/lib/services/types";

/**
 * Kokoro adapter for VoiceService — self-hosted kokoro-fastapi, OpenAI-compatible
 * `/v1/audio/speech`. One call per scene; WAV bytes are uploaded through the
 * injected StorageService (never a concrete storage class). Cost is $0
 * (self-hosted) but latency/success is still logged per call.
 */
export class KokoroVoiceService implements VoiceService {
  private baseUrl: string;
  private voice: string;

  constructor(
    config: ProviderConfig,
    private storage: StorageService
  ) {
    this.baseUrl = config.KOKORO_URL.replace(/\/$/, "");
    this.voice = config.KOKORO_VOICE;
  }

  async generateSceneAudio(input: VoiceInput): Promise<VoiceOutputResult> {
    const sceneAudios: SceneAudio[] = [];

    for (const scene of input.scenes) {
      const started = Date.now();
      try {
        const res = await fetch(`${this.baseUrl}/v1/audio/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "kokoro",
            input: scene.narration,
            voice: this.voice,
            response_format: "wav",
          }),
        });
        if (!res.ok) {
          throw new Error(`Kokoro responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
        }

        const wav = Buffer.from(await res.arrayBuffer());
        const durationSeconds = wavDurationSeconds(wav);

        const { url } = await this.storage.upload(
          `generations/${input.generationId}/voice/scene-${scene.index}.wav`,
          wav,
          "audio/wav"
        );

        await logProviderCall({
          generationId: input.generationId,
          step: "voice",
          provider: "kokoro",
          model: this.voice,
          costUsd: 0,
          latencyMs: Date.now() - started,
          success: true,
          attempt: 1,
        });

        sceneAudios.push({ sceneIndex: scene.index, url, durationSeconds });
      } catch (err) {
        await logProviderCall({
          generationId: input.generationId,
          step: "voice",
          provider: "kokoro",
          model: this.voice,
          costUsd: 0,
          latencyMs: Date.now() - started,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          attempt: 1,
        });
        throw err;
      }
    }

    return { sceneAudios, costUsd: 0 };
  }
}

/** Reads duration from a RIFF/WAV header: data chunk size ÷ fmt byte rate. */
export function wavDurationSeconds(wav: Buffer): number {
  if (wav.length < 12 || wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a RIFF/WAVE file");
  }

  let byteRate: number | undefined;
  let offset = 12;
  while (offset + 8 <= wav.length) {
    const chunkId = wav.toString("ascii", offset, offset + 4);
    const chunkSize = wav.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      byteRate = wav.readUInt32LE(offset + 16);
    } else if (chunkId === "data") {
      if (!byteRate) break;
      // Streamed WAVs sometimes declare a bogus data size (0 or 0xFFFFFFFF);
      // fall back to the actual bytes present after the header.
      const declared = chunkSize === 0 || chunkSize === 0xffffffff ? wav.length - offset - 8 : chunkSize;
      return declared / byteRate;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  throw new Error("Could not read WAV duration (missing fmt/data chunk)");
}
