import { Prisma, QueryRunStatus, VideoJobStatus } from "@prisma/client";
import { max } from "date-fns";

import { isQuotaOrBalanceError } from "@/lib/ai/errors";
import { getGitHubAccessToken } from "@/lib/auth";
import { getVideoClipProvider } from "@/lib/env";
import { sendDailyDigestForDate } from "@/lib/digests";
import { GitHubClient } from "@/lib/github/client";
import { collectCandidates } from "@/lib/github/search";
import { prisma } from "@/lib/prisma";
import { rankGrowth, rankNewHot } from "@/lib/ranking";
import { buildQueryInputFromSavedQuery } from "@/lib/saved-queries";
import { getNextRunAtForCron } from "@/lib/schedule";
import { buildShareDraft } from "@/lib/share/generator";
import {
  serializeShareDraftPayload,
  shareDraftPayloadSchema
} from "@/lib/share-drafts";
import { writeTextArtifact } from "@/lib/storage";
import type {
  CaptionSegment,
  QueryInput,
  RankedRepository,
  RateLimitSnapshot,
  ShareChannel,
  VideoFormat,
  VideoScript
} from "@/lib/types";
import { queryInputSchema } from "@/lib/types";

const db = prisma;

function logWorkflowStage(
  workflow: "runRankingWorkflow" | "processVideoJob",
  stage: string,
  payload?: Record<string, unknown>
) {
  console.info(`[workflow][${workflow}]`, stage, payload ?? {});
}

function stripUndefined<T extends object>(value: T) {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([, entry]) => entry !== undefined
    )
  );
}

function serializeQuotaSnapshot(quotaSnapshot: RateLimitSnapshot[]): Prisma.InputJsonValue {
  return quotaSnapshot.map((snapshot) => stripUndefined(snapshot)) as Prisma.InputJsonValue;
}

function serializeCaptionSegments(captions: CaptionSegment[]): Prisma.InputJsonValue {
  return captions.map((segment) => ({
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text
  })) as Prisma.InputJsonValue;
}

async function upsertRepositories(candidates: RankedRepository[]) {
  const records = [];

  for (const candidate of candidates) {
    const repository = await db.repository.upsert({
      where: { githubId: candidate.githubId },
      update: {
        owner: candidate.owner,
        name: candidate.name,
        fullName: candidate.fullName,
        htmlUrl: candidate.htmlUrl,
        description: candidate.description,
        topics: candidate.topics,
        language: candidate.language,
        defaultBranch: candidate.defaultBranch,
        totalStars: candidate.totalStars,
        fork: candidate.fork,
        archived: candidate.archived,
        createdAt: candidate.createdAt,
        pushedAt: candidate.pushedAt,
        metadataSyncedAt: new Date()
      },
      create: {
        githubId: candidate.githubId,
        owner: candidate.owner,
        name: candidate.name,
        fullName: candidate.fullName,
        htmlUrl: candidate.htmlUrl,
        description: candidate.description,
        topics: candidate.topics,
        language: candidate.language,
        defaultBranch: candidate.defaultBranch,
        totalStars: candidate.totalStars,
        fork: candidate.fork,
        archived: candidate.archived,
        createdAt: candidate.createdAt,
        pushedAt: candidate.pushedAt
      }
    });

    records.push({
      repositoryId: repository.id,
      candidate
    });
  }

  return records;
}

async function syncStarEvents(
  client: GitHubClient,
  repositoryId: string,
  repo: RankedRepository,
  windowDays: number
) {
  const latestKnown = await db.repoStarEvent.findFirst({
    where: { repositoryId },
    orderBy: {
      starredAt: "desc"
    },
    select: {
      starredAt: true
    }
  });

  const windowStart = max([
    new Date(0),
    new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  ]);
  let cursor: string | null | undefined = null;
  let hasNextPage = true;
  const collected: Date[] = [];

  while (hasNextPage) {
    const page = await client.fetchRecentStargazers(repo.owner, repo.name, cursor);

    for (const edge of page.edges) {
      const starredAt = new Date(edge.starredAt);

      if (latestKnown?.starredAt && starredAt <= latestKnown.starredAt) {
        hasNextPage = false;
        break;
      }

      if (starredAt < windowStart) {
        hasNextPage = false;
        break;
      }

      collected.push(starredAt);
    }

    if (!page.pageInfo.hasNextPage || !page.pageInfo.endCursor) {
      break;
    }

    cursor = page.pageInfo.endCursor;
  }

  if (!collected.length) {
    return 0;
  }

  await db.repoStarEvent.createMany({
    data: collected.map((starredAt) => ({
      repositoryId,
      starredAt
    })),
    skipDuplicates: true
  });

  return collected.length;
}

