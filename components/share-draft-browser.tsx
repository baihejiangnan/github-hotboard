"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";

export type ShareDraftListItem = {
  id: string;
  channel?: string | null;
  channelLabel?: string | null;
  title?: string | null;
  body?: string | null;
  coverText?: string | null;
  tags?: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  exportPath?: string | null;
  queryRunId?: string | null;
  lineCount?: number | null;
  wordCount?: number | null;
};

type ShareDraftBrowserProps = {
  drafts: ShareDraftListItem[];
};

const PAGE_SIZE = 3;

function getChannelLabel(channel?: string | null, channelLabel?: string | null) {
  if (channelLabel?.trim()) {
    return channelLabel.trim();
  }

  if (channel === "wechat_article") {
    return "公众号稿";
  }

  if (channel === "xiaohongshu_post") {
    return "小红书稿";
  }

  return "分享草稿";
}

function readTags(tags?: string[] | null) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags.filter(Boolean).slice(0, 5);
}

function countWords(body?: string | null) {
  const text = body?.trim() ?? "";
  if (!text) {
    return 0;
  }

  return text.replace(/\s+/g, "").length;
}

function countLines(body?: string | null) {
  const text = body?.trim() ?? "";
  if (!text) {
    return 0;
  }

  return text.split(/\r?\n/).length;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "刚刚更新";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function surfaceText(value?: string | null, fallback = "暂无内容") {
  const text = value?.trim();
  return text ? text : fallback;
}

const styles = {
  shell: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 420px",
    gap: "24px",
    alignItems: "start"
  } as const,
  panel: {
    background:
      "linear-gradient(135deg, rgba(255, 251, 246, 0.97), rgba(247, 248, 252, 0.94))",
    border: "1px solid rgba(220, 205, 187, 0.76)",
    borderRadius: "28px",
    padding: "24px",
    boxShadow: "0 18px 48px rgba(175, 141, 103, 0.12)"
  } as const,
  panelTitle: {
    margin: 0,
    fontSize: "28px",
    lineHeight: 1.12,
    fontWeight: 700,
    color: "rgba(34, 25, 20, 0.96)"
  } as const,
  muted: {
    margin: "10px 0 0",
    color: "rgba(89, 73, 59, 0.82)",
    fontSize: "14px",
    lineHeight: 1.65
  } as const,
  listWrap: {
    display: "grid",
    gap: "16px",
    marginTop: "20px"
  } as const,
  draftCard: (active: boolean) =>
    ({
      borderRadius: "24px",
      padding: "20px",
      border: active
        ? "1px solid rgba(123, 168, 255, 0.72)"
        : "1px solid rgba(219, 206, 188, 0.74)",
      boxShadow: active
        ? "0 16px 38px rgba(98, 143, 230, 0.14)"
        : "0 12px 26px rgba(173, 138, 102, 0.08)",
      background: active
        ? "linear-gradient(135deg, rgba(248, 252, 255, 0.98), rgba(255, 250, 244, 0.96))"
        : "rgba(255, 252, 248, 0.94)",
      transition: "border-color .2s ease, box-shadow .2s ease, transform .2s ease",
      cursor: "pointer"
    }) as const,
  pillRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    alignItems: "center"
  } as const,
  badge: (kind: "default" | "active" | "meta") =>
    ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "34px",
      padding: "0 14px",
      borderRadius: "999px",
      fontSize: "13px",
      fontWeight: 600,
      border:
        kind === "active"
          ? "1px solid rgba(93, 171, 145, 0.34)"
          : kind === "meta"
            ? "1px solid rgba(202, 189, 172, 0.72)"
            : "1px solid rgba(155, 186, 236, 0.5)",
      background:
        kind === "active"
          ? "rgba(224, 244, 235, 0.94)"
          : kind === "meta"
            ? "rgba(255, 251, 246, 0.9)"
            : "rgba(234, 243, 255, 0.92)",
      color:
        kind === "active"
          ? "rgba(51, 109, 86, 0.96)"
          : kind === "meta"
            ? "rgba(94, 75, 58, 0.86)"
            : "rgba(59, 95, 161, 0.94)"
    }) as const,
  title: {
    margin: "14px 0 0",
    fontSize: "18px",
    lineHeight: 1.35,
    fontWeight: 700,
    color: "rgba(30, 23, 17, 0.96)"
  } as const,
  summary: {
    margin: "14px 0 0",
    color: "rgba(96, 78, 62, 0.84)",
    lineHeight: 1.75,
    fontSize: "14px"
  } as const,
  tagList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "14px"
  } as const,
  tag: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "32px",
    padding: "0 14px",
    borderRadius: "999px",
    border: "1px solid rgba(205, 192, 175, 0.76)",
    background: "rgba(255, 252, 248, 0.92)",
    color: "rgba(76, 58, 43, 0.88)",
    fontSize: "13px",
    fontWeight: 600
  } as const,
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px"
  } as const,
  actionButton: (tone: "primary" | "secondary") =>
    ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "40px",
      padding: "0 16px",
      borderRadius: "999px",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: 700,
      border:
        tone === "primary"
          ? "1px solid rgba(91, 143, 236, 0.34)"
          : "1px solid rgba(203, 189, 173, 0.78)",
      background:
        tone === "primary"
          ? "linear-gradient(135deg, rgba(74, 126, 243, 0.98), rgba(53, 110, 226, 0.94))"
          : "rgba(255, 252, 248, 0.96)",
      color: tone === "primary" ? "#ffffff" : "rgba(63, 49, 37, 0.92)",
      boxShadow:
        tone === "primary"
          ? "0 12px 24px rgba(68, 115, 215, 0.2)"
          : "0 8px 18px rgba(181, 152, 120, 0.08)"
    }) as const,
  previewAside: {
    position: "sticky",
    top: "24px",
    alignSelf: "start"
  } as const,
  previewPanel: {
    ...{
      background:
        "linear-gradient(135deg, rgba(255, 251, 246, 0.97), rgba(247, 248, 252, 0.94))",
      border: "1px solid rgba(220, 205, 187, 0.76)",
      borderRadius: "28px",
      padding: "20px",
      boxShadow: "0 18px 48px rgba(175, 141, 103, 0.12)"
    },
    height: "760px",
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  } as const,
  previewHeader: {
    display: "grid",
    gap: "14px",
    padding: "18px 18px 0"
  } as const,
  previewContent: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "0 18px 18px",
    borderTop: "1px solid rgba(226, 212, 194, 0.64)"
  } as const,
  previewArticle: {
    paddingTop: "18px"
  } as const,
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginTop: "18px"
  } as const,
  pageButton: (disabled: boolean) =>
    ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "40px",
      padding: "0 16px",
      borderRadius: "999px",
      border: "1px solid rgba(205, 190, 172, 0.78)",
      background: disabled
        ? "rgba(244, 238, 230, 0.78)"
        : "rgba(255, 252, 248, 0.96)",
      color: disabled ? "rgba(143, 122, 99, 0.58)" : "rgba(67, 52, 40, 0.92)",
      fontSize: "14px",
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer"
    }) as const,
  emptyState: {
    ...{
      background:
        "linear-gradient(135deg, rgba(255, 251, 246, 0.97), rgba(247, 248, 252, 0.94))",
      border: "1px solid rgba(220, 205, 187, 0.76)",
      borderRadius: "28px",
      padding: "32px",
      boxShadow: "0 18px 48px rgba(175, 141, 103, 0.12)"
    },
    textAlign: "center"
  } as const
};

