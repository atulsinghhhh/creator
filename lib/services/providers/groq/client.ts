import Groq from "groq-sdk";
import type { z } from "zod";
import { logProviderCall } from "@/lib/services/call-log";
import type { PipelineStep } from "@/pipeline/types";

/**
 * USD per 1M tokens (input, output). Keep in sync with
 * https://groq.com/pricing when changing GROQ_MODEL.
 */
const PRICING_PER_MILLION: Record<string, { input: number; output: number }> = {
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
};

function costFor(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_PER_MILLION[model];
  if (!pricing) {
    console.warn(`[groq] no pricing entry for model "${model}" — recording cost as $0`);
    return 0;
  }
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1_000_000;
}

export class GroqInvalidOutputError extends Error {}

export interface GroqJsonRequest<Schema extends z.ZodType> {
  step: PipelineStep;
  generationId: string;
  system: string;
  user: string;
  schema: Schema;
}

/**
 * Shared Groq chat-completion helper: JSON mode, zod-validated output,
 * up to 2 retries when the model returns invalid JSON (the validation error
 * is fed back into the retry), and one provider_calls log row per attempt.
 */
export class GroqJsonClient {
  private groq: Groq;

  constructor(
    apiKey: string,
    private model: string
  ) {
    this.groq = new Groq({ apiKey });
  }

  async complete<Schema extends z.ZodType>(
    request: GroqJsonRequest<Schema>
  ): Promise<{ data: z.infer<Schema>; costUsd: number }> {
    const maxAttempts = 3; // 1 initial + 2 retries on invalid JSON
    let totalCostUsd = 0;
    let lastValidationError = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const started = Date.now();
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ];
      if (lastValidationError) {
        messages.push({
          role: "user",
          content: `Your previous response was invalid: ${lastValidationError}. Respond again with ONLY the corrected JSON object.`,
        });
      }

      let completion: Groq.Chat.ChatCompletion;
      try {
        completion = await this.groq.chat.completions.create({
          model: this.model,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.7,
        });
      } catch (err) {
        await logProviderCall({
          generationId: request.generationId,
          step: request.step,
          provider: "groq",
          model: this.model,
          costUsd: 0,
          latencyMs: Date.now() - started,
          success: false,
          error: err instanceof Error ? err.message : String(err),
          attempt,
        });
        throw err;
      }

      const promptTokens = completion.usage?.prompt_tokens ?? 0;
      const completionTokens = completion.usage?.completion_tokens ?? 0;
      const costUsd = costFor(this.model, promptTokens, completionTokens);
      totalCostUsd += costUsd;

      const raw = completion.choices[0]?.message?.content ?? "";
      let parsed: z.ZodSafeParseResult<z.infer<Schema>>;
      try {
        parsed = request.schema.safeParse(JSON.parse(raw));
      } catch (err) {
        parsed = {
          success: false,
          error: { message: err instanceof Error ? err.message : String(err) },
        } as z.ZodSafeParseError<z.infer<Schema>>;
      }

      await logProviderCall({
        generationId: request.generationId,
        step: request.step,
        provider: "groq",
        model: this.model,
        promptTokens,
        completionTokens,
        costUsd,
        latencyMs: Date.now() - started,
        success: parsed.success,
        error: parsed.success ? undefined : `invalid output: ${parsed.error.message}`.slice(0, 500),
        attempt,
      });

      if (parsed.success) return { data: parsed.data, costUsd: totalCostUsd };
      lastValidationError = String(parsed.error.message).slice(0, 800);
    }

    throw new GroqInvalidOutputError(
      `Groq returned invalid ${request.step} output after ${maxAttempts} attempts: ${lastValidationError.slice(0, 300)}`
    );
  }
}
