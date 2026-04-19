import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { DashboardPage } from "@/components/dashboard-page";
import { ShareDraftBrowser } from "@/components/share-draft-browser";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeShareDraft } from "@/lib/share-drafts";

export default async function SharePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const drafts = await prisma.shareDraft.findMany({
    where: {
      userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  const normalizedDrafts = drafts.map((draft) => {
    const normalized = normalizeShareDraft(draft);

    return {
      id: normalized.id,
      channel: normalized.channel,
      title: normalized.title,
      coverText: normalized.coverText,
      body: normalized.body,
      tags: normalized.hashtags,
      updatedAt: normalized.updatedAt,
      queryRunId: normalized.queryRunId,
      wordCount: normalized.body.length,
      lineCount: normalized.body ? normalized.body.split(/\r?\n/).length : 1
    };
  });

  return (
    <DashboardPage
      active="share"
      description="这里集中管理所有已生成的公众号稿和小红书稿。列表保持简洁，预览固定可滚动，单份草稿进入独立编辑页做精修。"
      eyebrow="Share Studio"
      title="图文分享工作台"
      userName={session?.user?.name}
    >
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>草稿列表</h2>
            <p className={styles.muted}>左侧看草稿摘要，右侧看固定预览窗口。鼠标移到哪条草稿，右侧就预览哪条。</p>
          </div>
        </div>

        {normalizedDrafts.length ? (
          <ShareDraftBrowser drafts={normalizedDrafts} />
        ) : (
          <article className={styles.emptyCard}>
            <h3>还没有分享草稿</h3>
            <p className={styles.muted}>先去 Run Detail 生成公众号稿或小红书稿，这里就会出现可预览、可编辑的草稿。</p>
          </article>
        )}
      </section>
    </DashboardPage>
  );
}
