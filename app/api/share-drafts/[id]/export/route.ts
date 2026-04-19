import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const draft = await prisma.shareDraft.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!draft?.exportPath) {
      return NextResponse.json({ error: "Export file not found." }, { status: 404 });
    }

    const content = await readFile(draft.exportPath, "utf8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${draft.id}.txt"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to export share draft."
      },
      { status: 400 }
    );
  }
}

