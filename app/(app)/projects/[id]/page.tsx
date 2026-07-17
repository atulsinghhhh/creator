import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { generations, projects } from "@/lib/db/schema";
import { getBalance } from "@/lib/billing/balance";
import { getProfile } from "@/lib/workplace/queries";
import { platformLabel } from "@/lib/workplace/format";
import { WorkplaceHeader } from "@/components/workplace/workplace-header";
import { GenerationView } from "@/components/processing/GenerationView";

export const metadata: Metadata = {
  title: "Project — CreatorOS",
};

export const dynamic = "force-dynamic";

/**
 * V0 screens 3+4 (Processing → Preview), state-driven on one route.
 * Ownership verified server-side; live pipeline state polled client-side.
 */
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

  const [profile, balance, [latestGeneration]] = await Promise.all([
    getProfile(session.user.id),
    getBalance(session.user.id),
    db
      .select({ id: generations.id })
      .from(generations)
      .where(eq(generations.projectId, project.id))
      .orderBy(desc(generations.createdAt))
      .limit(1),
  ]);
  if (!profile) redirect("/api/auth/signin?callbackUrl=/workplace");

  return (
    <div className="landing min-h-screen bg-fog font-sans">
      <WorkplaceHeader profile={profile} credits={balance} />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-blurple/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blurple">
              {platformLabel(project.platform)}
            </span>
            <Link href="/workplace" className="text-[13px] font-medium text-muted hover:text-ink">
              ← Back to Workplace
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{project.title}</h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-body">
            &ldquo;{project.prompt}&rdquo;
          </p>
        </div>

        {latestGeneration ? (
          <GenerationView
            initialGenerationId={latestGeneration.id}
            projectId={project.id}
            balance={balance}
          />
        ) : (
          <div className="shadow-stripe-sm rounded-2xl border border-line bg-white p-8 text-center">
            <p className="text-[15px] text-body">No generation yet for this project.</p>
          </div>
        )}
      </main>
    </div>
  );
}
