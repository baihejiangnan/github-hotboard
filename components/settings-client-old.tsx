"use client";

import { useState } from "react";

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

  const isPremium = data.user.membershipTier === "premium";

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
            membershipTier: "premium",
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
    <div className="settings-page">
      {/* Account Overview */}
      <section className="settings-section">
        <h2>账号概览</h2>
        <div className="settings-card">
          {data.user.image && (
            <img alt={data.user.name ?? ""} src={data.user.image} style={{ width: 64, height: 64, borderRadius: "50%" }} />
          )}
          <div>
            <p className="settings-label">名称</p>
            <p className="settings-value">{data.user.name ?? "—"}</p>
          </div>
          <div>
            <p className="settings-label">邮箱</p>
            <p className="settings-value">{data.user.email ?? "—"}</p>
          </div>
        </div>
      </section>

      {/* Membership Center */}
      <section className="settings-section">
        <h2>会员中心</h2>
        <div className="settings-card">
          <div className="membership-status">
            <span className={`membership-badge ${isPremium ? "premium" : "free"}`}>
              {isPremium ? "Premium" : "Free"}
            </span>
            {isPremium && data.user.membershipExpiresAt && (
              <p className="settings-muted">到期时间：{new Date(data.user.membershipExpiresAt).toLocaleString("zh-CN")}</p>
            )}
          </div>

          {!isPremium && (
            <div className="membership-benefits">
              <h4>Premium 权益</h4>
              <ul>
                <li>使用聚合数据文生视频 API 生成高质量视频背景</li>
                <li>使用聚合数据 TTS 语音合成</li>
                <li>优先使用外部 AI 能力</li>
              </ul>
            </div>
          )}

          <div className="redeem-form">
            <h4>兑换会员码</h4>
            <div className="inline-form">
              <input
                type="text"
                placeholder="XXXX-XXXX"
                value={membershipCode}
                onChange={(e) => setMembershipCode(e.target.value)}
                className="settings-input"
              />
              <button className="primary-button" onClick={handleRedeem} disabled={redeeming}>
                {redeeming ? "兑换中…" : "兑换"}
              </button>
            </div>
            {redeemMsg && (
              <p className={redeemMsg.type === "success" ? "settings-success" : "settings-error"}>
                {redeemMsg.text}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Media Default Settings */}
      <section className="settings-section">
        <h2>媒体默认设置</h2>
        <div className="settings-card">
          {!isPremium && (
            <div className="settings-notice">
              <p>免费用户默认使用本地生成模式。开通 Premium 后可选择外部 API 模式。</p>
            </div>
          )}

          <div className="settings-field">
            <label className="settings-label">生成模式</label>
            <select
              className="settings-select"
              value={mediaSettings.videoMode}
              onChange={(e) => setMediaSettings((p) => ({ ...p, videoMode: e.target.value }))}
            >
              <option value="local">本地模式（免费）</option>
              <option value="premium">会员 API 模式</option>
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">视频 Provider</label>
            <select
              className="settings-select"
              value={mediaSettings.videoProvider}
              onChange={(e) => setMediaSettings((p) => ({ ...p, videoProvider: e.target.value }))}
            >
              <option value="local_template">本地模板（免费）</option>
              <option value="juhe_video" disabled={!isPremium}>聚合数据文生视频（Premium）</option>
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">语音 Provider</label>
            <select
              className="settings-select"
              value={mediaSettings.speechProvider}
              onChange={(e) => setMediaSettings((p) => ({ ...p, speechProvider: e.target.value }))}
            >
              <option value="piper">本地 Piper（免费）</option>
              <option value="juhe_tts" disabled={!isPremium}>聚合数据 TTS（Premium）</option>
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">默认视频格式</label>
            <select
              className="settings-select"
              value={mediaSettings.defaultVideoFormat}
              onChange={(e) => setMediaSettings((p) => ({ ...p, defaultVideoFormat: e.target.value }))}
            >
              <option value="vertical_60">竖版 60 秒</option>
              <option value="horizontal_90">横版 90 秒</option>
            </select>
          </div>

          <div className="settings-field">
            <label className="settings-label">Prompt Studio 目标平台</label>
            <select
              className="settings-select"
              value={mediaSettings.promptTargetPlatform}
              onChange={(e) => setMediaSettings((p) => ({ ...p, promptTargetPlatform: e.target.value }))}
            >
              <option value="generic">通用</option>
              <option value="kling">可灵 Kling</option>
              <option value="runway">Runway</option>
              <option value="pika">Pika</option>
              <option value="jimeng">即梦</option>
            </select>
          </div>

          <button className="primary-button" onClick={handleSaveMediaSettings} disabled={settingsSaving}>
            {settingsSaving ? "保存中…" : "保存设置"}
          </button>
          {settingsMsg && (
            <p className={settingsMsg.type === "success" ? "settings-success" : "settings-error"}>
              {settingsMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* API Key Management */}
      <section className="settings-section">
        <h2>API Key 管理</h2>
        <div className="settings-card">
          <p className="settings-muted" style={{ marginBottom: 16 }}>
            个人 Key 优先于系统默认 Key。Key 以加密形式存储，接口只返回掩码预览。
          </p>

          {(["juhe_video", "juhe_tts"] as const).map((provider) => {
            const cred = data.credentials[provider];
            const isVideo = provider === "juhe_video";
            const label = isVideo ? "聚合数据视频 API Key" : "聚合数据 TTS API Key";
            const hasKey = cred.hasKey;
            const masked = cred.masked;

            return (
              <div key={provider} className="api-key-row">
                <div>
                  <p className="settings-label">{label}</p>
                  {hasKey && masked && <p className="settings-muted">当前：{masked}</p>}
                  {!hasKey && <p className="settings-muted">使用系统默认 Key</p>}
                </div>
                <div className="inline-form">
                  <input
                    type="password"
                    placeholder="输入新的 Key 以覆盖"
                    value={apiKeys[provider] ?? ""}
                    onChange={(e) => setApiKeys((p) => ({ ...p, [provider]: e.target.value }))}
                    className="settings-input"
                  />
                  <button
                    className="primary-button"
                    onClick={() => handleSaveApiKey(provider)}
                    disabled={apiKeysSaving[provider] || !apiKeys[provider]?.trim()}
                  >
                    {apiKeysSaving[provider] ? "…" : "保存"}
                  </button>
                  {hasKey && (
                    <button className="ghost-button" onClick={() => handleDeleteApiKey(provider)}>
                      移除
                    </button>
                  )}
                </div>
                {apiKeysMsg[provider] && (
                  <p className={apiKeysMsg[provider]!.type === "success" ? "settings-success" : "settings-error"}>
                    {apiKeysMsg[provider]!.text}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Prompt Studio */}
      <section className="settings-section">
        <h2>Prompt Studio</h2>
        <div className="settings-card">
          <p className="settings-muted" style={{ marginBottom: 16 }}>
            为外部视频生成工具制作提示词。支持 Kling、Runway、Pika、即梦等平台。生成后可复制使用。
          </p>

          <div className="prompt-studio-grid">
            <div className="prompt-inputs">
              <div className="settings-field">
                <label className="settings-label">目标平台</label>
                <select
                  className="settings-select"
                  value={promptStudio.targetPlatform}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, targetPlatform: e.target.value }))}
                >
                  <option value="generic">通用</option>
                  <option value="kling">可灵 Kling</option>
                  <option value="runway">Runway</option>
                  <option value="pika">Pika</option>
                  <option value="jimeng">即梦</option>
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-label">视频主题</label>
                <textarea
                  className="settings-textarea"
                  rows={3}
                  value={promptStudio.topic}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, topic: e.target.value }))}
                  placeholder="描述你想要生成的视频内容…"
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">风格</label>
                <input
                  type="text"
                  className="settings-input"
                  value={promptStudio.style}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, style: e.target.value }))}
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">镜头语气</label>
                <input
                  type="text"
                  className="settings-input"
                  value={promptStudio.cameraMotion}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, cameraMotion: e.target.value }))}
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">时长（秒）</label>
                <input
                  type="number"
                  className="settings-input"
                  min={5}
                  max={60}
                  value={promptStudio.duration}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, duration: parseInt(e.target.value) || 15 }))}
                />
              </div>

              <div className="settings-field">
                <label className="settings-label">比例</label>
                <select
                  className="settings-select"
                  value={promptStudio.ratio}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, ratio: e.target.value }))}
                >
                  <option value="9:16">9:16 竖版</option>
                  <option value="16:9">16:9 横版</option>
                  <option value="1:1">1:1 方版</option>
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-label">避免元素（选填）</label>
                <input
                  type="text"
                  className="settings-input"
                  value={promptStudio.avoidElements}
                  onChange={(e) => setPromptStudio((p) => ({ ...p, avoidElements: e.target.value }))}
                  placeholder="模糊、水印、低质量…"
                />
              </div>

              <button
                className="primary-button"
                onClick={handleGeneratePrompt}
                disabled={promptGenerating || !promptStudio.topic.trim()}
              >
                {promptGenerating ? "生成中…" : "生成提示词"}
              </button>
            </div>

            {promptResult && (
              <div className="prompt-outputs">
                <h4>生成结果</h4>
                <div className="prompt-output-item">
                  <p className="settings-label">中文提示词</p>
                  <textarea className="settings-textarea" rows={4} readOnly value={promptResult.promptZh} />
                  <button className="ghost-button" onClick={() => navigator.clipboard.writeText(promptResult.promptZh)}>
                    复制
                  </button>
                </div>
                <div className="prompt-output-item">
                  <p className="settings-label">英文提示词</p>
                  <textarea className="settings-textarea" rows={4} readOnly value={promptResult.promptEn} />
                  <button className="ghost-button" onClick={() => navigator.clipboard.writeText(promptResult.promptEn)}>
                    复制
                  </button>
                </div>
                <div className="prompt-output-item">
                  <p className="settings-label">负面提示词</p>
                  <textarea className="settings-textarea" rows={2} readOnly value={promptResult.negativePrompt} />
                  <button className="ghost-button" onClick={() => navigator.clipboard.writeText(promptResult.negativePrompt)}>
                    复制
                  </button>
                </div>
                <div className="prompt-output-item">
                  <p className="settings-label">镜头说明</p>
                  <textarea className="settings-textarea" rows={2} readOnly value={promptResult.shotNotes} />
                  <button className="ghost-button" onClick={() => navigator.clipboard.writeText(promptResult.shotNotes)}>
                    复制
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Admin: Membership Code Management */}
      {data.user.isAdmin && (
        <section className="settings-section">
          <h2>会员码管理</h2>
          <div className="settings-card">
            <button className="ghost-button" onClick={loadAdminCodes} disabled={adminCodesLoading}>
              {adminCodesLoading ? "加载中…" : "加载已有码"}
            </button>

            <div className="create-code-form">
              <h4>创建新兑换码</h4>
              <div className="inline-form" style={{ flexWrap: "wrap", gap: 8 }}>
                <label className="settings-label" style={{ margin: 0 }}>
                  时长
                  <input
                    type="number"
                    className="settings-input"
                    style={{ width: 80, marginLeft: 8 }}
                    value={newCodeDays}
                    onChange={(e) => setNewCodeDays(e.target.value)}
                    min={1}
                    max={3650}
                  />
                  天
                </label>
                <label className="settings-label" style={{ margin: 0 }}>
                  有效期
                  <input
                    type="number"
                    className="settings-input"
                    style={{ width: 80, marginLeft: 8 }}
                    value={newCodeExpires}
                    onChange={(e) => setNewCodeExpires(e.target.value)}
                    min={1}
                    max={365}
                  />
                  天
                </label>
                <button className="primary-button" onClick={handleCreateCode} disabled={creatingCode}>
                  {creatingCode ? "…" : "生成"}
                </button>
              </div>
              {newCodeResult && (
                <div className="settings-notice" style={{ marginTop: 8 }}>
                  <code>{newCodeResult}</code>
                </div>
              )}
            </div>

            {adminCodes.length > 0 && (
              <table className="codes-table">
                <thead>
                  <tr>
                    <th>码预览</th>
                    <th>时长</th>
                    <th>状态</th>
                    <th>创建者</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {adminCodes.map((code) => (
                    <tr key={code.id}>
                      <td><code>{code.codePreview}</code></td>
                      <td>{code.durationDays}天</td>
                      <td>
                        {code.disabledAt ? "已停用" :
                         code.redeemedByUserId ? `已兑换 ${code.redeemedAt ? new Date(code.redeemedAt).toLocaleDateString("zh-CN") : ""}` :
                         new Date(code.expiresAt) < new Date() ? "已过期" : "可用"}
                      </td>
                      <td>{code.createdByAdminEmail}</td>
                      <td>
                        {!code.disabledAt && !code.redeemedByUserId && (
                          <button className="ghost-button" onClick={() => handleDisableCode(code.id)}>
                            停用
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      <style>{`
        .settings-page { max-width: 800px; }
        .settings-section { margin-bottom: 32px; }
        .settings-section h2 { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: var(--color-text); }
        .settings-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
        .settings-label { font-size: 12px; font-weight: 500; color: var(--color-text-secondary); margin-bottom: 4px; display: block; }
        .settings-value { font-size: 14px; color: var(--color-text); margin: 0; }
        .settings-muted { font-size: 13px; color: var(--color-text-secondary); margin: 0; }
        .settings-notice { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px; }
        .settings-notice p { margin: 0; font-size: 13px; color: #0369a1; }
        .settings-success { color: #16a34a; font-size: 13px; margin: 0; }
        .settings-error { color: #dc2626; font-size: 13px; margin: 0; }
        .settings-input { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; background: var(--color-bg); color: var(--color-text); min-width: 200px; }
        .settings-select { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; background: var(--color-bg); color: var(--color-text); }
        .settings-textarea { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; font-size: 14px; background: var(--color-bg); color: var(--color-text); width: 100%; resize: vertical; }
        .settings-field { display: flex; flex-direction: column; }
        .inline-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .membership-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        .membership-badge.premium { background: #fef3c7; color: #92400e; }
        .membership-badge.free { background: #f3f4f6; color: #374151; }
        .membership-status { display: flex; align-items: center; gap: 12px; }
        .membership-benefits { background: #fffbeb; border-radius: 6px; padding: 12px 16px; }
        .membership-benefits h4 { margin: 0 0 8px; font-size: 14px; }
        .membership-benefits ul { margin: 0; padding-left: 20px; font-size: 13px; color: #92400e; }
        .redeem-form { border-top: 1px solid var(--color-border); padding-top: 16px; }
        .redeem-form h4 { margin: 0 0 8px; font-size: 14px; }
        .api-key-row { border-top: 1px solid var(--color-border); padding-top: 16px; }
        .api-key-row:first-child { border-top: none; padding-top: 0; }
        .prompt-studio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .prompt-inputs { display: flex; flex-direction: column; gap: 12px; }
        .prompt-outputs { display: flex; flex-direction: column; gap: 16px; }
        .prompt-outputs h4 { margin: 0; font-size: 14px; }
        .prompt-output-item { display: flex; flex-direction: column; gap: 4px; }
        .codes-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .codes-table th { text-align: left; padding: 8px; border-bottom: 1px solid var(--color-border); color: var(--color-text-secondary); }
        .codes-table td { padding: 8px; border-bottom: 1px solid var(--color-border); }
        .create-code-form { border-top: 1px solid var(--color-border); padding-top: 16px; }
        .create-code-form h4 { margin: 0 0 12px; font-size: 14px; }
        .primary-button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
        .primary-button:disabled { opacity: 0.5; cursor: not-allowed; }
        .ghost-button { padding: 8px 16px; background: transparent; color: var(--color-text); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; font-size: 14px; }
        .ghost-button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
