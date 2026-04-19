"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { getShareChannelLabel } from "@/lib/display";

type DraftRecord = {
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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function countTextStats(text: string) {
  const trimmed = text.trim();
  const charCount = trimmed.length;
  const lineCount = trimmed ? trimmed.split("\n").length : 0;
  return { charCount, lineCount };
}

function joinHashtags(tags: string[]) {
  return tags.join(" ");
}

function splitHashtags(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function DraftEditor({
  draft
}: {
  draft: DraftRecord;
}) {
  const [title, setTitle] = useState(draft.payload.titleOptions[0] || "");
  const [altTitles, setAltTitles] = useState(draft.payload.titleOptions.slice(1).join("\n"));
  const [coverText, setCoverText] = useState(draft.payload.coverText || "");
  const [hashtags, setHashtags] = useState(joinHashtags(draft.payload.hashtags || []));
  const [body, setBody] = useState(draft.payload.body || "");
  const [message, setMessage] = useState<string | null>(null);

  const stats = useMemo(() => countTextStats(body), [body]);

  const fullPackage = useMemo(() => {
    const sections = [
      `标题：${title}`,
      altTitles.trim() ? `备选标题：\n${altTitles.trim()}` : "",
      `封面文案：${coverText}`,
      splitHashtags(hashtags).length ? `标签：${splitHashtags(hashtags).join(" ")}` : "",
      "",
      body.trim()
    ].filter(Boolean);

    return sections.join("\n\n");
  }, [altTitles, body, coverText, hashtags, title]);

  async function handleCopy(label: string, value: string) {
    try {
      await copyText(value);
      setMessage(`${label}已复制到剪贴板。`);
      window.setTimeout(() => setMessage(null), 1800);
    } catch {
      setMessage(`复制${label}失败，请检查浏览器剪贴板权限。`);
    }
  }

  function resetDraft() {
    setTitle(draft.payload.titleOptions[0] || "");
    setAltTitles(draft.payload.titleOptions.slice(1).join("\n"));
    setCoverText(draft.payload.coverText || "");
    setHashtags(joinHashtags(draft.payload.hashtags || []));
    setBody(draft.payload.body || "");
    setMessage("已恢复为原始生成稿。");
    window.setTimeout(() => setMessage(null), 1800);
  }

  return (
    <div className="panel share-card">
      <div className="share-card__header">
        <div>
          <div className="meta-row">
            <span className="badge good">{getShareChannelLabel(draft.channel)}</span>
            <span className="badge">{draft.exportPath ? "已导出" : "未导出"}</span>
            <span className="badge">生成于 {formatDate(draft.createdAt)}</span>
          </div>
          <h3 style={{ marginTop: 14 }}>内容编辑与导出</h3>
          <p style={{ marginBottom: 0 }}>
            来源 Run ID：{draft.payload.sourceRunId || "未知"}。这里可以快速调整标题、封面文案、标签和正文，然后复制到公众号或小红书编辑器。
          </p>
        </div>

        <div className="share-actions">
          <button className="button secondary" onClick={() => handleCopy("整份发布包", fullPackage)}>
            复制整份发布包
          </button>
          <button className="ghost-button" onClick={() => handleCopy("正文", body)}>
            仅复制正文
          </button>
          <button className="ghost-button" onClick={resetDraft}>
            恢复原稿
          </button>
          {draft.exportPath ? (
            <a className="ghost-button" href={`/api/share-drafts/${draft.id}/export`}>
              下载导出稿
            </a>
          ) : null}
        </div>
      </div>

      {message ? <p style={{ marginTop: 18 }}>{message}</p> : null}

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="stack">
          <div className="field">
            <label>主标题</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="field">
            <label>备选标题</label>
            <textarea
              value={altTitles}
              onChange={(event) => setAltTitles(event.target.value)}
              placeholder="一行一个备选标题"
              style={{ minHeight: 120 }}
            />
          </div>

          <div className="field">
            <label>封面文案</label>
            <input value={coverText} onChange={(event) => setCoverText(event.target.value)} />
          </div>

          <div className="field">
            <label>标签</label>
            <input
              value={hashtags}
              onChange={(event) => setHashtags(event.target.value)}
              placeholder="#GitHub热榜 #开源项目"
            />
          </div>

          <div className="field">
            <label>正文</label>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} />
          </div>
        </div>

        <div className="stack">
          <div className="panel share-preview">
            <h4>实时预览</h4>
            <div className="share-preview__title">{title || "在左侧填写标题"}</div>
            <div className="share-preview__cover">{coverText || "封面文案会显示在这里"}</div>
            <div className="share-preview__meta">
              <span>{getShareChannelLabel(draft.channel)}</span>
              <span>{stats.charCount} 字</span>
              <span>{stats.lineCount} 行</span>
            </div>
            <div className="code-block">{body || "正文内容会显示在这里。"}</div>
            <div className="meta-row" style={{ marginTop: 16 }}>
              {splitHashtags(hashtags).map((tag) => (
                <span key={tag} className="badge">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <h4>快捷输出</h4>
            <div className="actions">
              <button className="ghost-button" onClick={() => handleCopy("标题", title)}>
                复制标题
              </button>
              <button className="ghost-button" onClick={() => handleCopy("封面文案", coverText)}>
                复制封面文案
              </button>
              <button className="ghost-button" onClick={() => handleCopy("标签", splitHashtags(hashtags).join(" "))}>
                复制标签
              </button>
            </div>
            <p style={{ marginTop: 14, marginBottom: 0 }}>
              当前正文 {stats.charCount} 字，适合先快速调整，再复制到目标平台发布。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ShareStudio({ drafts }: { drafts: DraftRecord[] }) {
  const [channelFilter, setChannelFilter] = useState<"all" | "wechat_article" | "xiaohongshu_post">("all");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredDrafts = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();

    return drafts.filter((draft) => {
      if (channelFilter !== "all" && draft.channel !== channelFilter) {
        return false;
      }

      if (!keyword) {
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

      return haystack.includes(keyword);
    });
  }, [channelFilter, deferredSearch, drafts]);

  return (
    <div className="stack">
      <div className="panel">
        <div className="form-grid">
          <div className="field">
            <label>按渠道筛选</label>
            <select value={channelFilter} onChange={(event) => setChannelFilter(event.target.value as typeof channelFilter)}>
              <option value="all">全部渠道</option>
              <option value="wechat_article">公众号稿</option>
              <option value="xiaohongshu_post">小红书稿</option>
            </select>
          </div>

          <div className="field">
            <label>搜索标题 / 正文 / 标签</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="例如 GitHub 热榜、openclaw、AI Agent"
            />
          </div>
        </div>

        <div className="meta-row" style={{ marginTop: 16 }}>
          <span className="badge good">共 {drafts.length} 份草稿</span>
          <span className="badge">筛选后 {filteredDrafts.length} 份</span>
          <span className="badge">支持快速编辑与复制</span>
        </div>
      </div>

      {filteredDrafts.length === 0 ? (
        <div className="panel">
          <div className="empty-state">当前筛选条件下没有命中的分享草稿，换个关键词或切换渠道试试。</div>
        </div>
      ) : (
        filteredDrafts.map((draft) => <DraftEditor key={draft.id} draft={draft} />)
      )}
    </div>
  );
}

