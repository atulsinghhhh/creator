import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { generations, projects } from "@/lib/db/schema";
import { enqueueGenerationJob } from "@/lib/queue/generation-queue";
import { verifyCsrf } from "@/lib/auth/csrf";

const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  prompt: z.string().min(1).max(2000),
  platform: z.enum(["instagram", "tiktok", "youtube_shorts"]),
});

/**
 * Handles "New Project" / clicking Generate: creates the Project and its
 * first Generation (status "queued"), enqueues the pipeline job, and returns
 * immediately. No AI work happens in this request — the worker does that.
 */
export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await request.json().catch(() => null);
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { project, generation } = await db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        userId,
        title: parsed.data.title,
        prompt: parsed.data.prompt,
        platform: parsed.data.platform,
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

  return NextResponse.json(
    { projectId: project.id, generationId: generation.id, status: generation.status },
    { status: 201 }
  );
}
