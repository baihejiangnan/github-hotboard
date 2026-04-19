import { describe, expect, it } from "vitest";

import { rankGrowth, rankNewHot } from "@/lib/ranking";
import type { RankedRepository } from "@/lib/types";

const now = new Date();

const repo = (partial: Partial<RankedRepository>): RankedRepository => ({
  githubId: partial.githubId || crypto.randomUUID(),
  owner: partial.owner || "owner",
  name: partial.name || "repo",
  fullName: partial.fullName || "owner/repo",
  htmlUrl: partial.htmlUrl || "https://github.com/owner/repo",
  description: partial.description || "desc",
  topics: partial.topics || [],
  language: partial.language || "TypeScript",
  defaultBranch: partial.defaultBranch || "main",
  totalStars: partial.totalStars ?? 100,
  fork: partial.fork ?? false,
  archived: partial.archived ?? false,
  createdAt: partial.createdAt || now,
  pushedAt: partial.pushedAt || now,
  matchedFields: partial.matchedFields || [],
  starGain: partial.starGain,
  starsPerDay: partial.starsPerDay
});

describe("ranking", () => {
  it("keeps only new repositories for new_hot", () => {
    const results = rankNewHot(
      [
        repo({ fullName: "a/newer", totalStars: 300, createdAt: now }),
        repo({
          fullName: "b/older",
          totalStars: 999,
          createdAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000)
        })
      ],
      {
        rankingMode: "new_hot",
        windowDays: 7,
        limit: 10,
        keywordMode: "broad",
        excludeForks: true,
        excludeArchived: true
      }
    );

    expect(results).toHaveLength(1);
    expect(results[0].fullName).toBe("a/newer");
  });

  it("sorts growth repositories by star gain first", () => {
    const results = rankGrowth(
      [
        repo({ fullName: "a/slow", totalStars: 1000, starGain: 18 }),
        repo({ fullName: "b/fast", totalStars: 400, starGain: 29 })
      ],
      {
        rankingMode: "growth",
        windowDays: 7,
        limit: 10,
        keywordMode: "broad",
        excludeForks: true,
        excludeArchived: true
      }
    );

    expect(results[0].fullName).toBe("b/fast");
    expect(results[0].starsPerDay).toBeCloseTo(4.14, 2);
  });
});

