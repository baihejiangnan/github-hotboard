import type { QueryInput, RankedRepository, ShareChannel } from "@/lib/types";

const OUTPUT_SCHEMA = `输出严格的 JSON，格式如下：
{
  "titleOptions": ["标题1", "标题2"],
  "body": "正文内容（Markdown 格式）",
  "coverText": "封面文字（15字以内）",
  "hashtags": ["#标签1", "#标签2", "#标签3"]
}`;

export function buildShareSystemPrompt(channel: ShareChannel): string {
  if (channel === "wechat_article") {
    return `你是一位资深的技术自媒体编辑，擅长撰写微信公众号文章。
要求：
- 语气专业但不枯燥，信息密度高
- 正文用 Markdown 格式，包含项目名称、描述、Star 数据和 GitHub 链接
- 标题要有吸引力，提供两个备选
- 结尾要有行动号召
${OUTPUT_SCHEMA}`;
  }

  return `你是一位小红书博主，擅长用轻松有趣的方式分享技术内容。
要求：
- 语气轻松活泼，适当使用 emoji
- 正文用纯文本，包含项目名称、描述、Star 数据和 GitHub 链接
- 标题要抓眼球，提供两个备选
- 结尾引导互动（收藏、关注）
${OUTPUT_SCHEMA}`;
}

export function buildShareUserPrompt(
  input: QueryInput,
  repos: RankedRepository[],
  runId: string,
): string {
  const repoList = repos
    .map(
      (r, i) =>
        `${i + 1}. ${r.fullName} - ${r.description ?? "暂无描述"} | Star: ${r.totalStars}${r.starGain != null ? ` | 窗口新增: ${r.starGain}` : ""} | ${r.htmlUrl}`,
    )
    .join("\n");

  return `请根据以下 GitHub 热榜数据生成分享文案。

查询条件：
- 排名模式：${input.rankingMode === "growth" ? "增长速度榜" : "新项目榜"}
- 时间窗口：最近 ${input.windowDays} 天
- 关键词：${input.keyword || "无"}
- 语言：${input.language || "不限"}

项目列表：
${repoList}

来源 Run ID：${runId}`;
}
