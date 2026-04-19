import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { DashboardPage } from "@/components/dashboard-page";
import { authOptions } from "@/lib/auth";
import { formatDateTime, getVideoFormatLabel, getVideoStatusLabel } from "@/lib/display";
import { prisma } from "@/lib/prisma";

function describeCaption(value: unknown) {
  if (!value) {
    return "尚未生成";
  }

  if (Array.isArray(value)) {
    return `已生成 ${value.length} 条字幕`;
  }

  if (typeof value === "object") {
    return "已生成字幕数据";
  }

  return "已生成字幕";
}

export default async function VideosPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const db = prisma as any;
  const jobs = await db.videoJob.findMany({
    where: {
      userId
    },
    include: {
      queryRun: {
        select: {
          id: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <DashboardPage
      active="videos"
      description="这里查看所有视频任务的状态、格式、输出路径与失败原因。视频渲染仍依赖 worker 常驻运行。"
      eyebrow="Video Studio"
      title="视频工作台"
      userName={session?.user?.name}
    >
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>视频任务</h2>
            <p className={styles.muted}>支持 60 秒竖版和 90 秒横版。成功后会记录本地产物信息，失败时展示错误原因。</p>
          </div>
        </div>

        {jobs.length ? (
          <div className={styles.subscriptionList}>
            {jobs.map((job: any) => (
              <article className={styles.subscriptionCard} key={job.id}>
                <div className={styles.subscriptionTop}>
                  <div className="stack">
                    <div className={styles.subscriptionTitleRow}>
                      <h3>{getVideoFormatLabel(job.format)}</h3>
                      <span
                        className={`${styles.statusPill} ${
                          job.status === "failed" ? styles.statusFailed : styles.statusActive
                        }`}
                      >
                        {getVideoStatusLabel(job.status)}
                      </span>
                    </div>
                    <p className={styles.subscriptionMeta}>
                      创建于 {formatDateTime(job.createdAt)} · 来源 Run {job.queryRunId}
                    </p>
                  </div>
                  <div className={styles.subscriptionLinks}>
                    <Link className="ghost-button" href={`/runs/${job.queryRunId}`}>
                      查看来源
                    </Link>
                  </div>
                </div>

                <div className={styles.facts}>
                  <div className={styles.fact}>
                    <span>视频文件</span>
                    <strong>{job.videoPath || "尚未生成"}</strong>
                  </div>
                  <div className={styles.fact}>
                    <span>音频文件</span>
                    <strong>{job.audioPath || "尚未生成"}</strong>
                  </div>
                  <div className={styles.fact}>
                    <span>字幕状态</span>
                    <strong>{describeCaption(job.captionJson)}</strong>
                  </div>
                </div>

                {job.error ? <p className={styles.errorText}>失败原因：{job.error}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <article className={styles.emptyCard}>
            <h3>还没有视频任务</h3>
            <p className={styles.muted}>先去榜单详情页发起一个视频生成任务，这里会展示全部渲染进度和产物信息。</p>
          </article>
        )}
      </section>
    </DashboardPage>
  );
}
