import { describe, expect, it } from "vitest";

import {
  buildShareDraft,
  parseShareDraftModelOutput
} from "@/lib/share/generator";
import type { RankedRepository } from "@/lib/types";

const repo = (fullName: string): RankedRepository => ({
  githubId: fullName,
  owner: fullName.split("/")[0],
  name: fullName.split("/")[1],
  fullName,
  htmlUrl: `https://github.com/${fullName}`,
  description: "Test repository",
  topics: ["ai"],
  language: "TypeScript",
  defaultBranch: "main",
  totalStars: 120,
  fork: false,
  archived: false,
  createdAt: new Date(),
  pushedAt: new Date(),
  matchedFields: ["name"],
  starGain: 32,
  starsPerDay: 4.57
});

describe("buildShareDraft", () => {
  it("creates a wechat payload with repo links", async () => {
    const payload = await buildShareDraft(
      "wechat_article",
      "run-1",
      {
        rankingMode: "growth",
        windowDays: 7,
        keyword: "openclaw",
        limit: 10,
        keywordMode: "broad",
        excludeForks: true,
        excludeArchived: true
      },
      [repo("team/repo-a"), repo("team/repo-b")]
    );

    expect(payload.body).toContain("https://github.com/team/repo-a");
    expect(payload.titleOptions[0]).toContain("最近7天");
  });

  it("normalizes a valid AI share payload through schema parsing", () => {
    const payload = parseShareDraftModelOutput(
      JSON.stringify({
        titleOptions: ["主标题", "副标题"],
        body: "正文内容",
        coverText: "封面文案",
        hashtags: ["GitHub热榜", "开源项目"]
      }),
      "wechat_article",
      "run-1"
    );

    expect(payload).toEqual({
      channel: "wechat_article",
      sourceRunId: "run-1",
      titleOptions: ["主标题", "副标题"],
      body: "正文内容",
      coverText: "封面文案",
      hashtags: ["GitHub热榜", "开源项目"]
    });
  });

  it("rejects malformed AI share payloads", () => {
    expect(() =>
      parseShareDraftModelOutput(
        JSON.stringify({
          titleOptions: [],
          body: "正文内容",
          coverText: "封面文案",
          hashtags: ["GitHub热榜"]
        }),
        "wechat_article",
        "run-1"
      )
    ).toThrow();
  });
});
