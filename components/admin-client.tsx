"use client";

import { useState, useEffect } from "react";

import styles from "@/app/queries/queries.module.css";
import { getMembershipLabel } from "@/lib/membership";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  membershipTier: string;
  membershipActivatedAt: string | null;
  membershipExpiresAt: string | null;
  createdAt: string;
  _count: {
    queryRuns: number;
    videoJobs: number;
    shareDrafts: number;
  };
}

export function AdminClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchCount, setBatchCount] = useState("10");
  const [batchDays, setBatchDays] = useState("30");
  const [batchExpires, setBatchExpires] = useState("90");
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchGenerate() {
    setGenerating(true);
    setGeneratedCodes([]);
    try {
      const res = await fetch("/api/admin/batch-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: parseInt(batchCount) || 10,
          durationDays: parseInt(batchDays) || 30,
          expiresInDays: parseInt(batchExpires) || 90
        })
      });
      const json = await res.json();
      if (res.ok) {
        setGeneratedCodes(json.codes);
      }
    } catch {
      /* ignore */
    } finally {
      setGenerating(false);
    }
  }

  function copyAllCodes() {
    navigator.clipboard.writeText(generatedCodes.join("\n"));
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* Batch Generate Codes */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>批量生成兑换码</h2>
            <p className={styles.muted}>一次性生成多个兑换码，生成后仅显示一次，请妥善保存。</p>
          </div>
        </div>

        <article className={styles.compactCard}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>数量</span>
              <input
                type="number"
                min={1}
                max={100}
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>时长（天）</span>
              <input
                type="number"
                min={1}
                max={3650}
                value={batchDays}
                onChange={(e) => setBatchDays(e.target.value)}
                style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>有效期（天）</span>
              <input
                type="number"
                min={1}
                max={365}
                value={batchExpires}
                onChange={(e) => setBatchExpires(e.target.value)}
                style={{ width: "80px", padding: "8px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              />
            </label>
            <button className="primary-button" onClick={handleBatchGenerate} disabled={generating}>
              {generating ? "生成中..." : "批量生成"}
            </button>
          </div>

          {generatedCodes.length > 0 && (
            <div style={{ marginTop: "16px", padding: "16px", background: "rgba(255, 252, 247, 0.9)", borderRadius: "12px", border: "1px solid rgba(209, 190, 169, 0.34)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <strong>已生成 {generatedCodes.length} 个兑换码</strong>
                <button className="ghost-button" onClick={copyAllCodes}>
                  复制全部
                </button>
              </div>
              <textarea
                readOnly
                value={generatedCodes.join("\n")}
                rows={Math.min(generatedCodes.length, 10)}
                style={{ width: "100%", padding: "12px", fontFamily: "monospace", fontSize: "13px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              />
            </div>
          )}
        </article>
      </section>

      {/* User List */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>用户列表</h2>
            <p className={styles.muted}>查看所有注册用户及其会员状态、使用情况。</p>
          </div>
        </div>

        {loading ? (
          <article className={styles.compactCard}>
            <p>加载中...</p>
          </article>
        ) : (
          <div className={styles.tableCard}>
            <table>
              <thead>
                <tr>
                  <th>用户</th>
                  <th>会员状态</th>
                  <th>到期时间</th>
                  <th>跑榜</th>
                  <th>视频</th>
                  <th>分享稿</th>
                  <th>注册时间</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {user.image && (
                          <img
                            alt={user.name ?? ""}
                            src={user.image}
                            style={{ width: 32, height: 32, borderRadius: "50%" }}
                          />
                        )}
                        <div>
                          <div>{user.name ?? "—"}</div>
                          <div style={{ fontSize: "12px", color: "rgba(72, 54, 39, 0.62)" }}>
                            {user.email ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={styles.statusPill}
                        style={{
                          background:
                            user.membershipTier === "god"
                              ? "linear-gradient(135deg, #ffd700, #ffed4e)"
                              : user.membershipTier === "plus"
                                ? "#fef3c7"
                                : "#f3f4f6",
                          color:
                            user.membershipTier === "god"
                              ? "#92400e"
                              : user.membershipTier === "plus"
                                ? "#92400e"
                                : "#374151"
                        }}
                      >
                        {getMembershipLabel(user.membershipTier as any)}
                      </span>
                    </td>
                    <td>
                      {user.membershipExpiresAt
                        ? new Date(user.membershipExpiresAt).toLocaleDateString("zh-CN")
                        : "—"}
                    </td>
                    <td>{user._count.queryRuns}</td>
                    <td>{user._count.videoJobs}</td>
                    <td>{user._count.shareDrafts}</td>
                    <td>{new Date(user.createdAt).toLocaleDateString("zh-CN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
