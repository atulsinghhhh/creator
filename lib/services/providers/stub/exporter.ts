import { readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { ExporterInput, ExporterResult, ExporterService, StorageService } from "@/lib/services/types";

/**
 * Stub — no re-encoding/resolution work yet, but the upload is real: the
 * draft file goes through the injected StorageService to
 * `generations/{id}/final.mp4`, proving the render → export → storage handoff.
 */
export class StubExporter implements ExporterService {
  constructor(private storage: StorageService) {}

  async export(input: ExporterInput): Promise<ExporterResult> {
    const draft = await readFile(input.draftVideoPath);

    const { url } = await this.storage.upload(
      `generations/${input.generationId}/final.mp4`,
      draft,
      "video/mp4"
    );

    // Draft temp dir is no longer needed once the final upload exists.
    await rm(dirname(input.draftVideoPath), { recursive: true, force: true });

    return { videoUrl: url, costUsd: 0 };
  }
}
