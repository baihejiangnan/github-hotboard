"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

import styles from "@/components/explore-form.module.css";
import { readApiError } from "@/lib/client-api";
import {
  buildScheduleCron,
  scheduleTimeOptions,
  type ScheduleMode,
  weekdayOptions
} from "@/lib/schedule";
import type { QueryInput } from "@/lib/types";

const defaults: QueryInput = {
  rankingMode: "new_hot",
  windowDays: 7,
  limit: 10,
  keywordMode: "broad",
  excludeForks: true,
  excludeArchived: true
};

type MessageKind = "info" | "error";

export function ExploreForm() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [form, setForm] = useState<QueryInput>(defaults);
  const [title, setTitle] = useState("我的热榜订阅");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("manual");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleWeekday, setScheduleWeekday] = useState("1");
  const [customCron, setCustomCron] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<MessageKind>("info");
  const [loading, setLoading] = useState(false);

  const sessionReady = sessionStatus === "authenticated";
  const sessionLoading = sessionStatus === "loading";

  function updateForm<K extends keyof QueryInput>(key: K, value: QueryInput[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function ensureSession(actionText: string) {
    if (sessionReady) {
      return true;
    }

    setMessageKind("error");
    setMessage(`请先登录 GitHub，再${actionText}。`);
    if (!sessionLoading) {
      await signIn("github", { callbackUrl: "/explore" });
    }

    return false;
  }

  async function runNow() {
    if (!(await ensureSession("运行榜单"))) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, `运行失败（${response.status}）`));
      }

      const payload = await response.json();
      router.push(`/runs/${payload.runId}`);
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "运行失败。");
    } finally {
      setLoading(false);
    }
  }

  async function saveQuery() {
    if (!(await ensureSession("保存查询"))) {
      return;
    }

    const scheduleCron = buildScheduleCron({
      mode: scheduleMode,
      time: scheduleTime,
      weekday: scheduleWeekday,
      customCron
    });

    if (scheduleMode === "custom" && !scheduleCron) {
      setMessageKind("error");
      setMessage("已选择高级 Cron，请先填写有效的 Cron 表达式。");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          title,
          scheduleCron,
          isActive: Boolean(scheduleCron)
        })
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, `保存失败（${response.status}）`));
      }

      setMessageKind("info");
      setMessage(scheduleCron ? "订阅已保存，并已加入自动化计划。" : "查询已保存到 My Queries。");
      router.refresh();
    } catch (error) {
      setMessageKind("error");
      setMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.formShell}>
      <div className={styles.statusBar}>
        <div className={styles.statusMeta}>
          <span className={styles.statusLabel}>当前状态</span>
          <span className={styles.statusValue}>
            {sessionLoading
              ? "正在同步登录态..."
              : sessionReady
                ? "已登录，可直接跑榜"
                : "未登录，需要先连接 GitHub"}
          </span>
        </div>
        <span className={styles.statusBadge}>
          {sessionLoading ? "同步中" : sessionReady ? "已连接 GitHub" : "待登录"}
        </span>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="rankingMode">榜单模式</label>
          <select
            className={styles.select}
            id="rankingMode"
            value={form.rankingMode}
            onChange={(event) =>
              updateForm("rankingMode", event.target.value as QueryInput["rankingMode"])
            }
          >
            <option value="new_hot">新项目总星榜</option>
            <option value="growth">近期开源增长榜</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="windowDays">窗口天数</label>
          <select
            className={styles.select}
            id="windowDays"
            value={form.windowDays}
            onChange={(event) => updateForm("windowDays", Number(event.target.value) as 1 | 7 | 14 | 30)}
          >
            <option value={1}>最近 1 天</option>
            <option value={7}>最近 7 天</option>
            <option value={14}>最近 14 天</option>
            <option value={30}>最近 30 天</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="keyword">关键词</label>
          <input
            className={styles.input}
            id="keyword"
            placeholder="例如 openclaw"
            type="text"
            value={form.keyword ?? ""}
            onChange={(event) => updateForm("keyword", event.target.value || undefined)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="language">语言</label>
          <input
            className={styles.input}
            id="language"
            placeholder="TypeScript / Rust / Python"
            type="text"
            value={form.language ?? ""}
            onChange={(event) => updateForm("language", event.target.value || undefined)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="topic">Topic</label>
          <input
            className={styles.input}
            id="topic"
            placeholder="ai / infra / frontend"
            type="text"
            value={form.topic ?? ""}
            onChange={(event) => updateForm("topic", event.target.value || undefined)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="limit">榜单条数</label>
          <select
            className={styles.select}
            id="limit"
            value={form.limit}
            onChange={(event) => updateForm("limit", Number(event.target.value) as 10 | 20)}
          >
            <option value={10}>前 10 名</option>
            <option value={20}>前 20 名</option>
          </select>
        </div>

        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label htmlFor="title">订阅标题</label>
          <input
            className={styles.input}
            id="title"
            placeholder="我的热榜订阅"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.schedulePanel}>
        <div className={styles.schedulePanelTitle}>
          <strong>定时方式</strong>
          <p>不定时可只手动运行；如果要自动化订阅，选择一种固定计划即可。</p>
        </div>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="scheduleMode">计划类型</label>
            <select
              className={styles.select}
              id="scheduleMode"
              value={scheduleMode}
              onChange={(event) => setScheduleMode(event.target.value as ScheduleMode)}
            >
              <option value="manual">不定时，仅手动运行</option>
              <option value="daily">每天定时</option>
              <option value="weekdays">工作日定时</option>
              <option value="weekly">每周定时</option>
              <option value="custom">高级 Cron</option>
            </select>
          </div>

          {scheduleMode !== "manual" && scheduleMode !== "custom" ? (
            <div className={styles.field}>
              <label htmlFor="scheduleTime">执行时间</label>
              <select
                className={styles.select}
                id="scheduleTime"
                value={scheduleTime}
                onChange={(event) => setScheduleTime(event.target.value)}
              >
                {scheduleTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {scheduleMode === "weekly" ? (
            <div className={styles.field}>
              <label htmlFor="scheduleWeekday">星期</label>
              <select
                className={styles.select}
                id="scheduleWeekday"
                value={scheduleWeekday}
                onChange={(event) => setScheduleWeekday(event.target.value)}
              >
                {weekdayOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {scheduleMode === "custom" ? (
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label htmlFor="customCron">Cron 表达式</label>
              <input
                className={styles.input}
                id="customCron"
                placeholder="例如 0 9 * * 1-5"
                type="text"
                value={customCron}
                onChange={(event) => setCustomCron(event.target.value)}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className={styles.actionRow}>
        <button
          className={styles.primaryButton}
          disabled={loading}
          onClick={runNow}
          type="button"
        >
          {loading ? "处理中..." : "立即跑榜"}
        </button>
        <button
          className={styles.secondaryButton}
          disabled={loading}
          onClick={saveQuery}
          type="button"
        >
          保存到 My Queries
        </button>
      </div>

      {message ? (
        <p className={messageKind === "error" ? styles.error : styles.hint}>{message}</p>
      ) : (
        <p className={styles.hint}>
          默认支持新锐热榜和增长榜两种口径，并兼容关键词、语言、Topic 与定时订阅。
        </p>
      )}
    </div>
  );
}
