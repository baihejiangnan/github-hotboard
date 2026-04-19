import { afterEach, describe, expect, it } from "vitest";

describe("provider selection", () => {
  const originalTextProvider = process.env.AI_TEXT_PROVIDER;
  const originalTtsProvider = process.env.AI_TTS_PROVIDER;
  const originalVideoClipProvider = process.env.AI_VIDEO_CLIP_PROVIDER;
  const originalArkApiKey = process.env.ARK_API_KEY;

  afterEach(() => {
    process.env.AI_TEXT_PROVIDER = originalTextProvider;
    process.env.AI_TTS_PROVIDER = originalTtsProvider;
    process.env.AI_VIDEO_CLIP_PROVIDER = originalVideoClipProvider;
    process.env.ARK_API_KEY = originalArkApiKey;
  });

  it("defaults text provider to ark", async () => {
    delete process.env.AI_TEXT_PROVIDER;

    const { getTextProvider } = await import("@/lib/env");

    expect(getTextProvider()).toBe("ark");
  });

  it("creates an ark speech provider when configured", async () => {
    process.env.AI_TTS_PROVIDER = "ark";
    process.env.ARK_API_KEY = "ark-test-key";

    const { createSpeechProvider } = await import("@/lib/video/speech");

    expect(createSpeechProvider()?.constructor.name).toBe("ArkTtsProvider");
  });

  it("creates an ark video clip provider when configured", async () => {
    process.env.AI_VIDEO_CLIP_PROVIDER = "ark";
    process.env.ARK_API_KEY = "ark-test-key";

    const { createVideoClipProvider } = await import("@/lib/ai/video-clip");

    expect(createVideoClipProvider()?.constructor.name).toBe("ArkVideoClipProvider");
  });
});
