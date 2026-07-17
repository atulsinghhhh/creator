import { z } from "zod";

/**
 * Structured Script — the Script Generator's output contract. One entry per
 * scene from the Content Brief; narration is what Voice speaks,
 * visualDirection is what Media Search matches against.
 */
export const scriptSceneSchema = z.object({
  index: z.number().int().min(0),
  narration: z.string().min(1),
  visualDirection: z.string().min(1),
  estimatedSeconds: z.number().positive(),
});

export const structuredScriptSchema = z.object({
  scenes: z.array(scriptSceneSchema).min(1),
});

export type ScriptScene = z.infer<typeof scriptSceneSchema>;
export type StructuredScript = z.infer<typeof structuredScriptSchema>;
