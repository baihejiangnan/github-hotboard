import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import type { CaptionSegment, VideoFormat, VideoScript } from "@/lib/types";
import { writeTextArtifact } from "@/lib/storage";

const compositionByFormat: Record<VideoFormat, string> = {
  vertical_60: "HotRepoVertical60",
  horizontal_90: "HotRepoHorizontal90"
};

async function copyAssetForRemotion(
  publicAssetDir: string,
  routePrefix: string,
  sourcePath: string,
  targetName: string
) {
  const targetPath = path.join(publicAssetDir, targetName);
  await copyFile(sourcePath, targetPath);
  return `${routePrefix}/${targetName}`;
}

async function prepareRenderAssets(
  jobId: string,
  script: VideoScript
) {
  const publicAssetDir = path.resolve(process.cwd(), "public", "generated-assets", jobId);
  const routePrefix = `/generated-assets/${jobId}`;

  await mkdir(publicAssetDir, { recursive: true });

  const preparedScript: VideoScript = {
    ...script,
    scenes: await Promise.all(
      script.scenes.map(async (scene, index) => {
        if (!scene.clipPath) {
          return scene;
        }

        const extension = path.extname(scene.clipPath) || ".mp4";
        const clipPath = await copyAssetForRemotion(
          publicAssetDir,
          routePrefix,
          scene.clipPath,
          `scene-${index}${extension}`
        );

        return {
          ...scene,
          clipPath
        };
      })
    )
  };

  return {
    preparedScript,
    publicAssetDir
  };
}

export async function renderVideoJob(
  jobId: string,
  format: VideoFormat,
  script: VideoScript,
  audioPath: string | null,
  captions: CaptionSegment[]
) {
  const [{ bundle }, { renderMedia, selectComposition }] = await Promise.all([
    import("@remotion/bundler"),
    import("@remotion/renderer")
  ]);

  void audioPath;

  const { preparedScript, publicAssetDir } = await prepareRenderAssets(jobId, script);
  const remotionEntry = path.resolve(process.cwd(), "remotion/index.ts");
  const publicDir = path.resolve(process.cwd(), "public");
  try {
    const serveUrl = await bundle({
      entryPoint: remotionEntry,
      publicDir,
      enableCaching: false
    });
    const compositionId = compositionByFormat[format];
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: {
        script: preparedScript,
        audioSrc: "",
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
        script: preparedScript,
        audioSrc: "",
        captions
      }
    });

    return outputLocation;
  } finally {
    await rm(publicAssetDir, { recursive: true, force: true });
  }
}
