# CreatorOS

AI Content Operating System. One prompt in → one publishable short video out.

## Current Phase: V0

Goal: prove a single prompt reliably produces one good short video. Nothing more.

**Do NOT implement, even if it seems easy or related:**
- Video editing / trim / re-timing after generation
- Publishing or scheduling to any platform
- A timeline or manual editing surface
- Multiple voices, brand kits, or templates
- Team/collaboration features
- Analytics or performance tracking
- Partial "regenerate just this section" — V0 only supports full regeneration
- Subscriptions/plans, refunds, invoicing — V0 billing is credits-only (see Billing section)

If a request implies any of the above, stop and flag it rather than building it. These are real features planned for V1+, just not now.

## User Flow (5 screens, no branches)

```
Dashboard → New Project → Processing → Preview → Download
```

Billing (Credits) is not a screen in this flow — it's a persistent balance shown in the Dashboard and enforced at generation-start, not a separate step users walk through.

## Stack

- Backend: Next.js 16 (API routes)
- Database: PostgreSQL + Drizzle ORM
- Job execution: BullMQ + Redis (`lib/queue/*`, worker in `worker/index.ts`). One queue job per Generation; within it the orchestrator executes the pipeline dependency graph (`pipeline/registry.ts`) with real parallelism — voice ∥ media run concurrently, captions waits for voice. Per-step retries: 2 automatic with backoff (except `NonRetryableStageError`, e.g. moderation rejection). `npm run stage` runs stages sequentially in-process for debugging.
- Frontend: React 19 + Tailwind CSS
- Script generation: Groq (`llama-3.3-70b-versatile`) via `GroqPlanner`/`GroqScriptGenerator` — temporary, behind `PlannerService`/`ScriptService` interfaces
- Voice generation: Kokoro (self-hosted, docker compose) via `KokoroVoiceService` — behind `VoiceService`
- Captions: stub adapter live (`StubCaptions` — fake word timings over real audio durations); Groq STT MVP below is the next real implementation
- ### MediaSearchService

Status: Not yet implemented.

Implementation requirements:

- Use OpenCLIP embeddings.
- Store embeddings in Qdrant.
- Support semantic search over local media assets.
- Implement under `lib/services/media/`.
- All search logic must go through the `MediaSearchService` interface.
- ### RenderService

Status: Not yet implemented.

Implementation requirements:

- Use Remotion for composition.
- Use FFmpeg for encoding/export.
- Implement under `lib/services/render/`.
### CaptionService

Status: MVP implementation.

Implementation:

- Use Groq Speech-to-Text API for transcription.
- Generate timestamped transcripts.
- Produce SRT, VTT, and JSON outputs.
- Implementation location: `lib/services/captions/groq.ts`.
- All caption generation must go through the `CaptionService` interface.

Future:
- Replace Groq with a self-hosted engine (e.g. faster-whisper) without changing callers.
- Rendering must occur only through the `RenderService` interface.
- Auth: Auth.js v5 (credentials + Google OAuth)
- File storage: MinIO (S3-compatible, docker compose) via `MinIOStorageService` — behind `StorageService`
- Payments: Stripe (Checkout for credit purchases, webhooks for fulfillment) — **not yet implemented, see Billing section**

Provider wiring: interfaces in `lib/services/types.ts`, adapters in `lib/services/providers/`, resolved once from env in `lib/services/index.ts` (config: `lib/config/providers.ts`). Every external call is logged to `provider_calls` (model, tokens, cost, latency, success — one row per attempt).

Current adapter status: Moderation/Media Search/Captions/Renderer/Exporter all run as `stub` adapters (`lib/services/providers/stub/`, config `*_PROVIDER=stub`) — correctly shaped fake output, wired as real pipeline steps with Asset/Generation persistence. The spec blocks above (OpenCLIP+Qdrant, Remotion+FFmpeg, Groq STT) describe their planned real implementations; each replaces its stub behind the same interface + one config change.

## Architecture Rules

1. **Video generation is a multi-step job, never a single function call.** Steps: Moderation → Planner → Script Generator → Voice Generator → Media Search → Caption Generator → Renderer → Exporter.
2. **Every step is independently retryable** and tracks its own status (pending / running / done / failed). The Processing screen reads this status directly — it does not simulate progress.
3. **Steps are independent of each other's internals.** Each takes a defined input, produces a defined output. This is what makes providers swappable later without touching the rest of the pipeline.
4. **Generation is a separate entity from Project — never collapse them.** A Project can have multiple Generations over time (every regenerate creates a new one). Never overwrite a Generation in place.
5. **Media Search runs in parallel with Voice Generation** once Script is done — both depend only on the script, not on each other. **Caption Generator depends on Voice output** (captions are transcribed from the real audio via Whisper, not derived from script text) — this is a resolved decision, not open.
6. **Track cost per Generation from day one**, at per-provider-call granularity (see `provider_calls`). This number determines pricing later; don't bolt it on after the fact.
7. **Credits are debited only on successful completion of a Generation**, not on job start — a failed/abandoned job must not consume a user's credit. See Billing section for the full rule set.

