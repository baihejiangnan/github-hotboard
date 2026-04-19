"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";

import { getShareChannelLabel } from "@/lib/display";

type DraftListItem = {
  id: string;
  channel: string;
  exportPath: string | null;
  createdAt: string;
  payload: {
    titleOptions: string[];
    body: string;
    hashtags: string[];
    coverText: string;
    sourceRunId?: string;
  };
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function wordCount(text: string) {
  return text.trim().length;
}

export function ShareDraftList({ drafts }: { drafts: DraftListItem[] }) {
  const [selectedId, setSelectedId] = useState(drafts[0]?.id ?? "");
  const [channelFilter, setChannelFilter] = useState<"all" | "wechat_article" | "xiaohongshu_post">("all");
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);

  const filteredDrafts = useMemo(() => {
    const needle = deferredKeyword.trim().toLowerCase();

    return drafts.filter((draft) => {
      if (channelFilter !== "all" && draft.channel !== channelFilter) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = [
        draft.payload.titleOptions.join(" "),
        draft.payload.coverText,
        draft.payload.body,
        draft.payload.hashtags.join(" ")
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [channelFilter, deferredKeyword, drafts]);

  const selectedDraft =
    filteredDrafts.find((draft) => draft.id === selectedId) ??
    filteredDrafts[0] ??
    null;

  return (
    <div className="grid two share-list-layout">
      <div className="stack">
        <div className="panel">
          <div className="form-grid">
            <div className="field">
              <label>草稿渠道</label>
              <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as typeof channelFilter)}>
                <option value="all">全部渠道</option>
                <option value="wechat_article">公众号稿</option>
                <option value="xiaohongshu_post">小红书稿</option>
              </select>
            </div>

            <div className="field">
              <label>搜索草稿</label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索标题、正文、标签"
              />
            </div>
          </div>

          <div className="meta-row" style={{ marginTop: 16 }}>
            <span className="badge good">共 {drafts.length} 份</span>
            <span className="badge">筛选后 {filteredDrafts.length} 份</span>
          </div>
        </div>

        <div className="panel share-draft-list">
          {filteredDrafts.length === 0 ? (
            <div className="empty-state">当前筛选条件下没有草稿，换个关键词或渠道试试。</div>
          ) : (
            filteredDrafts.map((draft) => {
              const primaryTitle = draft.payload.titleOptions[0] || "未命名草稿";
              const selected = selectedDraft?.id === draft.id;

              return (
                <div
                  key={draft.id}
                  className={`share-draft-row ${selected ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(draft.id)}
                >
                  <div className="share-draft-row__main">
                    <div className="meta-row">
                      <span className="badge good">{getShareChannelLabel(draft.channel)}</span>
                      <span className="badge">{formatDate(draft.createdAt)}</span>
                      <span className="badge">{wordCount(draft.payload.body)} 字</span>
                    </div>
                    <h4>{primaryTitle}</h4>
                    <p>{draft.payload.coverText || "暂无封面文案"}</p>
                  </div>

                  <div className="share-draft-row__actions">
                    <button className="ghost-button" onClick={() => setSelectedId(draft.id)}>
                      预览
                    </button>
                    <Link className="button secondary" href={`/share/${draft.id}`}>
                      进入编辑
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="panel share-preview-fixed">
        {selectedDraft ? (
          <>
            <div className="share-preview-fixed__header">
              <div>
                <div className="meta-row">
                  <span className="badge good">{getShareChannelLabel(selectedDraft.channel)}</span>
                  <span className="badge">Run ID {selectedDraft.payload.sourceRunId || "未知"}</span>
                </div>
                <h3 style={{ marginTop: 14 }}>
                  {selectedDraft.payload.titleOptions[0] || "未命名草稿"}
                </h3>
                <p style={{ marginBottom: 0 }}>{selectedDraft.payload.coverText || "暂无封面文案"}</p>
              </div>

              <Link className="button secondary" href={`/share/${selectedDraft.id}`}>
                编辑这份草稿
              </Link>
            </div>

            <div className="share-preview-scroll">
              <div className="code-block">{selectedDraft.payload.body || "暂无正文内容"}</div>
            </div>

            <div className="meta-row" style={{ marginTop: 16 }}>
              {selectedDraft.payload.hashtags.map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">左侧选中一份草稿，这里会显示固定大小的滚动预览。</div>
        )}
      </div>
    </div>
  );
}

