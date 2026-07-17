import type { ProviderConfig } from "@/lib/config/providers";
import { logProviderCall } from "@/lib/services/call-log";
import type {
  MediaClip,
  MediaSearchInput,
  MediaSearchResult,
  MediaSearchService,
} from "@/lib/services/types";
import { embedText } from "./embeddings";
import { QdrantMediaIndex } from "./qdrant";

/**
 * Semantic media search: CLIP text embedding of each scene's visualQuery,
 * cosine-matched in Qdrant against the ingested local media library
 * (`npm run media:ingest`). Prefers a distinct clip per scene, falling back
 * to reuse only when the library is smaller than the scene count.
 */
export class ClipMediaSearchService implements MediaSearchService {
  constructor(private config: ProviderConfig) {}

  async findVisuals(input: MediaSearchInput): Promise<MediaSearchResult> {
    const index = new QdrantMediaIndex(this.config.QDRANT_URL, this.config.QDRANT_COLLECTION);
    await index.ensureCollection();

    const count = await index.count();
    if (count === 0) {
      throw new Error(
        "Media library is empty — add clips to media-library/ and run `npm run media:ingest` (or `npm run media:samples` first for synthetic test clips)."
      );
    }

    const clips: MediaClip[] = [];
    const usedIds = new Set<string | number>();

    for (const scene of input.scenes) {
      const started = Date.now();
      try {
        const vector = await embedText(scene.visualQuery);
        const results = await index.search(vector, input.scenes.length + 1);
        if (results.length === 0) {
          throw new Error(`No media match for scene ${scene.index}: "${scene.visualQuery}"`);
        }

        const pick = results.find((r) => !usedIds.has(r.id)) ?? results[0];
        usedIds.add(pick.id);

        clips.push({
          sceneIndex: scene.index,
          url: pick.payload.url,
          source: "local-library",
          durationSeconds: pick.payload.durationSeconds,
        });

        await logProviderCall({
          generationId: input.generationId,
          step: "media",
          provider: "clip-qdrant",
          model: "clip-vit-base-patch32",
          costUsd: 0,
          latencyMs: Date.now() - started,
          success: true,
          attempt: 1,
        });
      } catch (err) {
        await logProviderCall({
          generationId: input.generationId,
          step: "media",
          provider: "clip-qdrant",
          model: "clip-vit-base-patch32",
          costUsd: 0,
          latencyMs: Date.now() - started,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          attempt: 1,
        });
        throw err;
      }
    }

    return { clips, costUsd: 0 };
  }
}
