import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { generations, jobs, projects } from "@/lib/db/schema";

/**
 * Read-only status endpoint — the Processing screen polls this directly. It
 * reflects the pipeline's real state (generation status + one row per
 * completed/running/failed step); it never simulates progress.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id: generationId } = await params;

  const [generation] = await db.select().from(generations).where(eq(generations.id, generationId));
  if (!generation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [project] = await db.select().from(projects).where(eq(projects.id, generation.projectId));
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const steps = await db
    .select({
      step: jobs.step,
      status: jobs.status,
      error: jobs.error,
      startedAt: jobs.startedAt,
      finishedAt: jobs.finishedAt,
    })
    .from(jobs)
    .where(eq(jobs.generationId, generationId))
    .orderBy(jobs.createdAt);

  return NextResponse.json({
    id: generation.id,
    status: generation.status,
    script: generation.script,
    voiceUrl: generation.voiceUrl,
    subtitleUrl: generation.subtitleUrl,
    videoUrl: generation.videoUrl,
    duration: generation.duration,
    cost: generation.cost,
    steps,
  });
}
