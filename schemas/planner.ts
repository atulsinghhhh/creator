import { z } from "zod";

/**
 * Content Brief — the Planner's output contract. This is what the LLM must
 * return (validated, with retries) and what the Script stage consumes. The
 * schema is the contract; any LLM provider must produce exactly this shape.
 */
export const briefSceneSchema = z.object({
  index: z.number().int().min(0),
  purpose: z.string().min(1),
  summary: z.string().min(1),
  keywords: z.array(z.string().min(1)).min(1),
});

export const contentBriefSchema = z.object({
  title: z.string().min(1),
  hook: z.string().min(1),
  tone: z.string().min(1),
  audience: z.string().min(1),
  targetDurationSeconds: z.number().positive(),
  cta: z.string().min(1),
  scenes: z.array(briefSceneSchema).min(1),
});

export type BriefScene = z.infer<typeof briefSceneSchema>;
export type ContentBrief = z.infer<typeof contentBriefSchema>;
