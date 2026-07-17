import React from "react";
import { Composition } from "remotion";
import { ShortVideo } from "./ShortVideo";
import { FPS, HEIGHT, WIDTH, totalFrames, type ShortVideoProps } from "./props";

const DEFAULT_PROPS: ShortVideoProps = {
  scenes: [],
  sceneAudios: [],
  words: [],
  clips: [],
};

export const Root: React.FC = () => (
  <Composition
    id="short"
    component={ShortVideo}
    width={WIDTH}
    height={HEIGHT}
    fps={FPS}
    durationInFrames={1}
    defaultProps={DEFAULT_PROPS}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, totalFrames(props)),
    })}
  />
);
