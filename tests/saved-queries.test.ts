import { describe, expect, it } from "vitest";

import {
  buildQueryInputFromSavedQuery,
  buildSavedQueryCreateData,
  buildSavedQueryUpdateData,
  savedQueryCreateSchema,
  savedQueryUpdateSchema
} from "@/lib/saved-queries";

describe("saved query helpers", () => {
  it("normalizes create input and keeps only persisted fields", () => {
    const input = savedQueryCreateSchema.parse({
      title: "  我的订阅  ",
      rankingMode: "growth",
      windowDays: 7,
      keyword: "  openclaw  ",
      language: "  TypeScript  ",
      topic: "  ai  ",
      limit: 20,
      scheduleCron: "0 9 * * 1-5",
      keywordMode: "broad",
      excludeForks: true,
      excludeArchived: true
    });
    const data = buildSavedQueryCreateData("user-1", input);

    expect(data).toMatchObject({
      userId: "user-1",
      title: "我的订阅",
      rankingMode: "growth",
      keyword: "openclaw",
      language: "TypeScript",
      topic: "ai",
      scheduleCron: "0 9 * * 1-5",
      isActive: true
    });
    expect(data.channelPreset).toEqual([
      "wechat_article",
      "xiaohongshu_post"
    ]);
    expect(data.nextRunAt).not.toBeNull();
  });

  it("clears schedule state when cron is removed", () => {
    const input = savedQueryUpdateSchema.parse({
      scheduleCron: "",
      isActive: true
    });
    const data = buildSavedQueryUpdateData(
      {
        id: "query-1",
        userId: "user-1",
        title: "已有订阅",
        rankingMode: "growth",
        windowDays: 7,
        keyword: "openclaw",
        language: "TypeScript",
        topic: "ai",
        limit: 10,
        channelPreset: [],
        scheduleCron: "0 9 * * *",
        isActive: true,
        nextRunAt: new Date(),
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
        lastRunResultCount: null,
        lastRunQueryRunId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      input
    );

    expect(data).toMatchObject({
      scheduleCron: null,
      isActive: false,
      nextRunAt: null
    });
  });

  it("rebuilds runtime query input with fixed defaults", () => {
    const input = buildQueryInputFromSavedQuery({
      rankingMode: "new_hot",
      windowDays: 14,
      keyword: "agent",
      language: null,
      topic: null,
      limit: 10
    });

    expect(input).toEqual({
      rankingMode: "new_hot",
      windowDays: 14,
      keyword: "agent",
      limit: 10,
      keywordMode: "broad",
      excludeForks: true,
      excludeArchived: true
    });
  });
});
