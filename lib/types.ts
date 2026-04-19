import { z } from "zod";

export const windowDaysSchema = z.union([
  z.literal(1),
  z.literal(7),
  z.literal(14),
  z.literal(30)
]);

export const rankingModeSchema = z.union([
  z.literal("new_hot"),
  z.literal("growth")
]);

export const queryInputSchema = z.object({
  rankingMode: rankingModeSchema,
  windowDays: windowDaysSchema,
  keyword: z.string().trim().min(1).max(120).optional(),
  language: z.string().trim().min(1).max(50).optional(),
  topic: z.string().trim().min(1).max(50).optional(),
  limit: z.union([z.literal(10), z.literal(20)]),
  keywordMode: z.literal("broad").default("broad"),
  excludeForks: z.literal(true).default(true),
  excludeArchived: z.literal(true).default(true)
});

export type QueryInput = z.infer<typeof queryInputSchema>;

export type ShareChannel = "wechat_article" | "xiaohongshu_post";
export type VideoFormat = "vertical_60" | "horizontal_90";

export interface RateLimitSnapshot {
  remaining?: number;
  limit?: number;
  resetAt?: string;
  source?: "rest" | "graphql";
}

export interface RepoMetric {
  fullName: string;
  htmlUrl: string;
  description: string | null;
  topics: string[];
  language: string | null;
  createdAt: string;
  pushedAt: string | null;
  totalStars: number;
  starGain?: number;
  starsPerDay?: number;
  matchedFields: string[];
}

export interface ShareDraftPayload {
  channel: ShareChannel;
  titleOptions: string[];
  body: string;
  hashtags: string[];
  coverText: string;
  sourceRunId: string;
}

export interface NarrationSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface CaptionSegment {
  startMs: number;
  endMs: number;
  text: string;
}

export interface VideoScene {
  title: string;
  body: string;
  accent: string;
  repoName?: string;
}

export interface VideoScript {
  format: VideoFormat;
  scenes: VideoScene[];
  narrationSegments: NarrationSegment[];
  captionSegments: CaptionSegment[];
  cta: string;
}

export interface SearchCandidate {
  githubId: string;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  topics: string[];
  language: string | null;
  defaultBranch: string | null;
  totalStars: number;
  fork: boolean;
  archived: boolean;
  createdAt: Date;
  pushedAt: Date | null;
  matchedFields: string[];
}

export interface RankedRepository extends SearchCandidate {
  starGain?: number;
  starsPerDay?: number;
}

export const shareDraftRequestSchema = z.object({
  runId: z.string().min(1),
  channel: z.union([z.literal("wechat_article"), z.literal("xiaohongshu_post")])
});

export const videoJobRequestSchema = z.object({
  runId: z.string().min(1),
  format: z.union([z.literal("vertical_60"), z.literal("horizontal_90")])
});

export const savedQueryRequestSchema = queryInputSchema.extend({
  title: z.string().trim().min(2).max(80),
  scheduleCron: z.string().trim().min(5).max(100).optional(),
  channelPreset: z.array(z.union([z.literal("wechat_article"), z.literal("xiaohongshu_post")])).default([
    "wechat_article",
    "xiaohongshu_post"
  ])
});

