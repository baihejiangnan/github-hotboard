import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: filePathParts } = await params;
  const filePath = filePathParts.join("/");

  if (!filePath || filePath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.resolve(process.cwd(), "data/exports", filePath);

  if (!fullPath.startsWith(path.resolve(process.cwd(), "data/exports"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(fullPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Not a file" }, { status: 400 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".json": "application/json",
    ".txt": "text/plain"
  };
  const contentType = mimeTypes[ext] || "application/octet-stream";

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "true";
  const file = fs.readFileSync(fullPath);
  return new NextResponse(file, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": download
        ? `attachment; filename="${path.basename(filePath)}"`
        : `inline; filename="${path.basename(filePath)}"`
    }
  });
}
