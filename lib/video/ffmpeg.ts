import { rename, rm } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { getFfmpegBinaryPath } from "@/lib/env";

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const command = getFfmpegBinaryPath();
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new Error(`FFmpeg 启动失败，请检查 ${command} 是否可用。${error.message}`)
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `FFmpeg 合成失败（exit ${code}）。${stderr.trim() || "没有返回错误详情。"}`
        )
      );
    });
  });
}

export async function muxAudioTrack(videoPath: string, audioPath: string) {
  const parsed = path.parse(videoPath);
  const muxedPath = path.join(parsed.dir, `${parsed.name}.muxed${parsed.ext}`);

  try {
    await runFfmpeg([
      "-y",
      "-i",
      videoPath,
      "-i",
      audioPath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      muxedPath
    ]);

    await rm(videoPath, { force: true });
    await rename(muxedPath, videoPath);
    return videoPath;
  } catch (error) {
    await rm(muxedPath, { force: true });
    throw error;
  }
}
