import type { VideoClipProvider } from "@/lib/ai/types";
import { getJuheVideoApiKey } from "@/lib/env";
import { writeTextArtifact } from "@/lib/storage";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const JUHE_VIDEO_GENERATE_URL = "https://gpt.juhe.cn/text2video/generate";
const JUHE_VIDEO_QUERY_URL = "https://gpt.juhe.cn/text2video/query";
const POLL_INTERVAL_MS = 15_000;
const POLL_TIMEOUT_MS = 300_000;

export class JuheVideoProvider implements VideoClipProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateClip(
    prompt: string,
    durationSec: number,
    size: string
  ): Promise<{ taskId: string }> {
    const params = new URLSearchParams({
      key: this.apiKey,
      prompt,
      negativePrompt: "低质量,模糊,抖动,变形,字幕,水印",
      resolution: "720P",
      proportion: sizeToProportion(size),
      duration: String(Math.min(Math.max(durationSec, 5), 15)),
      promptExtend: "1"
    });

    const res = await fetch(JUHE_VIDEO_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error(`Juhe video generation HTTP ${res.status}`);
    }

    const data = await res.json() as { code?: number; orderId?: string; error?: string };

    if (data.code !== 1) {
      throw new Error(`Juhe video generation failed: ${data.error ?? `code=${data.code}`}`);
    }

    if (!data.orderId) {
      throw new Error("Juhe video generation returned no orderId.");
    }

    return { taskId: data.orderId };
  }

  async pollClipResult(
    taskId: string
  ): Promise<{ status: "processing" | "success" | "fail"; videoUrl?: string }> {
    const params = new URLSearchParams({
      key: this.apiKey,
      orderId: taskId
    });

    const res = await fetch(JUHE_VIDEO_QUERY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error(`Juhe video poll HTTP ${res.status}`);
    }

    const data = await res.json() as { code?: number; videoUrl?: string; error?: string };

    if (data.code === 1) {
      return { status: "success", videoUrl: data.videoUrl };
    }

    if (data.code === 0 && data.error?.includes("PROCESSING")) {
      return { status: "processing" };
    }

    return { status: "fail" };
  }
}

export async function generateJuheVideoClip(
  prompt: string,
  durationSec: number,
  size: string,
  apiKey: string
): Promise<string | null> {
  const provider = new JuheVideoProvider(apiKey);
  const { taskId } = await provider.generateClip(prompt, durationSec, size);

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await provider.pollClipResult(taskId);
    if (result.status === "success" && result.videoUrl) {
      const buffer = await downloadVideo(result.videoUrl);
      const clipDir = path.resolve(process.cwd(), "data", "exports", "video-clip");
      const { mkdir } = await import("node:fs/promises");
      await mkdir(clipDir, { recursive: true });
      const targetPath = path.join(clipDir, `juhe-${Date.now()}.mp4`);
      await writeFile(targetPath, buffer);
      return targetPath;
    }
    if (result.status === "fail") {
      return null;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null;
}

async function downloadVideo(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function sizeToProportion(size: string): string {
  if (size === "1080x1920") return "9:16";
  if (size === "1920x1080") return "16:9";
  return "16:9";
}

export function createJuheVideoProvider(): VideoClipProvider {
  const key = getJuheVideoApiKey();
  if (!key) throw new Error("JUHE_VIDEO_API_KEY is not configured.");
  return new JuheVideoProvider(key);
}
