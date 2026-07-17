import type { ContentBrief } from "@/schemas/planner";
import type { StructuredScript } from "@/schemas/script";

/**
 * Service interfaces for every AI-backed pipeline capability. Pipeline stages
 * and orchestration code depend ONLY on these types — never on a concrete
 * provider class. Providers are adapters resolved once from config in
 * `lib/services/index.ts`.
 */

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export interface UploadResult {
  key: string;
  /** Stable, publicly reachable URL (dev bucket is public-read). */
  url: string;
}

export interface StorageService {
  upload(key: string, body: Buffer, contentType: string): Promise<UploadResult>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export interface PlannerInput {
  prompt: string;
  platform: string;
  targetDurationSeconds: number;
  /** For per-call cost/latency attribution — adapters log against this. */
  generationId: string;
}

export interface PlannerService {
  generateBrief(input: PlannerInput): Promise<{ brief: ContentBrief; costUsd: number }>;
}

// ---------------------------------------------------------------------------
// Script
// ---------------------------------------------------------------------------

export interface ScriptInput {
  brief: ContentBrief;
  generationId: string;
}

export interface ScriptService {
  generateScript(input: ScriptInput): Promise<{ script: StructuredScript; costUsd: number }>;
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

export interface VoiceSceneInput {
  index: number;
  narration: string;
}

export interface SceneAudio {
  sceneIndex: number;
  url: string;
  durationSeconds: number;
}

export interface VoiceInput {
  scenes: VoiceSceneInput[];
  generationId: string;
}

export interface VoiceOutputResult {
  sceneAudios: SceneAudio[];
  /** 0 for self-hosted providers (Kokoro) — still reported so the contract is uniform. */
  costUsd: number;
}

export interface VoiceService {
  generateSceneAudio(input: VoiceInput): Promise<VoiceOutputResult>;
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

export interface ModerationInput {
  prompt: string;
  generationId: string;
}

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  costUsd: number;
}

export interface ModerationService {
  moderate(input: ModerationInput): Promise<ModerationResult>;
}

// ---------------------------------------------------------------------------
// Media search
// ---------------------------------------------------------------------------

export interface MediaSearchSceneInput {
  index: number;
  /** What to search stock footage for — built from the script's visualDirection + brief keywords. */
  visualQuery: string;
}

export interface MediaClip {
  sceneIndex: number;
  url: string;
  /** Which provider supplied the clip (e.g. "pexels", "stub") — persisted on Asset.source. */
  source: string;
  durationSeconds?: number;
}

export interface MediaSearchInput {
  scenes: MediaSearchSceneInput[];
  platform: string;
  generationId: string;
}

export interface MediaSearchResult {
  clips: MediaClip[];
  costUsd: number;
}

export interface MediaSearchService {
  findVisuals(input: MediaSearchInput): Promise<MediaSearchResult>;
}

// ---------------------------------------------------------------------------
// Captions
// ---------------------------------------------------------------------------

export interface CaptionWord {
  word: string;
  /** Seconds relative to the start of the word's own scene audio. */
  startSeconds: number;
  endSeconds: number;
  sceneIndex: number;
}

export interface CaptionInput {
  /** Real audio in, word-level timings out — captions are transcribed, never derived from script text. */
  sceneAudios: SceneAudio[];
  generationId: string;
}

export interface CaptionResult {
  words: CaptionWord[];
  /** Uploaded caption file (via StorageService) — persisted as Generation.subtitleUrl. VTT for real providers. */
  subtitleUrl: string;
  /** Extra formats when the provider produces them (persisted in the caption Asset's metadata). */
  srtUrl?: string;
  wordsJsonUrl?: string;
  costUsd: number;
}

export interface CaptionService {
  generateCaptions(input: CaptionInput): Promise<CaptionResult>;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export interface RendererInput {
  scenes: { index: number; narration: string }[];
  sceneAudios: SceneAudio[];
  words: CaptionWord[];
  clips: MediaClip[];
  platform: string;
  generationId: string;
}

export interface RendererResult {
  /** Local temp file — the Exporter uploads it. Never persist this path to the DB. */
  draftVideoPath: string;
  durationSeconds: number;
  costUsd: number;
}

export interface RendererService {
  render(input: RendererInput): Promise<RendererResult>;
}

// ---------------------------------------------------------------------------
// Exporter
// ---------------------------------------------------------------------------

export interface ExporterInput {
  draftVideoPath: string;
  platform: string;
  generationId: string;
}

export interface ExporterResult {
  /** Final downloadable URL (uploaded via StorageService). */
  videoUrl: string;
  costUsd: number;
}

export interface ExporterService {
  export(input: ExporterInput): Promise<ExporterResult>;
}
