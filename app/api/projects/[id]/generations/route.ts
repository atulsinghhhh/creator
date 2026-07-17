import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { generations, projects } from "@/lib/db/schema";
import { enqueueGenerationJob } from "@/lib/queue/generation-queue";
import { verifyCsrf } from "@/lib/auth/csrf";

/**
 * Regenerate: creates a brand-new Generation for an existing Project and
 * enqueues it. V0 only supports full regeneration — never overwrites or
 * mutates a prior Generation.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: "invalid_csrf" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [generation] = await db
    .insert(generations)
    .values({ projectId: project.id, status: "queued" })
    .returning();

  await db.update(projects).set({ status: "in_progress" }).where(eq(projects.id, project.id));

  await enqueueGenerationJob(generation.id);

  return NextResponse.json(
    { projectId: project.id, generationId: generation.id, status: generation.status },
    { status: 201 }
  );
}
