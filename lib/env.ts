const required = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const;

function getProjectPath(relativePath: string) {
  return relativePath.replace(/\\/g, "/");
}

export function assertBaseEnv() {
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

export function getExportRoot() {
  return process.env.EXPORT_ROOT || "./data/exports";
}

export function getFfmpegBinaryPath() {
  return getProjectPath(process.env.FFMPEG_BINARY_PATH || "ffmpeg");
}

export function getWorkspaceToolsRoot() {
  return getProjectPath(process.env.WORKSPACE_TOOLS_ROOT || "./tools");
}

export function getWorkspaceModelsRoot() {
  return getProjectPath(process.env.WORKSPACE_MODELS_ROOT || "./models");
}

export function shouldInlineRender() {
  return process.env.VIDEO_INLINE_RENDER === "true";
}

export function getOpenAIChatModel() {
  return process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
}

export function getTtsModel() {
  return process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts";
}

export function getZaiApiKey() {
  const key = process.env.ZAI_API_KEY;
  if (!key) throw new Error("Missing ZAI_API_KEY");
  return key;
}

export function getZaiBaseUrl() {
  return process.env.ZAI_BASE_URL || "https://api.z.ai/api/paas/v4";
}

export function getArkApiKey() {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error("Missing ARK_API_KEY");
  return key;
}

export function getArkBaseUrl() {
  return process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3";
}

export function getTextProvider(): "openai" | "zai" | "ark" {
  return (process.env.AI_TEXT_PROVIDER as "openai" | "zai" | "ark") || "ark";
}

export function getTtsProvider(): "piper" | "openai" | "zai" | "ark" | "none" {
  return (process.env.AI_TTS_PROVIDER as "piper" | "openai" | "zai" | "ark" | "none") || "piper";
}

export function getVideoClipProvider(): "ark" | "none" {
  return (process.env.AI_VIDEO_CLIP_PROVIDER as "ark" | "none") || "none";
}

export function getZaiChatModel() {
  return process.env.ZAI_CHAT_MODEL || "glm-4.7";
}

export function getArkTextModel() {
  return process.env.ARK_TEXT_MODEL || "doubao-seed-2-0-mini-260215";
}

export function getArkVisionModel() {
  return process.env.ARK_VISION_MODEL || getArkTextModel();
}

export function getArkTtsModel() {
  return process.env.ARK_TTS_MODEL || "doubao-tts";
}

export function getArkTtsVoice() {
  return process.env.ARK_TTS_VOICE || "alloy";
}

export function getArkVideoModel() {
  return process.env.ARK_VIDEO_MODEL || "doubao-seedance-1-5-pro";
}

export function getArkVideoGenerationPath() {
  return process.env.ARK_VIDEO_GENERATION_PATH || "/contents/generations/tasks";
}

export function getArkVideoQueryPathTemplate() {
  return process.env.ARK_VIDEO_QUERY_PATH_TEMPLATE || "/contents/generations/tasks/{taskId}";
}

export function getZaiTtsVoice() {
  return process.env.ZAI_TTS_VOICE || "tongtong";
}

export function getPiperRoot() {
  return getProjectPath(process.env.PIPER_ROOT || `${getWorkspaceToolsRoot()}/piper`);
}

export function getPiperDownloadsRoot() {
  return getProjectPath(
    process.env.PIPER_DOWNLOADS_ROOT || `${getPiperRoot()}/downloads`
  );
}

export function getPiperInstallRoot() {
  return getProjectPath(process.env.PIPER_INSTALL_ROOT || `${getPiperRoot()}/runtime`);
}

export function getPiperBinaryPath() {
  return getProjectPath(
    process.env.PIPER_BINARY_PATH || `${getPiperInstallRoot()}/piper/piper.exe`
  );
}

export function getPiperVoiceName() {
  return process.env.PIPER_VOICE_NAME || "zh_CN-huayan-medium";
}

export function getPiperVoicesRoot() {
  return getProjectPath(
    process.env.PIPER_VOICES_ROOT || `${getWorkspaceModelsRoot()}/piper`
  );
}

export function getPiperVoiceModelPath() {
  return getProjectPath(
    process.env.PIPER_VOICE_MODEL_PATH ||
      `${getPiperVoicesRoot()}/${getPiperVoiceName()}.onnx`
  );
}

export function getPiperVoiceConfigPath() {
  return getProjectPath(
    process.env.PIPER_VOICE_CONFIG_PATH ||
      `${getPiperVoicesRoot()}/${getPiperVoiceName()}.onnx.json`
  );
}

export function getPiperReleaseVersion() {
  return process.env.PIPER_RELEASE_VERSION || "2023.11.14-2";
}

export function getPiperDownloadUrl() {
  return (
    process.env.PIPER_DOWNLOAD_URL ||
    `https://github.com/rhasspy/piper/releases/download/${getPiperReleaseVersion()}/piper_windows_amd64.zip`
  );
}

export function getPiperVoiceModelUrl() {
  return (
    process.env.PIPER_VOICE_MODEL_URL ||
    `https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/${getPiperVoiceName()}.onnx?download=true`
  );
}

export function getPiperVoiceConfigUrl() {
  return (
    process.env.PIPER_VOICE_CONFIG_URL ||
    `https://huggingface.co/rhasspy/piper-voices/resolve/main/zh/zh_CN/huayan/medium/${getPiperVoiceName()}.onnx.json?download=true`
  );
}

export function getUserCredentialEncryptionKey(): string {
  return process.env.USER_CREDENTIAL_ENCRYPTION_KEY || "";
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getJuheVideoApiKey(): string {
  return process.env.JUHE_VIDEO_API_KEY || "";
}

export function getJuheTtsApiKey(): string {
  return process.env.JUHE_TTS_API_KEY || "";
}

export function getDefaultVideoProvider(): string {
  return process.env.DEFAULT_VIDEO_PROVIDER || "local_template";
}

export function getDefaultSpeechProvider(): string {
  return process.env.DEFAULT_SPEECH_PROVIDER || "piper";
}
