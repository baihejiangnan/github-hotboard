import {
  getOpenAIChatModel,
  getTextProvider,
  getZaiChatModel
} from "@/lib/env";

import { generateArkText } from "./ark";
import { createChatClient } from "./client";
import type { TextGenerationProvider } from "./types";

class ZaiTextProvider implements TextGenerationProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = createChatClient("zai");
    const res = await client.chat.completions.create({
      model: getZaiChatModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });
    return res.choices[0]?.message?.content ?? "";
  }
}

class OpenAITextProvider implements TextGenerationProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    const client = createChatClient("openai");
    const res = await client.chat.completions.create({
      model: getOpenAIChatModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });
    return res.choices[0]?.message?.content ?? "";
  }
}

class ArkTextProvider implements TextGenerationProvider {
  async generate(systemPrompt: string, userPrompt: string): Promise<string> {
    return generateArkText(systemPrompt, userPrompt);
  }
}

export function createTextProvider(): TextGenerationProvider {
  const provider = getTextProvider();

  if (provider === "zai") {
    return new ZaiTextProvider();
  }

  if (provider === "ark") {
    return new ArkTextProvider();
  }

  return new OpenAITextProvider();
}
