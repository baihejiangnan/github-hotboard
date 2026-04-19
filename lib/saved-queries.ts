import type { Prisma, SavedQuery } from "@prisma/client";
import { z } from "zod";

import { getNextRunAtForCron } from "@/lib/schedule";
import {
  queryInputSchema,
  type QueryInput,
  rankingModeSchema,
  windowDaysSchema
} from "@/lib/types";

const defaultChannelPreset = ["wechat_article", "xiaohongshu_post"] as const;

function emptyStringToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

function emptyStringToNull(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

const optionalString = (max: number) =>
  z.preprocess(emptyStringToUndefined, z.string().max(max).optional());

const optionalCron = z.preprocess(
  emptyStringToNull,
  z.string().min(5).max(100).nullable().optional()
);

const channelPresetSchema = z
  .array(z.union([z.literal("wechat_article"), z.literal("xiaohongshu_post")]))
  .default([...defaultChannelPreset]);

export const savedQueryCreateSchema = z.object({
  title: z.preprocess(emptyStringToUndefined, z.string().min(2).max(80)),
  rankingMode: rankingModeSchema,
  windowDays: windowDaysSchema,
  keyword: optionalString(120),
  language: optionalString(50),
  topic: optionalString(50),
  limit: z.union([z.literal(10), z.literal(20)]),
  scheduleCron: optionalCron,
  isActive: z.boolean().optional(),
  channelPreset: channelPresetSchema.optional()
});

export const savedQueryUpdateSchema = z
  .object({
    title: z.preprocess(emptyStringToUndefined, z.string().min(2).max(80).optional()),
    scheduleCron: optionalCron,
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field must be provided."
  });

export type SavedQueryCreateInput = z.infer<typeof savedQueryCreateSchema>;
export type SavedQueryUpdateInput = z.infer<typeof savedQueryUpdateSchema>;

export function buildSavedQueryCreateData(
  userId: string,
  input: SavedQueryCreateInput
): Prisma.SavedQueryUncheckedCreateInput {
  const scheduleCron = input.scheduleCron ?? null;
  const isActive = scheduleCron ? input.isActive !== false : false;

  return {
    userId,
    title: input.title,
    rankingMode: input.rankingMode,
    windowDays: input.windowDays,
    keyword: input.keyword ?? null,
    language: input.language ?? null,
    topic: input.topic ?? null,
    limit: input.limit,
    channelPreset: (input.channelPreset ?? [...defaultChannelPreset]) as Prisma.InputJsonValue,
    scheduleCron,
    isActive,
    nextRunAt: scheduleCron && isActive ? getNextRunAtForCron(scheduleCron) : null
  };
}

export function buildSavedQueryUpdateData(
  current: SavedQuery,
  input: SavedQueryUpdateInput
): Prisma.SavedQueryUncheckedUpdateInput {
  const scheduleCron =
    input.scheduleCron === undefined ? current.scheduleCron : input.scheduleCron;
  const isActive = scheduleCron
    ? input.isActive !== undefined
      ? input.isActive
      : current.isActive
    : false;

  return {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.scheduleCron !== undefined ? { scheduleCron } : {}),
    ...(input.isActive !== undefined || input.scheduleCron !== undefined
      ? {
          isActive,
          nextRunAt: scheduleCron && isActive ? getNextRunAtForCron(scheduleCron) : null
        }
      : {})
  };
}

export function buildQueryInputFromSavedQuery(
  savedQuery: Pick<SavedQuery, "rankingMode" | "windowDays" | "keyword" | "language" | "topic" | "limit">
): QueryInput {
  return queryInputSchema.parse({
    rankingMode: savedQuery.rankingMode,
    windowDays: savedQuery.windowDays,
    keyword: savedQuery.keyword ?? undefined,
    language: savedQuery.language ?? undefined,
    topic: savedQuery.topic ?? undefined,
    limit: savedQuery.limit,
    keywordMode: "broad",
    excludeForks: true,
    excludeArchived: true
  });
}
