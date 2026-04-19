import { QueryRunStatus, QueryRunTriggerType } from "@prisma/client";
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

function parseTriggerType(value: string | null) {
  switch (value) {
    case "manual":
      return QueryRunTriggerType.manual;
    case "scheduled":
      return QueryRunTriggerType.scheduled;
    case "retry":
      return QueryRunTriggerType.retry;
    default:
      return undefined;
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const status = parseStatus(url.searchParams.get("status"));
    const triggerType = parseTriggerType(url.searchParams.get("triggerType"));
    const runs = await prisma.queryRun.findMany({
      where: {
        userId: user.id,
        savedQueryId: {
          not: null
        },
        ...(status ? { status } : {}),
        ...(triggerType ? { triggerType } : {})
      },
      include: {
        savedQuery: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return NextResponse.json({
      ok: true,
      runs
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "拉取全局流水失败"
      },
      { status: 400 }
    );
  }
}
