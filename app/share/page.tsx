import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { DashboardPage } from "@/components/dashboard-page";
import { ShareDraftBrowser } from "@/components/share-draft-browser";
import { authOptions } from "@/lib/auth";
import { formatDateTime, getShareChannelLabel } from "@/lib/display";
import { prisma } from "@/lib/prisma";

function extractString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  return payload as Record<string, unknown>;
}

function extractPreviewText(body?: string | null) {
  const safeBody = typeof body === "string" ? body : "";
  return safeBody.replace(/[#>*`[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 280) || "这份草稿还没有正文。";
}

export default async function SharePage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const db = prisma as any;
  const drafts = await db.shareDraft.findMany({
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
      updatedAt: "desc"
    }
  });

  const normalizedDrafts = drafts.map((draft: any) => {
    const payload = readPayload(draft.payload);
    const titleOptions = extractStringArray(
      draft.titleOptions ?? payload.titleOptions ?? payload.title_options
    );
    const body = extractString(draft.body ?? payload.body ?? payload.content);
    const coverText = extractString(
      draft.coverText ?? payload.coverText ?? payload.cover_text ?? payload.summary
    );
    const hashtags = extractStringArray(
      draft.hashtags ?? payload.hashtags ?? payload.tags
    );

    return {
      id: draft.id,
      channelLabel: getShareChannelLabel(draft.channel),
      updatedAtLabel: formatDateTime(draft.updatedAt),
      title: titleOptions[0] || extractString(payload.title) || "未命名草稿",
      coverText: coverText || "还没有封面文案",
      body: body || "这份草稿还没有正文。",
      hashtags,
      wordCount: body.length,
      lineCount: body ? body.split(/\r?\n/).length : 1
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
