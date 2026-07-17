import { Queue } from "bullmq";
import { queueConnection } from "./connection";

export const GENERATION_QUEUE_NAME = "generation-pipeline";

export interface GenerationJobData {
  generationId: string;
}

const globalForQueue = globalThis as unknown as { generationQueue?: Queue<GenerationJobData> };

export const generationQueue =
  globalForQueue.generationQueue ??
  new Queue<GenerationJobData>(GENERATION_QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      // Stage-level retry/backoff is future work; V0 runs each generation once.
      attempts: 1,
      removeOnComplete: { age: 60 * 60 },
      removeOnFail: { age: 24 * 60 * 60 },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.generationQueue = generationQueue;
}

/** Enqueues the whole pipeline for a generation — the only thing the HTTP request does. */
export async function enqueueGenerationJob(generationId: string) {
  await generationQueue.add(GENERATION_QUEUE_NAME, { generationId });
}
