import Link from "next/link";
import { redirect } from "next/navigation";
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

export default async function QueriesPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; triggerType?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedStatus = resolvedSearchParams.status ?? "";
  const selectedTriggerType = resolvedSearchParams.triggerType ?? "";
  const db = prisma as any;
  const subscriptions = await db.savedQuery.findMany({
    where: {
      userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const recentRuns = await db.queryRun.findMany({
    where: {
      userId,
      savedQueryId: {
        not: null
      },
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(selectedTriggerType ? { triggerType: selectedTriggerType } : {})
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
    },
    take: 24
  });

  const latestDigest = await db.dailyDigest.findFirst({
    where: {
      userId
    },
    orderBy: {
      digestDate: "desc"
    }
  });

  const activeSubscriptionCount = subscriptions.filter(
    (item: any) => item.isActive && item.scheduleCron
  ).length;
  const failedSubscriptionCount = subscriptions.filter(
    (item: any) => item.lastRunStatus === "failed"
  ).length;

  function getStatusPillClass(subscription: any) {
    const label = getSubscriptionStateLabel({
      isActive: subscription.isActive,
      scheduleCron: subscription.scheduleCron,
      lastRunStatus: subscription.lastRunStatus
    });

    if (label.includes("失败")) {
      return `${styles.statusPill} ${styles.statusFailed}`;
    }

    if (label.includes("暂停")) {
      return `${styles.statusPill} ${styles.statusPaused}`;
    }

    if (label.includes("仅手动")) {
      return `${styles.statusPill} ${styles.statusManual}`;
    }

    return `${styles.statusPill} ${styles.statusActive}`;
  }

  return (
    <div className={styles.layout}>
      <DashboardSidebar active="queries" userName={session?.user?.name} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className="stack">
            <span className="eyebrow">My Queries</span>
            <h1>订阅中心</h1>
            <p className={styles.muted}>
              统一查看你的自动化订阅、下次运行时间、最近结果与失败情况。这里既是管理台，也是个人运行流水入口。
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className="ghost-button" href="/explore">
              新建订阅
            </Link>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>订阅总数</span>
            <strong>{subscriptions.length}</strong>
            <p className={styles.muted}>已保存的全部个人订阅条件</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>自动运行中</span>
            <strong>{activeSubscriptionCount}</strong>
            <p className={styles.muted}>带计划且处于启用状态的订阅</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>最近失败</span>
            <strong>{failedSubscriptionCount}</strong>
            <p className={styles.muted}>最近一次运行失败，建议尽快补跑</p>
          </article>
          <article className={styles.summaryCard}>
            <span className={styles.summaryLabel}>日报状态</span>
            <strong>
              {latestDigest
                ? latestDigest.status === "sent"
                  ? "已发送"
                  : latestDigest.status === "skipped"
                    ? "已跳过"
                    : latestDigest.status === "failed"
                      ? "发送失败"
                      : "待发送"
                : "未生成"}
            </strong>
            <p className={styles.muted}>
              {latestDigest
                ? `最新日期 ${formatDateTime(latestDigest.digestDate)}`
                : "还没有日报记录"}
            </p>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className="stack">
              <h2>我的订阅</h2>
              <p className={styles.muted}>每张卡片会展示订阅状态、下一次运行时间、最近结果与可执行操作。</p>
            </div>
          </div>

          {subscriptions.length ? (
            <div className={styles.subscriptionList}>
              {subscriptions.map((subscription: any) => (
                <article className={styles.subscriptionCard} key={subscription.id}>
                  <div className={styles.subscriptionTop}>
                    <div className="stack">
                      <div className={styles.subscriptionTitleRow}>
                        <h3>{subscription.title}</h3>
                        <span className={getStatusPillClass(subscription)}>
                          {getSubscriptionStateLabel({
                            isActive: subscription.isActive,
                            scheduleCron: subscription.scheduleCron,
                            lastRunStatus: subscription.lastRunStatus
                          })}
                        </span>
                      </div>
                      <p className={styles.subscriptionMeta}>
                        {subscription.rankingMode === "growth" ? "增长榜" : "新锐热榜"} ·{" "}
                        {subscription.windowDays} 天 · Top {subscription.limit}
                      </p>
                    </div>
                    <div className={styles.subscriptionLinks}>
                      <Link className="ghost-button" href={`/queries/${subscription.id}`}>
                        查看详情
                      </Link>
                    </div>
                  </div>

                  <div className={styles.facts}>
                    <div className={styles.fact}>
                      <span>计划</span>
                      <strong>{describeCron(subscription.scheduleCron)}</strong>
                    </div>
                    <div className={styles.fact}>
                      <span>下次运行</span>
                      <strong>
                        {subscription.nextRunAt
                          ? formatDateTime(subscription.nextRunAt)
                          : "未安排"}
                      </strong>
                    </div>
                    <div className={styles.fact}>
                      <span>最近结果</span>
                      <strong>
                        {subscription.lastRunStatus
                          ? `${getRunStatusLabel(subscription.lastRunStatus)} · ${subscription.lastRunResultCount ?? 0} 条`
                          : "还没有运行记录"}
                      </strong>
                    </div>
                  </div>

                  {subscription.lastRunError ? (
                    <p className={styles.errorText}>最近错误：{subscription.lastRunError}</p>
                  ) : null}

                  <SubscriptionActions
                    id={subscription.id}
                    isActive={subscription.isActive}
                    scheduleCron={subscription.scheduleCron}
                    title={subscription.title}
                  />
                </article>
              ))}
            </div>
          ) : (
            <article className={styles.emptyCard}>
              <h3>还没有订阅</h3>
              <p className={styles.muted}>先去 Explore 保存一个查询条件，这里就会出现你的自动化订阅和历史记录。</p>
              <Link className="primary-button" href="/explore">
                去创建订阅
              </Link>
            </article>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className="stack">
              <h2>全局运行流水</h2>
              <p className={styles.muted}>展示当前账号下所有订阅的最近自动化执行情况，方便快速定位失败或部分结果。</p>
            </div>
          </div>

          <div className={styles.filters}>
            <Link
              className={`${styles.filterChip} ${!selectedStatus && !selectedTriggerType ? styles.filterChipActive : ""}`.trim()}
              href="/queries"
            >
              全部状态
            </Link>
            <Link
              className={`${styles.filterChip} ${selectedStatus === "completed" ? styles.filterChipActive : ""}`.trim()}
              href="/queries?status=completed"
            >
              仅看成功
            </Link>
            <Link
              className={`${styles.filterChip} ${selectedStatus === "failed" ? styles.filterChipActive : ""}`.trim()}
              href="/queries?status=failed"
            >
              仅看失败
            </Link>
            <Link
              className={`${styles.filterChip} ${selectedStatus === "running" ? styles.filterChipActive : ""}`.trim()}
              href="/queries?status=running"
            >
              仅看运行中
            </Link>
            <Link
              className={`${styles.filterChip} ${selectedTriggerType === "retry" ? styles.filterChipActive : ""}`.trim()}
              href="/queries?triggerType=retry"
            >
              仅看自动重试
            </Link>
          </div>

          <article className={styles.tableCard}>
            {recentRuns.length ? (
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>订阅</th>
                    <th>状态</th>
                    <th>来源</th>
                    <th>结果数</th>
                    <th>说明</th>
                    <th>跳转</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run: any) => (
                    <tr key={run.id}>
                      <td>{formatDateTime(run.createdAt)}</td>
                      <td>{run.savedQuery?.title ?? "未知订阅"}</td>
                      <td>{getRunStatusLabel(run.status)}</td>
                      <td>{getTriggerTypeLabel(run.triggerType)}</td>
                      <td>{run.resultCount ?? 0}</td>
                      <td>
                        {run.partial ? "部分结果" : "完整"}
                        {run.attemptNumber > 1 ? ` · 第 ${run.attemptNumber} 次` : ""}
                        {run.retryOfRunId ? " · 来自重试" : ""}
                        {run.error ? ` · ${run.error}` : ""}
                      </td>
                      <td>
                        <Link href={`/runs/${run.id}`}>查看</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>还没有自动化运行记录。保存一个带计划的订阅后，这里会显示最近流水。</p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
