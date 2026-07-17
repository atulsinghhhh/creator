"use client";

import { useEffect, useState } from "react";
import { PIPELINE_STEPS } from "@/pipeline/types";

interface StepRow {
  step: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  error: string | null;
}

interface GenerationStatus {
  status: string;
  videoUrl: string | null;
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

const STATUS_STYLES: Record<StepRow["status"], string> = {
  queued: "bg-fog text-muted",
  running: "bg-blurple/10 text-blurple",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-fog text-muted line-through",
};

const POLL_MS = 2000;

/**
 * Minimal Processing view: polls the generation status API and renders the
 * real per-step job state — never simulated progress (Architecture Rule 2).
 */
export function GenerationSteps({ generationId }: { generationId: string }) {
  const [data, setData] = useState<GenerationStatus | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/generations/${generationId}`);
        if (!res.ok) throw new Error(String(res.status));
        const body: GenerationStatus = await res.json();
        if (cancelled) return;
        setData(body);
        setFetchError(false);
        if (body.status === "completed" || body.status === "failed") return;
      } catch {
        if (!cancelled) setFetchError(true);
      }
      timer = setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [generationId]);

  const stepsByName = new Map(data?.steps.map((s) => [s.step, s]));
  const failedStep = data?.steps.find((s) => s.status === "failed");

  return (
    <div className="mt-4">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {PIPELINE_STEPS.map((step) => {
          const row = stepsByName.get(step);
          const status = row?.status ?? "queued";
          return (
            <li key={step} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm text-ink">{STEP_LABELS[step] ?? step}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}
              >
                {status === "running" ? "running…" : status}
              </span>
            </li>
          );
        })}
      </ul>

      {failedStep && (
        <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {STEP_LABELS[failedStep.step] ?? failedStep.step} failed
          {failedStep.error ? `: ${failedStep.error}` : "."}
        </p>
      )}

      {fetchError && (
        <p className="mt-3 text-[13px] text-muted">Connection hiccup — retrying…</p>
      )}

      {data?.status === "completed" && data.videoUrl && (
        <a
          href={data.videoUrl}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-blurple px-5 text-sm font-semibold text-white transition-colors hover:bg-ink"
        >
          Download video
        </a>
      )}
    </div>
  );
}
