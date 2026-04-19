import OpenAI from "openai";

import { getZaiApiKey, getZaiBaseUrl } from "@/lib/env";

export function createChatClient(provider: "openai" | "zai"): OpenAI {
  if (provider === "zai") {
    return new OpenAI({
      apiKey: getZaiApiKey(),
      baseURL: `${getZaiBaseUrl()}/chat/completions`.replace(
        "/chat/completions",
        "",
      ),
    });
  }
  return new OpenAI();
}
