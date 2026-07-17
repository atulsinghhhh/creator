# CreatorOS — Architecture (V0)

This document is the technical detail behind `CLAUDE.md`. `CLAUDE.md` states the rules; this explains the *why* and the *how* so both you and Claude Code can reason about tradeoffs, not just follow constraints blindly.

---

## 1. System Overview

```
Client (web app)
   │
   ▼
API layer  ───────────────►  Database (User, Project, Generation, Asset, Credit, CreditTransaction)
   │                                          ▲
   ▼                                          │
Job Runner (sequential, in-process — no queue yet)       Webhook ──┘
   │
   ▼
Pipeline Stages
   │
   ├─► Moderation
   ├─► Planner
   ├─► Script Generator     ──► LLM provider (Groq)
   ├─► Voice Generator      ──► TTS provider (Kokoro)
   ├─► Media Search         ──► CLIP + Qdrant (local library)
   ├─► Caption Generator    ──► Groq Speech-to-Text (whisper-large-v3-turbo)
   ├─► Renderer             ──► Remotion (composition) + FFmpeg (export)
   └─► Exporter             ──► File storage (MinIO)
        │
        ▼
   billingService.chargeGeneration() ── only called on Generation.status = done

    aptions | Groq Speech-to-Text | faster-whisper (self-hosted) | | ✅ |
    | Media Search | OpenCLIP + Qdrant | ✅ |
    | Video Composition | Remotion | ✅ |
    | Video Encoding | FFmpeg | ✅ |
```

The client never talks to AI providers or Stripe directly. It talks to the API, which either enqueues/runs a job (returns a Project/Generation id for polling) or, for billing, redirects to Stripe Checkout and later receives a webhook.

---

## 2. Why Sequential Execution, Not a Queue, For Now

V0 runs pipeline stages sequentially in-process rather than through a real job queue (BullMQ). This is a deliberate simplification, not the final design:

- At V0 volume (validating demand, not scaling it), one generation at a time per request is enough
- It keeps `npm run stage` viable as a direct debugging tool — no queue infrastructure to stand up locally
- The stage contract (Section 3) is queue-agnostic by design, so introducing a real queue later means changing *how* stages get invoked, not changing the stages themselves

**When to revisit:** the moment concurrent generations start queueing up behind each other in a way users notice, or you need multiple worker processes. At that point, the same stage functions get wrapped by queue jobs instead of called directly — this should not require rewriting stage logic.

---

## 3. Pipeline Stage Contract

Every stage follows the same shape, regardless of what it does internally:

```
Input  →  Stage  →  Output
```

- A stage receives a well-defined input (e.g. Script Generator receives a "brief" object from the Planner)
- It does its work, calling whatever external provider it needs
- It returns a well-defined output (e.g. structured script JSON) or throws a typed failure
- It knows nothing about the stages before or after it — only its own input/output contract

**Why this matters:** it means you can swap providers, or add a new stage (e.g. a music-selection stage), without rewriting the rest of the pipeline. It also means each stage can be tested and run standalone via `npm run stage`.

---

## 4. Sequencing and Parallelism

```
Moderation → Planner → Script Generator ─┬─► Voice Generator ─► Caption Generator ─┐
                                          └─► Media Search ─────────────────────────┤
                                                                                     ▼
                                                                                 Renderer
                                                                                     │
                                                                                     ▼
                                                                                 Exporter
                                                                                     │
                                                                                     ▼
                                                                    billingService.chargeGeneration()
```

- **Voice Generator and Media Search both depend only on the Script** — run these concurrently, this is the biggest lever on total wait time.
- **Caption Generator depends on Voice Generator's audio output**, not on the script directly — captions are transcribed from the real audio (Whisper-style), which is more accurate than assuming the TTS engine read the script exactly as written. This was previously listed as an open decision; it is now resolved and reflected in the Data Flow table below.
- Renderer depends on Voice, Captions, and Media all being complete.
- Exporter depends only on Renderer.
- Billing charge happens strictly after Exporter succeeds and Generation status flips to `done` — never earlier (see Section 6).

---

## 5. Failure and Retry Strategy

Each step in the Generation's status independently tracks: `pending → running → done | failed`.

**On failure:**
- Retry the individual step automatically (2 automatic retries with backoff before surfacing as failed)
- Never re-run upstream steps that already succeeded
- Persist partial results — a failed Caption step should not discard the already-generated Script/Voice assets
- Surface the specific failed step to the user and in logs
- **A failed Generation must never reach `billingService.chargeGeneration()`.** This is enforced structurally: the charge call is the last line of the Exporter success path, not a separate step that could accidentally run regardless of upstream status.

**Cost tracking on retries:** log cost per attempt in `provider_calls`, not just per Generation, so a flaky provider's true cost impact is visible.

---

## 6. Billing Architecture

**Model:** prepaid credits, one credit consumed per successful Generation. See `CLAUDE.md` for the product-level rules; this section covers the mechanics.

