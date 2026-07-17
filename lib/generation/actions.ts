import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generations, projects } from "@/lib/db/schema";
import { enqueueGenerationJob } from "@/lib/queue/generation-queue";

export class ProjectNotFoundError extends Error {}

interface CreateProjectAndGenerationParams {
  userId: string;
  title: string;
  prompt: string;
  platform: "instagram" | "tiktok" | "youtube_shorts";
}

/**
 * "New Project" / first-time Generate: creates the Project and its first
 * Generation (status "queued"), enqueues the pipeline job, and returns. No AI
 * work happens here — the worker does that.
 */
export async function createProjectAndGeneration(params: CreateProjectAndGenerationParams) {
  const { project, generation } = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        userId: params.userId,
        title: params.title,
        prompt: params.prompt,
        platform: params.platform,
        status: "in_progress",
      })
      .returning();

    const [generation] = await tx
      .insert(generations)
      .values({ projectId: project.id, status: "queued" })
      .returning();

    return { project, generation };
  });

  await enqueueGenerationJob(generation.id);
  return { project, generation };
}

/**
 * Regenerate: creates a brand-new Generation for an existing Project and
 * enqueues it. V0 only supports full regeneration — never overwrites or
 * mutates a prior Generation. Throws ProjectNotFoundError if the project
 * doesn't exist or isn't owned by userId.
 */
export async function regenerateForProject(params: { userId: string; projectId: string }) {
  const [project] = await db.select().from(projects).where(eq(projects.id, params.projectId));
  if (!project || project.userId !== params.userId) {
    throw new ProjectNotFoundError();
  }

  const [generation] = await db
    .insert(generations)
    .values({ projectId: project.id, status: "queued" })
    .returning();

  await db.update(projects).set({ status: "in_progress" }).where(eq(projects.id, project.id));

  await enqueueGenerationJob(generation.id);
  return { project, generation };
}
