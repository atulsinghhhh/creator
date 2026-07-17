import { contentBriefSchema, type ContentBrief } from "@/schemas/planner";
import type { PlannerInput, PlannerService } from "@/lib/services/types";
import type { GroqJsonClient } from "./client";

const SYSTEM_PROMPT = `You are a short-form video content strategist. Given a user's video idea, produce a content brief for a single vertical short video as a JSON object with EXACTLY this shape:

{
  "title": string,               // catchy working title, <= 60 chars
  "hook": string,                // the first-2-seconds attention hook, spoken aloud
  "tone": string,                // e.g. "energetic", "calm and informative"
  "audience": string,            // who this video is for
  "targetDurationSeconds": number,
  "cta": string,                 // closing call to action, spoken aloud
  "scenes": [
    {
      "index": number,           // 0-based, sequential
      "purpose": string,         // e.g. "hook", "point 1", "cta"
      "summary": string,         // 1-2 sentences of what this scene covers
      "keywords": [string]       // 2-4 stock-footage search keywords for this scene
    }
  ]
}

Rules:
- 3 to 6 scenes; scene 0 is always the hook, the last scene always delivers the CTA.
- Scene summaries must together fit the target duration when spoken.
- keywords must be concrete and visual (things a stock-video search can match), never abstract.
- Respond with ONLY the JSON object, no markdown, no commentary.`;

/** Groq-backed PlannerService. Swappable: implement PlannerService with another provider and change LLM_PROVIDER. */
export class GroqPlanner implements PlannerService {
  constructor(private client: GroqJsonClient) {}

  async generateBrief(input: PlannerInput): Promise<{ brief: ContentBrief; costUsd: number }> {
    const user = [
      `Video idea: ${input.prompt}`,
      `Platform: ${input.platform}`,
      `Target duration: ${input.targetDurationSeconds} seconds — set targetDurationSeconds to exactly this value.`,
    ].join("\n");

    const { data, costUsd } = await this.client.complete({
      step: "planner",
      generationId: input.generationId,
      system: SYSTEM_PROMPT,
      user,
      schema: contentBriefSchema,
    });
    return { brief: data, costUsd };
  }
}
