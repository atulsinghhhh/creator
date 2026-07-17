import Link from "next/link";
import { firstName } from "@/lib/workplace/format";
import { Icon, icons } from "./icons";

const EXAMPLE_PROMPTS = [
  "A 30-second launch video for my productivity app",
  "3 morning habits that changed my life",
  "Why every founder should learn to sell",
  "Quick pasta recipe under 10 minutes",
];

export function Hero({ name }: { name: string }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#635bff] via-[#5b6bff] to-[#00a2ff] p-8 sm:p-10">
      {/* subtle texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />
      <div className="relative">
        <h1 className="max-w-xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
          What will you create today, {firstName(name)}?
        </h1>
        <p className="mt-2 max-w-lg text-pretty text-[15px] leading-relaxed text-white/80">
          Describe your video in one sentence — CreatorOS writes the script,
          adds a voiceover, captions, and visuals, and renders it for you.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/projects/new"
            className="group inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white px-6 text-[15px] font-semibold text-blurple shadow-stripe-sm transition-transform hover:scale-[1.02]"
          >
            <Icon d={icons.plus} className="size-4" strokeWidth={2.4} />
            Create project
            <Icon
              d={icons.chevronRight}
              className="size-3 transition-transform group-hover:translate-x-0.5"
              strokeWidth={3}
            />
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-white/70">Try:</span>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <Link
              key={prompt}
              href={`/projects/new?prompt=${encodeURIComponent(prompt)}`}
              className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              {prompt}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
