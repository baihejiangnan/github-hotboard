"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import styles from "@/components/subscription-actions.module.css";
import { readApiError } from "@/lib/client-api";

type SubscriptionActionsProps = {
  id: string;
  title: string;
  isActive: boolean;
  scheduleCron?: string | null;
};

async function readJson(response: Response) {
  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

export function SubscriptionActions({
  id,
  title,
  isActive,
  scheduleCron
}: SubscriptionActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasSchedule = Boolean(scheduleCron);

  function runAction(action: () => Promise<void>) {
    startTransition(async () => {
      setError(null);
      try {
        await action();
        router.refresh();
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "操作失败");
      }
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <button
          className={styles.primaryButton}
          disabled={isPending}
          onClick={() =>
            runAction(async () => {
              const payload = await readJson(await fetch(`/api/queries/${id}/run`, { method: "POST" }));
              router.push(`/runs/${payload.runId}`);
            })
          }
          type="button"
        >
          立即补跑
        </button>
        <button
          className={styles.secondaryButton}
          disabled={isPending}
          onClick={() =>
            runAction(async () => {
              const nextTitle = window.prompt("订阅名称", title);
              if (nextTitle === null) {
                return;
              }

              const nextCron = window.prompt("新的 Cron 表达式，留空表示仅手动运行", scheduleCron ?? "");
              if (nextCron === null) {
                return;
              }

              await readJson(
                await fetch(`/api/queries/${id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    title: nextTitle,
                    scheduleCron: nextCron.trim() || null,
                    isActive: Boolean(nextCron.trim())
                  })
                })
              );
            })
          }
          type="button"
        >
          编辑计划
        </button>
        <button
          className={styles.secondaryButton}
          disabled={isPending || !hasSchedule}
          onClick={() =>
            runAction(async () => {
              await readJson(
                await fetch(`/api/queries/${id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    isActive: !isActive
                  })
                })
              );
            })
          }
          type="button"
        >
          {hasSchedule ? (isActive ? "暂停订阅" : "恢复订阅") : "无定时计划"}
        </button>
        <button
          className={styles.secondaryButton}
          disabled={isPending}
          onClick={() =>
            runAction(async () => {
              if (!window.confirm(`确定删除订阅“${title}”吗？历史运行记录会保留。`)) {
                return;
              }

              await readJson(
                await fetch(`/api/queries/${id}`, {
                  method: "DELETE"
                })
              );
              router.push("/queries");
            })
          }
          type="button"
        >
          删除订阅
        </button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
