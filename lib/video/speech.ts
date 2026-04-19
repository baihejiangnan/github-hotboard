import OpenAI from "openai";

import {
  getTtsModel,
  getTtsProvider,
  getZaiApiKey,
  getZaiBaseUrl,
  getZaiTtsVoice
} from "@/lib/env";
import { writeTextArtifact } from "@/lib/storage";

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

export function createSpeechProvider(): SpeechProvider | null {
  if (getTtsProvider() === "none") {
    return null;
  }

  if (getTtsProvider() === "zai") {
    return new ZaiTtsProvider(getZaiApiKey(), getZaiBaseUrl());
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate voice-over audio.");
  }

  return new OpenAITtsProvider(process.env.OPENAI_API_KEY);
}
