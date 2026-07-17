import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/utilis/auth";

export const metadata: Metadata = {
  title: "New project — CreatorOS",
};

// Placeholder for V0 screen 2 (New Project). The Workplace links here — the
// real prompt form + platform picker lands with the pipeline work.
export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/projects/new");
  }
  const { prompt } = await searchParams;

  return (
    <div className="landing flex min-h-screen flex-col items-center justify-center bg-fog px-5 font-sans">
      <div className="shadow-stripe-sm w-full max-w-lg rounded-2xl border border-line bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          New project
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-body">
          The project creation screen is the next piece of V0 — prompt in,
          pipeline kicks off.
        </p>
        {prompt && (
          <div className="mt-5 rounded-lg border border-line bg-fog px-4 py-3 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Prefilled prompt
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">&ldquo;{prompt}&rdquo;</p>
          </div>
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
