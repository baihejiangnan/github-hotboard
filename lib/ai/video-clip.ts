import { z } from "zod";

import {
  getArkApiKey,
  getArkBaseUrl,
  getArkVideoGenerationPath,
  getArkVideoModel,
  getArkVideoQueryPathTemplate,
  getVideoClipProvider
} from "@/lib/env";

import type { VideoClipProvider } from "./types";

const clipPollStatusSchema = z.union([
  z.literal("PROCESSING"),
  z.literal("PENDING"),
  z.literal("RUNNING"),
  z.literal("SUCCESS"),
  z.literal("SUCCEEDED"),
  z.literal("FAIL"),
  z.literal("FAILED")
]);

function pickTaskId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const direct =
    record.id ?? record.task_id ?? record.taskId;

  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const nested = record.data;
  if (nested && typeof nested === "object") {
    return pickTaskId(nested);
  }

  return undefined;
}

function pickVideoUrl(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const directCandidates = [
    record.video_url,
    record.videoUrl,
    record.url
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
  }

  const videoResult = record.video_result;
  if (Array.isArray(videoResult)) {
    for (const item of videoResult) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).url === "string"
      ) {
        return (item as Record<string, string>).url;
      }
    }
  }

  const output = record.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const url = pickVideoUrl(item);
      if (url) {
        return url;
      }
    }
  }

  if (record.data && typeof record.data === "object") {
    return pickVideoUrl(record.data);
  }

  return undefined;
}

export function parseClipGenerationResponse(payload: unknown): { taskId: string } {
  const taskId = pickTaskId(payload);

  if (!taskId) {
    throw new Error("Video clip generation payload did not contain a task id.");
  }

  return { taskId };
}

export function parseClipPollResponse(payload: unknown): {
  status: "processing" | "success" | "fail";
  videoUrl?: string;
} {
  if (!payload || typeof payload !== "object") {
    throw new Error("Video clip poll payload must be an object.");
  }

  const record = payload as Record<string, unknown>;
  const rawStatus =
    record.task_status ?? record.status ?? record.state ?? (record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>).task_status ??
        (record.data as Record<string, unknown>).status ??
        (record.data as Record<string, unknown>).state
      : undefined);

  const parsedStatus = clipPollStatusSchema.parse(rawStatus);
  const normalized =
    parsedStatus === "SUCCESS" || parsedStatus === "SUCCEEDED"
      ? "success"
      : parsedStatus === "FAIL" || parsedStatus === "FAILED"
        ? "fail"
        : "processing";

  return {
    status: normalized,
    videoUrl: pickVideoUrl(payload)
  };
}

function joinArkPath(pathname: string) {
  return `${getArkBaseUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export class ArkVideoClipProvider implements VideoClipProvider {
  private readonly apiKey: string;
  private readonly generationUrl: string;
  private readonly queryPathTemplate: string;

  constructor() {
    this.apiKey = getArkApiKey();
    this.generationUrl = joinArkPath(getArkVideoGenerationPath());
    this.queryPathTemplate = getArkVideoQueryPathTemplate();
  }

  async generateClip(
    prompt: string,
    durationSec: number,
    size: string
  ): Promise<{ taskId: string }> {
    const res = await fetch(this.generationUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getArkVideoModel(),
        prompt,
        duration: Math.min(Math.max(durationSec, 4), 10),
        size
      })
    });

    if (!res.ok) {
      throw new Error(`Ark video generation failed: ${res.status}`);
    }

    return parseClipGenerationResponse(await res.json());
  }

  async pollClipResult(
    taskId: string
  ): Promise<{
    status: "processing" | "success" | "fail";
    videoUrl?: string;
  }> {
    const pollUrl = joinArkPath(
      this.queryPathTemplate.replace("{taskId}", encodeURIComponent(taskId))
    );
    const res = await fetch(pollUrl, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      }
    });

    if (!res.ok) {
      throw new Error(`Ark video poll failed: ${res.status}`);
    }

    return parseClipPollResponse(await res.json());
  }
}

export function createVideoClipProvider(): VideoClipProvider | null {
  if (getVideoClipProvider() === "none") {
    return null;
  }

  return new ArkVideoClipProvider();
}
