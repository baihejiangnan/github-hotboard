import { QueryRunStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseStatus(value: string | null) {
  switch (value) {
    case "pending":
      return QueryRunStatus.pending;
    case "running":
      return QueryRunStatus.running;
    case "completed":
      return QueryRunStatus.completed;
    case "failed":
      return QueryRunStatus.failed;
    default:
      return undefined;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const url = new URL(request.url);
    const status = parseStatus(url.searchParams.get("status"));
    const query = await prisma.savedQuery.findFirst({
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

    const runs = await prisma.queryRun.findMany({
      where: {
        userId: user.id,
        savedQueryId: id,
        ...(status ? { status } : {})
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      ok: true,
      runs
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "拉取运行历史失败"
      },
      { status: 400 }
    );
  }
}
