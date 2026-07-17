import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

// Deferred (dynamic) import: static imports are hoisted above this file's own
// top-level code, which would construct @/lib/db's connection pool before the
// config() calls above ever run. Dynamic import() is not hoisted, so this
// guarantees env vars are loaded first.
async function main() {
  const { ensureStorageReady } = await import("@/lib/services");
  await ensureStorageReady();

  const { createGenerationWorker } = await import("@/lib/queue/worker");
  const worker = createGenerationWorker();

  worker.on("completed", (job) => {
    console.log(`[worker] generation ${job.data.generationId} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] generation ${job?.data.generationId} failed:`, err.message);
  });

  console.log("[worker] listening for generation pipeline jobs...");

  async function shutdown() {
    console.log("[worker] shutting down...");
    await worker.close();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
