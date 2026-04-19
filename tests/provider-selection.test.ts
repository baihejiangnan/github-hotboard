import { afterEach, describe, expect, it } from "vitest";

describe("provider selection", () => {
  const originalTextProvider = process.env.AI_TEXT_PROVIDER;
  const originalTtsProvider = process.env.AI_TTS_PROVIDER;
  const originalVideoClipProvider = process.env.AI_VIDEO_CLIP_PROVIDER;
  const originalArkApiKey = process.env.ARK_API_KEY;
  const originalPiperBinaryPath = process.env.PIPER_BINARY_PATH;
  const originalPiperVoiceModelPath = process.env.PIPER_VOICE_MODEL_PATH;
  const originalPiperVoiceConfigPath = process.env.PIPER_VOICE_CONFIG_PATH;

  afterEach(() => {
    process.env.AI_TEXT_PROVIDER = originalTextProvider;
    process.env.AI_TTS_PROVIDER = originalTtsProvider;
    process.env.AI_VIDEO_CLIP_PROVIDER = originalVideoClipProvider;
    process.env.ARK_API_KEY = originalArkApiKey;
    process.env.PIPER_BINARY_PATH = originalPiperBinaryPath;
    process.env.PIPER_VOICE_MODEL_PATH = originalPiperVoiceModelPath;
    process.env.PIPER_VOICE_CONFIG_PATH = originalPiperVoiceConfigPath;
  });

  it("defaults text provider to ark", async () => {
    delete process.env.AI_TEXT_PROVIDER;

    const { getTextProvider } = await import("@/lib/env");

    expect(getTextProvider()).toBe("ark");
  });

  it("defaults the video clip provider to none", async () => {
    delete process.env.AI_VIDEO_CLIP_PROVIDER;

    const { getVideoClipProvider } = await import("@/lib/env");

    expect(getVideoClipProvider()).toBe("none");
  });

  it("creates a piper speech provider when configured", async () => {
    process.env.AI_TTS_PROVIDER = "piper";
    process.env.PIPER_BINARY_PATH = "D:/tools/piper/piper.exe";
    process.env.PIPER_VOICE_MODEL_PATH = "D:/models/piper/voice.onnx";
    process.env.PIPER_VOICE_CONFIG_PATH = "D:/models/piper/voice.onnx.json";

    const { createSpeechProvider } = await import("@/lib/video/speech");

    expect(createSpeechProvider()?.constructor.name).toBe("PiperTtsProvider");
  });
});
