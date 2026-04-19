import { writeTextArtifact } from "@/lib/storage";

import type { CaptionSegment } from "@/lib/types";

export function toSrtTimestamp(totalMs: number) {
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const milliseconds = totalMs % 1_000;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
    .concat(`,${String(milliseconds).padStart(3, "0")}`);
}

export function serializeCaptionsToSrt(captions: CaptionSegment[]) {
  return captions
    .map((caption, index) =>
      [
        String(index + 1),
        `${toSrtTimestamp(caption.startMs)} --> ${toSrtTimestamp(caption.endMs)}`,
        caption.text
      ].join("\n")
    )
    .join("\n\n");
}

export async function exportCaptionArtifact(jobId: string, captions: CaptionSegment[]) {
  const srt = serializeCaptionsToSrt(captions);
  return writeTextArtifact("caption", `${jobId}.srt`, srt);
}
