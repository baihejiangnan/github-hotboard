import type { QueryInput, RankedRepository, ShareChannel, ShareDraftPayload } from "@/lib/types";

function makeIntro(input: QueryInput, repos: RankedRepository[]) {
  const metricLabel = input.rankingMode === "growth" ? "增星速度" : "新项目总星";
  const names = repos.slice(0, 3).map((repo) => repo.fullName).join("、");
  return `这期我们按照最近 ${input.windowDays} 天的 ${metricLabel} 榜单，挑出了最值得看的 ${repos.length} 个 GitHub 项目。开头先记住三个名字：${names}。`;
}

function makeRepoLines(repos: RankedRepository[]) {
  return repos.map((repo, index) => {
    const gain =
      typeof repo.starGain === "number"
        ? `，窗口新增 Star ${repo.starGain}，日均 ${repo.starsPerDay ?? 0}`
        : "";

    return `${index + 1}. ${repo.fullName}\n- ${repo.description ?? "暂无仓库描述"}\n- 当前总 Star ${repo.totalStars}${gain}\n- GitHub：${repo.htmlUrl}`;
  });
}

export function buildShareDraft(
  channel: ShareChannel,
  runId: string,
  input: QueryInput,
  repos: RankedRepository[]
): ShareDraftPayload {
  const intro = makeIntro(input, repos);
  const repoLines = makeRepoLines(repos).join("\n\n");
  const keywordLine = input.keyword ? `关键词过滤：${input.keyword}` : "未设置关键词过滤";
  const hashtags = [
    "#GitHub热榜",
    input.rankingMode === "growth" ? "#增长速度榜" : "#新项目榜",
    input.keyword ? `#${input.keyword.replace(/\s+/g, "")}` : "#开源项目"
  ];

  if (channel === "wechat_article") {
    return {
      channel,
      sourceRunId: runId,
      titleOptions: [
        `最近${input.windowDays}天最值得看的 GitHub 项目 Top ${repos.length}`,
        `${input.keyword || "开源"} 热榜：最近${input.windowDays}天 GitHub Top ${repos.length}`
      ],
      coverText: `最近${input.windowDays}天 GitHub 热榜`,
      hashtags,
      body: [
        "【开场】",
        intro,
        "",
        "【筛选条件】",
        `${keywordLine}；窗口 ${input.windowDays} 天；榜单口径：${input.rankingMode}`,
        "",
        "【项目清单】",
        repoLines,
        "",
        "【结尾】",
        "如果你只看一个项目，优先点开榜首；如果你要做内容选题，这份榜单里的链接都可以直接继续深挖。"
      ].join("\n")
    };
  }

  return {
    channel,
    sourceRunId: runId,
    titleOptions: [
      `最近${input.windowDays}天 GitHub 热榜，前 ${repos.length} 真有东西`,
      `${input.keyword || "开源项目"} 最近${input.windowDays}天涨疯了`
    ],
    coverText: `GitHub 热榜 Top ${repos.length}`,
    hashtags,
    body: [
      intro,
      "",
      "这份清单我已经按“值得点进去”的思路排过一遍，下面是本轮最值得关注的项目：",
      repoLines,
      "",
      "想做选题、找灵感、跟踪技术风向，直接从榜单里的 GitHub 链接继续看就行。"
    ].join("\n")
  };
}

