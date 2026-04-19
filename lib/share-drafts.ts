import type { Prisma, ShareDraft } from "@prisma/client";
import { z } from "zod";

import type { ShareChannel, ShareDraftPayload } from "@/lib/types";

const shareChannelSchema = z.union([
  z.literal("wechat_article"),
  z.literal("xiaohongshu_post")
]);

function trimStringArray(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function normalizeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

export const shareDraftPayloadSchema = z.object({
  channel: shareChannelSchema,
  titleOptions: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .transform(trimStringArray),
  body: z.string(),
  hashtags: z.array(z.string().trim().min(1).max(60)).default([]).transform(trimStringArray),
  coverText: z.string().default(""),
  sourceRunId: z.string().min(1)
});

export const shareDraftPayloadPatchSchema = z
  .object({
    titleOptions: z.array(z.string().trim().min(1).max(200)).min(1).transform(trimStringArray).optional(),
    body: z.string().optional(),
    hashtags: z.array(z.string().trim().min(1).max(60)).transform(trimStringArray).optional(),
    coverText: z.string().optional(),
    sourceRunId: z.string().min(1).optional()
  })
  .strict();

export type ShareDraftPayloadPatch = z.infer<typeof shareDraftPayloadPatchSchema>;

export type NormalizedShareDraft = {
  id: string;
  channel: ShareChannel;
  queryRunId: string;
  exportPath: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  titleOptions: string[];
  body: string;
  coverText: string;
  hashtags: string[];
  sourceRunId: string;
  payload: ShareDraftPayload;
};

type ShareDraftRecord = Pick<
  ShareDraft,
  "id" | "channel" | "queryRunId" | "payload" | "exportPath" | "createdAt" | "updatedAt"
>;

export function parseShareDraftPayload(
  payload: Prisma.JsonValue,
  fallback: { channel: ShareChannel; sourceRunId: string }
): ShareDraftPayload {
  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};

  return shareDraftPayloadSchema.parse({
    channel: base.channel ?? fallback.channel,
    titleOptions: base.titleOptions ?? ["未命名草稿"],
    body: normalizeString(base.body, "这份草稿还没有正文。"),
    hashtags: Array.isArray(base.hashtags) ? base.hashtags : [],
    coverText: normalizeString(base.coverText),
    sourceRunId: normalizeString(base.sourceRunId, fallback.sourceRunId)
  });
}

export function mergeShareDraftPayload(
  current: ShareDraftPayload,
  patch: ShareDraftPayloadPatch
): ShareDraftPayload {
  return shareDraftPayloadSchema.parse({
    ...current,
    ...patch,
    channel: current.channel,
    sourceRunId: patch.sourceRunId ?? current.sourceRunId
  });
}

export function serializeShareDraftPayload(
  payload: ShareDraftPayload
): Prisma.InputJsonObject {
  return {
    channel: payload.channel,
    titleOptions: payload.titleOptions,
    body: payload.body,
    hashtags: payload.hashtags,
    coverText: payload.coverText,
    sourceRunId: payload.sourceRunId
  };
}

export function normalizeShareDraft(draft: ShareDraftRecord): NormalizedShareDraft {
  const payload = parseShareDraftPayload(draft.payload, {
    channel: draft.channel as ShareChannel,
    sourceRunId: draft.queryRunId
  });

  return {
    id: draft.id,
    channel: payload.channel,
    queryRunId: draft.queryRunId,
    exportPath: draft.exportPath,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    title: payload.titleOptions[0] ?? "未命名草稿",
    titleOptions: payload.titleOptions,
    body: payload.body,
    coverText: payload.coverText || "这份草稿还没有封面文案。",
    hashtags: payload.hashtags,
    sourceRunId: payload.sourceRunId,
    payload
  };
}
