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

export function getTtsProvider(): "openai" | "zai" | "ark" | "none" {
  return (process.env.AI_TTS_PROVIDER as "openai" | "zai" | "ark" | "none") || "none";
}

export function getVideoClipProvider(): "ark" | "none" {
  return (process.env.AI_VIDEO_CLIP_PROVIDER as "ark" | "none") || "ark";
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
