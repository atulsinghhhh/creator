import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/utilis/auth";
import { getBalance } from "@/lib/billing/balance";
import { getProfile } from "@/lib/workplace/queries";
import { GENERATION_COST_CREDITS } from "@/lib/billing/packs";
import { WorkplaceHeader } from "@/components/workplace/workplace-header";
import { NewProjectForm } from "@/components/projects/NewProjectForm";

export const metadata: Metadata = {
  title: "New project — CreatorOS",
};

export const dynamic = "force-dynamic";

/** V0 screen 2: prompt in → pipeline kicks off. Balance is gated here and re-checked server-side. */
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/projects/new");
  }
  const [{ prompt }, profile, balance] = await Promise.all([
    searchParams,
    getProfile(session.user.id),
    getBalance(session.user.id),
  ]);
  if (!profile) redirect("/api/auth/signin?callbackUrl=/projects/new");

  return (
    <div className="landing min-h-screen bg-fog font-sans">
      <WorkplaceHeader profile={profile} credits={balance} />
      <main className="mx-auto max-w-xl px-5 py-12">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-blurple">
          New project
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
          One prompt in. One video out.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-body">
          Describe the short video you want — the pipeline plans, scripts, voices, and renders it.
        </p>

        <div className="shadow-stripe-sm mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8">
          <NewProjectForm
            initialPrompt={prompt ?? ""}
            hasCredits={balance >= GENERATION_COST_CREDITS}
          />
        </div>
      </main>
    </div>
  );
}
