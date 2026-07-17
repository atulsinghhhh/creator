import { Worker, type Job } from "bullmq";
import { queueConnection } from "./connection";
import { GENERATION_QUEUE_NAME, type GenerationJobData } from "./generation-queue";
import { runGenerationPipeline } from "./orchestrator";

export function createGenerationWorker(): Worker<GenerationJobData> {
  return new Worker<GenerationJobData>(
    GENERATION_QUEUE_NAME,
    async (job: Job<GenerationJobData>) => {
      await runGenerationPipeline(job.data.generationId, job.id!);
    },
    { connection: queueConnection, concurrency: 2 }
  );
}
