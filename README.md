# CreatorOS

**AI Content Operating System.** One prompt in → one publishable short video out.

Instead of juggling separate tools for scripting, voiceover, captions, stock
footage, and editing, you describe what you want and CreatorOS produces a
finished short-form video.

> "Launch my micro saas." → script, voice, captions, visuals, rendered video.

---

## Status: V0 (MVP)

**Goal:** prove a single prompt reliably produces one good short video. Nothing more.

V0 deliberately does **not** include video editing/trimming, publishing or
scheduling, a timeline/manual editing surface, multiple voices or brand kits,
team/collaboration, analytics, or partial ("just the voice") regeneration.
Those are real, planned features — just not yet. See [Roadmap](#roadmap-v0--v10)
and `CLAUDE.md` for the exact V0 boundary.

### V0 user flow

```
Dashboard → New Project → Processing → Preview → Download
```

### Pipeline

```
Moderation → Planner → Script Generator ─┬─► Voice Generator ─► Caption Generator ─┐
                                          └─► Media Search ─────────────────────────┤
                                                                                     ▼
                                                                                 Renderer
                                                                                     │
                                                                                     ▼
                                                                                 Exporter
```

Every stage is an independently retryable job step with its own
`pending / running / done / failed` status, takes a defined input, and
produces a defined output — providers behind each stage are swappable
adapters, never hardcoded into orchestration logic. Full detail in
`docs/architecture.md`.

---

## Tools & Stack (currently implemented)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, API routes), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Drizzle ORM |
| Job queue | BullMQ + Redis (`ioredis`) |
| Auth | Auth.js (NextAuth) v5 — credentials + Google OAuth, Argon2 password hashing |
| Object storage | MinIO (S3-compatible, self-hosted) |
| Script generation (LLM) | Groq (`groq-sdk`) |
| Voice generation (TTS) | Kokoro (self-hosted) |
| Captions (speech-to-text) | Groq Whisper (`whisper-large-v3-turbo`) |
| Media search | OpenCLIP embeddings (`@huggingface/transformers`) + Qdrant |
| Video rendering | Remotion (`@remotion/bundler`, `@remotion/renderer`) |
| Video/audio encoding | FFmpeg (`ffmpeg-static`, `ffprobe-static`) |
| Local infra | Docker Compose (Postgres, Redis, MinIO, Qdrant, Kokoro) |
| CI | GitHub Actions (lint, typecheck, build) |

Every provider above sits behind a config-driven interface
(`lib/config/providers.ts`) — swapping one (e.g. Groq → Claude) means writing
a new adapter and changing an env var, never touching pipeline code.

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template and fill in secrets (Groq key, Auth secret, etc.)
cp .env.local.example .env.local

# 3. Start local infra (Postgres, Redis, MinIO, Qdrant, Kokoro)
npm run docker:up

# 4. Run DB migrations
npm run db:migrate

# 5. Start the app
npm run dev

# 6. Start the pipeline worker (separate process)
npm run worker
```

Other useful commands:

```bash
npm run lint          # ESLint
npx tsc --noEmit       # Typecheck
npm run build          # Production build
npm run db:generate    # Generate a new Drizzle migration
npm run db:studio      # Drizzle Studio (DB browser)
npm run stage           # Run a single pipeline stage standalone (debugging)
npm run media:ingest   # Ingest stock media into the CLIP/Qdrant index
```

---

## Roadmap: V0 → V10

CreatorOS's long-term vision is to become the operating system for content
creation and marketing — one AI workspace managing the full lifecycle from
idea to measurable business results. The path there:

| Version | Theme | Adds |
|---|---|---|
| **V0** | MVP | Prompt → short video: AI script, AI voice, auto captions, stock visuals, export. *(current)* |
| **V1** | Creator Studio | Projects, brand kit, multiple voices, templates, export presets, workspace dashboard |
| **V2** | Content Repurposer | Input a blog/PDF/YouTube URL/thread → output reels, shorts, TikTok, IG, LinkedIn post, X thread |
| **V3** | Product Ad Studio | Product ads, hooks, CTAs, variations, UGC-style ads for small businesses & e-commerce |
| **V4** | Long-form Studio | YouTube videos, podcasts, training/educational content — chapters, thumbnails, SEO |
| **V5** | Brand Intelligence | CreatorOS remembers writing style, voice, brand colors, logo, audience, editing preferences — every output personalized |
| **V6** | AI Team | Specialized agents (research, marketing, script, storyboard, video, voice, thumbnail, SEO, publishing) users manage as a team |
| **V7** | Publishing Platform | Direct publishing to YouTube/Instagram/TikTok/LinkedIn/X, scheduling, approval flows, content calendar |
| **V8** | Growth Intelligence | Analytics (watch time, CTR, retention, engagement, conversion); AI recommends and auto-generates optimized versions |
| **V9** | Marketplace | Buy/sell templates, AI workflows, brand kits, prompt packs, voice presets, automation recipes |
| **V10** | Autonomous Marketing OS | "Grow my business" → researches trends, plans campaigns, writes/generates/publishes content, replies to comments, tracks analytics, and improves the next campaign. User mainly reviews and approves. |

Each version is additive — nothing in the V0 pipeline gets thrown away, later
versions layer new stages, providers, and surfaces on top of the same
stage-contract architecture described in `docs/architecture.md`.

Supporting docs: `docs/plan.md` (full product vision), `docs/features.md`
(feature backlog), `docs/monetization.md` (pricing tiers), `docs/api.md`,
`docs/database.md`, `docs/opensource.md` (candidate OSS stack per stage as
the roadmap progresses).

---

## Project Structure

```
app/            Next.js routes — (app) UI screens, api/ route handlers
components/     React UI components
pipeline/       Pipeline stages — each exports one (input) -> output function
lib/            Auth, DB, queue, storage, provider adapters, config
worker/         BullMQ worker process (runs pipeline jobs)
drizzle/        DB schema migrations
docs/           Architecture, product plan, and design docs
scripts/        Standalone dev scripts (run a stage, seed media, etc.)
```

See `CLAUDE.md` for architecture rules and the current V0 scope boundary.