export function ShareDraftBrowser({ drafts }: ShareDraftBrowserProps) {
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string>(drafts[0]?.id ?? "");

  const totalPages = Math.max(1, Math.ceil(drafts.length / PAGE_SIZE));

  const pagedDrafts = useMemo(() => {
    const start = page * PAGE_SIZE;
    return drafts.slice(start, start + PAGE_SIZE);
  }, [drafts, page]);

  useEffect(() => {
    if (!pagedDrafts.length) {
      if (drafts[0]?.id) {
        setActiveId(drafts[0].id);
      }
      return;
    }

    const hasActive = pagedDrafts.some((draft) => draft.id === activeId);
    if (!hasActive) {
      setActiveId(pagedDrafts[0].id);
    }
  }, [activeId, drafts, pagedDrafts]);

  const activeDraft =
    pagedDrafts.find((draft) => draft.id === activeId) ??
    pagedDrafts[0] ??
    drafts[0] ??
    null;

  if (!drafts.length) {
    return (
      <div style={styles.emptyState}>
        <h3 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>暂时还没有分享草稿</h3>
        <p style={styles.muted}>
          先去运行一轮榜单，再生成公众号稿或小红书稿，这里就会出现可继续编辑和分发的草稿。
        </p>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>草稿列表</h2>
        <p style={styles.muted}>每页展示 3 条草稿，移入条目就能切换右侧预览，也可以直接继续编辑或回到来源 Run 生成更多版本。</p>

        <div style={styles.listWrap}>
          {pagedDrafts.map((draft) => {
            const active = draft.id === activeDraft?.id;
            const title = surfaceText(draft.title, "未命名草稿");
            const coverText = surfaceText(draft.coverText, "这份草稿还没有封面文案。");
            const tags = readTags(draft.tags);

            return (
              <article
                key={draft.id}
                style={styles.draftCard(active)}
                onMouseEnter={() => setActiveId(draft.id)}
                onFocus={() => setActiveId(draft.id)}
                onClick={() => setActiveId(draft.id)}
              >
                <div style={styles.pillRow}>
                  <span style={styles.badge("default")}>{getChannelLabel(draft.channel, draft.channelLabel)}</span>
                  {active ? <span style={styles.badge("active")}>当前预览</span> : null}
                  <span style={styles.badge("meta")}>{formatDate(draft.updatedAt ?? draft.createdAt)}</span>
                </div>

                <h3 style={styles.title}>{title}</h3>
                <p style={styles.summary}>{coverText}</p>

                {tags.length ? (
                  <div style={styles.tagList}>
                    {tags.map((tag) => (
                      <span key={tag} style={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div style={styles.actionRow}>
                  <Link href={`/share/${draft.id}`} style={styles.actionButton("primary")}>
                    进入编辑
                  </Link>

                  {draft.queryRunId && draft.channel !== "wechat_article" ? (
                    <Link
                      href={`/runs/${draft.queryRunId}?intent=wechat_article&fromDraft=${draft.id}`}
                      style={styles.actionButton("secondary")}
                    >
                      去生成公众号稿
                    </Link>
                  ) : null}

                  {draft.queryRunId && draft.channel !== "xiaohongshu_post" ? (
                    <Link
                      href={`/runs/${draft.queryRunId}?intent=xiaohongshu_post&fromDraft=${draft.id}`}
                      style={styles.actionButton("secondary")}
                    >
                      去生成小红书稿
                    </Link>
                  ) : null}

                  {draft.queryRunId ? (
                    <Link
                      href={`/runs/${draft.queryRunId}?intent=video&fromDraft=${draft.id}`}
                      style={styles.actionButton("secondary")}
                    >
                      去生成视频
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <div style={styles.pagination}>
          <button
            type="button"
            style={styles.pageButton(page <= 0)}
            disabled={page <= 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            上一页
          </button>

          <span style={{ color: "rgba(88, 70, 55, 0.84)", fontWeight: 600 }}>
            第 {page + 1} / {totalPages} 页
          </span>

          <button
            type="button"
            style={styles.pageButton(page >= totalPages - 1)}
            disabled={page >= totalPages - 1}
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
          >
            下一页
          </button>
        </div>
      </section>

      <aside style={styles.previewAside}>
        <section style={styles.previewPanel}>
          {activeDraft ? (
            <>
              <header style={styles.previewHeader}>
                <div style={styles.pillRow}>
                  <span style={styles.badge("active")}>当前预览</span>
                  <span style={styles.badge("default")}>{getChannelLabel(activeDraft.channel, activeDraft.channelLabel)}</span>
                  <span style={styles.badge("meta")}>{formatDate(activeDraft.updatedAt ?? activeDraft.createdAt)}</span>
                  <span style={styles.badge("meta")}>{activeDraft.wordCount ?? countWords(activeDraft.body)} 字</span>
                  <span style={styles.badge("meta")}>{activeDraft.lineCount ?? countLines(activeDraft.body)} 行</span>
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: "22px", lineHeight: 1.3, fontWeight: 800 }}>
                    {surfaceText(activeDraft.title, "未命名草稿")}
                  </h3>
                  <p style={{ ...styles.muted, marginTop: "8px" }}>{surfaceText(activeDraft.coverText, "这份草稿还没有封面文案。")}</p>
                </div>

                {readTags(activeDraft.tags).length ? (
                  <div style={styles.tagList}>
                    {readTags(activeDraft.tags).map((tag) => (
                      <span key={tag} style={styles.tag}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </header>

              <div style={styles.previewContent}>
                <div style={styles.previewArticle}>
                  <MarkdownRenderer content={surfaceText(activeDraft.body, "这份草稿还没有正文。")} />
                </div>
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <h3 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>选择一份草稿开始预览</h3>
              <p style={styles.muted}>移入左侧条目后，这里会显示完整的 Markdown 文章呈现。</p>
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
