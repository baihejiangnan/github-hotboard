import { writeFile } from "node:fs/promises";
import path from "node:path";

import { createJuheVideoProvider, generateJuheVideoClip } from "@/lib/ai/juhe-video";
import { createVideoClipProvider } from "@/lib/ai/video-clip";
import { getExportRoot } from "@/lib/env";
import type { VideoFormat, VideoScene } from "@/lib/types";
import type { VideoClipProvider } from "@/lib/ai/types";

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 300_000;

const SIZE_MAP: Record<VideoFormat, string> = {
  vertical_60: "1080x1920",
  horizontal_90: "1920x1080",
};

async function downloadToLocal(url: string, filePath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);
}

async function pollUntilDone(
  provider: VideoClipProvider,
  taskId: string,
): Promise<string | null> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await provider.pollClipResult(taskId);
    if (result.status === "success" && result.videoUrl) return result.videoUrl;
    if (result.status === "fail") return null;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  return null;
}

export async function generateSceneClips(
  scenes: VideoScene[],
  format: VideoFormat,
): Promise<Map<number, string>> {
  const provider = createVideoClipProvider();
  if (!provider) {
    return new Map<number, string>();
  }
  const size = SIZE_MAP[format];
  const clipDir = path.resolve(getExportRoot(), "video-clip");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(clipDir, { recursive: true });

  const tasks = scenes.map(async (scene, index) => {
    const prompt = `GitHub开源项目推荐视频背景：${scene.title} - ${scene.body}，科技感，深色背景，动态粒子效果`;
    try {
      const { taskId } = await provider.generateClip(prompt, 5, size);
      const videoUrl = await pollUntilDone(provider, taskId);
      if (!videoUrl) return { index, clipPath: null };
      const clipPath = path.join(clipDir, `scene-${index}.mp4`);
      await downloadToLocal(videoUrl, clipPath);
      return { index, clipPath };
    } catch {
      return { index, clipPath: null };
    }
  });

  const results = await Promise.allSettled(tasks);
  const clipMap = new Map<number, string>();

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.clipPath) {
      clipMap.set(result.value.index, result.value.clipPath);
    }
  }

  return clipMap;
}

export async function generatePremiumBackgroundClip(
  script: { scenes: VideoScene[]; cta: string },
  format: VideoFormat,
  apiKey: string,
): Promise<string | null> {
  const size = SIZE_MAP[format];
  const sceneDescriptions = script.scenes
    .map((s, i) => `场景${i + 1}：${s.title} - ${s.body}`)
    .join("；");
  const prompt = `GitHub开源项目推荐视频背景，${sceneDescriptions}。${script.cta}。科技感，深色背景，专业短视频风格。`;

  const duration = format === "vertical_60" ? 10 : 15;

  try {
    return await generateJuheVideoClip(prompt, duration, size, apiKey);
  } catch (error) {
    console.warn("[clip-orchestrator][generatePremiumBackgroundClip]", { error });
    return null;
  }
}
