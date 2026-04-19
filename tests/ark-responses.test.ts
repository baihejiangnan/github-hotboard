import { describe, expect, it } from "vitest";

import {
  buildArkImageTextInput,
  buildArkTextInput,
  parseArkResponseText
} from "@/lib/ai/ark";

describe("ark responses helpers", () => {
  it("builds image and text input for the ark responses api", () => {
    expect(
      buildArkImageTextInput(
        "https://example.com/demo.png",
        "你看见了什么？"
      )
    ).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: "https://example.com/demo.png"
          },
          {
            type: "input_text",
            text: "你看见了什么？"
          }
        ]
      }
    ]);
  });

  it("builds text-only input for the ark responses api", () => {
    expect(buildArkTextInput("system prompt", "user prompt")).toEqual([
      {
        role: "system",
        content: [{ type: "input_text", text: "system prompt" }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: "user prompt" }]
      }
    ]);
  });

  it("parses top-level output_text when present", () => {
    expect(
      parseArkResponseText({
        output_text: "{\"ok\":true}"
      })
    ).toBe("{\"ok\":true}");
  });

  it("parses nested text blocks when output_text is absent", () => {
    expect(
      parseArkResponseText({
        output: [
          {
            content: [
              {
                type: "output_text",
                text: "{\"ok\":true,\"source\":\"nested\"}"
              }
            ]
          }
        ]
      })
    ).toBe("{\"ok\":true,\"source\":\"nested\"}");
  });
});
