import { describe, expect, it } from "vitest";

import { buildSearchQueries } from "@/lib/query-input";

describe("buildSearchQueries", () => {
  it("builds three queries with the expected strategies", () => {
    const queries = buildSearchQueries({
      rankingMode: "growth",
      windowDays: 7,
      keyword: "openclaw",
      language: "TypeScript",
      topic: "ai",
      limit: 10,
      keywordMode: "broad",
      excludeForks: true,
      excludeArchived: true
    });

    expect(queries).toHaveLength(3);
    expect(queries[0].query).toContain("openclaw");
    expect(queries[1].query).toContain("created:>=");
    expect(queries[2].sort).toBe("updated");
  });
});

