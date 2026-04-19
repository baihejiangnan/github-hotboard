import type { CSSProperties, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";

import type { CaptionSegment, VideoScript } from "@/lib/types";

function AbsoluteFill(props: { children?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        ...props.style
      }}
    >
      {props.children}
    </div>
  );
}

function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number]
) {
  const [inputStart, inputEnd] = inputRange;
  const [outputStart, outputEnd] = outputRange;

  if (inputEnd === inputStart) {
    return outputStart;
  }

  const progress = Math.min(1, Math.max(0, (value - inputStart) / (inputEnd - inputStart)));
  return outputStart + progress * (outputEnd - outputStart);
}

function findCurrentCaption(captions: CaptionSegment[], currentMs: number) {
  return (
    captions.find((caption) => currentMs >= caption.startMs && currentMs < caption.endMs) ??
    captions[captions.length - 1]
  );
}

export function HotRepoVideo({
  script,
  audioSrc,
  captions
}: {
  script: VideoScript;
  audioSrc: string;
  captions: CaptionSegment[];
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;
  const index = Math.min(
    Math.floor((frame / (script.format === "vertical_60" ? 270 : 360)) % Math.max(script.scenes.length, 1)),
    Math.max(script.scenes.length - 1, 0)
  );
  const scene = script.scenes[index];
  const caption = findCurrentCaption(captions, currentMs);
  const opacity = interpolate(frame % (script.format === "vertical_60" ? 270 : 360), [0, 20, 220, 260], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(145deg, #151413 0%, #20170f 35%, #0f1d37 100%)",
        color: "white",
        padding: script.format === "vertical_60" ? 84 : 72
      }}
    >
      {audioSrc ? <Audio src={audioSrc} /> : null}

      <div
        style={{
          display: "grid",
          gridTemplateRows: "1fr auto",
          height: "100%",
          opacity
        }}
      >
        <div
          style={{
            display: "grid",
            alignContent: "center",
            gap: 28
          }}
        >
          <div
            style={{
              width: 132,
              height: 10,
              borderRadius: 999,
              background: scene?.accent ?? "#ff6b35"
            }}
          />
          <div style={{ fontSize: script.format === "vertical_60" ? 88 : 74, fontWeight: 800, lineHeight: 1.02 }}>
            {scene?.title || "GitHub 热榜"}
          </div>
          <div
            style={{
              fontSize: script.format === "vertical_60" ? 42 : 34,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.82)",
              maxWidth: script.format === "vertical_60" ? 860 : 980
            }}
          >
            {scene?.body || "正在生成视频脚本"}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 24
          }}
        >
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 36,
              padding: "24px 30px",
              background: "rgba(255,255,255,0.08)",
              fontSize: script.format === "vertical_60" ? 36 : 28,
              lineHeight: 1.4
            }}
          >
            {caption?.text || script.cta}
          </div>
          <div style={{ fontSize: 26, color: "rgba(255,255,255,0.72)" }}>{script.cta}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
