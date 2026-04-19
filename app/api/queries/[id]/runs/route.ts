import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
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

    const runs = await db.queryRun.findMany({
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
