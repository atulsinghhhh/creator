import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/utilis/auth";
import { getBalance } from "@/lib/billing/balance";
import { getProfile } from "@/lib/workplace/queries";
import { WorkplaceHeader } from "@/components/workplace/workplace-header";
import { Hero } from "@/components/workplace/hero";
import { CreditsCard } from "@/components/workplace/credits-card";
import { QuickStats } from "@/components/workplace/quick-stats";
import { RecentProjects } from "@/components/workplace/recent-projects";
import { RecentActivity } from "@/components/workplace/recent-activity";
import {
  ActivitySkeleton,
  CreditsSkeleton,
  ProjectsSkeleton,
  StatsSkeleton,
} from "@/components/workplace/skeletons";

export const metadata: Metadata = {
  title: "Workplace — CreatorOS",
};

// Session-scoped data on every request — never cache another user's dashboard.
export const dynamic = "force-dynamic";

export default async function WorkplacePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/workplace");
  }
  const userId = session.user.id;

  // Profile renders in the header/hero shell, so it's awaited up front;
  // the four data sections below stream in independently via Suspense.
  const [profile, balance] = await Promise.all([getProfile(userId), getBalance(userId)]);
  if (!profile) {
    // Session references a user that no longer exists — force re-auth.
    redirect("/api/auth/signin?callbackUrl=/workplace");
  }

  return (
    <div className="landing min-h-screen bg-fog font-sans">
      <WorkplaceHeader profile={profile} credits={balance} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Hero name={profile.name} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* main column */}
          <div className="min-w-0 space-y-8">
            <section aria-label="Quick stats">
              <Suspense fallback={<StatsSkeleton />}>
                <QuickStats userId={userId} />
              </Suspense>
            </section>

            <section aria-label="Recent projects">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-ink">
                  Recent projects
                </h2>
              </div>
              <Suspense fallback={<ProjectsSkeleton />}>
                <RecentProjects userId={userId} />
              </Suspense>
            </section>
          </div>

          {/* side column */}
          <div className="space-y-6">
            <section aria-label="Credits">
              <Suspense fallback={<CreditsSkeleton />}>
                <CreditsCard userId={userId} />
              </Suspense>
            </section>

            <section aria-label="Recent activity">
              <Suspense fallback={<ActivitySkeleton />}>
                <RecentActivity userId={userId} />
              </Suspense>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
