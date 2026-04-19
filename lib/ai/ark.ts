import OpenAI from "openai";
import { z } from "zod";

import {
  getArkApiKey,
  getArkBaseUrl,
  getArkTextModel,
  getArkTtsModel,
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

export type ArkChatContent =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

export type ArkChatMessage = {
  role: "system" | "user";
  content: string | ArkChatContent[];
};

const arkChatCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.union([
          z.string(),
          z.array(
            z.object({
              type: z.string().optional(),
              text: z.string().optional()
            })
          )
        ])
      })
    })
  )
});

export function createArkClient() {
  return new OpenAI({
    baseURL: getArkBaseUrl(),
    apiKey: getArkApiKey()
  });
}

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

export function buildArkChatTextMessages(
  systemPrompt: string,
  userPrompt: string
): ArkChatMessage[] {
  return [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: userPrompt
    }
  ];
}

export function buildArkChatImageMessages(
  imageUrl: string,
  prompt: string
): ArkChatMessage[] {
  return [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        },
        {
          type: "text",
          text: prompt
        }
      ]
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

export function parseArkChatCompletionText(payload: unknown): string {
  const parsed = arkChatCompletionSchema.parse(payload);
  const content = parsed.choices[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.text?.trim()) {
        return item.text;
      }
    }
  }

  throw new Error("Ark chat completions payload did not contain message content.");
}

async function createArkResponse(payload: {
  model: string;
  input: ArkInputMessage[];
}) {
  const client = createArkClient();

  return client.responses.create(payload as Parameters<typeof client.responses.create>[0]);
}

async function createArkChatCompletion(payload: {
  model: string;
  messages: ArkChatMessage[];
  responseFormat?: { type: "json_object" };
}) {
  const client = createArkClient();

  return client.chat.completions.create({
    model: payload.model,
    messages: payload.messages as Parameters<typeof client.chat.completions.create>[0]["messages"],
    ...(payload.responseFormat ? { response_format: payload.responseFormat } : {})
  });
}

export async function generateArkText(
  systemPrompt: string,
  userPrompt: string,
  model = getArkTextModel()
) {
  const payload = await createArkChatCompletion({
    model,
    messages: buildArkChatTextMessages(systemPrompt, userPrompt),
    responseFormat: { type: "json_object" }
  });

  return parseArkChatCompletionText(payload);
}

export async function analyzeImageWithArk(
  imageUrl: string,
  prompt: string,
  model = getArkVisionModel()
) {
  const payload = await createArkChatCompletion({
    model,
    messages: buildArkChatImageMessages(imageUrl, prompt)
  });

  return parseArkChatCompletionText(payload);
}

export async function synthesizeSpeechWithArk(text: string, voice: string, jobId?: string) {
  const client = createArkClient();
  const result = await client.audio.speech.create({
    model: getArkTtsModel(),
    voice: voice as "alloy",
    input: text
  });

  return {
    result,
    jobId
  };
}
