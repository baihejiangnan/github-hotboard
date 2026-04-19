import type { Prisma } from "@prisma/client";

import { createTextProvider } from "@/lib/ai/text";
import { getTextProvider } from "@/lib/env";
import {
  videoScriptSchema,
  type QueryInput,
  type RankedRepository,
  type VideoFormat,
  type VideoScript
} from "@/lib/types";
import { buildVideoScriptSystemPrompt, buildVideoScriptUserPrompt } from "@/lib/video/prompts";

const formatConfigs: Record<VideoFormat, { maxScenes: number; introMs: number; repoMs: number; outroMs: number }> = {
  vertical_60: {
    maxScenes: 5,
    introMs: 6000,
    repoMs: 9000,
    outroMs: 6000
  },
  horizontal_90: {
    maxScenes: 6,
    introMs: 9000,
    repoMs: 12000,
    outroMs: 9000
  }
};

async function buildVideoScriptWithAI(
  format: VideoFormat,
  input: QueryInput,
  repos: RankedRepository[]
): Promise<VideoScript> {
  const config = formatConfigs[format];
  const selected = repos.slice(0, config.maxScenes);
  const provider = createTextProvider();
  const raw = await provider.generate(
    buildVideoScriptSystemPrompt(format),
    buildVideoScriptUserPrompt(
      format,
      input.rankingMode,
      input.windowDays,
      input.keyword,
      selected
    )
  );

  return parseVideoScriptModelOutput(raw, format);
}

export function parseVideoScriptModelOutput(
  raw: string,
  format: VideoFormat
): VideoScript {
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return videoScriptSchema.parse({
    ...parsed,
    format
  });
}

export function serializeVideoScript(script: VideoScript): Prisma.InputJsonObject {
  return {
    format: script.format,
    scenes: script.scenes.map((scene) => ({
      title: scene.title,
      body: scene.body,
      accent: scene.accent,
      ...(scene.repoName ? { repoName: scene.repoName } : {}),
      ...(scene.clipPath ? { clipPath: scene.clipPath } : {})
    })),
    narrationSegments: script.narrationSegments.map((segment) => ({
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text
    })),
    captionSegments: script.captionSegments.map((segment) => ({
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text
    })),
    cta: script.cta
  };
}

export async function buildVideoScript(
  format: VideoFormat,
  input: QueryInput,
  repos: RankedRepository[]
): Promise<VideoScript> {
  if (getTextProvider() === "zai" || getTextProvider() === "openai") {
    try {
      return await buildVideoScriptWithAI(format, input, repos);
    } catch {
      return buildVideoScriptTemplate(format, input, repos);
    }
  }
  return buildVideoScriptTemplate(format, input, repos);
}

function buildVideoScriptTemplate(
  format: VideoFormat,
  input: QueryInput,
  repos: RankedRepository[]
): VideoScript {
  const config = formatConfigs[format];
  const selected = repos.slice(0, config.maxScenes);
  let cursor = 0;

  const introText = `这是一份最近 ${input.windowDays} 天的 GitHub ${
    input.rankingMode === "growth" ? "增星速度" : "新项目总星"
  } 热榜。我们直接看最值得点开的项目。`;

  const narrationSegments = [
    {
      startMs: cursor,
      endMs: cursor + config.introMs,
      text: introText
    }
  ];
  const scenes = [
    {
      title: "GitHub 热榜",
      body: `${input.windowDays} 天窗口 · ${input.rankingMode === "growth" ? "增长速度榜" : "新项目榜"}`,
      accent: "#ff6b35"
    }
  ];
  cursor += config.introMs;

  for (const repo of selected) {
    const text = `${repo.fullName}，${repo.description ?? "这是一个值得关注的开源项目"}。当前总 Star ${
      repo.totalStars
    }${typeof repo.starGain === "number" ? `，最近窗口新增 ${repo.starGain}` : ""}。`;
    narrationSegments.push({
      startMs: cursor,
      endMs: cursor + config.repoMs,
      text
    });
    scenes.push({
      title: repo.fullName,
      body: repo.description ?? "值得关注的开源项目",
      accent: "#0057ff"
    });
    cursor += config.repoMs;
  }

  const outroText = "完整榜单和 GitHub 原链接已经准备好了，点开继续深挖你最感兴趣的项目。";
  narrationSegments.push({
    startMs: cursor,
    endMs: cursor + config.outroMs,
    text: outroText
  });
  scenes.push({
    title: "继续深挖",
    body: "打开完整榜单，直接跳转到项目 GitHub 地址。",
    accent: "#10b981"
  });

  return {
    format,
    scenes,
    narrationSegments,
    captionSegments: narrationSegments.map((segment) => ({ ...segment })),
    cta: "打开完整榜单"
  };
}
