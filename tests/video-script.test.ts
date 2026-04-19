import { describe, expect, it } from "vitest";

import {
  parseVideoScriptModelOutput,
  serializeVideoScript
} from "@/lib/video/script";

describe("video script parsing", () => {
  it("normalizes a valid AI response into a typed video script", () => {
    const script = parseVideoScriptModelOutput(
      JSON.stringify({
        format: "horizontal_90",
        scenes: [{ title: "榜单", body: "正文", accent: "#ff6b35" }],
        narrationSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
        captionSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
        cta: "查看完整榜单"
      }),
      "horizontal_90"
    );

    expect(script.format).toBe("horizontal_90");
    expect(script.scenes[0]?.title).toBe("榜单");
    expect(script.captionSegments).toHaveLength(1);
  });

  it("rejects malformed AI response payloads", () => {
    expect(() =>
      parseVideoScriptModelOutput(
        JSON.stringify({
          format: "vertical_60",
          scenes: [{ title: "榜单", body: "正文" }],
          narrationSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
          captionSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
          cta: "查看完整榜单"
        }),
        "vertical_60"
      )
    ).toThrow();
  });

  it("serializes validated scripts into Prisma-safe JSON", () => {
    const serialized = serializeVideoScript({
      format: "vertical_60",
      scenes: [{ title: "榜单", body: "正文", accent: "#ff6b35" }],
      narrationSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
      captionSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
      cta: "查看完整榜单"
    });

    expect(serialized).toEqual({
      format: "vertical_60",
      scenes: [{ title: "榜单", body: "正文", accent: "#ff6b35" }],
      narrationSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
      captionSegments: [{ startMs: 0, endMs: 3000, text: "开场" }],
      cta: "查看完整榜单"
    });
  });
});
