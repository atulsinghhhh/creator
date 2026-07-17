import Link from "next/link";
import { getCreditsSummary } from "@/lib/workplace/queries";
import { Icon, icons } from "./icons";
import { SectionError } from "./section-error";

export async function CreditsCard({ userId }: { userId: string }) {
  let summary;
  try {
    summary = await getCreditsSummary(userId);
  } catch {
    return <SectionError label="your credits" />;
  }
  if (!summary) return <SectionError label="your credits" />;

  const { balance, planName, planCode, planCredits } = summary;
  const pct =
    planCredits > 0 ? Math.min(100, Math.round((balance / planCredits) * 100)) : 0;
  const low = planCredits > 0 && pct <= 20;

  return (
    <div className="shadow-stripe-sm rounded-xl border border-line bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Icon d={icons.coins} className="size-4 text-blurple" />
          Credits
        </h2>
        <span className="rounded-full bg-blurple/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blurple">
          {planName} plan
        </span>
      </div>

      <p className="mt-4 text-4xl font-semibold tracking-tight text-ink">
        {balance}
        <span className="ml-1.5 text-sm font-normal text-muted">
          / {planCredits} credits
        </span>
      </p>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-fog"
        role="progressbar"
        aria-valuenow={balance}
        aria-valuemin={0}
        aria-valuemax={planCredits}
        aria-label="Remaining credits"
      >
        <div
          className={`h-full rounded-full transition-[width] ${low ? "bg-[#e0426d]" : "bg-blurple"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-[13px] text-muted">
        {low
          ? "Running low — upgrade to keep creating."
          : `${pct}% of your ${planName} plan credits remaining.`}
      </p>

      {planCode !== "enterprise" && (
        <Link
          href="/#pricing"
          className="mt-5 flex h-10 items-center justify-center gap-1 rounded-full bg-blurple text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink"
        >
          Upgrade
          <Icon d={icons.chevronRight} className="size-3" strokeWidth={3} />
        </Link>
      )}
    </div>
  );
}
