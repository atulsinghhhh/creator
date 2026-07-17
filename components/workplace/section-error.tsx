"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon, icons } from "./icons";

/**
 * Inline failure state for one dashboard section. Retry re-runs the server
 * render (router.refresh) so only failed data is refetched — the rest of the
 * page stays as-is.
 */
export function SectionError({ label }: { label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#f5c6c6] bg-[#fdf3f3] px-5 py-4">
      <div className="flex items-center gap-3">
        <Icon d={icons.alert} className="size-4.5 shrink-0 text-[#b3093c]" />
        <p className="text-sm text-[#7f1d3f]">
          <span className="font-semibold">Couldn&rsquo;t load {label}.</span>{" "}
          Please try again.
        </p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#e5a3a3] px-3.5 py-1.5 text-[13px] font-semibold text-[#7f1d3f] transition-colors hover:bg-white disabled:opacity-50"
      >
        <Icon
          d={icons.refresh}
          className={`size-3.5 ${isPending ? "animate-spin" : ""}`}
        />
        Retry
      </button>
    </div>
  );
}
