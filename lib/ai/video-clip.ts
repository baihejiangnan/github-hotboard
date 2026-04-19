import { z } from "zod";

import { getZaiApiKey, getZaiBaseUrl } from "@/lib/env";

import type { VideoClipProvider } from "./types";

const clipGenerationResponseSchema = z.object({
  id: z.string().min(1)
});

const clipPollResponseSchema = z.object({
  task_status: z.union([
    z.literal("PROCESSING"),
    z.literal("SUCCESS"),
    z.literal("FAIL")
  ]),
  video_result: z.array(z.object({ url: z.string().url() })).optional()
});

export function parseClipGenerationResponse(payload: unknown): { taskId: string } {
  const parsed = clipGenerationResponseSchema.parse(payload);

  return { taskId: parsed.id };
}

export function parseClipPollResponse(payload: unknown): {
  status: "processing" | "success" | "fail";
  videoUrl?: string;
} {
  const parsed = clipPollResponseSchema.parse(payload);

  return {
    status: parsed.task_status.toLowerCase() as "processing" | "success" | "fail",
    videoUrl: parsed.video_result?.[0]?.url
  };
}

export class CogVideoXProvider implements VideoClipProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = getZaiApiKey();
    this.baseUrl = getZaiBaseUrl();
  }

  async generateClip(
    prompt: string,
    durationSec: number,
    size: string
  ): Promise<{ taskId: string }> {
    const res = await fetch(`${this.baseUrl}/videos/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "cogvideox-3",
        prompt,
        duration: Math.min(Math.max(durationSec, 4), 10),
        size,
        quality: "speed"
      })
    });

    if (!res.ok) {
      throw new Error(`CogVideoX generation failed: ${res.status}`);
    }

    return parseClipGenerationResponse(await res.json());
  }

  async pollClipResult(
    taskId: string
  ): Promise<{
    status: "processing" | "success" | "fail";
    videoUrl?: string;
  }> {
    const res = await fetch(`${this.baseUrl}/async-result/${taskId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });

    if (!res.ok) {
      throw new Error(`CogVideoX poll failed: ${res.status}`);
    }

    return parseClipPollResponse(await res.json());
  }
}