## Data Model

**Project**
- id
- title
- prompt (preserve original input, never overwrite)
- status: draft / processing / done / failed
- platform: instagram / tiktok / youtube_shorts
- createdAt

**Generation** (one Project → many Generations)
- projectId
- script
- voiceUrl
- subtitleUrl
- videoUrl
- duration (actual output, not requested)
- cost
- status (mirrors job step state: moderation / planning / scripting / voice / media / captions / rendering / exporting / done / failed)
- creditsCharged (boolean — has this generation already debited a credit)

**Asset**
- type: voice / caption / stock-visual / final-video
- url
- source (which provider — needed for debugging/swapping providers)
- metadata (flexible, stage-specific)

**Credit** (new — see Billing)
- userId
- balance
- updatedAt

**CreditTransaction** (new — see Billing)
- userId
- generationId (nullable — null for purchases, set for consumption)
- type: purchase / consumption / refund / grant (e.g. signup bonus)
- amount (positive for purchase/refund/grant, negative for consumption)
- stripePaymentIntentId (nullable, only for purchases)
- createdAt

See `ARCHITECTURE.md` for full pipeline, preview, and billing detail.

## Preview

The Preview screen is read-only in V0 — no editing controls beyond Regenerate (which starts a brand-new Generation, full pipeline rerun).

**What it displays**, all sourced from the completed Generation record:
- `videoUrl` — playable video
- `script` — full script text
- `subtitleUrl` — captions, rendered as toggleable overlay or separate panel
- Download button — direct link to `videoUrl`
- Regenerate button — only enabled if the user has ≥1 credit; if not, route to the credit purchase flow instead of silently failing

**Do not build:** trim/edit controls, per-scene regenerate, script editing, voice swapping. All of these are later-version features (see the "Do NOT implement" list above).

## Billing (Credits — V0 model)

V0 billing is intentionally the simplest model that works: **users buy credit packs, each successful video generation consumes exactly one credit.**

**Explicitly out of scope for V0 billing:**
- Subscriptions / recurring plans
- Usage-based/metered pricing (e.g. charging differently for 30s vs 60s videos)
- Refund automation beyond the failure-triggers-refund rule below
- Invoicing, tax handling, multi-currency

**Rules:**
- New users receive a small starting grant (e.g. 3 free credits) recorded as a `CreditTransaction` of type `grant` — exact number is a product decision, not an engineering one, confirm before hardcoding.
- Purchasing credits goes through Stripe Checkout; a webhook on successful payment creates a `purchase` transaction and increments `Credit.balance`. Do not increment balance from the client-side redirect — only the webhook is trusted.
- A credit is checked (balance ≥ 1) before a Generation is allowed to start, but only **debited when the Generation reaches `done` status.** If a Generation fails at any pipeline stage, no credit is consumed — this is why `creditsCharged` exists on Generation, to prevent double-charging on retries of the same generation.
- If a Generation fails after a credit was already (incorrectly) charged, that's a bug — the fix is correctness in the charge-on-completion logic, not a refund workflow. Don't build a refund UI for this in V0; it shouldn't be reachable if the rule above is implemented correctly.
- `Credit.balance` is the fast-read source of truth for gating actions (Dashboard display, Generate button state); `CreditTransaction` is the audit log. Never compute balance by summing transactions on every read — maintain the running `balance` field and let transactions be the historical record.

## Conventions

- Pipeline stages live in `/pipeline/[stage-name]`, each exporting one function: `(input) -> output`
- API routes in `/api`
- No stage should import or depend on another stage's internals — only its documented input/output shape
- Billing logic lives in `/lib/billing/` — Stripe webhook handler, credit debit/grant functions. Pipeline code calls a single `billingService.chargeGeneration(generationId)` function; it must not touch Stripe or the Credit table directly.

## Commands

- Dev server: `npm run dev`
- Run tests: `___`
- Run a single pipeline stage standalone: `npm run stage <planner|script|voice|captions|media|render> [-- --prompt "..." --platform tiktok]` (runs upstream stages first; real providers, no DB writes)
- DB migrate: `npm run db:migrate` (generate first with `npm run db:generate`)
- Stripe webhook (local dev): `___` (fill in once Stripe CLI forwarding is set up)

## Known Gotchas

*(add these as you hit them — this section compounds in value over time)*

-