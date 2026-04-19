import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const findUnique = vi.fn();
  const update = vi.fn();

  return {
    prisma: {
      videoJob: {
        findUnique,
        update
      }
    },
    createSpeechProvider: vi.fn(),
    renderVideoJob: vi.fn(),
    generateSceneClips: vi.fn()
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/video/speech", () => ({
  createSpeechProvider: mocks.createSpeechProvider
}));

vi.mock("@/lib/video/remotion", () => ({
  renderVideoJob: mocks.renderVideoJob
}));

vi.mock("@/lib/video/clip-orchestrator", () => ({
  generateSceneClips: mocks.generateSceneClips
}));

describe("processVideoJob", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.prisma.videoJob.findUnique.mockReset();
    mocks.prisma.videoJob.update.mockReset();
    mocks.createSpeechProvider.mockReset();
    mocks.renderVideoJob.mockReset();
    mocks.generateSceneClips.mockReset();
    process.env.AI_VIDEO_CLIP_PROVIDER = "none";
  });

  it("returns the existing video path when the job is already completed", async () => {
    mocks.prisma.videoJob.findUnique.mockResolvedValue({
      id: "job-1",
      format: "vertical_60",
      status: "completed",
      videoPath: "D:/exports/video/job-1.mp4",
      scriptJson: {
        format: "vertical_60",
        scenes: [{ title: "榜单", body: "正文", accent: "#ff6b35" }],
        narrationSegments: [{ startMs: 0, endMs: 1000, text: "开场" }],
        captionSegments: [{ startMs: 0, endMs: 1000, text: "开场" }],
        cta: "查看完整榜单"
      }
    });

    const { processVideoJob } = await import("@/lib/workflows");
    const result = await processVideoJob("job-1");

    expect(result).toBe("D:/exports/video/job-1.mp4");
    expect(mocks.prisma.videoJob.update).not.toHaveBeenCalled();
  });

  it("stores a speech_synthesis_failed error when speech generation fails", async () => {
    mocks.prisma.videoJob.findUnique.mockResolvedValue({
      id: "job-2",
      format: "vertical_60",
      status: "pending",
      videoPath: null,
      scriptJson: {
        format: "vertical_60",
        scenes: [{ title: "榜单", body: "正文", accent: "#ff6b35" }],
        narrationSegments: [{ startMs: 0, endMs: 1000, text: "开场" }],
        captionSegments: [{ startMs: 0, endMs: 1000, text: "开场" }],
        cta: "查看完整榜单"
      }
    });
    mocks.createSpeechProvider.mockReturnValue({
      synthesize: vi.fn().mockRejectedValue(new Error("tts broke"))
    });

    const { processVideoJob } = await import("@/lib/workflows");

    await expect(processVideoJob("job-2")).rejects.toThrow("tts broke");
    expect(mocks.prisma.videoJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "failed",
          error: "speech_synthesis_failed: tts broke"
        })
      })
    );
  });
});
