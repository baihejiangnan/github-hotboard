import { prisma } from "@/lib/prisma";
import { parseShareDraftPayload } from "@/lib/share-drafts";
import { queryInputSchema, type QueryInput } from "@/lib/types";
import {
  createShareDraftFromRun,
  createVideoJob,
  processVideoJob,
  runRankingWorkflow
} from "@/lib/workflows";

type Stage =
  | "load_env"
  | "find_user"
  | "create_run"
  | "run_ranking"
  | "create_share_draft"
  | "create_video_job"
  | "process_video_job";

type TtsProviderName = "piper" | "openai" | "zai" | "none";

function fail(stage: Stage, message: string): never {
  throw new Error(`${stage}: ${message}`);
}

async function findSmokeUser() {
  const account = await prisma.account.findFirst({
    where: {
      provider: "github",
      access_token: {
        not: null
      }
    },
    include: {
      user: true
    },
    orderBy: {
      user: {
        updatedAt: "desc"
      }
    }
  });

  if (!account?.user) {
    fail("find_user", "未找到本地 GitHub 登录用户，请先完成一次 GitHub 登录。");
  }

  return account.user;
}

function buildTtsProviderCandidates(): TtsProviderName[] {
  const explicitProviders = process.env.SMOKE_TTS_PROVIDER
    ?.split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(
      (provider): provider is TtsProviderName =>
        provider === "piper" ||
        provider === "openai" ||
        provider === "zai" ||
        provider === "none"
    );

  if (explicitProviders && explicitProviders.length > 0) {
    return [...new Set(explicitProviders)];
  }

  const preferredProviders = [
    process.env.AI_TTS_PROVIDER?.toLowerCase(),
    "piper",
    "none",
    "openai",
    "zai"
  ].filter(
    (provider): provider is TtsProviderName =>
      provider === "piper" ||
      provider === "openai" ||
      provider === "zai" ||
      provider === "none"
  );

  return [...new Set(preferredProviders)].filter((provider) => {
    if (provider === "piper") {
      return true;
    }

    if (provider === "none") {
      return true;
    }

    if (provider === "openai") {
      return Boolean(process.env.OPENAI_API_KEY);
    }

    return Boolean(process.env.ZAI_API_KEY);
  });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    fail("load_env", "DATABASE_URL 未配置。");
  }

  const user = await findSmokeUser();
  const input = queryInputSchema.parse({
    rankingMode: "new_hot",
    windowDays: 7,
    limit: 10,
    keywordMode: "broad",
    excludeForks: true,
    excludeArchived: true
  }) as QueryInput;

  const run = await prisma.queryRun.create({
    data: {
      userId: user.id,
      inputJson: input
    }
  });

  let videoJobId = "";

  try {
    await runRankingWorkflow(run.id);
  } catch (error) {
    fail(
      "run_ranking",
      error instanceof Error ? error.message : "未知跑榜失败。"
    );
  }

  const refreshedRun = await prisma.queryRun.findUnique({
    where: { id: run.id },
    include: {
      results: true
    }
  });

  if (!refreshedRun || refreshedRun.results.length < 1) {
    fail("run_ranking", "没有生成 QueryRunResult。");
  }

  const draft = await createShareDraftFromRun(run.id, "wechat_article").catch((error) =>
    fail(
      "create_share_draft",
      error instanceof Error ? error.message : "未知分享稿生成失败。"
    )
  );

  const normalizedDraft = parseShareDraftPayload(draft.payload, {
    channel: "wechat_article",
    sourceRunId: run.id
  });

  const job = await createVideoJob(run.id, user.id, "vertical_60").catch((error) =>
    fail(
      "create_video_job",
      error instanceof Error ? error.message : "未知视频任务创建失败。"
    )
  );

  videoJobId = job.id;

  const originalTtsProvider = process.env.AI_TTS_PROVIDER;
  const providerCandidates = buildTtsProviderCandidates();

  if (providerCandidates.length < 1) {
    fail(
      "process_video_job",
      "没有可用的 TTS provider，请先运行 `npm run setup:piper`，或配置 OPENAI_API_KEY / ZAI_API_KEY，或将 AI_TTS_PROVIDER 设为 none。"
    );
  }

  let videoPath = "";
  let selectedTtsProvider = "";
  const providerErrors: string[] = [];

  try {
    for (const provider of providerCandidates) {
      process.env.AI_TTS_PROVIDER = provider;

      try {
        videoPath = await processVideoJob(job.id);
        selectedTtsProvider = provider;
        break;
      } catch (error) {
        const latest = await prisma.videoJob.findUnique({
          where: { id: videoJobId }
        });
        const detail =
          latest?.error ||
          (error instanceof Error ? error.message : "未知视频处理失败。");

        providerErrors.push(`${provider}: ${detail}`);
        console.warn(`[smoke:local] provider ${provider} failed: ${detail}`);
      }
    }
  } finally {
    process.env.AI_TTS_PROVIDER = originalTtsProvider;
  }

  if (!videoPath || !selectedTtsProvider) {
    fail("process_video_job", providerErrors.join(" | "));
  }

  const finalJob = await prisma.videoJob.findUnique({
    where: { id: job.id }
  });

  if (!finalJob || finalJob.status !== "completed" || !finalJob.videoPath) {
    fail("process_video_job", "视频任务没有完成，或缺少最终视频产物。");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: user.id,
        runId: run.id,
        resultCount: refreshedRun.results.length,
        draftId: draft.id,
        draftPath: draft.exportPath,
        draftTitle: normalizedDraft.titleOptions[0],
        jobId: finalJob.id,
        ttsProvider: selectedTtsProvider,
        audioPath: finalJob.audioPath,
        videoPath,
        status: finalJob.status,
        warning: finalJob.error
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[smoke:local]", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
