"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { readApiError } from "@/lib/client-api";
import { getShareChannelLabel, getVideoFormatLabel } from "@/lib/display";
import type { ShareChannel, VideoFormat } from "@/lib/types";

type RunStatus = "pending" | "running" | "completed" | "failed";

export function RunDetailLive({
  runId,
  initialStatus,
  resultCount,
  partial,
  error
}: {
  runId: string;
  initialStatus: RunStatus;
  resultCount: number;
  partial: boolean;
  error: string | null;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const shouldPoll = initialStatus === "pending" || initialStatus === "running";

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const interval = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 2500);

    return () => window.clearInterval(interval);
  }, [router, shouldPoll]);

  const summary = useMemo(() => {
    if (initialStatus === "failed") {
      return error || "本次跑榜失败，请稍后重试。";
    }

    if (shouldPoll) {
      return isPending ? "正在刷新榜单结果..." : "正在拉取 GitHub 数据并写入结果，页面会自动刷新。";
    }

    if (resultCount === 0) {
      return "本次运行完成了，但没有命中结果。可以换一个窗口、关键词或放宽筛选条件。";
    }

    if (partial) {
      return "结果已生成，但 GitHub 配额或候选上限触发了 partial 模式，榜单可能不是完整全集。";
    }

    return "榜单结果已就绪，可以继续生成分享稿或视频任务。";
  }, [error, initialStatus, isPending, partial, resultCount, shouldPoll]);

  async function createShare(channel: ShareChannel) {
    setMessage(null);
    const response = await fetch("/api/share-drafts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ runId, channel })
    });

    if (!response.ok) {
      setMessage(await readApiError(response, `生成${getShareChannelLabel(channel)}失败。`));
      return;
    }

    setMessage(`${getShareChannelLabel(channel)}已生成，正在跳转到 Share Studio。`);
    router.push("/share");
    router.refresh();
  }

  async function createVideo(format: VideoFormat) {
    setMessage(null);
    const response = await fetch("/api/video-jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ runId, format })
    });

    if (!response.ok) {
      setMessage(await readApiError(response, `创建${getVideoFormatLabel(format)}失败。`));
      return;
    }

    setMessage(`${getVideoFormatLabel(format)}已创建，正在跳转到 Video Studio。`);
    router.push("/videos");
    router.refresh();
  }

  return (
    <div className="stack" style={{ marginTop: 22 }}>
      <div className="panel">
        <p style={{ marginTop: 0 }}>{summary}</p>
        {message ? <p style={{ marginBottom: 0 }}>{message}</p> : null}
      </div>

      <div className="panel">
        <div className="actions">
          <button className="button secondary" disabled={shouldPoll} onClick={() => createShare("wechat_article")}>
            生成公众号稿
          </button>
          <button className="button secondary" disabled={shouldPoll} onClick={() => createShare("xiaohongshu_post")}>
            生成小红书稿
          </button>
          <button className="ghost-button" disabled={shouldPoll} onClick={() => createVideo("vertical_60")}>
            生成 60 秒竖版
          </button>
          <button className="ghost-button" disabled={shouldPoll} onClick={() => createVideo("horizontal_90")}>
            生成 90 秒横版
          </button>
          {shouldPoll ? (
            <button className="ghost-button" onClick={() => router.refresh()}>
              立即刷新
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