```
User clicks "Buy Credits"
   │
   ▼
Stripe Checkout Session created (server-side)
   │
   ▼
User completes payment on Stripe-hosted page
   │
   ▼
Stripe sends webhook → POST /api/webhooks/stripe
   │
   ▼
Verify webhook signature
   │
   ▼
Create CreditTransaction (type=purchase, stripePaymentIntentId=...)
   │
   ▼
Increment Credit.balance
```

**Why the webhook, not the redirect, is the source of truth:** a client redirect back to your app after Stripe Checkout is not a trustworthy signal that payment succeeded (user could close the tab, network could fail, redirect URL could be hit without real payment). Only a verified webhook event confirms the charge. The post-payment redirect page should show a "processing" state and poll `Credit.balance`, not assume success itself.

**Consumption flow, tied into the pipeline:**

```
Generate button clicked
   │
   ▼
Check Credit.balance ≥ 1  ──── if false ──► block, route to purchase flow
   │ (true)
   ▼
Create Generation (creditsCharged=false)
   │
   ▼
Run pipeline (Section 4)
   │
   ▼
Exporter succeeds → Generation.status = done
   │
   ▼
billingService.chargeGeneration(generationId)
   │
   ├─ if Generation.creditsCharged === true → no-op (idempotency guard against double-charge on retry/webhook replay)
   ├─ else: create CreditTransaction (type=consumption, amount=-1, generationId), decrement Credit.balance, set creditsCharged=true
```

**Why balance-check-at-start but charge-at-completion:** checking balance upfront prevents starting a job you can't ultimately charge for (bad UX — don't let someone spend 90 seconds waiting only to be told they can't afford the result). Charging only on completion ensures failed generations never cost the user a credit. The gap between check and charge is why `creditsCharged` exists — without it, a scenario like "generation succeeds, charge fires, then a retry of a duplicate webhook or job replay fires again" would double-charge.

**Refunds:** V0 has no refund workflow. If the charge-on-completion logic above is implemented correctly, there is no code path where a failed generation gets charged — so there's nothing to refund. If you ever find yourself building a refund feature in V0, treat it as a signal that the completion/charge logic has a bug, not as a legitimate feature to ship.

---

## 7. Preview Architecture

Preview is a read screen, not a generation trigger. It reads a single completed `Generation` row and renders it — no new pipeline logic here.

```
GET /api/generations/:id
   │
   ▼
Return: { videoUrl, script, subtitleUrl, status, duration }
```

- If `status !== 'done'`, the client should already be on the Processing screen, not Preview — Preview assumes a completed Generation. Guard against direct navigation to a Preview URL for an incomplete Generation (redirect to Processing, which itself polls status).
- Regenerate button behavior: it does not modify the existing Generation. It creates a **new** Generation for the same Project (same prompt/platform/duration, or a new prompt if the user edited it — confirm which before building) and re-runs the full pipeline, including a fresh credit check.
- Download simply serves `videoUrl` directly (it's already a public/signed MinIO URL) — no separate download-preparation step needed in V0.

---

## 8. Data Flow Detail

| Stage | Reads | Writes |
|---|---|---|
| Moderation | Project.prompt | pass/fail flag (blocks job if unsafe) |
| Planner | Project.prompt, Project.platform, Project.duration | structured brief (in-memory / passed to next stage) |
| Script Generator | brief | Generation.script |
| Voice Generator | Generation.script | Generation.voiceUrl → Asset(type=voice) |
| Media Search | Generation.script (keywords/topics extracted) | Asset(type=stock-visual) × N |
| Caption Generator | Generation.voiceUrl | Generation.subtitleUrl → Asset(type=caption) |
| Renderer | voiceUrl, subtitleUrl, visual Assets | draft video file |
| Exporter | rendered draft | Generation.videoUrl → Asset(type=final-video), Generation.status=done |
| Billing charge | Generation.status, Generation.creditsCharged | CreditTransaction row, Credit.balance, Generation.creditsCharged=true |

Every asset produced along the way is persisted as its own `Asset` row, not just the final video — gives you debuggability and future reusability (e.g. a later "regenerate just the voice" feature becomes possible because intermediate assets already exist).

---

## 9. What This Architecture Deliberately Defers

To keep V0 buildable in weeks:

- **No real job queue.** See Section 2.
- **No provider abstraction layer beyond the stage contract.** Don't build a plugin system — just keep provider specifics inside their own adapter, per the pattern already used for Groq/Kokoro/MinIO.
- **No caching/reuse of intermediate assets across Generations.** Every regenerate reruns the full pipeline and consumes a fresh credit.
- **No subscription billing, metered pricing, or refund automation.** Flat one-credit-per-generation only (Section 6).

---

## 10. Resolved Decisions (previously open)

- ~~Whether captions come from transcribing the voice track or from script timing~~ → **Resolved: transcribed from voice audio.** Reflected in Sections 4 and 8.
- ~~Retry count and backoff strategy~~ → **Resolved: 2 automatic retries with backoff** (Section 5).

## Still Open

- Exact job queue/runner choice — deferred, not urgent (Section 2)
- Where rendered video files live during processing vs. after export (temp storage vs. permanent MinIO path)
- Signup credit grant amount (product decision — see `CLAUDE.md` Billing section)
- Whether "Regenerate" reuses the original prompt verbatim or allows the user to edit it first (Section 7)