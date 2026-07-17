import type { MediaSearchInput, MediaSearchResult, MediaSearchService } from "@/lib/services/types";

/**
 * Stub — obviously-fake placeholder clip URLs, correctly shaped. Swap for a
 * real stock-media provider (e.g. Pexels) later; source lets the rest of the
 * system see these are stubs.
 */
export class StubMediaSearch implements MediaSearchService {
  async findVisuals(input: MediaSearchInput): Promise<MediaSearchResult> {
    return {
      clips: input.scenes.map((scene) => ({
        sceneIndex: scene.index,
        url: `https://stub-media.creatoros.local/${input.generationId}/scene-${scene.index}.mp4`,
        source: "stub",
        durationSeconds: 5,
      })),
      costUsd: 0,
    };
  }
}
