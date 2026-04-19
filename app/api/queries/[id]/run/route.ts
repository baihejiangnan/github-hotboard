import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { executeSavedQueryRun } from "@/lib/workflows";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const db = prisma as any;
    const query = await db.savedQuery.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!query) {
      return NextResponse.json(
        {
          ok: false,
          error: "订阅不存在"
        },
        { status: 404 }
      );
    }

    const run = await executeSavedQueryRun(query.id, "manual");

    return NextResponse.json({
      ok: true,
      runId: run.id
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "补跑失败"
      },
      { status: 400 }
    );
  }
}
