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

