import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  getPiperBinaryPath,
  getPiperDownloadUrl,
  getPiperDownloadsRoot,
  getPiperInstallRoot,
  getPiperVoiceConfigPath,
  getPiperVoiceConfigUrl,
  getPiperVoiceModelPath,
  getPiperVoiceModelUrl
} from "@/lib/env";

const execFileAsync = promisify(execFile);

async function exists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(targetPath: string) {
  await mkdir(targetPath, { recursive: true });
}

async function downloadFile(url: string, outputPath: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await ensureDir(path.dirname(outputPath));
  await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, bytes));
}

async function extractZip(zipPath: string, outputDir: string) {
  await ensureDir(outputDir);

  if (process.platform === "win32") {
    await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${outputDir.replace(/'/g, "''")}' -Force`
      ]
    );
    return;
  }

  await execFileAsync("python", [
    "-c",
    [
      "import sys, zipfile",
      "zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])"
    ].join(";"),
    zipPath,
    outputDir
  ]);
}

async function main() {
  const downloadsRoot = path.resolve(getPiperDownloadsRoot());
  const installRoot = path.resolve(getPiperInstallRoot());
  const zipPath = path.join(downloadsRoot, "piper_windows_amd64.zip");
  const binaryPath = path.resolve(getPiperBinaryPath());
  const voiceModelPath = path.resolve(getPiperVoiceModelPath());
  const voiceConfigPath = path.resolve(getPiperVoiceConfigPath());

  await Promise.all([
    ensureDir(downloadsRoot),
    ensureDir(installRoot),
    ensureDir(path.dirname(voiceModelPath))
  ]);

  if (!(await exists(binaryPath))) {
    console.log("[setup:piper] downloading runtime");
    if (!(await exists(zipPath))) {
      await downloadFile(getPiperDownloadUrl(), zipPath);
    }
    await extractZip(zipPath, installRoot);
  }

  if (!(await exists(voiceModelPath))) {
    console.log("[setup:piper] downloading voice model");
    await downloadFile(getPiperVoiceModelUrl(), voiceModelPath);
  }

  if (!(await exists(voiceConfigPath))) {
    console.log("[setup:piper] downloading voice config");
    await downloadFile(getPiperVoiceConfigUrl(), voiceConfigPath);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        binaryPath,
        voiceModelPath,
        voiceConfigPath
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[setup:piper]", error instanceof Error ? error.message : error);
  process.exit(1);
});
