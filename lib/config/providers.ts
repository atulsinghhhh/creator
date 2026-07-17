import { z } from "zod";

/**
 * Provider configuration — THE single place provider choice is decided.
 * Swapping a provider (e.g. Groq → Claude) is: write a new adapter
 * implementing the same service interface, change the env value here.
 * Nothing in pipeline/orchestration code references providers directly.
 */
const providerConfigSchema = z.object({
  LLM_PROVIDER: z.enum(["groq"]).default("groq"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default("llama-3.3-70b-versatile"),

  VOICE_PROVIDER: z.enum(["kokoro"]).default("kokoro"),
  KOKORO_URL: z.string().default("http://localhost:8880"),
  KOKORO_VOICE: z.string().default("af_heart"),

  MODERATION_PROVIDER: z.enum(["stub"]).default("stub"),
  MEDIA_SEARCH_PROVIDER: z.enum(["stub"]).default("stub"),
  CAPTION_PROVIDER: z.enum(["stub"]).default("stub"),
  RENDERER_PROVIDER: z.enum(["stub"]).default("stub"),
  EXPORTER_PROVIDER: z.enum(["stub"]).default("stub"),

  STORAGE_PROVIDER: z.enum(["minio"]).default("minio"),
  MINIO_ENDPOINT: z.string().default("localhost"),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  MINIO_ACCESS_KEY: z.string().default("creator"),
  MINIO_SECRET_KEY: z.string().default("creator_dev_pw"),
  MINIO_BUCKET: z.string().default("creator-media"),
  /** Base URL assets are publicly reachable at (public-read dev bucket). */
  MINIO_PUBLIC_URL: z.string().default("http://localhost:9000"),
});

export type ProviderConfig = z.infer<typeof providerConfigSchema>;

let cached: ProviderConfig | undefined;

/** Parsed lazily so importing this module never crashes at build time. */
export function getProviderConfig(): ProviderConfig {
  if (!cached) {
    const parsed = providerConfigSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid provider config: ${parsed.error.message}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** Fails fast when the configured LLM provider needs a key that isn't set. */
export function requireGroqApiKey(config: ProviderConfig): string {
  if (!config.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required when LLM_PROVIDER=groq");
  }
  return config.GROQ_API_KEY;
}
