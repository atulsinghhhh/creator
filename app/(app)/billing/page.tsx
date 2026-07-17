import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/utilis/auth";
import { db } from "@/lib/db";
import { wallets, walletTransactions } from "@/lib/db/schema";
import { CREDIT_PACKS, GENERATION_COST_CREDITS } from "@/lib/billing/packs";
import { getProfile } from "@/lib/workplace/queries";
import { WorkplaceHeader } from "@/components/workplace/workplace-header";
import { CheckoutButton } from "@/components/billing/CheckoutButton";

export const metadata: Metadata = {
  title: "Billing — CreatorOS",
};

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  signup_bonus: "Signup bonus",
  credit_purchase: "Credit purchase",
  generation: "Video generation",
};

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/** V0 billing: prepaid credit packs (1 credit = 1 video), dummy Razorpay for now. */
export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin?callbackUrl=/billing");
  }

  const [profile, [wallet]] = await Promise.all([
    getProfile(session.user.id),
    db.select().from(wallets).where(eq(wallets.userId, session.user.id)),
  ]);
  if (!profile) redirect("/api/auth/signin?callbackUrl=/billing");

  const balance = wallet?.balance ?? 0;
  const transactions = wallet
    ? await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, wallet.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10)
    : [];

  return (
    <div className="landing min-h-screen bg-fog font-sans">
      <WorkplaceHeader profile={profile} credits={balance} />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-blurple">Billing</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">Credits</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-body">
          Every video costs {GENERATION_COST_CREDITS} credits, debited only when generation
          succeeds — failed runs are free. Payments run in Razorpay test mode; no real money
          moves.
        </p>

        <div className="shadow-stripe-sm mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white px-6 py-5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight text-ink tabular-nums">
              {balance}
            </span>
            <span className="text-[15px] text-muted">
              {balance === 1 ? "credit" : "credits"} available
            </span>
          </div>
          <p className="text-[13px] text-muted">
            {GENERATION_COST_CREDITS} credits = 1 finished video · credits never expire
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => {
            const videos = Math.floor(pack.credits / GENERATION_COST_CREDITS);
            const perVideoPaise = pack.amountPaise / videos;
            const baseRate =
              CREDIT_PACKS[0].amountPaise /
              Math.floor(CREDIT_PACKS[0].credits / GENERATION_COST_CREDITS);
            const savingsPct = Math.round((1 - perVideoPaise / baseRate) * 100);
            return (
              <div
                key={pack.id}
                className={`flex flex-col rounded-2xl bg-white p-6 ${
                  pack.featured
                    ? "shadow-stripe border-2 border-blurple"
                    : "shadow-stripe-sm border border-line"
                }`}
              >
                <div className="flex h-6 items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-ink">{pack.name}</h2>
                  {pack.featured && (
                    <span className="rounded-full bg-blurple/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blurple">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-ink">
                    {formatAmount(pack.amountPaise)}
                  </span>
                  <span className="text-[13px] text-muted">one-time</span>
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  ₹{(perVideoPaise / 100).toFixed(2)} per video
                  {savingsPct > 0 && (
                    <span className="ml-1.5 font-semibold text-[#0e6245]">
                      Save {savingsPct}%
                    </span>
                  )}
                </p>
                <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-body">
                  <li className="flex items-center gap-2">
                    <span className="text-blurple">✓</span> {pack.credits} credits ·{" "}
                    {videos} video {videos === 1 ? "generation" : "generations"}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blurple">✓</span> Script, voice, captions included
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-blurple">✓</span> Failed runs are always free
                  </li>
                </ul>
                <div className="mt-auto pt-5">
                  <CheckoutButton packId={pack.id} packName={pack.name} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="shadow-stripe-sm mt-10 rounded-2xl border border-line bg-white p-6">
          <h2 className="text-[17px] font-semibold text-ink">Recent activity</h2>
          {transactions.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No transactions yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {REASON_LABELS[tx.reason] ?? tx.reason}
                    </p>
                    <p className="text-[12px] text-muted">
                      {tx.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        tx.type === "credit" ? "text-[#0e6245]" : "text-ink"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "−"}
                      {tx.amount}
                    </p>
                    <p className="text-[12px] text-muted tabular-nums">balance {tx.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
