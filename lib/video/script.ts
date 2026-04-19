import type { QueryInput, RankedRepository, VideoFormat, VideoScript } from "@/lib/types";

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

export function buildVideoScript(format: VideoFormat, input: QueryInput, repos: RankedRepository[]): VideoScript {
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
      accent: "#0057ff",
      repoName: repo.fullName
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

