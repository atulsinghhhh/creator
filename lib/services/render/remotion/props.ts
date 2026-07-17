import type { CaptionWord, MediaClip, SceneAudio } from "@/lib/services/types";

/** Input props for the "short" composition — everything the video needs, passed at render time. */
export interface ShortVideoProps {
  scenes: { index: number; narration: string }[];
  sceneAudios: SceneAudio[];
  words: CaptionWord[];
  clips: MediaClip[];
  [key: string]: unknown;
}

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/** Scene lengths in frames, ordered by scene index — audio duration drives everything. */
export function sceneFrames(props: ShortVideoProps): { sceneIndex: number; frames: number }[] {
  return [...props.sceneAudios]
    .sort((a, b) => a.sceneIndex - b.sceneIndex)
    .map((audio) => ({
      sceneIndex: audio.sceneIndex,
      frames: Math.max(1, Math.round(audio.durationSeconds * FPS)),
    }));
}

export function totalFrames(props: ShortVideoProps): number {
  return sceneFrames(props).reduce((sum, s) => sum + s.frames, 0);
}
