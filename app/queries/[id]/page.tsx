import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SubscriptionActions } from "@/components/subscription-actions";
import { authOptions } from "@/lib/auth";
import {
  describeCron,
  formatDateTime,
  getRunStatusLabel,
  getSubscriptionStateLabel,
  getTriggerTypeLabel
} from "@/lib/display";
import { prisma } from "@/lib/prisma";

export default async function QueryDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const { id } = await params;
  const db = prisma as any;
  const subscription = await db.savedQuery.findFirst({
    where: {
      id,
      userId
    },
    include: {
      queryRuns: {
        orderBy: {
          createdAt: "desc"
        },
        take: 40
      }
    }
  });

  if (!subscription) {
    notFound();
  }

  return (
    <div className={styles.layout}>
      <DashboardSidebar active="queries" userName={session?.user?.name} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className="stack">
            <span className="eyebrow">Subscription Detail</span>
            <h1>{subscription.title}</h1>
            <p className={styles.muted}>
              {getSubscriptionStateLabel({
                isActive: subscription.isActive,
                scheduleCron: subscription.scheduleCron,
                lastRunStatus: subscription.lastRunStatus
              })}
            </p>
            <p className={styles.muted}>
              计划：{describeCron(subscription.scheduleCron)} · 下次运行：
              {subscription.nextRunAt ? formatDateTime(subscription.nextRunAt) : "未安排"}
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className="ghost-button" href="/queries">
              返回订阅中心
            </Link>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>榜单类型</span>
            <strong>{subscription.rankingMode === "growth" ? "增长榜" : "新锐热榜"}</strong>
            <p className={styles.muted}>
              {subscription.windowDays} 天窗口 · Top {subscription.limit}
            </p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>筛选条件</span>
            <strong>{subscription.keyword || "无关键词"}</strong>
            <p className={styles.muted}>
              语言 {subscription.language || "不限"} · Topic {subscription.topic || "不限"}
            </p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>最近一次运行</span>
            <strong>
              {subscription.lastRunAt ? formatDateTime(subscription.lastRunAt) : "未运行"}
            </strong>
            <p className={styles.muted}>
              {subscription.lastRunStatus
                ? getRunStatusLabel(subscription.lastRunStatus)
                : "还没有状态"}
            </p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>最近结果</span>
            <strong>{subscription.lastRunResultCount ?? 0} 条</strong>
            <p className={styles.muted}>{subscription.lastRunError || "没有记录到错误"}</p>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className="stack">
              <h2>快捷操作</h2>
              <p className={styles.muted}>补跑、暂停或删除都会保留历史记录，方便你回看自动化链路。</p>
            </div>
          </div>
          <article className={styles.subscriptionCard}>
            <SubscriptionActions
              id={subscription.id}
              isActive={subscription.isActive}
              scheduleCron={subscription.scheduleCron}
              title={subscription.title}
            />
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className="stack">
              <h2>运行历史</h2>
              <p className={styles.muted}>这里会保留首次失败与自动重试两条独立记录，方便判断定时任务是否真正恢复。</p>
            </div>
          </div>

          <article className={styles.tableCard}>
            {subscription.queryRuns.length ? (
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>状态</th>
                    <th>触发方式</th>
                    <th>尝试次数</th>
                    <th>结果数</th>
                    <th>说明</th>
                    <th>跳转</th>
                  </tr>
                </thead>
                <tbody>
                  {subscription.queryRuns.map((run: any) => (
                    <tr key={run.id}>
                      <td>{formatDateTime(run.createdAt)}</td>
                      <td>{getRunStatusLabel(run.status)}</td>
                      <td>{getTriggerTypeLabel(run.triggerType)}</td>
                      <td>{run.attemptNumber ?? 1}</td>
                      <td>{run.resultCount ?? 0}</td>
                      <td>
                        {run.partial ? "部分结果" : "完整"}
                        {run.retryOfRunId ? " · 来自前次失败的自动重试" : ""}
                        {run.error ? ` · ${run.error}` : ""}
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`}>查看 Run Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>这个订阅还没有运行历史。</p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
