export interface TextGenerationProvider {
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface VideoClipProvider {
  generateClip(
    prompt: string,
    durationSec: number,
    size: string,
  ): Promise<{ taskId: string }>;

  pollClipResult(
    taskId: string,
  ): Promise<{ status: "processing" | "success" | "fail"; videoUrl?: string }>;
}
