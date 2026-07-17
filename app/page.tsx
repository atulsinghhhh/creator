import type { ReactNode, SVGProps } from "react";

/* ---------- Inline icons (stroke inherits currentColor) ---------- */

function Icon({
  d,
  filled = false,
  ...props
}: { d: string; filled?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d={d} />
    </svg>
  );
}

const paths = {
  play: "M6 4.5v15l13-7.5-13-7.5Z",
  sparkles:
    "M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z",
  mic: "M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Zm7 9a7 7 0 0 1-14 0M12 18v4m-4 0h8",
  captions:
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 6h4m3 0h3M7 14h2m3 0h5",
  image:
    "M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5 8 5.5-6 4 4.5L16 13l5 6",
  film: "M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm3 0v18M17 3v18M3 8h4m10 0h4M3 16h4m10 0h4",
  download: "M12 3v12m0 0 5-5m-5 5-5-5M4 19h16",
  check: "M4.5 12.5 10 18 19.5 6.5",
  chevronRight: "M9 5l7 7-7 7",
  refresh:
    "M20 11a8 8 0 0 0-14.9-3M4 4v4h4m-4 5a8 8 0 0 0 14.9 3m1.1 4v-4h-4",
  zap: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  layers:
    "M12 3 2.5 8.5 12 14l9.5-5.5L12 3Zm-9.5 10L12 18.5 21.5 13M2.5 17.5 12 23l9.5-5.5",
  chevronDown: "M6 9l6 6 6-6",
  text: "M4 6V4h16v2M12 4v16m-3 0h6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-14v6l4 2",
  shield:
    "M12 2 4 5.5V11c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5.5L12 2Zm-3 10 2.2 2.2L15.5 9.5",
};

/* ---------- Building blocks ---------- */

function Eyebrow({ children, cyan = false }: { children: ReactNode; cyan?: boolean }) {
  return (
    <p
      className={`mb-3 text-[15px] font-semibold ${cyan ? "text-cyan-accent" : "text-blurple"}`}
    >
      {children}
    </p>
  );
}

function Heading({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <h2
      className={`max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-[1.15] ${
        light ? "text-white" : "text-ink"
      }`}
    >
      {children}
    </h2>
  );
}

function Sub({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <p
      className={`mt-4 max-w-xl text-pretty text-lg leading-relaxed ${
        light ? "text-[#adbdcc]" : "text-body"
      }`}
    >
      {children}
    </p>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`text-[17px] font-semibold tracking-tight ${
        light ? "text-white" : "text-ink"
      }`}
    >
      CreatorOS
    </span>
  );
}

/* ---------- Hero product mock ---------- */

const pipelineSteps = [
  { name: "Script", icon: paths.text, state: "done" },
  { name: "Voice", icon: paths.mic, state: "done" },
  { name: "Captions", icon: paths.captions, state: "running" },
  { name: "Visuals", icon: paths.image, state: "running" },
  { name: "Render", icon: paths.film, state: "pending" },
  { name: "Export", icon: paths.download, state: "pending" },
] as const;

