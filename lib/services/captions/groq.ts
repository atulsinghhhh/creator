import Groq, { toFile } from "groq-sdk";
import { logProviderCall } from "@/lib/services/call-log";
import type {
  CaptionInput,
  CaptionResult,
  CaptionService,
  CaptionWord,
  SceneAudio,
  StorageService,
} from "@/lib/services/types";

/**
 * USD per audio-hour. Keep in sync with https://groq.com/pricing when
 * changing GROQ_STT_MODEL.
 */
const STT_PRICING_PER_HOUR: Record<string, number> = {
  "whisper-large-v3-turbo": 0.04,
  "whisper-large-v3": 0.111,
};

interface GroqWord {
  word: string;
  start: number;
  end: number;
}

/**
 * Groq Speech-to-Text CaptionService (MVP). Transcribes each scene's real
 * audio (never the script text) into word-level timestamps, then uploads
 * JSON, SRT, and VTT via the injected StorageService. Future: swap for a
 * self-hosted engine (e.g. faster-whisper) behind this same interface.
 */
export class GroqCaptionService implements CaptionService {
  private groq: Groq;

  constructor(
    apiKey: string,
    private model: string,
    private storage: StorageService
  ) {
    this.groq = new Groq({ apiKey });
  }

  async generateCaptions(input: CaptionInput): Promise<CaptionResult> {
    const words: CaptionWord[] = [];
    let costUsd = 0;

    const ordered = [...input.sceneAudios].sort((a, b) => a.sceneIndex - b.sceneIndex);
    for (const audio of ordered) {
      const started = Date.now();
      const callCost =
        (audio.durationSeconds / 3600) * (STT_PRICING_PER_HOUR[this.model] ?? 0);
      try {
        const res = await fetch(audio.url);
        if (!res.ok) throw new Error(`Failed to fetch scene audio (${res.status}): ${audio.url}`);
        const buffer = Buffer.from(await res.arrayBuffer());

        const transcription = await this.groq.audio.transcriptions.create({
          file: await toFile(buffer, `scene-${audio.sceneIndex}.wav`),
          model: this.model,
          response_format: "verbose_json",
          timestamp_granularities: ["word"],
        });

        const sceneWords = ((transcription as { words?: GroqWord[] }).words ?? []).map((w) => ({
          word: w.word.trim(),
          startSeconds: w.start,
          endSeconds: w.end,
          sceneIndex: audio.sceneIndex,
        }));
        words.push(...sceneWords);
        costUsd += callCost;

        await logProviderCall({
          generationId: input.generationId,
          step: "captions",
          provider: "groq",
          model: this.model,
          costUsd: callCost,
          latencyMs: Date.now() - started,
          success: true,
          attempt: 1,
        });
      } catch (err) {
        await logProviderCall({
          generationId: input.generationId,
          step: "captions",
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

    const base = `generations/${input.generationId}/captions`;
    const [json, srt, vtt] = await Promise.all([
      this.storage.upload(
        `${base}/captions.json`,
        Buffer.from(JSON.stringify({ words }, null, 2)),
        "application/json"
      ),
      this.storage.upload(`${base}/captions.srt`, Buffer.from(toSrt(words, ordered)), "text/plain"),
      this.storage.upload(`${base}/captions.vtt`, Buffer.from(toVtt(words, ordered)), "text/vtt"),
    ]);

    return { words, subtitleUrl: vtt.url, srtUrl: srt.url, wordsJsonUrl: json.url, costUsd };
  }
}

/** Start-of-scene offsets on the final video's global timeline (scenes are concatenated in index order). */
function sceneOffsets(sceneAudios: SceneAudio[]): Map<number, number> {
  const offsets = new Map<number, number>();
  let cursor = 0;
  for (const audio of sceneAudios) {
    offsets.set(audio.sceneIndex, cursor);
    cursor += audio.durationSeconds;
  }
  return offsets;
}

/** Groups words into short caption lines (~4 words) with global timestamps. */
function toCues(
  words: CaptionWord[],
  sceneAudios: SceneAudio[]
): { start: number; end: number; text: string }[] {
  const offsets = sceneOffsets(sceneAudios);
  const cues: { start: number; end: number; text: string }[] = [];
  const WORDS_PER_CUE = 4;

  for (let i = 0; i < words.length; i += WORDS_PER_CUE) {
    const group = words.slice(i, i + WORDS_PER_CUE);
    // A cue never spans scenes — split the group at scene boundaries.
    const byScene = new Map<number, CaptionWord[]>();
    for (const w of group) {
      byScene.set(w.sceneIndex, [...(byScene.get(w.sceneIndex) ?? []), w]);
    }
    for (const [sceneIndex, sceneWords] of byScene) {
      const offset = offsets.get(sceneIndex) ?? 0;
      cues.push({
        start: offset + sceneWords[0].startSeconds,
        end: offset + sceneWords[sceneWords.length - 1].endSeconds,
        text: sceneWords.map((w) => w.word).join(" "),
      });
    }
  }
  return cues;
}

function formatTimestamp(seconds: number, separator: "," | "."): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms, 3)}`;
}

export function toSrt(words: CaptionWord[], sceneAudios: SceneAudio[]): string {
  return toCues(words, sceneAudios)
    .map(
      (cue, i) =>
        `${i + 1}\n${formatTimestamp(cue.start, ",")} --> ${formatTimestamp(cue.end, ",")}\n${cue.text}\n`
    )
    .join("\n");
}

export function toVtt(words: CaptionWord[], sceneAudios: SceneAudio[]): string {
  const body = toCues(words, sceneAudios)
    .map((cue) => `${formatTimestamp(cue.start, ".")} --> ${formatTimestamp(cue.end, ".")}\n${cue.text}\n`)
    .join("\n");
  return `WEBVTT\n\n${body}`;
}
