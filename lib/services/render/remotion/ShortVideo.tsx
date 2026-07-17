import React from "react";
import { AbsoluteFill, Audio, Loop, OffthreadVideo, Sequence, useCurrentFrame } from "remotion";
import type { CaptionWord } from "@/lib/services/types";
import { FPS, sceneFrames, type ShortVideoProps } from "./props";

/**
 * The V0 composition: per scene, a looping muted background clip under the
 * scene's voice track, with the currently-spoken words overlaid. Inline
 * styles only — Tailwind doesn't exist inside the Remotion bundle.
 */
export const ShortVideo: React.FC<ShortVideoProps> = (props) => {
  // Cumulative start frames, derived up front — React render must not mutate.
  const sequences = sceneFrames(props).reduce<
    { sceneIndex: number; length: number; from: number }[]
  >((acc, { sceneIndex, frames: length }) => {
    const from = acc.length === 0 ? 0 : acc[acc.length - 1].from + acc[acc.length - 1].length;
    return [...acc, { sceneIndex, length, from }];
  }, []);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {sequences.map(({ sceneIndex, length, from }) => {
        const audio = props.sceneAudios.find((a) => a.sceneIndex === sceneIndex);
        const clip = props.clips.find((c) => c.sceneIndex === sceneIndex);
        const words = props.words.filter((w) => w.sceneIndex === sceneIndex);

        return (
          <Sequence key={sceneIndex} from={from} durationInFrames={length}>
            {clip && (
              // Library clips are often shorter than the scene's narration —
              // loop the clip for the full scene length.
              <Loop durationInFrames={Math.max(1, Math.round((clip.durationSeconds ?? 5) * FPS))}>
                <OffthreadVideo
                  src={clip.url}
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </Loop>
            )}
            {audio && <Audio src={audio.url} />}
            <CaptionOverlay words={words} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/** Shows the last few words spoken up to the current frame (scene-relative timing). */
const CaptionOverlay: React.FC<{ words: CaptionWord[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const seconds = frame / FPS;

  const VISIBLE_WORDS = 4;
  const spoken = words.filter((w) => w.startSeconds <= seconds);
  const visible = spoken.slice(-VISIBLE_WORDS);
  if (visible.length === 0) return null;

  const current = visible[visible.length - 1];
  const isCurrent = (w: CaptionWord) => w === current && seconds <= current.endSeconds + 0.15;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center" }}>
      <div
        style={{
          marginBottom: 360,
          maxWidth: 900,
          textAlign: "center",
          fontFamily: "Helvetica, Arial, sans-serif",
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1.25,
          color: "#fff",
          textShadow: "0 4px 24px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)",
        }}
      >
        {visible.map((w, i) => (
          <span key={i} style={{ color: isCurrent(w) ? "#ffd84d" : "#fff" }}>
            {w.word}
            {i < visible.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