function StepChip({
  name,
  icon,
  state,
}: {
  name: string;
  icon: string;
  state: "done" | "running" | "pending";
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium ${
        state === "done"
          ? "border-[#c5f1d4] bg-[#effdf4] text-[#0e6245]"
          : state === "running"
            ? "border-[#dbd8ff] bg-[#f5f4ff] text-blurple"
            : "border-line bg-fog text-muted"
      }`}
    >
      {state === "done" ? (
        <Icon d={paths.check} className="size-3.5 shrink-0" strokeWidth={2.4} />
      ) : (
        <Icon
          d={icon}
          className={`size-3.5 shrink-0 ${state === "running" ? "animate-pulse-soft" : ""}`}
        />
      )}
      {name}
      {state === "running" && (
        <span className="ml-auto size-1.5 rounded-full bg-blurple animate-pulse-soft" />
      )}
    </div>
  );
}

function HeroMock() {
  return (
    <div className="animate-fade-up delay-200 relative w-full">
      <div className="shadow-stripe overflow-hidden rounded-xl bg-white">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-line px-4 py-3">
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="ml-3 hidden rounded-md bg-fog px-2.5 py-1 text-[11px] font-medium text-muted sm:block">
            creatoros.app/new-project
          </span>
        </div>

        <div className="grid sm:grid-cols-[1fr_172px]">
          <div className="p-5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Your prompt
            </p>
            <div className="rounded-lg border border-line bg-fog px-3.5 py-3">
              <p className="text-[13.5px] leading-relaxed text-ink">
                &ldquo;Make a 30-second launch video for my productivity app —
                energetic, for TikTok.&rdquo;
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                Generating
              </p>
              <p className="flex items-center gap-1 text-[11px] font-medium text-muted">
                <Icon d={paths.clock} className="size-3" />
                ~48s left
              </p>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {pipelineSteps.map((s) => (
                <StepChip key={s.name} {...s} />
              ))}
            </div>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-line">
              <div className="animate-progress h-full rounded-full bg-blurple" />
            </div>
          </div>

          {/* vertical preview */}
          <div className="hidden items-center justify-center border-l border-line bg-fog p-4 sm:flex">
            <div className="shadow-stripe-sm relative aspect-[9/16] w-28 overflow-hidden rounded-lg bg-gradient-to-b from-[#635bff] via-[#7a5cff] to-[#00d4ff]">
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                  <Icon d={paths.play} filled className="ml-0.5 size-3.5 text-white" />
                </span>
                <span className="text-[9px] font-semibold tracking-widest text-white/80">
                  PREVIEW
                </span>
              </div>
              <div className="absolute inset-x-2 bottom-3 rounded bg-ink/60 px-1.5 py-1 text-center text-[8px] font-semibold leading-snug text-white">
                Meet the app that plans your day ✦
              </div>
              <div className="absolute left-2 top-2 rounded-full bg-ink/40 px-1.5 py-0.5 text-[7px] font-semibold text-white/90">
                9:16 · 30s
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" aria-label="CreatorOS home">
          <Logo />
        </a>
        <div className="hidden items-center gap-7 text-[15px] font-medium text-ink/80 md:flex">
          <a href="#features" className="transition-colors hover:text-ink">Features</a>
          <a href="#how" className="transition-colors hover:text-ink">How it works</a>
          <a href="#pipeline" className="transition-colors hover:text-ink">Pipeline</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="hidden text-[15px] font-semibold text-ink/80 transition-colors hover:text-ink sm:block"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blurple"
          >
            Get early access
            <Icon d={paths.chevronRight} className="size-2.5" strokeWidth={3} />
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden pb-20 pt-32 sm:pt-36 lg:pb-28"
    >
      {/* skewed animated gradient band */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="hero-gradient">
          <span className="edge-a" />
          <span className="edge-b" />
          <span className="edge-c" />
        </div>
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full bg-white/60 py-1 pl-1.5 pr-3 text-sm font-medium text-ink backdrop-blur">
            <span className="rounded-full bg-blurple px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            Private beta is open — join the waitlist
          </p>
          <h1 className="animate-fade-up delay-100 max-w-xl text-balance text-[2.75rem] font-bold leading-[1.06] tracking-tight text-ink sm:text-6xl sm:leading-[1.04]">
            One prompt. One publishable video.
          </h1>
          <p className="animate-fade-up delay-200 mt-6 max-w-lg text-pretty text-lg leading-relaxed text-body">
            CreatorOS turns a single sentence into a finished short video —
            script, voiceover, captions, and visuals — ready for TikTok,
            Instagram Reels, and YouTube Shorts in about a minute.
          </p>
          <form
            action="#"
            className="animate-fade-up delay-300 mt-8 flex max-w-md gap-3"
          >
            <input
              type="email"
              required
              placeholder="Email address"
              className="shadow-stripe-sm h-11 min-w-0 flex-1 rounded-full border border-transparent bg-white px-4 text-[15px] text-ink placeholder:text-muted focus:border-blurple focus:outline-none focus:ring-4 focus:ring-blurple/15"
            />
            <button
              type="submit"
              className="group inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-blurple px-5 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-ink"
            >
              Join waitlist
              <Icon
                d={paths.chevronRight}
                className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
                strokeWidth={3}
              />
            </button>
          </form>
        </div>

        <HeroMock />
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    ["~60s", "from prompt to finished video"],
    ["6", "production stages, automated"],
    ["3", "platforms, perfectly formatted"],
    ["0", "editing skills required"],
  ];
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-10 md:grid-cols-4 md:divide-x md:divide-line md:py-0">
        {stats.map(([n, label]) => (
          <div key={label} className="md:px-8 md:py-9 md:first:pl-0 md:last:pr-0">
            <p className="text-3xl font-semibold tracking-tight text-ink">{n}</p>
            <p className="mt-1 text-sm leading-snug text-muted">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      title: "Describe your video",
      body: "Type what you want in plain language — topic, tone, platform. That's the entire brief. No storyboards, no timelines, no templates.",
      icon: paths.sparkles,
    },
    {
      title: "AI produces everything",
      body: "CreatorOS writes the script, records a natural voiceover, times the captions, and matches visuals — then renders one polished cut.",
      icon: paths.zap,
    },
    {
      title: "Preview & download",
      body: "Watch the result, regenerate with one click if it's not right, and download a platform-ready file. Idea to publishable in one sitting.",
      icon: paths.download,
    },
  ];
  return (
    <section id="how" className="py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Eyebrow>How it works</Eyebrow>
        <Heading>From sentence to screen in three steps</Heading>
        <Sub>
          No editing software. No prompt engineering. No workflow diagrams. You
          describe it — CreatorOS makes it.
        </Sub>

        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <div key={s.title}>
              <span className="shadow-stripe-sm flex size-10 items-center justify-center rounded-lg bg-blurple text-white">
                <Icon d={s.icon} className="size-5" />
              </span>
              <p className="mt-5 text-[13px] font-semibold text-muted">
                Step {i + 1}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-body">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: paths.text,
      title: "AI scriptwriting",
      body: "Hooks that stop the scroll, pacing built for retention, and a clear call to action — written for your topic and platform.",
    },
    {
      icon: paths.mic,
      title: "Studio-quality voiceover",
      body: "A natural AI voice narrates with human pacing and emphasis. No robotic monotone, no recording booth.",
    },
    {
      icon: paths.captions,
      title: "Auto captions, perfectly timed",
      body: "Word-accurate captions synced to the voice track — because most short-form video is watched on mute.",
    },
    {
      icon: paths.image,
      title: "Visuals found for you",
      body: "CreatorOS reads your script and pulls matching licensed stock footage for every scene. Nothing to dig through.",
    },
    {
      icon: paths.layers,
      title: "Platform-perfect export",
      body: "Vertical 9:16, correct length, correct encoding — one download that's ready to post anywhere.",
    },
    {
      icon: paths.refresh,
      title: "One-click regeneration",
      body: "Not feeling the first cut? Regenerate from the same prompt. Every version is kept — nothing is overwritten.",
    },
  ];

  return (
    <section id="features" className="fog-band py-24 sm:py-32">
      <div className="relative mx-auto max-w-6xl px-5">
        <Eyebrow>Everything included</Eyebrow>
        <Heading>A full production team, collapsed into one prompt</Heading>
        <Sub>
          Scriptwriter, voice artist, captioner, footage researcher, and editor
          — every role handled end-to-end, automatically.
        </Sub>

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title}>
              <span className="shadow-stripe-sm flex size-9 items-center justify-center rounded-lg bg-white text-blurple">
                <Icon d={f.icon} className="size-4.5" />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-body">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  const stages = [
    { icon: paths.text, name: "Script" },
    { icon: paths.mic, name: "Voice" },
    { icon: paths.captions, name: "Captions" },
    { icon: paths.image, name: "Visuals" },
    { icon: paths.film, name: "Render" },
    { icon: paths.download, name: "Export" },
  ];
  const callouts = [
    {
      icon: paths.refresh,
      title: "Independently retryable",
      body: "A hiccup at one stage retries just that stage — your script and voice are never regenerated from scratch.",
    },
    {
      icon: paths.zap,
      title: "Parallel where it counts",
      body: "Voice, captions, and visuals are produced concurrently the moment the script is ready.",
    },
    {
      icon: paths.shield,
      title: "Transparent status, always",
      body: "The progress you see is the pipeline's real state — not an animation guessing at it.",
    },
  ];
  return (
    <section id="pipeline" className="dark-band my-20 py-28 sm:py-32">
      <div className="relative mx-auto max-w-6xl px-5">
        <Eyebrow cyan>Under the hood</Eyebrow>
        <Heading light>Real progress, not a fake spinner</Heading>
        <Sub light>
          Every video runs through a six-stage production pipeline. You watch
          each stage complete live — and if one hiccups, only that stage
          retries. Finished work is never thrown away.
        </Sub>

        <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stages.map((s, i) => (
            <div key={s.name} className="relative">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 text-center transition-colors hover:border-cyan-accent/40">
                <span className="mx-auto flex size-9 items-center justify-center rounded-lg bg-white/10 text-cyan-accent">
                  <Icon d={s.icon} className="size-4" />
                </span>
                <p className="mt-2.5 text-sm font-semibold text-white">{s.name}</p>
              </div>
              {i < stages.length - 1 && (
                <Icon
                  d={paths.chevronRight}
                  className="absolute -right-2.5 top-1/2 z-10 hidden size-3.5 -translate-y-1/2 text-white/30 lg:block"
                  strokeWidth={3}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {callouts.map((c) => (
            <div key={c.title}>
              <span className="flex size-8 items-center justify-center rounded-md bg-cyan-accent/15 text-cyan-accent">
                <Icon d={c.icon} className="size-4" />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold text-white">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#adbdcc]">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Platforms() {
  const platforms = [
    ["TikTok", "Fast pacing and bold captions tuned for the For You page."],
    ["Instagram Reels", "A polished look with feed-safe caption zones."],
    ["YouTube Shorts", "Retention-first hooks that fit under 60 seconds."],
  ];
  return (
    <section className="py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <Eyebrow>Built for short-form</Eyebrow>
        <Heading>Native to every vertical feed</Heading>
        <Sub>
          Pick your platform when you create a project — format, length, and
          style are tuned automatically.
        </Sub>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {platforms.map(([name, detail]) => (
            <div
              key={name}
              className="shadow-stripe-sm rounded-xl border border-line bg-white p-6 transition-shadow duration-300 hover:shadow-stripe"
            >
              <div className="flex aspect-[9/16] w-10 items-center justify-center rounded-md bg-gradient-to-b from-blurple to-cyan-accent">
                <Icon d={paths.play} filled className="size-3 text-white" />
              </div>
              <h3 className="mt-4 text-[17px] font-semibold text-ink">{name}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-body">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  const items = [
    ["Brand kits & templates", "Your fonts, colors, and style on every video."],
    ["Multiple AI voices", "Pick the voice that fits your brand."],
    ["Content repurposing", "Blog, PDF, or YouTube URL → a week of shorts."],
    ["Direct publishing", "Push to every platform with scheduling."],
    ["Growth analytics", "AI learns from performance and improves the next video."],
    ["AI creative team", "Specialized agents for research, SEO, and thumbnails."],
  ];
  return (
    <section className="fog-band py-24 sm:py-32">
      <div className="relative mx-auto max-w-6xl px-5">
        <Eyebrow>Roadmap</Eyebrow>
        <Heading>This is only the beginning</Heading>
        <Sub>
          CreatorOS is becoming the operating system for content — from one
          video today to your entire content business on autopilot.
        </Sub>
        <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(([title, desc]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="mt-0.5 rounded-full bg-blurple/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blurple">
                Soon
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-body">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      tagline: "Try it on a real video",
      features: [
        "3 videos per month",
        "All core features included",
        "720p export with watermark",
        "Community support",
      ],
      cta: "Start free",
      featured: false,
    },
    {
      name: "Creator",
      price: "$29",
      tagline: "For creators posting weekly",
      features: [
        "30 videos per month",
        "1080p export, no watermark",
        "All 3 platforms",
        "Full generation history",
        "Priority rendering",
      ],
      cta: "Get early access",
      featured: true,
    },
    {
      name: "Pro",
      price: "$79",
      tagline: "For serious volume",
      features: [
        "Unlimited videos*",
        "Highest render priority",
        "Early access to new features",
        "Priority support",
      ],
      cta: "Get early access",
      featured: false,
    },
  ];
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center text-center">
          <Eyebrow>Pricing</Eyebrow>
          <Heading>Less than one freelance edit</Heading>
          <Sub>
            Early-access pricing, locked in for founding members. Cancel
            anytime.
          </Sub>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl bg-white p-7 ${
                t.featured
                  ? "shadow-stripe border-2 border-blurple"
                  : "shadow-stripe-sm border border-line"
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blurple px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-base font-semibold text-ink">{t.name}</h3>
              <p className="mt-0.5 text-sm text-muted">{t.tagline}</p>
              <p className="mt-5 text-4xl font-semibold tracking-tight text-ink">
                {t.price}
                <span className="text-base font-normal text-muted"> /mo</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-body">
                    <Icon
                      d={paths.check}
                      className="mt-0.5 size-4 shrink-0 text-blurple"
                      strokeWidth={2.4}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#cta"
                className={`mt-8 block rounded-full py-2.5 text-center text-sm font-semibold transition-colors duration-200 ${
                  t.featured
                    ? "bg-blurple text-white hover:bg-ink"
                    : "border border-line text-blurple hover:border-blurple"
                }`}
              >
                {t.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-muted">
          *Fair-use policy applies. Prices shown are planned early-access
          pricing.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const faqs = [
    {
      q: "Do I need any video editing experience?",
      a: "None. You type a sentence describing the video you want; CreatorOS handles scripting, voiceover, captions, visuals, and rendering. There is no timeline, no keyframes, and nothing to learn.",
    },
    {
      q: "How long does a video take to generate?",
      a: "Most videos finish in about a minute. You watch each production stage complete in real time, so you always know exactly where your video is.",
    },
    {
      q: "What if I don't like the result?",
      a: "Regenerate with one click. Every generation is saved to your project, so you can compare versions — an earlier cut is never overwritten or lost.",
    },
    {
      q: "Which platforms are supported?",
      a: "TikTok, Instagram Reels, and YouTube Shorts at launch. You pick the platform when creating a project, and the output is formatted for it automatically. Direct publishing and scheduling are on the roadmap.",
    },
    {
      q: "Where do the visuals come from?",
      a: "CreatorOS analyzes your script and selects matching clips from licensed, high-quality stock footage libraries — safe to publish commercially.",
    },
    {
      q: "Do I own the videos I create?",
      a: "Yes. Every video you generate is yours to publish, monetize, and use however you like.",
    },
  ];
  return (
    <section id="faq" className="faq py-24 sm:py-28">
      <div className="mx-auto max-w-3xl px-5">
        <Eyebrow>FAQ</Eyebrow>
        <Heading>Questions, answered</Heading>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-semibold text-ink transition-colors hover:text-blurple">
                {f.q}
                <Icon
                  d={paths.chevronDown}
                  className="chevron size-4 shrink-0 text-muted"
                />
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-body">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="cta" className="dark-band py-28 sm:py-32">
      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Your next video is one sentence away
        </h2>
        <p className="mx-auto mt-4 max-w-md text-pretty text-lg leading-relaxed text-[#adbdcc]">
          Join the waitlist and be among the first creators to turn prompts
          into publishable videos.
        </p>
        <form
          action="#"
          className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row"
        >
          <input
            type="email"
            required
            placeholder="Email address"
            className="h-11 flex-1 rounded-full border border-white/20 bg-white/10 px-4 text-[15px] text-white placeholder:text-white/50 focus:border-cyan-accent focus:outline-none focus:ring-4 focus:ring-cyan-accent/20"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-200 hover:bg-cyan-accent"
          >
            Join the waitlist
            <Icon d={paths.chevronRight} className="size-3" strokeWidth={3} />
          </button>
        </form>
        <p className="mt-4 text-[13px] text-white/50">
          Free to join · no credit card required
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-white pb-14 pt-36">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row">
        <Logo />
        <div className="flex items-center gap-7 text-sm font-medium text-body">
          <a href="#features" className="transition-colors hover:text-ink">Features</a>
          <a href="#pricing" className="transition-colors hover:text-ink">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-ink">FAQ</a>
          <a href="#" className="transition-colors hover:text-ink">Contact</a>
        </div>
        <p className="text-sm text-muted">© {new Date().getFullYear()} CreatorOS</p>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="landing min-h-screen scroll-smooth font-sans">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <HowItWorks />
        <Features />
        <Pipeline />
        <Platforms />
        <Roadmap />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
