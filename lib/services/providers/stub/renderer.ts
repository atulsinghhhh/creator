import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RendererInput, RendererResult, RendererService } from "@/lib/services/types";

/**
 * Minimal structurally-valid MP4: an `ftyp` box plus an empty `moov` box.
 * Not playable content — it's a stub artifact that exercises the
 * render → export file handoff with real bytes on disk.
 */
const PLACEHOLDER_MP4 = Buffer.concat([
  // ftyp box: size 24, "ftyp", major brand isom, minor version, compatible brands
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from("ftypisom"),
  Buffer.from([0x00, 0x00, 0x02, 0x00]),
  Buffer.from("isomiso2"),
  // empty moov box: size 8
  Buffer.from([0x00, 0x00, 0x00, 0x08]),
  Buffer.from("moov"),
]);

/** Stub — writes a placeholder MP4 to a temp dir. Swap for FFmpeg/Remotion later. */
export class StubRenderer implements RendererService {
  async render(input: RendererInput): Promise<RendererResult> {
    const dir = await mkdtemp(join(tmpdir(), "creator-render-"));
    const draftVideoPath = join(dir, `${input.generationId}-draft.mp4`);
    await writeFile(draftVideoPath, PLACEHOLDER_MP4);

    return {
      draftVideoPath,
      durationSeconds: input.sceneAudios.reduce((sum, a) => sum + a.durationSeconds, 0),
      costUsd: 0,
    };
  }
}
