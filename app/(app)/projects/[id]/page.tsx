import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { generations, projects } from "@/lib/db/schema";
import { platformLabel } from "@/lib/workplace/format";
import { GenerationSteps } from "@/components/processing/GenerationSteps";

export const metadata: Metadata = {
  title: "Project — CreatorOS",
};

// Placeholder for the project detail view (Processing/Preview screens follow
// with the pipeline work). Verifies ownership before showing anything.
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/workplace");
  }
  const { id } = await params;

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) notFound();

  const [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project || project.userId !== session.user.id) notFound();

  const [latestGeneration] = await db
    .select({ id: generations.id })
    .from(generations)
    .where(eq(generations.projectId, project.id))
    .orderBy(desc(generations.createdAt))
    .limit(1);

  return (
    <div className="landing flex min-h-screen flex-col items-center justify-center bg-fog px-5 font-sans">
      <div className="shadow-stripe-sm w-full max-w-lg rounded-2xl border border-line bg-white p-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {platformLabel(project.platform)} · {project.status}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
          {project.title}
        </h1>
        <div className="mt-4 rounded-lg border border-line bg-fog px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Prompt
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink">&ldquo;{project.prompt}&rdquo;</p>
        </div>
        {latestGeneration ? (
          <GenerationSteps generationId={latestGeneration.id} />
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-body">
            No generation yet for this project.
          </p>
        )}
        <Link
          href="/workplace"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-blurple px-5 text-sm font-semibold text-white transition-colors hover:bg-ink"
        >
          Back to Workplace
        </Link>
      </div>
    </div>
  );
}
