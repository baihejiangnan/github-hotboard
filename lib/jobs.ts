import PgBoss from "pg-boss";

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
  await boss.schedule("saved-query.dispatch", "* * * * *", null);

  // 每日晚间发送“我的订阅日报”，使用本地时区语义。
  await boss.schedule("daily-digest.tick", "0 20 * * *", null, {
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

  for (const query of dueQueries) {
    try {
      const run = await executeSavedQueryRun(query.id, "scheduled");

      if (run?.status === "failed") {
        await triggerRetryIfNeeded(run.id);
      }
    } catch (error) {
      console.error("[saved-query.dispatch]", error);

      const latestRun = await db.queryRun.findFirst({
        where: {
          savedQueryId: query.id
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (latestRun?.id) {
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

    await runRankingWorkflow(data.runId);
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

    await createShareDraftFromRun(data.runId, data.channel);
  });

  await boss.work("video.render", async ([job]) => {
    const data = (job?.data ?? {}) as { jobId?: string };
    if (!data.jobId) {
      return;
    }

    await processVideoJob(data.jobId);
  });

  await boss.work("daily-digest.tick", async () => {
    await sendTodayDigest();
  });
}
