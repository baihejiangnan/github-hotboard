import { describe, expect, it } from "vitest";

import { buildShareDraft } from "@/lib/share/generator";
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
  it("creates a wechat payload with repo links", () => {
    const payload = buildShareDraft(
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
});

