import OpenAI from "openai";
import { z } from "zod";

import {
  getArkApiKey,
  getArkBaseUrl,
  getArkTextModel,
  getArkVisionModel
} from "@/lib/env";

const arkOutputContentSchema = z.object({
  type: z.string(),
  text: z.string().optional()
});

const arkResponseSchema = z.object({
  output_text: z.string().optional(),
  output: z
    .array(
      z.object({
        content: z.array(arkOutputContentSchema).optional()
      })
    )
    .optional()
});

export type ArkInputContent =
  | {
      type: "input_text";
      text: string;
    }
  | {
      type: "input_image";
      image_url: string;
    };

export type ArkInputMessage = {
  role: "system" | "user";
  content: ArkInputContent[];
};

export function buildArkImageTextInput(
  imageUrl: string,
  prompt: string
): ArkInputMessage[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "input_image",
          image_url: imageUrl
        },
        {
          type: "input_text",
          text: prompt
        }
      ]
    }
  ];
}

export function buildArkTextInput(
  systemPrompt: string,
  userPrompt: string
): ArkInputMessage[] {
  return [
    {
      role: "system",
      content: [{ type: "input_text", text: systemPrompt }]
    },
    {
      role: "user",
      content: [{ type: "input_text", text: userPrompt }]
    }
  ];
}

export function parseArkResponseText(payload: unknown): string {
  const parsed = arkResponseSchema.parse(payload);

  if (parsed.output_text?.trim()) {
    return parsed.output_text;
  }

  for (const item of parsed.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.text?.trim()) {
        return content.text;
      }
    }
  }

  throw new Error("Ark responses payload did not contain output text.");
}

async function createArkResponse(payload: {
  model: string;
  input: ArkInputMessage[];
}) {
  const client = new OpenAI({
    baseURL: getArkBaseUrl(),
    apiKey: getArkApiKey()
  });

  return client.responses.create(payload as Parameters<typeof client.responses.create>[0]);
}

export async function generateArkText(
  systemPrompt: string,
  userPrompt: string,
  model = getArkTextModel()
) {
  const payload = await createArkResponse({
    model,
    input: buildArkTextInput(systemPrompt, userPrompt)
  });

  return parseArkResponseText(payload);
}

export async function analyzeImageWithArk(
  imageUrl: string,
  prompt: string,
  model = getArkVisionModel()
) {
  const payload = await createArkResponse({
    model,
    input: buildArkImageTextInput(imageUrl, prompt)
  });

  return parseArkResponseText(payload);
}
