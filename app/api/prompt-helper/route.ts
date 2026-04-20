import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createTextProvider } from "@/lib/ai/text";

const promptHelperSchema = z.object({
  targetPlatform: z.enum(["generic", "kling", "runway", "pika", "jimeng"]).default("generic"),
  topic: z.string().min(1).max(500),
  style: z.string().min(1).max(200).default("科技感，深色背景，专业"),
  cameraMotion: z.string().min(1).max(200).default("稳定镜头，平滑推进"),
  duration: z.number().int().min(5).max(60).default(15),
  ratio: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
  avoidElements: z.string().max(300).optional()
});

const PLATFORM_PROMPTS: Record<string, string> = {
  generic: "You are a professional AI video prompt engineer. Generate cinematic video prompts.",
  kling: "You are a prompt engineer for Kuaishou Kling video generation. Follow Kling prompt conventions.",
  runway: "You are a prompt engineer for Runway Gen video generation. Follow Runway conventions.",
  pika: "You are a prompt engineer for Pika video generation. Follow Pika conventions.",
  jimeng: "You are a prompt engineer for Jimeng (即梦) video generation. Follow Jimeng conventions."
};

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const input = promptHelperSchema.parse(body);

    const platformInstruction = PLATFORM_PROMPTS[input.targetPlatform] ?? PLATFORM_PROMPTS.generic;

    const systemPrompt = `${platformInstruction}

Generate a structured video prompt for the following topic. Return JSON with exactly these fields:
- promptZh: Chinese prompt (detailed, 100-300 chars)
- promptEn: English prompt (detailed, 100-300 chars, natural language)
- negativePrompt: What to avoid (English, comma-separated, max 200 chars)
- shotNotes: Camera and editing notes (Chinese, 50-150 chars)
- ratio: recommended aspect ratio
- durationSec: recommended duration in seconds`;

    const userPrompt = `Topic: ${input.topic}
Style: ${input.style}
Camera: ${input.cameraMotion}
Duration: ${input.duration}s
Ratio: ${input.ratio}
Avoid: ${input.avoidElements ?? "无"}`;

    const provider = createTextProvider();
    const result = await provider.generate(systemPrompt, userPrompt);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(result);
    } catch {
      parsed = { promptZh: result, promptEn: "", negativePrompt: "", shotNotes: "", ratio: input.ratio, durationSec: input.duration };
    }

    return NextResponse.json({
      promptZh: parsed.promptZh ?? "",
      promptEn: parsed.promptEn ?? "",
      negativePrompt: parsed.negativePrompt ?? "",
      shotNotes: parsed.shotNotes ?? "",
      ratio: parsed.ratio ?? input.ratio,
      durationSec: parsed.durationSec ?? input.duration
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prompt generation failed.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
