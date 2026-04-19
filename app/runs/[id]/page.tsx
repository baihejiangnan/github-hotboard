import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { RunDetailLive } from "@/components/run-detail-live";
import { StatusPill } from "@/components/status-pill";
import { getRankingModeLabel, getRunStatusLabel } from "@/lib/display";
import { prisma } from "@/lib/prisma";

export default async function RunDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await prisma.queryRun.findUnique({
    where: { id },
    include: {
      results: {
        orderBy: {
          rank: "asc"
        },
        include: {
          repository: true
        }
      }
    }
  });

  if (!run) {
    notFound();
  }

  const input = run.inputJson as Record<string, string | number>;

  return (
    <AppShell pathname="/explore">
      <section className="hero">
        <div className="meta-row">
          <StatusPill label={getRunStatusLabel(run.status)} kind={run.status === "completed" ? "ok" : run.status === "failed" ? "warn" : "neutral"} />
          {run.partial ? <StatusPill label="结果不完整" kind="warn" /> : null}
          {run.results.length > 0 ? <StatusPill label={`${run.results.length} 条结果`} kind="ok" /> : null}
        </div>
        <h2>榜单详情</h2>
        <p>
          模式：{getRankingModeLabel(String(input.rankingMode))} · 窗口：{String(input.windowDays)} 天 · 前 {String(input.limit)} 名
        </p>
      </section>

      <RunDetailLive
        runId={run.id}
        initialStatus={run.status}
        resultCount={run.results.length}
        partial={run.partial}
        error={run.error}
      />

      <div className="table-panel">
        {run.results.length === 0 ? (
          <div className="empty-state">
            {run.status === "failed"
              ? `本次运行失败：${run.error || "未知错误"}`
              : run.status === "completed"
                ? "本次运行已完成，但没有命中结果。"
                : "当前运行还没有结果，页面会自动刷新。"}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>仓库</th>
                <th>说明</th>
                <th>指标</th>
                <th>匹配字段</th>
                <th>直达链接</th>
              </tr>
            </thead>
            <tbody>
              {run.results.map((result) => (
                <tr key={result.id}>
                  <td>{result.rank}</td>
                  <td>
                    <strong>{result.repository.fullName}</strong>
                    <div>{result.repository.language || "Unknown"}</div>
                  </td>
                  <td>{result.repository.description || "暂无描述"}</td>
                  <td>
                    总 Star {result.totalStars}
                    <br />
                    {typeof result.starGain === "number" ? `窗口新增 ${result.starGain}` : "按总 Star 排名"}
                  </td>
                  <td>{((result.matchedFields as string[]) || []).join(", ") || "无关键词过滤"}</td>
                  <td>
                    <a className="repo-link" href={result.repository.htmlUrl} target="_blank" rel="noreferrer">
                      打开 GitHub
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

