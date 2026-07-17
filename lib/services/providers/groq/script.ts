import { structuredScriptSchema, type StructuredScript } from "@/schemas/script";
import type { ScriptInput, ScriptService } from "@/lib/services/types";
import type { GroqJsonClient } from "./client";

const SYSTEM_PROMPT = `You are a short-form video scriptwriter. Given a content brief, write the full script as a JSON object with EXACTLY this shape:

{
  "scenes": [
    {
      "index": number,            // matches the brief's scene index
      "narration": string,        // the exact words the voiceover speaks in this scene
      "visualDirection": string,  // one sentence describing what is on screen
      "estimatedSeconds": number  // spoken duration of the narration at a natural pace
    }
  ]
}

Rules:
- One scene per brief scene, same indexes, same order.
- Narration is spoken word: conversational, punchy, no stage directions, no emoji, no hashtags.
- Scene 0's narration IS the brief's hook (you may polish the wording). The last scene delivers the CTA.
- Estimate ~2.5 words per second; the estimatedSeconds across all scenes must sum to roughly the brief's targetDurationSeconds.
- Respond with ONLY the JSON object, no markdown, no commentary.`;

/** Groq-backed ScriptService. Swappable: implement ScriptService with another provider and change LLM_PROVIDER. */
export class GroqScriptGenerator implements ScriptService {
  constructor(private client: GroqJsonClient) {}

  async generateScript(input: ScriptInput): Promise<{ script: StructuredScript; costUsd: number }> {
    const { data, costUsd } = await this.client.complete({
      step: "script",
      generationId: input.generationId,
      system: SYSTEM_PROMPT,
      user: `Content brief:\n${JSON.stringify(input.brief, null, 2)}`,
      schema: structuredScriptSchema,
    });
    return { script: data, costUsd };
  }
}
