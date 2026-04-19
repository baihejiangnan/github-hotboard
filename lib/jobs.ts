import PgBoss from "pg-boss";

import { isQuotaOrBalanceError } from "@/lib/ai/errors";
import { prisma } from "@/lib/prisma";
import {
  createShareDraftFromRun,
  executeSavedQueryRun,
  processVideoJob,
  runRankingWorkflow,
  sendTodayDigest,
  triggerRetryIfNeeded
} from "@/lib/workflows";

let bossPromise: Promise<PgBoss> | null = null;

const QUEUE_NAMES = [
  "query.run",
  "saved-query.dispatch",
  "share.generate",
  "video.render",
  "daily-digest.tick"
] as const;

function logWorkerEvent(event: string, payload?: Record<string, unknown>) {
  console.info("[worker]", event, payload ?? {});
}

async function createBoss() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("缺少 DATABASE_URL，无法启动 pg-boss。");
  }

  const boss = new PgBoss({
    connectionString
  });

  boss.on("error", (error) => {
    console.error("[pg-boss]", error);
  });

  await boss.start();
  return boss;
}

export async function getBoss() {
  if (!bossPromise) {
    bossPromise = createBoss();
  }

  return bossPromise;
}

async function ensureQueues(boss: PgBoss) {
  for (const queueName of QUEUE_NAMES) {
    await boss.createQueue(queueName);
  }
}

export async function publishQueryRun(runId: string) {
  const boss = await getBoss();
  await boss.send("query.run", { runId });
}

export async function publishVideoJob(jobId: string) {
  const boss = await getBoss();
  await boss.send("video.render", { jobId });
}

export async function publishShareDraft(runId: string, channel: "wechat_article" | "xiaohongshu_post") {
  const boss = await getBoss();
  await boss.send("share.generate", { runId, channel });
}

export async function syncSavedQuerySchedules() {
  const boss = await getBoss();
  await ensureQueues(boss);

  // 全局订阅调度器：每分钟检查一次到点订阅，避免为每个订阅注册独立 queue。
  await boss.schedule("saved-query.dispatch", "* * * * *", undefined);

  // 每日晚间发送“我的订阅日报”，使用本地时区语义。
  await boss.schedule("daily-digest.tick", "0 20 * * *", undefined, {
    tz: "Asia/Shanghai"
  });
}

async function handleScheduledDispatch() {
  const db = prisma as any;
  const dueQueries = await db.savedQuery.findMany({
    where: {
      isActive: true,
      scheduleCron: {
        not: null
      },
      nextRunAt: {
        lte: new Date()
      }
    },
    select: {
      id: true
    },
    orderBy: {
      nextRunAt: "asc"
    },
    take: 20
  });

  logWorkerEvent("saved-query.dispatch.found", {
    dueQueryCount: dueQueries.length
  });

  for (const query of dueQueries) {
    try {
      logWorkerEvent("saved-query.dispatch.start", { savedQueryId: query.id });
      const run = await executeSavedQueryRun(query.id, "scheduled");

      if (run?.status === "failed") {
        logWorkerEvent("saved-query.dispatch.retry", {
          savedQueryId: query.id,
          runId: run.id,
          triggerType: run.triggerType
        });
        await triggerRetryIfNeeded(run.id);
      }
    } catch (error) {
      console.error("[saved-query.dispatch]", { savedQueryId: query.id, error });

      const latestRun = await db.queryRun.findFirst({
        where: {
          savedQueryId: query.id
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (latestRun?.id) {
        logWorkerEvent("saved-query.dispatch.retry_after_error", {
          savedQueryId: query.id,
          runId: latestRun.id,
          triggerType: latestRun.triggerType
        });
        await triggerRetryIfNeeded(latestRun.id);
      }
    }
  }
}

export async function registerWorkers() {
  const boss = await getBoss();
  await ensureQueues(boss);

  await boss.work("query.run", async ([job]) => {
    const data = (job?.data ?? {}) as { runId?: string };
    if (!data.runId) {
      return;
    }

    logWorkerEvent("query.run.start", { runId: data.runId });
    await runRankingWorkflow(data.runId);
    logWorkerEvent("query.run.complete", { runId: data.runId });
  });

  await boss.work("saved-query.dispatch", async () => {
    await handleScheduledDispatch();
  });

  await boss.work("share.generate", async ([job]) => {
    const data = (job?.data ?? {}) as {
      runId?: string;
      channel?: "wechat_article" | "xiaohongshu_post";
    };

    if (!data.runId || !data.channel) {
      return;
    }

    logWorkerEvent("share.generate.start", data);
    await createShareDraftFromRun(data.runId, data.channel);
    logWorkerEvent("share.generate.complete", data);
  });

  await boss.work("video.render", async ([job]) => {
    const data = (job?.data ?? {}) as { jobId?: string };
    if (!data.jobId) {
      return;
    }

    await handleVideoRenderJob(data.jobId);
  });

  await boss.work("daily-digest.tick", async () => {
    logWorkerEvent("daily-digest.tick.start");
    await sendTodayDigest();
    logWorkerEvent("daily-digest.tick.complete");
  });
}

export async function handleVideoRenderJob(jobId: string) {
  try {
    logWorkerEvent("video.render.start", { jobId });
    await processVideoJob(jobId);
    logWorkerEvent("video.render.complete", { jobId });
  } catch (error) {
    if (isQuotaOrBalanceError(error)) {
      logWorkerEvent("video.render.non_retryable_failure", {
        jobId,
        reason: error instanceof Error ? error.message : String(error)
      });
      return;
    }

    throw error;
  }
}
