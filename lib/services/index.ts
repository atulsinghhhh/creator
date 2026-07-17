import { getProviderConfig, requireGroqApiKey } from "@/lib/config/providers";
import { GroqJsonClient } from "./providers/groq/client";
import { GroqModeration } from "./providers/groq/moderation";
import { GroqPlanner } from "./providers/groq/planner";
import { GroqScriptGenerator } from "./providers/groq/script";
import { GroqCaptionService } from "./captions/groq";
import { ClipMediaSearchService } from "./media/clip-media-search";
import { FFmpegExporter } from "./render/ffmpeg-exporter";
import { RemotionRenderService } from "./render/remotion-renderer";
import { KokoroVoiceService } from "./providers/kokoro-voice";
import { MinIOStorageService } from "./providers/minio-storage";
import { StubCaptions } from "./providers/stub/captions";
import { StubExporter } from "./providers/stub/exporter";
import { StubMediaSearch } from "./providers/stub/media-search";
import { StubModeration } from "./providers/stub/moderation";
import { StubRenderer } from "./providers/stub/renderer";
import type {
  CaptionService,
  ExporterService,
  MediaSearchService,
  ModerationService,
  PlannerService,
  RendererService,
  ScriptService,
  StorageService,
  VoiceService,
} from "./types";

/**
 * Provider resolution — the ONLY file that may import concrete provider
 * classes. Each service is resolved once from config into its interface;
 * everything else in the codebase calls `getXService()` and stays
 * provider-agnostic.
 */

let storage: StorageService | undefined;
let planner: PlannerService | undefined;
let script: ScriptService | undefined;
let voice: VoiceService | undefined;
let groqClient: GroqJsonClient | undefined;

function getGroqClient(): GroqJsonClient {
  if (!groqClient) {
    const config = getProviderConfig();
    groqClient = new GroqJsonClient(requireGroqApiKey(config), config.GROQ_MODEL);
  }
  return groqClient;
}

/** Model the configured LLM provider is using — recorded on jobs rows. */
export function getLlmModel(): string {
  return getProviderConfig().GROQ_MODEL;
}

/** Name of the configured LLM provider — recorded on jobs/asset rows. */
export function getLlmProviderName(): string {
  return getProviderConfig().LLM_PROVIDER;
}

export function getStorageService(): StorageService {
  if (!storage) {
    const config = getProviderConfig();
    switch (config.STORAGE_PROVIDER) {
      case "minio":
        storage = new MinIOStorageService(config);
        break;
      default:
        throw new Error(`Unknown STORAGE_PROVIDER: ${config.STORAGE_PROVIDER}`);
    }
  }
  return storage;
}

/**
 * One-time storage init (bucket creation + public-read policy). Called at
 * worker boot; provider-specific setup stays out of the StorageService
 * interface itself.
 */
export async function ensureStorageReady(): Promise<void> {
  const service = getStorageService();
  if (service instanceof MinIOStorageService) {
    await service.ensureBucket();
  }
}

export function getPlannerService(): PlannerService {
  if (!planner) {
    const config = getProviderConfig();
    switch (config.LLM_PROVIDER) {
      case "groq":
        planner = new GroqPlanner(getGroqClient());
        break;
      default:
        throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
    }
  }
  return planner;
}

export function getScriptService(): ScriptService {
  if (!script) {
    const config = getProviderConfig();
    switch (config.LLM_PROVIDER) {
      case "groq":
        script = new GroqScriptGenerator(getGroqClient());
        break;
      default:
        throw new Error(`Unknown LLM_PROVIDER: ${config.LLM_PROVIDER}`);
    }
  }
  return script;
}

export function getVoiceService(): VoiceService {
  if (!voice) {
    const config = getProviderConfig();
    switch (config.VOICE_PROVIDER) {
      case "kokoro":
        voice = new KokoroVoiceService(config, getStorageService());
        break;
      default:
        throw new Error(`Unknown VOICE_PROVIDER: ${config.VOICE_PROVIDER}`);
    }
  }
  return voice;
}

let moderation: ModerationService | undefined;
let mediaSearch: MediaSearchService | undefined;
let captions: CaptionService | undefined;
let renderer: RendererService | undefined;
let exporter: ExporterService | undefined;

export function getModerationService(): ModerationService {
  if (!moderation) {
    const config = getProviderConfig();
    switch (config.MODERATION_PROVIDER) {
      case "groq":
        moderation = new GroqModeration(requireGroqApiKey(config), config.GROQ_MODERATION_MODEL);
        break;
      case "stub":
        moderation = new StubModeration();
        break;
      default:
        throw new Error(`Unknown MODERATION_PROVIDER: ${config.MODERATION_PROVIDER}`);
    }
  }
  return moderation;
}

export function getMediaSearchService(): MediaSearchService {
  if (!mediaSearch) {
    const config = getProviderConfig();
    switch (config.MEDIA_SEARCH_PROVIDER) {
      case "clip":
        mediaSearch = new ClipMediaSearchService(config);
        break;
      case "stub":
        mediaSearch = new StubMediaSearch();
        break;
      default:
        throw new Error(`Unknown MEDIA_SEARCH_PROVIDER: ${config.MEDIA_SEARCH_PROVIDER}`);
    }
  }
  return mediaSearch;
}

export function getCaptionService(): CaptionService {
  if (!captions) {
    const config = getProviderConfig();
    switch (config.CAPTION_PROVIDER) {
      case "groq":
        captions = new GroqCaptionService(
          requireGroqApiKey(config),
          config.GROQ_STT_MODEL,
          getStorageService()
        );
        break;
      case "stub":
        captions = new StubCaptions(getStorageService());
        break;
      default:
        throw new Error(`Unknown CAPTION_PROVIDER: ${config.CAPTION_PROVIDER}`);
    }
  }
  return captions;
}

export function getRendererService(): RendererService {
  if (!renderer) {
    const config = getProviderConfig();
    switch (config.RENDERER_PROVIDER) {
      case "remotion":
        renderer = new RemotionRenderService();
        break;
      case "stub":
        renderer = new StubRenderer();
        break;
      default:
        throw new Error(`Unknown RENDERER_PROVIDER: ${config.RENDERER_PROVIDER}`);
    }
  }
  return renderer;
}

export function getExporterService(): ExporterService {
  if (!exporter) {
    const config = getProviderConfig();
    switch (config.EXPORTER_PROVIDER) {
      case "ffmpeg":
        exporter = new FFmpegExporter(getStorageService());
        break;
      case "stub":
        exporter = new StubExporter(getStorageService());
        break;
      default:
        throw new Error(`Unknown EXPORTER_PROVIDER: ${config.EXPORTER_PROVIDER}`);
    }
  }
  return exporter;
}
