"use client";

import { useEffect, useState } from "react";
import { PIPELINE_STEPS } from "@/pipeline/types";
import { GenerationPreview } from "@/components/preview/GenerationPreview";

export interface StepRow {
  step: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  error: string | null;
}

export interface GenerationStatus {
  id: string;
  status: string;
  script: string | null;
  subtitleUrl: string | null;
  videoUrl: string | null;
  duration: string | null;
  steps: StepRow[];
}

const STEP_LABELS: Record<string, string> = {
  moderation: "Moderation",
  planner: "Planning",
  script: "Script",
  voice: "Voice",
  media: "Media search",
  captions: "Captions",
  render: "Render",
  export: "Export",
};

const STATUS_TEXT: Record<StepRow["status"], { label: string; className: string }> = {
  queued: { label: "Waiting", className: "text-muted" },
  running: { label: "In progress…", className: "text-blurple" },
  completed: { label: "Complete", className: "text-[#0e6245]" },
  failed: { label: "Failed", className: "text-red-700" },
  cancelled: { label: "Skipped", className: "text-muted line-through" },
};

/** Timeline node: check when done, pulsing dot while running, hollow while waiting. */
function StepNode({ status }: { status: StepRow["status"] }) {
  if (status === "completed") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-[#effdf4] text-[#0e6245]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden>
          <path d="M4.5 12.5 10 18 19.5 6.5" />
        </svg>
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full border-2 border-blurple bg-white">
        <span className="size-2 animate-pulse-soft rounded-full bg-blurple" />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-red-50 text-red-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="size-3" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    );
  }
  return <span className="size-6 rounded-full border-2 border-line bg-white" />;
}

const POLL_MS = 2000;

/**
 * V0 screens 3+4 on one route: polls real pipeline state (never simulated —
 * Architecture Rule 2) and flips from Processing to Preview on completion.
 * Regenerate swaps in the new generation and returns to Processing.
 */
export function GenerationView({
  initialGenerationId,
  projectId,
  balance,
}: {
  initialGenerationId: string;
  projectId: string;
  balance: number;
}) {
  const [generationId, setGenerationId] = useState(initialGenerationId);
  const [latest, setLatest] = useState<GenerationStatus | null>(null);
  // After regenerate, `latest` may briefly belong to the previous generation —
  // treat it as absent instead of resetting state inside the effect.
  const data = latest?.id === generationId ? latest : null;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/generations/${generationId}`);
        if (res.ok) {
          const body: GenerationStatus = await res.json();
          if (cancelled) return;
          setLatest(body);
          if (body.status === "completed" || body.status === "failed") return;
        }
      } catch {
        // transient — keep polling
      }
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [generationId]);

  if (data?.status === "completed" && data.videoUrl) {
    return (
      <GenerationPreview
        generation={data}
        projectId={projectId}
        balance={balance}
        onRegenerated={setGenerationId}
      />
    );
  }

  const stepsByName = new Map(data?.steps.map((s) => [s.step, s]));
  const failedStep = data?.steps.find((s) => s.status === "failed");
  const doneCount = PIPELINE_STEPS.filter(
    (s) => stepsByName.get(s)?.status === "completed"
  ).length;
  const progressPct = Math.round((doneCount / PIPELINE_STEPS.length) * 100);

  return (
    <div className="shadow-stripe-sm mx-auto max-w-xl rounded-2xl border border-line bg-white p-6 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-ink">
          {data?.status === "failed" ? "Generation failed" : "Generating your video"}
        </h2>
        {data?.status !== "failed" && (
          <span className="inline-flex items-center gap-2 text-[13px] font-medium text-muted">
            <span className="size-2 animate-pulse-soft rounded-full bg-blurple" />
            Live
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-body">
            {doneCount} of {PIPELINE_STEPS.length} steps complete
          </span>
          <span className="font-semibold text-ink tabular-nums">{progressPct}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fog">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${
              data?.status === "failed" ? "bg-red-400" : "bg-blurple"
            }`}
            style={{ width: `${Math.max(progressPct, 2)}%` }}
          />
        </div>
      </div>

      <ol className="mt-6">
        {PIPELINE_STEPS.map((step, i) => {
          const status = stepsByName.get(step)?.status ?? "queued";
          const text = STATUS_TEXT[status];
          const isLast = i === PIPELINE_STEPS.length - 1;
          return (
            <li key={step} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <StepNode status={status} />
                {!isLast && (
                  <span
                    className={`w-px flex-1 ${
                      status === "completed" ? "bg-[#0e6245]/25" : "bg-line"
                    }`}
                  />
                )}
              </div>
              <div className={isLast ? "pb-0" : "pb-5"}>
                <p
                  className={`text-sm font-semibold leading-6 ${
                    status === "queued" ? "text-muted" : "text-ink"
                  }`}
                >
                  {STEP_LABELS[step] ?? step}
                </p>
                <p className={`text-[13px] ${text.className}`}>{text.label}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {failedStep && (
        <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
          {STEP_LABELS[failedStep.step] ?? failedStep.step} failed
          {failedStep.error ? `: ${failedStep.error}` : "."} No credits were used — failed
          generations are free.
        </p>
      )}
    </div>
  );
}
