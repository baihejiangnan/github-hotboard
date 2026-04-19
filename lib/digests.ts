import { createMailProvider } from "@/lib/mail";
import { prisma } from "@/lib/prisma";

function startOfLocalDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfLocalDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function digestDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDigestText(input: {
  dateLabel: string;
  totalRuns: number;
  completedCount: number;
  failedCount: number;
  partialCount: number;
  failedItems: Array<{ title: string; error: string }>;
  topItems: Array<{ title: string; url: string }>;
}) {
  const lines = [
    `我的订阅日报 · ${input.dateLabel}`,
    "",
    `今日运行：${input.totalRuns} 次`,
    `成功：${input.completedCount} 次`,
    `失败：${input.failedCount} 次`,
    `部分结果：${input.partialCount} 次`
  ];

  if (input.failedItems.length) {
    lines.push("", "失败订阅");
    for (const item of input.failedItems) {
      lines.push(`- ${item.title}：${item.error}`);
    }
  }

  if (input.topItems.length) {
    lines.push("", "最近可查看的榜单");
    for (const item of input.topItems) {
      lines.push(`- ${item.title}：${item.url}`);
    }
  }

  return lines.join("\n");
}

export async function sendDailyDigestForDate(date = new Date()) {
  const db = prisma as any;
  const start = startOfLocalDay(date);
  const end = endOfLocalDay(date);
  const provider = createMailProvider();
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  for (const user of users) {
    const runs = await db.queryRun.findMany({
      where: {
        userId: user.id,
        savedQueryId: {
          not: null
        },
        createdAt: {
          gte: start,
          lte: end
        }
      },
      include: {
        savedQuery: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const digestDate = start;

    if (!runs.length) {
      await db.dailyDigest.upsert({
        where: {
          userId_digestDate: {
            userId: user.id,
            digestDate
          }
        },
        update: {
          status: "skipped",
          summaryJson: {
            totalRuns: 0
          }
        },
        create: {
          userId: user.id,
          digestDate,
          status: "skipped",
          summaryJson: {
            totalRuns: 0
          }
        }
      });
      continue;
    }

    const completedCount = runs.filter((run: any) => run.status === "completed").length;
    const failedCount = runs.filter((run: any) => run.status === "failed").length;
    const partialCount = runs.filter((run: any) => Boolean(run.partial)).length;
    const failedItems = runs
      .filter((run: any) => run.status === "failed")
      .slice(0, 5)
      .map((run: any) => ({
        title: run.savedQuery?.title ?? `订阅 ${run.savedQueryId}`,
        error: run.error ?? "未知错误"
      }));
    const topItems = runs
      .filter((run: any) => run.status === "completed" && run.resultCount > 0)
      .slice(0, 5)
      .map((run: any) => ({
        title: `${run.savedQuery?.title ?? "未命名订阅"} · ${run.resultCount} 条结果`,
        url: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/runs/${run.id}`
      }));

    const summaryJson = {
      totalRuns: runs.length,
      completedCount,
      failedCount,
      partialCount
    };

    const digestRecord = await db.dailyDigest.upsert({
      where: {
        userId_digestDate: {
          userId: user.id,
          digestDate
        }
      },
      update: {
        status: user.email ? "pending" : "skipped",
        summaryJson,
        error: null
      },
      create: {
        userId: user.id,
        digestDate,
        status: user.email ? "pending" : "skipped",
        summaryJson
      }
    });

    if (!user.email) {
      await db.queryRun.updateMany({
        where: {
          id: {
            in: runs.map((run: any) => run.id)
          }
        },
        data: {
          dailyDigestId: digestRecord.id
        }
      });
      continue;
    }

    try {
      const text = createDigestText({
        dateLabel: digestDateKey(digestDate),
        totalRuns: runs.length,
        completedCount,
        failedCount,
        partialCount,
        failedItems,
        topItems
      });

      const sendResult = await provider.send({
        to: user.email,
        subject: `我的订阅日报 · ${digestDateKey(digestDate)}`,
        text
      });

      await db.dailyDigest.update({
        where: {
          id: digestRecord.id
        },
        data: {
          status: "sent",
          transport: sendResult.transport,
          externalId: sendResult.externalId ?? null,
          sentAt: new Date(),
          error: null
        }
      });

      await db.queryRun.updateMany({
        where: {
          id: {
            in: runs.map((run: any) => run.id)
          }
        },
        data: {
          dailyDigestId: digestRecord.id
        }
      });
    } catch (error) {
      await db.dailyDigest.update({
        where: {
          id: digestRecord.id
        },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : "未知邮件错误"
        }
      });
    }
  }
}
