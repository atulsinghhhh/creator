"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJson } from "@/lib/utilis/auth-client";
import { GENERATION_COST_CREDITS } from "@/lib/billing/packs";

const PLATFORMS = [
  { value: "instagram", label: "Instagram", hint: "Reels" },
  { value: "tiktok", label: "TikTok", hint: "9:16" },
  { value: "youtube_shorts", label: "YouTube", hint: "Shorts" },
] as const;

type Platform = (typeof PLATFORMS)[number]["value"];

export function NewProjectForm({
  initialPrompt,
  hasCredits,
}: {
  initialPrompt: string;
  hasCredits: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(!hasCredits);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { ok, status, data } = await postJson<{ projectId?: string; error?: string }>(
        "/api/projects",
        { title: title.trim() || prompt.trim().slice(0, 80), prompt: prompt.trim(), platform }
      );

      if (status === 402) {
        setOutOfCredits(true);
        setLoading(false);
        return;
      }
      if (!ok || !data.projectId) {
        setError(
          data.error === "invalid_input"
            ? "Check the prompt and title — something's missing or too long."
            : "Something went wrong. Please try again."
        );
        setLoading(false);
        return;
      }

      router.push(`/projects/${data.projectId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const disabled = loading || outOfCredits;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {outOfCredits && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blurple/30 bg-blurple/5 px-4 py-3">
          <p className="text-sm text-ink">
            Not enough credits — each video costs {GENERATION_COST_CREDITS} credits.
          </p>
          <Link
            href="/billing"
            className="inline-flex h-9 shrink-0 items-center rounded-full bg-blurple px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-ink"
          >
            Get credits
          </Link>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="prompt" className="text-[13px] font-semibold text-ink">
          What&rsquo;s the video about?
        </label>
        <textarea
          id="prompt"
          required
          rows={4}
          maxLength={2000}
          placeholder="e.g. 3 morning habits that boost focus — energetic, for young professionals"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="mt-1.5 w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted focus:border-blurple focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="title" className="text-[13px] font-semibold text-ink">
          Project title <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          placeholder="Defaults to your prompt"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-muted focus:border-blurple focus:outline-none"
        />
      </div>

      <div>
        <span className="text-[13px] font-semibold text-ink">Platform</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2.5">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPlatform(p.value)}
              aria-pressed={platform === p.value}
              className={`rounded-xl border px-3 py-2.5 text-center transition-colors duration-200 ${
                platform === p.value
                  ? "border-blurple bg-blurple/5"
                  : "border-line bg-white hover:border-blurple/50"
              }`}
            >
              <span className={`block text-sm font-semibold ${platform === p.value ? "text-blurple" : "text-ink"}`}>
                {p.label}
              </span>
              <span className="block text-[11px] text-muted">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={disabled}
        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-blurple text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Starting…" : `Generate video · ${GENERATION_COST_CREDITS} credits`}
      </button>
    </form>
  );
}
