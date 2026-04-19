import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { shareDraftRequestSchema } from "@/lib/types";
import { createShareDraftFromRun } from "@/lib/workflows";

export async function GET() {
  try {
    const user = await requireUser();
    const drafts = await prisma.shareDraft.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(drafts);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list share drafts.";
    return NextResponse.json(
      {
        error: message
      },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = shareDraftRequestSchema.parse(body);

    const run = await prisma.queryRun.findFirst({
      where: {
        id: input.runId,
        userId: user.id
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    const draft = await createShareDraftFromRun(input.runId, input.channel);

    return NextResponse.json(draft, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate share draft.";
    return NextResponse.json(
      {
        error: message
      },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
