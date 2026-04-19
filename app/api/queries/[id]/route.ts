import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncSavedQuerySchedules } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { getNextRunAtForCron } from "@/lib/schedule";

function normalizeString(value: unknown) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const db = prisma as any;
    const current = await db.savedQuery.findFirst({
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

    const nextScheduleCron =
      Object.prototype.hasOwnProperty.call(body, "scheduleCron") ? normalizeString(body.scheduleCron) : current.scheduleCron;
    const nextIsActive =
      typeof body.isActive === "boolean" ? body.isActive : nextScheduleCron ? current.isActive : false;

    const query = await db.savedQuery.update({
      where: {
        id: current.id
      },
      data: {
        title: Object.prototype.hasOwnProperty.call(body, "title") ? normalizeString(body.title) ?? current.title : current.title,
        scheduleCron: nextScheduleCron,
        isActive: nextIsActive,
        nextRunAt: nextScheduleCron && nextIsActive ? getNextRunAtForCron(nextScheduleCron) : null
      }
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
    const db = prisma as any;
    const current = await db.savedQuery.findFirst({
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

    await db.savedQuery.delete({
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
