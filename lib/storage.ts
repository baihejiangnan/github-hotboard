import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getExportRoot } from "@/lib/env";

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function writeTextArtifact(kind: "share" | "video" | "audio", fileName: string, content: string | Buffer) {
  const root = path.resolve(getExportRoot(), kind);
  await ensureDir(root);

  const targetPath = path.join(root, fileName);
  await writeFile(targetPath, content);
  return targetPath;
}

