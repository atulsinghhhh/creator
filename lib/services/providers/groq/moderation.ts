import Groq from "groq-sdk";
import { logProviderCall } from "@/lib/services/call-log";
import type { ModerationInput, ModerationResult, ModerationService } from "@/lib/services/types";

/** USD per 1M tokens (input, output) — https://groq.com/pricing. */
const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  "openai/gpt-oss-safeguard-20b": { input: 0.1, output: 0.5 },
};

/**
 * The V0 content policy the safety model classifies against. Video prompts
 * are short-form content ideas; anything on this list fails moderation and
 * the generation stops before any provider spend.
 */
const POLICY = `You are a content moderation classifier for a short-video generation platform. Classify the user's video prompt against this policy.

DENY a prompt if it requests or promotes any of:
- violence, weapons manufacture, or instructions for causing physical harm (professional or regulated sporting competition — MMA, boxing, wrestling, martial arts — is NOT violence under this policy; deny it only if the prompt glorifies real-world harm outside the sport or dwells on graphic gore)
- illegal activity (drugs, fraud, hacking, theft)
- sexual content or nudity
- child exploitation of any kind
- hate, harassment, or demeaning content targeting a protected group
- self-harm or suicide encouragement
- medical, legal, or financial advice presented as professional counsel
- targeted disinformation or election manipulation
- doxxing or exposing private personal information

ALLOW everything else, including edgy-but-harmless topics, opinions, criticism, educational content about sensitive subjects, and sports coverage (fights, matches, rivalries between athletes).

Respond with ONLY a JSON object: {"verdict": "allow" | "deny", "category": "<short reason, only when denying>"}`;

/**
 * Groq-hosted safety-classifier ModerationService (gpt-oss-safeguard) —
 * screens the user's raw prompt before any generation spend. Unparseable
 * verdicts are treated as deny (fail closed — a moderation step that fails
 * open isn't one).
 */
export class GroqModeration implements ModerationService {
  private groq: Groq;

  constructor(
    apiKey: string,
    private model: string
  ) {
    this.groq = new Groq({ apiKey });
  }

  async moderate(input: ModerationInput): Promise<ModerationResult> {
    const started = Date.now();
    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: POLICY },
          { role: "user", content: `Video prompt to classify: ${input.prompt}` },
        ],
        temperature: 0,
      });

      const promptTokens = completion.usage?.prompt_tokens ?? 0;
      const completionTokens = completion.usage?.completion_tokens ?? 0;
      const pricing = PRICING_PER_MILLION[this.model];
      const costUsd = pricing
        ? (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000
        : 0;

      const raw = (completion.choices[0]?.message?.content ?? "").trim();
      let allowed = false;
      let reason: string | undefined = "moderation verdict unreadable";
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(match ? match[0] : raw) as {
          verdict?: string;
          category?: string;
        };
        allowed = parsed.verdict === "allow";
        reason = allowed ? undefined : (parsed.category ?? "flagged by moderation");
      } catch {
        // fall through with the fail-closed default
      }

      await logProviderCall({
        generationId: input.generationId,
        step: "moderation",
        provider: "groq",
        model: this.model,
        promptTokens,
        completionTokens,
        costUsd,
        latencyMs: Date.now() - started,
        success: true,
        attempt: 1,
      });

      return { allowed, reason, costUsd };
    } catch (err) {
      await logProviderCall({
        generationId: input.generationId,
        step: "moderation",
        provider: "groq",
        model: this.model,
        costUsd: 0,
        latencyMs: Date.now() - started,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        attempt: 1,
      });
      throw err;
    }
  }
}
