import OpenAI from "openai";

import { getTtsModel } from "@/lib/env";
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

export function createSpeechProvider() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate voice-over audio.");
  }

  return new OpenAITtsProvider(process.env.OPENAI_API_KEY);
}
