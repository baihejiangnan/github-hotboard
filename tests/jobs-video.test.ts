import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  processVideoJob: vi.fn(),
  createShareDraftFromRun: vi.fn(),
  executeSavedQueryRun: vi.fn(),
  runRankingWorkflow: vi.fn(),
  sendTodayDigest: vi.fn(),
  triggerRetryIfNeeded: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {}
}));

vi.mock("@/lib/workflows", () => ({
  createShareDraftFromRun: mocks.createShareDraftFromRun,
  executeSavedQueryRun: mocks.executeSavedQueryRun,
  processVideoJob: mocks.processVideoJob,
  runRankingWorkflow: mocks.runRankingWorkflow,
  sendTodayDigest: mocks.sendTodayDigest,
  triggerRetryIfNeeded: mocks.triggerRetryIfNeeded
}));

describe("handleVideoRenderJob", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.processVideoJob.mockReset();
  });

  it("swallows non-retryable balance errors so the worker does not loop", async () => {
    mocks.processVideoJob.mockRejectedValue(
      Object.assign(new Error("Insufficient balance or no resource package. Please recharge."), {
        status: 429,
        code: "1113"
      })
    );

    const { handleVideoRenderJob } = await import("@/lib/jobs");

    await expect(handleVideoRenderJob("job-1")).resolves.toBeUndefined();
  });

  it("rethrows retryable video render errors", async () => {
    mocks.processVideoJob.mockRejectedValue(new Error("renderer crashed"));

    const { handleVideoRenderJob } = await import("@/lib/jobs");

    await expect(handleVideoRenderJob("job-2")).rejects.toThrow("renderer crashed");
  });
});
