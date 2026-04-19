import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const triggerType = url.searchParams.get("triggerType");
    const db = prisma as any;
    const runs = await db.queryRun.findMany({
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
