import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "ffprobe-static";

const execFileAsync = promisify(execFile);

/**
 * Ingests media-library/*.mp4 into the semantic search index:
 * ffprobe duration → 3 frames extracted → CLIP-embedded + mean-pooled →
 * video uploaded to MinIO (library/{name}) → point upserted into Qdrant.
 * Idempotent: point ids derive from filenames, so re-runs update in place.
 */
async function main() {
  const { getProviderConfig } = await import("@/lib/config/providers");
  const { ensureStorageReady, getStorageService } = await import("@/lib/services");
  const { embedImage, meanVector } = await import("@/lib/services/media/embeddings");
  const { QdrantMediaIndex } = await import("@/lib/services/media/qdrant");

  const cfg = getProviderConfig();
  const dir = cfg.MEDIA_LIBRARY_DIR;

  const files = (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".mp4"));
  if (files.length === 0) {
    console.error(`No .mp4 files in ${dir} — run \`npm run media:samples\` or drop clips in.`);
    process.exit(1);
  }

  await ensureStorageReady();
  const storage = getStorageService();
  const index = new QdrantMediaIndex(cfg.QDRANT_URL, cfg.QDRANT_COLLECTION);
  await index.ensureCollection();

  for (const file of files) {
    const path = join(dir, file);
    const started = Date.now();

    const { stdout } = await execFileAsync(ffprobe.path, [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      path,
    ]);
    const durationSeconds = Number(stdout.trim());

    const frameDir = await mkdtemp(join(tmpdir(), "creator-ingest-"));
    const vectors: number[][] = [];
    for (const fraction of [0.1, 0.5, 0.9]) {
      const framePath = join(frameDir, `${fraction}.jpg`);
      await execFileAsync(ffmpegPath as unknown as string, [
        "-y",
        "-ss", String(durationSeconds * fraction),
        "-i", path,
        "-frames:v", "1",
        "-q:v", "3",
        framePath,
      ]);
      vectors.push(await embedImage(framePath));
    }
    await rm(frameDir, { recursive: true, force: true });

    const { url } = await storage.upload(`library/${file}`, await readFile(path), "video/mp4");

    // Deterministic UUID from the filename → re-ingesting updates, never duplicates.
    const hash = createHash("sha1").update(file).digest("hex");
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

    await index.upsert([
      { id, vector: meanVector(vectors), payload: { file: basename(file), url, durationSeconds } },
    ]);

    console.log(`ingested ${file} (${durationSeconds.toFixed(1)}s) in ${Date.now() - started}ms`);
  }

  const count = await index.count();
  console.log(`\nCollection "${cfg.QDRANT_COLLECTION}" now holds ${count} clips.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Ingest failed:", err);
  process.exit(1);
});
