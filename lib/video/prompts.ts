import type { VideoFormat } from "@/lib/types";

const FORMAT_CONSTRAINTS: Record<VideoFormat, { maxScenes: number; totalSec: number }> = {
  vertical_60: { maxScenes: 5, totalSec: 60 },
  horizontal_90: { maxScenes: 6, totalSec: 90 },
};

export function buildVideoScriptSystemPrompt(format: VideoFormat): string {
  const c = FORMAT_CONSTRAINTS[format];
  return `你是一位短视频脚本编剧，擅长制作 GitHub 开源项目推荐视频。
请根据提供的项目数据，生成一个视频脚本 JSON。

要求：
- 总时长约 ${c.totalSec} 秒
- scenes 数组：1 个开场 + 最多 ${c.maxScenes} 个项目 + 1 个结尾
- 每个 scene 包含 title（简短标题）、body（一句话描述）、accent（十六进制颜色）
- narrationSegments 数组：与 scenes 一一对应，包含 startMs、endMs、text
- 旁白风格：口语化中文，适合 TTS 朗读，不要书面语
- captionSegments：与 narrationSegments 相同
- cta：一句行动号召

输出严格的 JSON，格式如下：
{
  "format": "${format}",
  "scenes": [{ "title": "", "body": "", "accent": "#hex" }],
  "narrationSegments": [{ "startMs": 0, "endMs": 6000, "text": "" }],
  "captionSegments": [{ "startMs": 0, "endMs": 6000, "text": "" }],
  "cta": ""
}`;
}

export function buildVideoScriptUserPrompt(
  format: VideoFormat,
  rankingMode: string,
  windowDays: number,
  keyword: string | undefined,
  repos: Array<{ fullName: string; description: string | null; totalStars: number; starGain?: number }>,
): string {
  const repoList = repos
    .map(
      (r, i) =>
        `${i + 1}. ${r.fullName} - ${r.description ?? "暂无描述"} | Star: ${r.totalStars}${r.starGain != null ? ` | 新增: ${r.starGain}` : ""}`,
    )
    .join("\n");

  return `视频格式：${format}
排名模式：${rankingMode === "growth" ? "增长速度榜" : "新项目榜"}
时间窗口：最近 ${windowDays} 天
关键词：${keyword || "无"}

项目列表：
${repoList}`;
}
