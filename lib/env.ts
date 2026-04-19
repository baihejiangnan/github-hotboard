const required = ["DATABASE_URL", "NEXTAUTH_SECRET"] as const;

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

export function shouldInlineRender() {
  return process.env.VIDEO_INLINE_RENDER === "true";
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

export function getTextProvider(): "openai" | "zai" {
  return (process.env.AI_TEXT_PROVIDER as "openai" | "zai") || "zai";
}

export function getTtsProvider(): "openai" | "zai" {
  return (process.env.AI_TTS_PROVIDER as "openai" | "zai") || "zai";
}

export function getVideoClipProvider(): "zai" | "none" {
  return (process.env.AI_VIDEO_CLIP_PROVIDER as "zai" | "none") || "none";
}

export function getZaiChatModel() {
  return process.env.ZAI_CHAT_MODEL || "glm-4.7";
}

export function getZaiTtsVoice() {
  return process.env.ZAI_TTS_VOICE || "tongtong";
}

