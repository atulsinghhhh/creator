import type {
  CaptionInput,
  CaptionResult,
  CaptionService,
  CaptionWord,
  StorageService,
} from "@/lib/services/types";

/**
 * Stub — fake word timings spread evenly across each scene's REAL audio
 * duration (the interface is audio-in like the eventual Whisper adapter).
 * The words file upload is real: it goes through the injected StorageService,
 * so Generation.subtitleUrl points at an actual fetchable file.
 */
export class StubCaptions implements CaptionService {
  constructor(private storage: StorageService) {}

  async generateCaptions(input: CaptionInput): Promise<CaptionResult> {
    const words: CaptionWord[] = input.sceneAudios.flatMap((audio) => {
      const wordCount = Math.max(1, Math.round(audio.durationSeconds * 2.5));
      const perWord = audio.durationSeconds / wordCount;
      return Array.from({ length: wordCount }, (_, i) => ({
        word: `stub-word-${i}`,
        startSeconds: i * perWord,
        endSeconds: (i + 1) * perWord,
        sceneIndex: audio.sceneIndex,
      }));
    });

    const { url } = await this.storage.upload(
      `generations/${input.generationId}/captions/words.json`,
      Buffer.from(JSON.stringify({ words }, null, 2)),
      "application/json"
    );

    return { words, subtitleUrl: url, costUsd: 0 };
  }
}