function serializeMetric(repo: RankedRepository) {
  return {
    fullName: repo.fullName,
    htmlUrl: repo.htmlUrl,
    description: repo.description,
    topics: repo.topics,
    language: repo.language,
    createdAt: repo.createdAt.toISOString(),
    pushedAt: repo.pushedAt?.toISOString() ?? null,
    totalStars: repo.totalStars,
    starGain: repo.starGain,
    starsPerDay: repo.starsPerDay,
    matchedFields: repo.matchedFields
  };
}

async function updateSavedQuerySummary(
  savedQueryId: string,
  values: Prisma.SavedQueryUncheckedUpdateInput
) {
  await db.savedQuery.update({
    where: { id: savedQueryId },
    data: values
  });
}

export async function createQueryRunFromSavedQuery(
  savedQueryId: string,
  triggerType: "manual" | "scheduled" | "retry" = "scheduled",
  retryOfRunId?: string,
  attemptNumber = 1
) {
  const savedQuery = await db.savedQuery.findUnique({
    where: { id: savedQueryId }
  });

  if (!savedQuery) {
    throw new Error("订阅不存在。");
  }

  const input = buildQueryInputFromSavedQuery(savedQuery);

  return db.queryRun.create({
    data: {
      userId: savedQuery.userId,
      savedQueryId: savedQuery.id,
      inputJson: input,
      triggerType,
      retryOfRunId,
      attemptNumber
    }
  });
}

export async function executeSavedQueryRun(
  savedQueryId: string,
  triggerType: "manual" | "scheduled" | "retry" = "scheduled",
  retryOfRunId?: string,
  attemptNumber = 1
) {
  const run = await createQueryRunFromSavedQuery(
    savedQueryId,
    triggerType,
    retryOfRunId,
    attemptNumber
  );
  await runRankingWorkflow(run.id);
  return run;
}

export async function runRankingWorkflow(runId: string) {
  logWorkflowStage("runRankingWorkflow", "start", { runId });
  const run = await db.queryRun.findUnique({
    where: { id: runId }
  });

  if (!run) {
    throw new Error(`Query run ${runId} was not found.`);
  }

  const input = queryInputSchema.parse(run.inputJson) as QueryInput;
  await db.queryRun.update({
    where: { id: runId },
    data: {
      status: QueryRunStatus.running,
      startedAt: new Date(),
      error: null
    }
  });

  try {
    logWorkflowStage("runRankingWorkflow", "load_github_token", {
      runId,
      userId: run.userId
    });
    const token = await getGitHubAccessToken(run.userId);
    const client = new GitHubClient(token);
    logWorkflowStage("runRankingWorkflow", "collect_candidates", { runId });
    const searchResult = await collectCandidates(client, input);
    const candidates = searchResult.candidates.map((candidate: RankedRepository) => ({
      ...candidate
    })) as RankedRepository[];
    const repositoryMap = await upsertRepositories(candidates);
    const byGitHubId = new Map(
      repositoryMap.map((entry) => [entry.candidate.githubId, entry])
    );

    if (input.rankingMode === "growth") {
      logWorkflowStage("runRankingWorkflow", "sync_star_events", { runId });
      for (const repo of candidates) {
        const repository = byGitHubId.get(repo.githubId);
        if (!repository) continue;

        await syncStarEvents(client, repository.repositoryId, repo, input.windowDays);
        const windowStart = new Date(
          Date.now() - input.windowDays * 24 * 60 * 60 * 1000
        );
        const starGain = await db.repoStarEvent.count({
          where: {
            repositoryId: repository.repositoryId,
            starredAt: {
              gte: windowStart
            }
          }
        });

        repo.starGain = starGain;
      }
    }

    const ranked =
      input.rankingMode === "growth"
        ? rankGrowth(candidates, input)
        : rankNewHot(candidates, input);

    await db.queryRunResult.deleteMany({
      where: {
        queryRunId: runId
      }
    });

    logWorkflowStage("runRankingWorkflow", "persist_results", {
      runId,
      resultCount: ranked.length,
      partial: searchResult.partial
    });

    for (const [index, repo] of ranked.entries()) {
      const repository = byGitHubId.get(repo.githubId);
      if (!repository) continue;

      await db.queryRunResult.create({
        data: {
          queryRunId: runId,
          repositoryId: repository.repositoryId,
          rank: index + 1,
          totalStars: repo.totalStars,
          starGain: repo.starGain,
          starsPerDay: repo.starsPerDay ?? null,
          matchedFields: repo.matchedFields
        }
      });
    }

    await db.queryRun.update({
      where: { id: runId },
      data: {
        status: QueryRunStatus.completed,
        resultCount: ranked.length,
        partial: searchResult.partial,
        quotaSnapshot: serializeQuotaSnapshot(searchResult.quotaSnapshot),
        finishedAt: new Date()
      }
    });

    if (run.savedQueryId) {
      const savedQuery = await db.savedQuery.findUnique({
        where: { id: run.savedQueryId }
      });
      await updateSavedQuerySummary(run.savedQueryId, {
        lastRunAt: new Date(),
        lastRunStatus: "completed",
        lastRunError: null,
        lastRunResultCount: ranked.length,
        lastRunQueryRunId: run.id,
        nextRunAt:
          savedQuery?.scheduleCron && savedQuery.isActive
            ? getNextRunAtForCron(savedQuery.scheduleCron)
            : null
      });
    }

    return ranked.map(serializeMetric);
  } catch (error) {
    console.error("[workflow][runRankingWorkflow]", { runId, error });
    await db.queryRun.update({
      where: { id: runId },
      data: {
        status: QueryRunStatus.failed,
        error:
          error instanceof Error
            ? error.message
            : "Unknown ranking workflow error.",
        finishedAt: new Date()
      }
    });

    if (run.savedQueryId) {
      const savedQuery = await db.savedQuery.findUnique({
        where: { id: run.savedQueryId }
      });
      await updateSavedQuerySummary(run.savedQueryId, {
        lastRunAt: new Date(),
        lastRunStatus: "failed",
        lastRunError: error instanceof Error ? error.message : "未知错误",
        lastRunResultCount: 0,
        lastRunQueryRunId: run.id,
        nextRunAt:
          savedQuery?.scheduleCron && savedQuery.isActive
            ? getNextRunAtForCron(savedQuery.scheduleCron)
            : null
      });
    }

    throw error;
  }
}

