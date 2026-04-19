"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { readApiError } from "@/lib/client-api";
import { getShareChannelLabel } from "@/lib/display";
import type { NormalizedShareDraft } from "@/lib/share-drafts";

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(value: string) {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ShareDraftEditor({ draft }: { draft: NormalizedShareDraft }) {
  const [title, setTitle] = useState(draft.titleOptions[0] || "");
  const [altTitles, setAltTitles] = useState(draft.titleOptions.slice(1).join("\n"));
  const [coverText, setCoverText] = useState(draft.coverText || "");
  const [hashtags, setHashtags] = useState(draft.hashtags.join(" "));
  const [body, setBody] = useState(draft.body || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const bodyLength = body.trim().length;
  const lineCount = body.trim() ? body.trim().split("\n").length : 0;
  const previewTags = splitTags(hashtags);

  const packageText = useMemo(() => {
    return [
      `标题：${title}`,
      altTitles.trim() ? `备选标题：\n${altTitles.trim()}` : "",
      `封面文案：${coverText}`,
      hashtags.trim() ? `标签：${hashtags.trim()}` : "",
      "",
      body
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [altTitles, body, coverText, hashtags, title]);

  async function saveDraft() {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/share-drafts/${draft.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        payload: {
          titleOptions: [title, ...splitLines(altTitles)],
          coverText,
          hashtags: previewTags,
          body,
          sourceRunId: draft.sourceRunId
        }
      })
    });

    setSaving(false);

    if (!response.ok) {
      setMessage(await readApiError(response, "保存草稿失败。"));
      return;
    }

    setMessage("草稿已保存。");
    window.setTimeout(() => setMessage(null), 1600);
  }

  async function handleCopy(label: string, value: string) {
    try {
      await copyText(value);
      setMessage(`${label}已复制到剪贴板。`);
      window.setTimeout(() => setMessage(null), 1600);
    } catch {
      setMessage(`复制${label}失败。`);
    }
  }

  return (
    <div className="share-editor">
      <div className="share-editor-summary">
        <div className="share-editor-summary__top">
          <div className="share-editor-summary__main">
            <div className="meta-row">
              <span className="badge good">{getShareChannelLabel(draft.channel)}</span>
              <span className="badge">创建于 {formatDate(draft.createdAt)}</span>
              <span className="badge">{bodyLength} 字</span>
              <span className="badge">{lineCount} 行</span>
            </div>
            <h3>{title || "未命名草稿"}</h3>
            <p>{coverText || "还没有填写封面文案，建议用一句话概括本次榜单的亮点。"}</p>
          </div>

          <div className="share-editor-summary__actions">
            <Link className="ghost-button" href="/share">
              返回草稿列表
            </Link>
            <button className="button secondary" disabled={saving} onClick={saveDraft}>
              {saving ? "保存中..." : "保存修改"}
            </button>
            <button className="ghost-button" onClick={() => handleCopy("整份发布包", packageText)}>
              复制整份发布包
            </button>
          </div>
        </div>

        <div className="share-editor-summary__meta">
          <div className="share-editor-info-chip">
            <span>来源 Run</span>
            <strong>{draft.sourceRunId || "未知"}</strong>
          </div>
          <div className="share-editor-info-chip">
            <span>导出状态</span>
            <strong>{draft.exportPath ? "已导出" : "未导出"}</strong>
          </div>
          <div className="share-editor-info-chip share-editor-info-chip--path">
            <span>导出路径</span>
            <strong>{draft.exportPath || "尚未写入本地文件"}</strong>
          </div>
        </div>
      </div>

      {message ? (
        <div className="panel" style={{ marginTop: 18 }}>
          <p style={{ margin: 0 }}>{message}</p>
        </div>
      ) : null}

      <div className="share-editor-layout">
        <section className="share-editor-main">
          <div className="share-editor-main__header">
            <div>
              <h2>草稿编辑器</h2>
              <p>围绕标题、封面、标签和正文做精修，正文下方直接显示 Markdown 加载后的样子，不再单独拆分预览卡。</p>
            </div>
          </div>

          <div className="share-editor-toolbar">
            <button className="ghost-button" onClick={() => handleCopy("标题", title)}>
              复制标题
            </button>
            <button className="ghost-button" onClick={() => handleCopy("封面文案", coverText)}>
              复制封面文案
            </button>
            <button className="ghost-button" onClick={() => handleCopy("正文", body)}>
              复制正文
            </button>
            <button className="ghost-button" onClick={() => handleCopy("标签", hashtags)}>
              复制标签
            </button>
            {draft.exportPath ? (
              <a className="ghost-button" href={`/api/share-drafts/${draft.id}/export`}>
                下载导出稿
              </a>
            ) : null}
          </div>

          <div className="share-editor-canvas">
            <div className="field">
              <label>主标题</label>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>

            <div className="grid two">
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
            </div>

            <div className="field">
              <label>备选标题</label>
              <textarea
                value={altTitles}
                onChange={(event) => setAltTitles(event.target.value)}
                placeholder="一行一个备选标题"
                style={{ minHeight: 130 }}
              />
            </div>

            <div className="field">
              <label>正文 Markdown</label>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                style={{ minHeight: 640 }}
              />
            </div>

            <div className="share-editor-rendered">
              <div className="share-editor-rendered__header">
                <div>
                  <h3>文章呈现</h3>
                  <p>这里展示 Markdown 被加载后的效果，支持标题、列表、引用、粗体、代码和链接。</p>
                </div>
                <div className="meta-row">
                  <span className="badge good">{getShareChannelLabel(draft.channel)}</span>
                  <span className="badge">{bodyLength} 字</span>
                  <span className="badge">{lineCount} 行</span>
                </div>
              </div>

              <div className="share-editor-rendered__frame">
                <div className="share-live-preview">
                  <div className="share-live-preview__title">{title || "这里显示标题"}</div>
                  <div className="share-live-preview__cover">{coverText || "这里显示封面文案"}</div>
                  <MarkdownRenderer content={body || "这里显示正文内容。"} />
                </div>
              </div>

              <div className="share-editor-rendered__footer">
                <div className="meta-row">
                  {previewTags.map((tag) => (
                    <span className="badge" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
