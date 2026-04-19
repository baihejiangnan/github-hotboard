import { Composition } from "remotion";

import { HotRepoVideo } from "@/remotion/HotRepoVideo";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="HotRepoVertical60"
        component={HotRepoVideo}
        fps={30}
        width={1080}
        height={1920}
        durationInFrames={1800}
        defaultProps={{
          script: {
            format: "vertical_60",
            scenes: [],
            narrationSegments: [],
            captionSegments: [],
            cta: ""
          },
          audioSrc: "",
          captions: []
        }}
      />
      <Composition
        id="HotRepoHorizontal90"
        component={HotRepoVideo}
        fps={30}
        width={1920}
        height={1080}
        durationInFrames={2700}
        defaultProps={{
          script: {
            format: "horizontal_90",
            scenes: [],
            narrationSegments: [],
            captionSegments: [],
            cta: ""
          },
          audioSrc: "",
          captions: []
        }}
      />
    </>
  );
}