async function loadRunRepos(runId: string) {
  const run = await db.queryRun.findUnique({
    where: { id: runId },
    include: {
      results: {
        orderBy: {
          rank: "asc"
        },
        include: {
          repository: true
        }
      }
    }
  });

  if (!run) {
    throw new Error(`Run ${runId} not found.`);
  }

  const input = queryInputSchema.parse(run.inputJson) as QueryInput;
  const repos: RankedRepository[] = run.results.map((result) => ({
    githubId: result.repository.githubId,
    owner: result.repository.owner,
    name: result.repository.name,
    fullName: result.repository.fullName,
    htmlUrl: result.repository.htmlUrl,
    description: result.repository.description,
    topics: (result.repository.topics as string[]) ?? [],
    language: result.repository.language,
    defaultBranch: result.repository.defaultBranch,
    totalStars: result.totalStars,
    fork: result.repository.fork,
    archived: result.repository.archived,
    createdAt: result.repository.createdAt,
    pushedAt: result.repository.pushedAt,
    matchedFields: (result.matchedFields as string[]) ?? [],
    starGain: result.starGain ?? undefined,
    starsPerDay: result.starsPerDay ?? undefined
  }));

  return { run, input, repos };
}

export async function createShareDraftFromRun(runId: string, channel: ShareChannel) {
  const { input, repos, run } = await loadRunRepos(runId);
  const payload = shareDraftPayloadSchema.parse(
    await buildShareDraft(channel, runId, input, repos)
  );
  const extension = channel === "wechat_article" ? "md" : "txt";
  const content = [
    payload.titleOptions.join("\n"),
    "",
    payload.body,
    "",
    `标签：${payload.hashtags.join(" ")}`
  ].join("\n");
  const exportPath = await writeTextArtifact(
    "share",
    `${runId}-${channel}.${extension}`,
    content
  );

  return db.shareDraft.create({
    data: {
      userId: run.userId,
      queryRunId: runId,
      channel,
      payload: serializeShareDraftPayload(payload),
      exportPath
    }
  });
}

export async function createVideoJob(
  runId: string,
  userId: string,
  format: VideoFormat
) {
  const { input, repos } = await loadRunRepos(runId);
  const { buildVideoScript, serializeVideoScript } = await import("@/lib/video/script");
  const script = await buildVideoScript(format, input, repos);

  return db.videoJob.create({
    data: {
      userId,
      queryRunId: runId,
      format,
      scriptJson: serializeVideoScript(script),
      status: VideoJobStatus.pending
    }
  });
}

