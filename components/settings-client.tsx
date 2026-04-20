"use client";

import { useState } from "react";
import Link from "next/link";

import styles from "@/app/queries/queries.module.css";
import { getMembershipLabel } from "@/lib/membership";

interface SettingsData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    membershipTier: string;
    membershipActivatedAt: string | null;
    membershipExpiresAt: string | null;
    isAdmin: boolean;
  };
  settings: {
    videoMode: string;
    videoProvider: string;
    speechProvider: string;
    defaultVideoFormat: string;
    promptTargetPlatform: string;
  };
  credentials: {
    juhe_video: { hasKey: boolean; masked: string | null };
    juhe_tts: { hasKey: boolean; masked: string | null };
  };
}

interface MembershipCode {
  id: string;
  codePreview: string;
  durationDays: number;
  expiresAt: string;
  redeemedByUserId: string | null;
  redeemedAt: string | null;
  disabledAt: string | null;
  createdByAdminEmail: string;
  createdAt: string;
}

export function SettingsClient({ initialData }: { initialData: SettingsData }) {
  const [data, setData] = useState<SettingsData>(initialData);
  const [membershipCode, setMembershipCode] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const [mediaSettings, setMediaSettings] = useState(initialData.settings);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiKeysSaving, setApiKeysSaving] = useState<Record<string, boolean>>({});
  const [apiKeysMsg, setApiKeysMsg] = useState<Record<string, { type: "success" | "error"; text: string } | null>>({});

  const [adminCodes, setAdminCodes] = useState<MembershipCode[]>([]);
  const [adminCodesLoading, setAdminCodesLoading] = useState(false);
  const [newCodeDays, setNewCodeDays] = useState("30");
  const [newCodeExpires, setNewCodeExpires] = useState("90");
  const [creatingCode, setCreatingCode] = useState(false);
  const [newCodeResult, setNewCodeResult] = useState<string | null>(null);

  const [promptStudio, setPromptStudio] = useState({
    targetPlatform: "generic",
    topic: "",
    style: "科技感，深色背景，专业",
    cameraMotion: "稳定镜头，平滑推进",
    duration: 15,
    ratio: "9:16",
    avoidElements: ""
  });
  const [promptResult, setPromptResult] = useState<{
    promptZh: string;
    promptEn: string;
    negativePrompt: string;
    shotNotes: string;
  } | null>(null);
  const [promptGenerating, setPromptGenerating] = useState(false);

  const isPremium = data.user.membershipTier === "plus" || data.user.membershipTier === "god";
  const isGod = data.user.membershipTier === "god";

  async function handleRedeem() {
    if (!membershipCode.trim()) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const res = await fetch("/api/membership/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: membershipCode.trim() })
      });
      const json = await res.json();
      if (res.ok) {
        setData((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            membershipTier: "plus",
            membershipExpiresAt: json.membershipExpiresAt
          }
        }));
        setMembershipCode("");
        setRedeemMsg({ type: "success", text: `会员已开通，到期时间：${new Date(json.membershipExpiresAt).toLocaleString("zh-CN")}` });
      } else {
        setRedeemMsg({ type: "error", text: json.error ?? "兑换失败" });
      }
    } catch {
      setRedeemMsg({ type: "error", text: "网络错误，请重试。" });
    } finally {
      setRedeeming(false);
    }
  }

  async function handleSaveMediaSettings() {
    setSettingsSaving(true);
    setSettingsMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mediaSettings)
      });
      const json = await res.json();
      if (res.ok) {
        setSettingsMsg({ type: "success", text: "设置已保存。" });
        setData((prev) => ({ ...prev, settings: mediaSettings }));
      } else {
        setSettingsMsg({ type: "error", text: json.error ?? "保存失败" });
      }
    } catch {
      setSettingsMsg({ type: "error", text: "网络错误，请重试。" });
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleSaveApiKey(provider: string) {
    const key = apiKeys[provider];
    if (!key?.trim()) return;
    setApiKeysSaving((prev) => ({ ...prev, [provider]: true }));
    setApiKeysMsg((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch("/api/settings/credentials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key.trim() })
      });
      const json = await res.json();
      if (res.ok) {
        setApiKeys((prev) => ({ ...prev, [provider]: "" }));
        setApiKeysMsg((prev) => ({ ...prev, [provider]: { type: "success", text: `已保存，掩码：${json.maskedPreview}` } }));
        setData((prev) => ({
          ...prev,
          credentials: {
            ...prev.credentials,
            [provider]: { hasKey: true, masked: json.maskedPreview }
          }
        }));
      } else {
        setApiKeysMsg((prev) => ({ ...prev, [provider]: { type: "error", text: json.error ?? "保存失败" } }));
      }
    } catch {
      setApiKeysMsg((prev) => ({ ...prev, [provider]: { type: "error", text: "网络错误" } }));
    } finally {
      setApiKeysSaving((prev) => ({ ...prev, [provider]: false }));
    }
  }

  async function handleDeleteApiKey(provider: string) {
    try {
      const res = await fetch(`/api/settings/credentials?provider=${provider}`, { method: "DELETE" });
      if (res.ok) {
        setApiKeysMsg((prev) => ({ ...prev, [provider]: null }));
        setData((prev) => ({
          ...prev,
          credentials: {
            ...prev.credentials,
            [provider]: { hasKey: false, masked: null }
          }
        }));
      }
    } catch { /* ignore */ }
  }

  async function loadAdminCodes() {
    setAdminCodesLoading(true);
    try {
      const res = await fetch("/api/admin/membership-codes");
      if (res.ok) {
        setAdminCodes(await res.json());
      }
    } catch { /* ignore */ } finally {
      setAdminCodesLoading(false);
    }
  }

  async function handleCreateCode() {
    setCreatingCode(true);
    setNewCodeResult(null);
    try {
      const res = await fetch("/api/admin/membership-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationDays: parseInt(newCodeDays) || 30,
          expiresInDays: parseInt(newCodeExpires) || 90
        })
      });
      const json = await res.json();
      if (res.ok) {
        setNewCodeResult(`兑换码：${json.fullCode}（${json.durationDays}天，仅显示一次，请妥善保存）`);
        loadAdminCodes();
      } else {
        setNewCodeResult(`创建失败：${json.error}`);
      }
    } catch {
      setNewCodeResult("网络错误");
    } finally {
      setCreatingCode(false);
    }
  }

  async function handleDisableCode(id: string) {
    await fetch(`/api/admin/membership-codes/${id}`, { method: "PATCH" });
    loadAdminCodes();
  }

  async function handleGeneratePrompt() {
    setPromptGenerating(true);
    try {
      const res = await fetch("/api/prompt-helper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promptStudio)
      });
      const json = await res.json();
      if (res.ok) {
        setPromptResult(json);
      }
    } catch { /* ignore */ } finally {
      setPromptGenerating(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* Account Overview */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>账号概览</h2>
          </div>
        </div>

        <article className={styles.subscriptionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {data.user.image && (
              <img alt={data.user.name ?? ""} src={data.user.image} style={{ width: 64, height: 64, borderRadius: "50%" }} />
            )}
            <div className="stack">
              <strong style={{ fontSize: "1.2rem" }}>{data.user.name ?? "—"}</strong>
              <p className={styles.muted}>{data.user.email ?? "—"}</p>
            </div>
          </div>
        </article>
      </section>

      {/* Membership Center */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>会员中心</h2>
          </div>
        </div>

        <article className={styles.subscriptionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span
              className={styles.statusPill}
              style={{
                background: isGod
                  ? "linear-gradient(135deg, #ffd700, #ffed4e)"
                  : isPremium
                    ? "#fef3c7"
                    : "#f3f4f6",
                color: isGod || isPremium ? "#92400e" : "#374151",
                border: isGod ? "2px solid #ffd700" : "1px solid rgba(210, 173, 104, 0.3)"
              }}
            >
              {getMembershipLabel(data.user.membershipTier as any)}
            </span>
            {isPremium && data.user.membershipExpiresAt && !isGod && (
              <p className={styles.muted}>到期时间：{new Date(data.user.membershipExpiresAt).toLocaleString("zh-CN")}</p>
            )}
          </div>

          {!isPremium && (
            <div style={{ padding: "16px", background: "#fffbeb", borderRadius: "12px", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>Plus 会员权益</h4>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#92400e" }}>
                <li>使用聚合数据文生视频 API 生成高质量视频背景</li>
                <li>使用聚合数据 TTS 语音合成</li>
                <li>优先使用外部 AI 能力</li>
              </ul>
            </div>
          )}

          {!isGod && (
            <div style={{ borderTop: "1px solid rgba(209, 190, 169, 0.34)", paddingTop: "16px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>兑换会员码</h4>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="HB-XXXX-XXXX"
                  value={membershipCode}
                  onChange={(e) => setMembershipCode(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)", minWidth: "200px" }}
                />
                <button className="primary-button" onClick={handleRedeem} disabled={redeeming}>
                  {redeeming ? "兑换中…" : "兑换"}
                </button>
              </div>
              {redeemMsg && (
                <p style={{ marginTop: "8px", fontSize: "13px", color: redeemMsg.type === "success" ? "#16a34a" : "#dc2626" }}>
                  {redeemMsg.text}
                </p>
              )}
            </div>
          )}
        </article>
      </section>

      {/* Media Settings */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>媒体默认设置</h2>
            <p className={styles.muted}>配置视频和语音生成的默认 Provider。</p>
          </div>
        </div>

        <article className={styles.subscriptionCard}>
          {!isPremium && (
            <div style={{ padding: "12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", marginBottom: "16px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#0369a1" }}>
                免费用户默认使用本地生成模式。开通 Plus 后可选择外部 API 模式。
              </p>
            </div>
          )}

          <div className={styles.facts}>
            <div className={styles.fact}>
              <span>生成模式</span>
              <select
                value={mediaSettings.videoMode}
                onChange={(e) => setMediaSettings((p) => ({ ...p, videoMode: e.target.value }))}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              >
                <option value="local">本地模式（免费）</option>
                <option value="premium">会员 API 模式</option>
              </select>
            </div>

            <div className={styles.fact}>
              <span>视频 Provider</span>
              <select
                value={mediaSettings.videoProvider}
                onChange={(e) => setMediaSettings((p) => ({ ...p, videoProvider: e.target.value }))}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              >
                <option value="local_template">本地模板（免费）</option>
                <option value="juhe_video" disabled={!isPremium}>聚合数据文生视频（Plus）</option>
              </select>
            </div>

            <div className={styles.fact}>
              <span>语音 Provider</span>
              <select
                value={mediaSettings.speechProvider}
                onChange={(e) => setMediaSettings((p) => ({ ...p, speechProvider: e.target.value }))}
                style={{ padding: "8px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)" }}
              >
                <option value="piper">本地 Piper（免费）</option>
                <option value="juhe_tts" disabled={!isPremium}>聚合数据 TTS（Plus）</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button className="primary-button" onClick={handleSaveMediaSettings} disabled={settingsSaving}>
              {settingsSaving ? "保存中…" : "保存设置"}
            </button>
            {settingsMsg && (
              <p style={{ margin: 0, fontSize: "13px", color: settingsMsg.type === "success" ? "#16a34a" : "#dc2626" }}>
                {settingsMsg.text}
              </p>
            )}
          </div>
        </article>
      </section>

      {/* API Key Management */}
      {isPremium && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className="stack">
              <h2>API Key 管理</h2>
              <p className={styles.muted}>个人 Key 优先于系统默认 Key。Key 以加密形式存储。</p>
            </div>
          </div>

          <article className={styles.subscriptionCard}>
            {(["juhe_video", "juhe_tts"] as const).map((provider) => {
              const cred = data.credentials[provider];
              const label = provider === "juhe_video" ? "聚合数据视频 API Key" : "聚合数据 TTS API Key";

              return (
                <div key={provider} style={{ borderTop: provider === "juhe_tts" ? "1px solid rgba(209, 190, 169, 0.34)" : "none", paddingTop: provider === "juhe_tts" ? "16px" : 0 }}>
                  <div style={{ marginBottom: "8px" }}>
                    <strong style={{ fontSize: "14px" }}>{label}</strong>
                    {cred.hasKey && cred.masked && <p className={styles.muted}>当前：{cred.masked}</p>}
                    {!cred.hasKey && <p className={styles.muted}>使用系统默认 Key</p>}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="password"
                      placeholder="输入新的 Key 以覆盖"
                      value={apiKeys[provider] ?? ""}
                      onChange={(e) => setApiKeys((p) => ({ ...p, [provider]: e.target.value }))}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(209, 190, 169, 0.34)", minWidth: "200px" }}
                    />
                    <button
                      className="primary-button"
                      onClick={() => handleSaveApiKey(provider)}
                      disabled={apiKeysSaving[provider] || !apiKeys[provider]?.trim()}
                    >
                      {apiKeysSaving[provider] ? "…" : "保存"}
                    </button>
                    {cred.hasKey && (
                      <button className="ghost-button" onClick={() => handleDeleteApiKey(provider)}>
                        移除
                      </button>
                    )}
                  </div>
                  {apiKeysMsg[provider] && (
                    <p style={{ marginTop: "8px", fontSize: "13px", color: apiKeysMsg[provider]!.type === "success" ? "#16a34a" : "#dc2626" }}>
                      {apiKeysMsg[provider]!.text}
                    </p>
                  )}
                </div>
              );
            })}
          </article>
        </section>
      )}

      {/* Admin Section */}
      {data.user.isAdmin && (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className="stack">
              <h2>管理员功能</h2>
              <p className={styles.muted}>管理会员码和查看用户。</p>
            </div>
          </div>

          <article className={styles.subscriptionCard}>
            <Link className="primary-button" href="/admin" style={{ display: "inline-block", textDecoration: "none" }}>
              进入管理中心
            </Link>
          </article>
        </section>
      )}
    </div>
  );
}
