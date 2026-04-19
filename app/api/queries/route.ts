import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncSavedQuerySchedules } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import {
  buildSavedQueryCreateData,
  savedQueryCreateSchema
} from "@/lib/saved-queries";

export async function GET() {
  try {
    const user = await requireUser();
    const queries = await prisma.savedQuery.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return NextResponse.json({
      ok: true,
      queries
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "未授权"
      },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = savedQueryCreateSchema.parse(await request.json());

    const query = await prisma.savedQuery.create({
      data: buildSavedQueryCreateData(user.id, input)
    });

    await syncSavedQuerySchedules();

    return NextResponse.json({
      ok: true,
      query
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "创建订阅失败"
      },
      { status: 400 }
    );
  }
}