export async function processVideoJob(jobId: string) {
  logWorkflowStage("processVideoJob", "start", { jobId });
  const [
    { createSpeechProvider },
    { renderVideoJob },
    { exportCaptionArtifact },
    { muxAudioTrack }
  ] = await Promise.all([
    import("@/lib/video/speech"),
    import("@/lib/video/remotion"),
    import("@/lib/video/captions"),
    import("@/lib/video/ffmpeg")
  ]);

  const job = await db.videoJob.findUnique({
    where: { id: jobId }
  });

  if (!job) {
    throw new Error(`Video job ${jobId} not found.`);
  }

  if (job.status === VideoJobStatus.completed && job.videoPath) {
    logWorkflowStage("processVideoJob", "skip_completed", {
      jobId,
      videoPath: job.videoPath
    });
    return job.videoPath;
  }

  const { videoScriptSchema } = await import("@/lib/types");
  const script = videoScriptSchema.parse(job.scriptJson) as VideoScript;
  await db.videoJob.update({
    where: { id: jobId },
    data: {
      status: VideoJobStatus.rendering,
      error: null
    }
  });

  let fallbackWarning: string | null = null;

  try {
    if (getVideoClipProvider() !== "none") {
      try {
        logWorkflowStage("processVideoJob", "clip_generation", { jobId });
        const { generateSceneClips } = await import("@/lib/video/clip-orchestrator");
        const clipMap = await generateSceneClips(script.scenes, job.format as VideoFormat);
        for (const [index, clipPath] of clipMap) {
          script.scenes[index].clipPath = clipPath;
        }
      } catch (error) {
        console.warn("[workflow][processVideoJob][clip_generation_failed]", {
          jobId,
          error
        });
      }
    }

    const audioPath = await (async () => {
      const provider = createSpeechProvider();

      if (!provider) {
        fallbackWarning =
          "speech_synthesis_skipped: no_tts_provider_configured | rendered_without_audio";
        return null;
      }

      try {
        logWorkflowStage("processVideoJob", "speech_synthesis", { jobId });
        const narration = script.narrationSegments
          .map((segment) => segment.text)
          .join("\n");
        const result = await provider.synthesize(job.id, narration);
        return result.audioPath;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "unknown speech synthesis failure";
        fallbackWarning = `speech_synthesis_failed: ${message} | rendered_without_audio`;
        console.warn("[workflow][processVideoJob][speech_synthesis_failed]", {
          jobId,
          error,
          nonRetryable: isQuotaOrBalanceError(error)
        });
        return null;
      }
    })();

    const captions = script.captionSegments;
    const captionPath = await exportCaptionArtifact(jobId, captions);
    const renderedVideoPath = await (async () => {
      try {
        logWorkflowStage("processVideoJob", "video_render", { jobId });
        return await renderVideoJob(
          job.id,
          job.format as VideoFormat,
          script,
          null,
          captions
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "unknown video render failure";
        await db.videoJob.update({
          where: { id: jobId },
          data: {
            status: VideoJobStatus.failed,
            error: `video_render_failed: ${message}`
          }
        });
        throw error;
      }
    })();

    const finalVideoPath = await (async () => {
      if (!audioPath) {
        return renderedVideoPath;
      }

      try {
        logWorkflowStage("processVideoJob", "audio_mux", { jobId });
        return await muxAudioTrack(renderedVideoPath, audioPath);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "unknown audio mux failure";
        fallbackWarning = `audio_mux_failed: ${message} | rendered_without_audio`;
        console.warn("[workflow][processVideoJob][audio_mux_failed]", {
          jobId,
          error
        });
        return renderedVideoPath;
      }
    })();

    await db.videoJob.update({
      where: { id: jobId },
      data: {
        status: VideoJobStatus.completed,
        audioPath,
        captionJson: serializeCaptionSegments(captions),
        videoPath: finalVideoPath,
        error: fallbackWarning
      }
    });

    logWorkflowStage("processVideoJob", "complete", {
      jobId,
      videoPath: finalVideoPath,
      captionPath
    });

    return finalVideoPath;
  } catch (error) {
    console.error("[workflow][processVideoJob]", { jobId, error });
    throw error;
  }
}

export async function triggerRetryIfNeeded(runId: string) {
  const run = await db.queryRun.findUnique({
    where: { id: runId }
  });

  if (
    !run ||
    !run.savedQueryId ||
    run.triggerType !== "scheduled" ||
    run.attemptNumber >= 2
  ) {
    return null;
  }

  const retryRun = await createQueryRunFromSavedQuery(
    run.savedQueryId,
    "retry",
    run.id,
    2
  );
  await runRankingWorkflow(retryRun.id);
  return retryRun;
}

export async function sendTodayDigest() {
  await sendDailyDigestForDate(new Date());
}
