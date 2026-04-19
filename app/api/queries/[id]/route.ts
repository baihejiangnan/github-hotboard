import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncSavedQuerySchedules } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import {
  buildSavedQueryUpdateData,
  savedQueryUpdateSchema
} from "@/lib/saved-queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const input = savedQueryUpdateSchema.parse(await request.json());
    const current = await prisma.savedQuery.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!current) {
      return NextResponse.json(
        {
          ok: false,
          error: "订阅不存在"
        },
        { status: 404 }
      );
    }

    const query = await prisma.savedQuery.update({
      where: {
        id: current.id
      },
      data: buildSavedQueryUpdateData(current, input)
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
        error: error instanceof Error ? error.message : "更新订阅失败"
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const current = await prisma.savedQuery.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!current) {
      return NextResponse.json(
        {
          ok: false,
          error: "订阅不存在"
        },
        { status: 404 }
      );
    }

    await prisma.savedQuery.delete({
      where: {
        id: current.id
      }
    });

    await syncSavedQuerySchedules();

    return NextResponse.json({
      ok: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "删除订阅失败"
      },
      { status: 400 }
    );
  }
}
