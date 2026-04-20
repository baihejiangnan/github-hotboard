import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import OpenAI from "openai";

import { createArkClient } from "@/lib/ai/ark";
import {
  getArkApiKey,
  getArkBaseUrl,
  getArkTtsModel,
  getArkTtsVoice,
  getFfmpegBinaryPath,
  getJuheTtsApiKey,
  getTtsModel,
  getTtsProvider,
  getZaiApiKey,
  getZaiBaseUrl,
  getZaiTtsVoice
} from "@/lib/env";
import { writeTextArtifact } from "@/lib/storage";
import { synthesizeWithPiper } from "@/lib/video/piper";

const JUHE_TTS_URL = "https://gpt.juhe.cn/text2speech/generate";
const MAX_TEXT_PER_REQUEST = 500;
const JUHE_TTS_VOICE = "Cherry";

export interface SpeechProvider {
  synthesize(jobId: string, text: string): Promise<{ audioPath: string }>;
}

export class OpenAITtsProvider implements SpeechProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async synthesize(jobId: string, text: string) {
    const result = await this.client.audio.speech.create({
      model: getTtsModel(),
      voice: "alloy",
      input: text
    });

    const buffer = Buffer.from(await result.arrayBuffer());
    const audioPath = await writeTextArtifact("audio", `${jobId}.mp3`, buffer);

    return { audioPath };
  }
}

export class ZaiTtsProvider implements SpeechProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
  }

  async synthesize(jobId: string, text: string) {
    const result = await this.client.audio.speech.create({
      model: "glm-tts",
      voice: getZaiTtsVoice() as "alloy",
      input: text
    });

    const buffer = Buffer.from(await result.arrayBuffer());
    const audioPath = await writeTextArtifact("audio", `${jobId}.mp3`, buffer);

    return { audioPath };
  }
}

export class ArkTtsProvider implements SpeechProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseUrl: string) {
    this.client = createArkClient();
    void apiKey;
    void baseUrl;
  }

  async synthesize(jobId: string, text: string) {
    const result = await this.client.audio.speech.create({
      model: getArkTtsModel(),
      voice: getArkTtsVoice() as "alloy",
      input: text
    });

    const buffer = Buffer.from(await result.arrayBuffer());
    const audioPath = await writeTextArtifact("audio", `${jobId}.mp3`, buffer);

    return { audioPath };
  }
}

export class PiperTtsProvider implements SpeechProvider {
  async synthesize(jobId: string, text: string) {
    const audioPath = await writeTextArtifact("audio", `${jobId}.wav`, "");
    await synthesizeWithPiper(text, audioPath);

    return { audioPath };
  }
}

export class JuheTtsProvider implements SpeechProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(jobId: string, text: string): Promise<{ audioPath: string }> {
    const chunks = splitTextIntoChunks(text, MAX_TEXT_PER_REQUEST);
    const finalPath = await writeTextArtifact("audio", `${jobId}.mp3`, "");

    if (chunks.length === 1) {
      const buffer = await this.fetchAudio(chunks[0]);
      await writeFile(finalPath, buffer);
    } else {
      const tmpDir = path.resolve(process.cwd(), "tmp", `juhe-tts-${jobId}`);
      await mkdir(tmpDir, { recursive: true });

      const tmpFiles: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const buffer = await this.fetchAudio(chunks[i]);
        const tmpPath = path.join(tmpDir, `chunk-${i}.mp3`);
        await writeFile(tmpPath, buffer);
        tmpFiles.push(tmpPath);
      }

      await concatBuffersWithFfmpeg(tmpFiles, finalPath);
      await rm(tmpDir, { recursive: true, force: true });
    }

    return { audioPath: finalPath };
  }

  private async fetchAudio(text: string): Promise<Buffer> {
    const params = new URLSearchParams({
      key: this.apiKey,
      text,
      voice: JUHE_TTS_VOICE,
      language: "zh-CN"
    });

    const res = await fetch(JUHE_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    if (!res.ok) {
      throw new Error(`Juhe TTS HTTP ${res.status}`);
    }

    const data = await res.json() as { code?: number; audioUrl?: string; error?: string };

    if (data.code !== 1 || !data.audioUrl) {
      throw new Error(`Juhe TTS failed: ${data.error ?? `code=${data.code}`}`);
    }

    const audioRes = await fetch(data.audioUrl);
    if (!audioRes.ok) {
      throw new Error(`Juhe TTS audio download failed: ${audioRes.status}`);
    }

    return Buffer.from(await audioRes.arrayBuffer());
  }
}

async function concatBuffersWithFfmpeg(inputPaths: string[], outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const listContent = inputPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    const listPath = outputPath + ".concat.txt";

    writeFile(listPath, listContent).then(() => {
      const ffmpegPath = getFfmpegBinaryPath();
      const child = spawn(ffmpegPath, [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listPath,
        "-c", "copy",
        outputPath
      ]);

      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      child.on("close", async (code) => {
        await rm(listPath, { force: true });
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg concat failed (exit ${code}): ${stderr}`));
      });
      child.on("error", async (err) => {
        await rm(listPath, { force: true });
        reject(err);
      });
    });
  });
}

export function createSpeechProvider(overrideProvider?: string): SpeechProvider | null {
  const provider = overrideProvider ?? getTtsProvider();

  if (provider === "none") {
    return null;
  }

  if (provider === "piper") {
    return new PiperTtsProvider();
  }

  if (provider === "ark") {
    return new ArkTtsProvider(getArkApiKey(), getArkBaseUrl());
  }

  if (provider === "zai") {
    return new ZaiTtsProvider(getZaiApiKey(), getZaiBaseUrl());
  }

  if (provider === "juhe_tts") {
    const key = getJuheTtsApiKey();
    if (!key) {
      throw new Error("JUHE_TTS_API_KEY is required for juhe_tts provider.");
    }
    return new JuheTtsProvider(key);
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate voice-over audio.");
  }

  return new OpenAITtsProvider(process.env.OPENAI_API_KEY);
}

function splitTextIntoChunks(text: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[。！？.!?])/);
  let current = "";

  for (const sentence of sentences) {
    if (current.length + sentence.length <= maxChars) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
