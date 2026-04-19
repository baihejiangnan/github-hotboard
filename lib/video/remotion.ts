import path from "node:path";

import type { CaptionSegment, VideoFormat, VideoScript } from "@/lib/types";
import { writeTextArtifact } from "@/lib/storage";

const compositionByFormat: Record<VideoFormat, string> = {
  vertical_60: "HotRepoVertical60",
  horizontal_90: "HotRepoHorizontal90"
};

export async function renderVideoJob(
  jobId: string,
  format: VideoFormat,
  script: VideoScript,
  audioPath: string,
  captions: CaptionSegment[]
) {
  const [{ bundle }, { renderMedia, selectComposition }] = await Promise.all([
    import("@remotion/bundler"),
    import("@remotion/renderer")
  ]);

  const remotionEntry = path.resolve(process.cwd(), "remotion/index.ts");
  const serveUrl = await bundle(remotionEntry);
  const compositionId = compositionByFormat[format];
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: {
      script,
      audioSrc: audioPath,
      captions
    }
  });

  const outputLocation = await writeTextArtifact("video", `${jobId}.mp4`, "");

  await renderMedia({
    codec: "h264",
    serveUrl,
    composition,
    outputLocation,
    inputProps: {
      script,
      audioSrc: audioPath,
      captions
    }
  });

  return outputLocation;
}
