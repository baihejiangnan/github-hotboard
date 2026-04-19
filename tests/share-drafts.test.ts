import { describe, expect, it } from "vitest";

import {
  mergeShareDraftPayload,
  normalizeShareDraft,
  serializeShareDraftPayload,
  shareDraftPayloadPatchSchema
} from "@/lib/share-drafts";

describe("share draft helpers", () => {
  it("normalizes persisted payload into a single view model", () => {
    const normalized = normalizeShareDraft({
      id: "draft-1",
      channel: "wechat_article",
      queryRunId: "run-1",
      payload: {
        channel: "wechat_article",
        titleOptions: ["主标题", "备选标题"],
        body: "正文内容",
        hashtags: ["GitHub热榜", "开源项目"],
        coverText: "封面文案",
        sourceRunId: "run-1"
      },
      exportPath: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-02T00:00:00.000Z")
    });

    expect(normalized.title).toBe("主标题");
    expect(normalized.titleOptions).toEqual(["主标题", "备选标题"]);
    expect(normalized.coverText).toBe("封面文案");
    expect(normalized.hashtags).toEqual(["GitHub热榜", "开源项目"]);
    expect(normalized.sourceRunId).toBe("run-1");
  });

  it("merges payload patches without changing channel ownership", () => {
    const patch = shareDraftPayloadPatchSchema.parse({
      titleOptions: ["新标题"],
      hashtags: ["新标签"]
    });
    const merged = mergeShareDraftPayload(
      {
        channel: "xiaohongshu_post",
        titleOptions: ["旧标题"],
        body: "旧正文",
        hashtags: ["旧标签"],
        coverText: "旧封面",
        sourceRunId: "run-2"
      },
      patch
    );

    expect(merged).toEqual({
      channel: "xiaohongshu_post",
      titleOptions: ["新标题"],
      body: "旧正文",
      hashtags: ["新标签"],
      coverText: "旧封面",
      sourceRunId: "run-2"
    });
  });

  it("serializes payload into a Prisma-safe JSON object", () => {
    const serialized = serializeShareDraftPayload({
      channel: "wechat_article",
      titleOptions: ["主标题", "副标题"],
      body: "正文",
      hashtags: ["GitHub热榜"],
      coverText: "封面文案",
      sourceRunId: "run-1"
    });

    expect(serialized).toEqual({
      channel: "wechat_article",
      titleOptions: ["主标题", "副标题"],
      body: "正文",
      hashtags: ["GitHub热榜"],
      coverText: "封面文案",
      sourceRunId: "run-1"
    });
  });
});
