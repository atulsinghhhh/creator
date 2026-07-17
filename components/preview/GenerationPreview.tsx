"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { postJson } from "@/lib/utilis/auth-client";
import { GENERATION_COST_CREDITS } from "@/lib/billing/packs";
import type { GenerationStatus } from "@/components/processing/GenerationView";

interface ScriptScene {
  index: number;
  narration: string;
  visualDirection: string;
}

interface VttCue {
  start: string;
  text: string;
}

/** Minimal WEBVTT parser — enough for our own generated cue files. */
function parseVtt(vtt: string): VttCue[] {
  const cues: VttCue[] = [];
  const blocks = vtt.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    const timingIndex = lines.findIndex((l) => l.includes("-->"));
    if (timingIndex === -1) continue;
    const start = lines[timingIndex].split("-->")[0].trim().replace(/^00:/, "");
    const text = lines.slice(timingIndex + 1).join(" ").trim();
    if (text) cues.push({ start, text });
  }
  return cues;
}

/**
 * V0 Preview: read-only view of a completed Generation — playable video,
 * script, caption cues, download, regenerate. No editing controls (V0 rules).
 */
export function GenerationPreview({
  generation,
  projectId,
  balance,
  onRegenerated,
}: {
  generation: GenerationStatus;
  projectId: string;
  balance: number;
  onRegenerated: (newGenerationId: string) => void;
}) {
  const [showCaptions, setShowCaptions] = useState(false);
  const [cues, setCues] = useState<VttCue[] | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(balance < GENERATION_COST_CREDITS);

  const scenes = useMemo<ScriptScene[]>(() => {
    try {
      return JSON.parse(generation.script ?? "{}").scenes ?? [];
    } catch {
      return [];
    }
  }, [generation.script]);

  useEffect(() => {
    if (!showCaptions || cues !== null || !generation.subtitleUrl) return;
    fetch(generation.subtitleUrl)
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((text) => setCues(parseVtt(text)))
      .catch(() => setCues([]));
  }, [showCaptions, cues, generation.subtitleUrl]);

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError(null);
    try {
      const { ok, status, data } = await postJson<{ generationId?: string }>(
        `/api/projects/${projectId}/generations`,
        {}
      );
      if (status === 402) {
        setOutOfCredits(true);
        setRegenerating(false);
        return;
      }
      if (!ok || !data.generationId) {
        setRegenError("Couldn't start a new generation. Please try again.");
        setRegenerating(false);
        return;
      }
      onRegenerated(data.generationId);
    } catch {
      setRegenError("Couldn't start a new generation. Please try again.");
      setRegenerating(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Video column */}
      <div>
        <div className="shadow-stripe rounded-2xl border border-line bg-ink p-2.5">
          <video
            key={generation.videoUrl ?? undefined}
            src={generation.videoUrl ?? undefined}
            controls
            playsInline
            className="aspect-[9/16] w-full rounded-xl bg-black"
          />
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <a
            href={generation.videoUrl ?? "#"}
            download
            className="inline-flex h-11 items-center justify-center rounded-full bg-blurple text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-ink"
          >
            Download video
          </a>

          {outOfCredits ? (
            <Link
              href="/billing"
              className="inline-flex h-11 items-center justify-center rounded-full border border-line text-[15px] font-semibold text-blurple transition-colors duration-200 hover:border-blurple"
            >
              Out of credits — top up to regenerate
            </Link>
          ) : (
            // Full-pipeline rerun with the original prompt verbatim (V0 —
            // no prompt editing on regenerate).
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="inline-flex h-11 items-center justify-center rounded-full border border-line text-[15px] font-semibold text-blurple transition-colors duration-200 hover:border-blurple disabled:cursor-not-allowed disabled:opacity-60"
            >
              {regenerating ? "Starting…" : `Regenerate · ${GENERATION_COST_CREDITS} credits`}
            </button>
          )}

          {regenError && <p className="text-center text-[13px] text-red-700">{regenError}</p>}
          {generation.duration && (
            <p className="text-center text-[13px] text-muted">
              {Number(generation.duration).toFixed(0)}s · ready to post
            </p>
          )}
        </div>
      </div>

      {/* Script / captions column */}
      <div className="shadow-stripe-sm h-fit rounded-2xl border border-line bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink">
            {showCaptions ? "Captions" : "Script"}
          </h2>
          {generation.subtitleUrl && (
            <button
              onClick={() => setShowCaptions((v) => !v)}
              className="rounded-full border border-line px-3.5 py-1.5 text-[13px] font-semibold text-blurple transition-colors duration-200 hover:border-blurple"
            >
              {showCaptions ? "Show script" : "Show captions"}
            </button>
          )}
        </div>

        {!showCaptions ? (
          <div className="mt-4 space-y-4">
            {scenes.length === 0 && (
              <p className="text-sm leading-relaxed text-muted">No script available.</p>
            )}
            {scenes.map((scene) => (
              <div key={scene.index} className="rounded-xl border border-line bg-fog px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blurple">
                  Scene {scene.index + 1}
                </p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink">{scene.narration}</p>
                <p className="mt-1.5 text-[13px] italic leading-relaxed text-muted">
                  Visual: {scene.visualDirection}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            {cues === null && <p className="text-sm text-muted">Loading captions…</p>}
            {cues?.length === 0 && (
              <p className="text-sm text-muted">Captions couldn&rsquo;t be loaded.</p>
            )}
            {!!cues?.length && (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {cues.map((cue, i) => (
                  <li key={i} className="flex gap-4 px-4 py-2.5">
                    <span className="w-16 shrink-0 font-mono text-[12px] text-muted">
                      {cue.start}
                    </span>
                    <span className="text-sm leading-relaxed text-ink">{cue.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
