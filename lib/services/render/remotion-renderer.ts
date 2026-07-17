import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { logProviderCall } from "@/lib/services/call-log";
import type { RendererInput, RendererResult, RendererService } from "@/lib/services/types";
import type { ShortVideoProps } from "./remotion/props";

// Bundling the composition is the slow part (~10-30s) and is identical for
// every render — do it once per process.
let bundlePromise: Promise<string> | undefined;

function getBundle(): Promise<string> {
  bundlePromise ??= bundle({
    entryPoint: join(process.cwd(), "lib/services/render/remotion/index.ts"),
  });
  return bundlePromise;
}

/**
 * Remotion-backed RendererService: composes background clips + voice audio +
 * word-timed captions into a draft MP4 (H.264 via Remotion's bundled FFmpeg).
 * First render also downloads Remotion's headless browser (~150MB, cached).
 */
export class RemotionRenderService implements RendererService {
  async render(input: RendererInput): Promise<RendererResult> {
    const started = Date.now();
    const inputProps: ShortVideoProps = {
      scenes: input.scenes,
      sceneAudios: input.sceneAudios,
      words: input.words,
      clips: input.clips,
    };

    try {
      const serveUrl = await getBundle();
      const composition = await selectComposition({ serveUrl, id: "short", inputProps });

      const dir = await mkdtemp(join(tmpdir(), "creator-render-"));
      const draftVideoPath = join(dir, `${input.generationId}-draft.mp4`);

      await renderMedia({
        composition,
        serveUrl,
        codec: "h264",
        outputLocation: draftVideoPath,
        inputProps,
      });

      const durationSeconds = input.sceneAudios.reduce((sum, a) => sum + a.durationSeconds, 0);

      await logProviderCall({
        generationId: input.generationId,
        step: "render",
        provider: "remotion",
        costUsd: 0,
        latencyMs: Date.now() - started,
        success: true,
        attempt: 1,
      });

      return { draftVideoPath, durationSeconds, costUsd: 0 };
    } catch (err) {
      await logProviderCall({
        generationId: input.generationId,
        step: "render",
        provider: "remotion",
        costUsd: 0,
        latencyMs: Date.now() - started,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        attempt: 1,
      });
      throw err;
    }
  }
}
