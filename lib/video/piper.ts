import { access } from "node:fs/promises";
import { spawn } from "node:child_process";

import {
  getPiperBinaryPath,
  getPiperVoiceConfigPath,
  getPiperVoiceModelPath
} from "@/lib/env";

export async function assertPiperRuntime() {
  await Promise.all([
    access(getPiperBinaryPath()),
    access(getPiperVoiceModelPath()),
    access(getPiperVoiceConfigPath())
  ]).catch(() => {
    throw new Error(
      "Piper runtime or voice files are missing. Run `npm run setup:piper` first."
    );
  });
}

export async function synthesizeWithPiper(text: string, outputPath: string) {
  await assertPiperRuntime();

  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      getPiperBinaryPath(),
      [
        "--model",
        getPiperVoiceModelPath(),
        "--config",
        getPiperVoiceConfigPath(),
        "--output_file",
        outputPath
      ],
      {
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Piper exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`
        )
      );
    });

    child.stdin.write(text);
    child.stdin.end();
  });
}
