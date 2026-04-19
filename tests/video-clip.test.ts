import { describe, expect, it } from "vitest";

import {
  parseClipGenerationResponse,
  parseClipPollResponse
} from "@/lib/ai/video-clip";

describe("video clip provider parsing", () => {
  it("accepts a valid generation response", () => {
    expect(
      parseClipGenerationResponse({
        id: "task-123"
      })
    ).toEqual({ taskId: "task-123" });
  });

  it("rejects an invalid generation response", () => {
    expect(() => parseClipGenerationResponse({})).toThrow();
  });

  it("accepts a valid poll response", () => {
    expect(
      parseClipPollResponse({
        task_status: "SUCCESS",
        video_result: [{ url: "https://cdn.example.com/video.mp4" }]
      })
    ).toEqual({
      status: "success",
      videoUrl: "https://cdn.example.com/video.mp4"
    });
  });

  it("rejects an invalid poll response", () => {
    expect(() =>
      parseClipPollResponse({
        task_status: "BROKEN"
      })
    ).toThrow();
  });
});
