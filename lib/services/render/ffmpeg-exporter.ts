import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { logProviderCall } from "@/lib/services/call-log";
import type { ExporterInput, ExporterResult, ExporterService, StorageService } from "@/lib/services/types";

const execFileAsync = promisify(execFile);

const TARGET_WIDTH = 1080;
const TARGET_HEIGHT = 1920;

/**
 * FFmpeg-backed ExporterService: normalizes the draft to platform-ready
 * 1080×1920 H.264/AAC with +faststart (moov up front for instant playback),
 * uploads via the injected StorageService, and cleans up temp files.
 */
export class FFmpegExporter implements ExporterService {
  constructor(private storage: StorageService) {}

  async export(input: ExporterInput): Promise<ExporterResult> {
    const started = Date.now();
    const outDir = await mkdtemp(join(tmpdir(), "creator-export-"));
    const outPath = join(outDir, "final.mp4");

    try {
      await execFileAsync(ffmpegPath as unknown as string, [
        "-y",
        "-i", input.draftVideoPath,
        "-vf",
        `scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=decrease,` +
          `pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p`,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        outPath,
      ]);

      const { url } = await this.storage.upload(
        `generations/${input.generationId}/final.mp4`,
        await readFile(outPath),
        "video/mp4"
      );

      await logProviderCall({
        generationId: input.generationId,
        step: "export",
        provider: "ffmpeg",
        costUsd: 0,
        latencyMs: Date.now() - started,
        success: true,
        attempt: 1,
      });

      return { videoUrl: url, costUsd: 0 };
    } catch (err) {
      await logProviderCall({
        generationId: input.generationId,
        step: "export",
        provider: "ffmpeg",
        costUsd: 0,
        latencyMs: Date.now() - started,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        attempt: 1,
      });
      throw err;
    } finally {
      await rm(outDir, { recursive: true, force: true });
      // The renderer's draft temp dir is finished with either way.
      await rm(dirname(input.draftVideoPath), { recursive: true, force: true });
    }
  }
}
