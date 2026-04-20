"use client";

import Link from "next/link";

import styles from "@/app/queries/queries.module.css";
import { formatDateTime, getVideoFormatLabel, getVideoStatusLabel } from "@/lib/display";

type VideoJobCardProps = {
  job: {
    id: string;
    status: string;
    format: string;
    videoPath: string | null;
    audioPath: string | null;
    captionJson: unknown;
    error: string | null;
    createdAt: Date;
    queryRunId: string;
  };
};

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

function buildExportUrl(filePath: string | null, download = false) {
  if (!filePath) return null;
  const relative = filePath.replace(/^data\/exports\//, "");
  const url = new URL(`/api/exports/${relative}`, "http://localhost");
  if (download) url.searchParams.set("download", "true");
  return url.pathname + url.search;
}

function FilePreview({ label, url }: { label: string; url: string }) {
  const ext = url.split(".").pop()?.toLowerCase();
  const isVideo = ext === "mp4";
  const isAudio = ext === "mp3" || ext === "wav";

  if (isVideo) {
    return (
      <div className={styles.mediaPreview}>
        <span className={styles.mediaLabel}>{label}</span>
        <video controls src={url} style={{ maxWidth: "100%", maxHeight: "200px" }} />
      </div>
    );
  }

  if (isAudio) {
    return (
      <div className={styles.mediaPreview}>
        <span className={styles.mediaLabel}>{label}</span>
        <audio controls src={url} />
      </div>
    );
  }

  return null;
}

export function VideoJobCard({ job }: VideoJobCardProps) {
  const videoUrl = buildExportUrl(job.videoPath);
  const videoDownloadUrl = buildExportUrl(job.videoPath, true);
  const audioUrl = buildExportUrl(job.audioPath);
  const audioDownloadUrl = buildExportUrl(job.audioPath, true);
  const isCompleted = job.status === "completed";

  return (
    <article className={styles.subscriptionCard}>
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

      {isCompleted && (videoUrl || audioUrl) ? (
        <div className={styles.exportSection}>
          <div className={styles.exportRow}>
            {videoUrl && (
              <>
                <FilePreview label="视频预览" url={videoUrl} />
                <a className="ghost-button" download href={videoDownloadUrl!} target="_blank">
                  下载视频
                </a>
              </>
            )}
            {audioUrl && (
              <>
                <FilePreview label="音频预览" url={audioUrl} />
                <a className="ghost-button" download href={audioDownloadUrl!} target="_blank">
                  下载音频
                </a>
              </>
            )}
          </div>
        </div>
      ) : null}

      {job.error ? <p className={styles.errorText}>失败原因：{job.error}</p> : null}
    </article>
  );
}
