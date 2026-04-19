import { describe, expect, it } from "vitest";

import {
  buildArkChatImageMessages,
  buildArkChatTextMessages,
  parseArkChatCompletionText
} from "@/lib/ai/ark";

describe("ark chat helpers", () => {
  it("builds text messages for ark chat completions", () => {
    expect(buildArkChatTextMessages("system prompt", "user prompt")).toEqual([
      {
        role: "system",
        content: "system prompt"
      },
      {
        role: "user",
        content: "user prompt"
      }
    ]);
  });

  it("builds image and text messages for ark chat completions", () => {
    expect(
      buildArkChatImageMessages(
        "https://example.com/view.jpeg",
        "这是哪里？"
      )
    ).toEqual([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: "https://example.com/view.jpeg"
            }
          },
          {
            type: "text",
            text: "这是哪里？"
          }
        ]
      }
    ]);
  });

  it("parses content returned by ark chat completions", () => {
    expect(
      parseArkChatCompletionText({
        choices: [
          {
            message: {
              content: "{\"ok\":true}"
            }
          }
        ]
      })
    ).toBe("{\"ok\":true}");
  });
});
