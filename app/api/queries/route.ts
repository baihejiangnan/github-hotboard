import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { syncSavedQuerySchedules } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { getNextRunAtForCron } from "@/lib/schedule";

function normalizeString(value: unknown) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue || null;
}

function normalizeSavedQueryBody(body: Record<string, unknown>) {
  const rankingMode = body.rankingMode === "growth" ? "growth" : "new_hot";
  const windowDaysRaw = Number(body.windowDays);
  const windowDays = [1, 7, 14, 30].includes(windowDaysRaw) ? windowDaysRaw : 7;
  const limitRaw = Number(body.limit);
  const limit = limitRaw === 20 ? 20 : 10;
  const scheduleCron = normalizeString(body.scheduleCron);

  return {
    title: normalizeString(body.title) ?? "未命名订阅",
    rankingMode,
    windowDays,
    keyword: normalizeString(body.keyword),
    language: normalizeString(body.language),
    topic: normalizeString(body.topic),
    limit,
    keywordMode: "broad",
    excludeForks: body.excludeForks !== false,
    excludeArchived: body.excludeArchived !== false,
    scheduleCron,
    isActive: scheduleCron ? body.isActive !== false : false,
    channelPreset: normalizeString(body.channelPreset) ?? "wechat_article"
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const db = prisma as any;
    const queries = await db.savedQuery.findMany({
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
    const db = prisma as any;
    const body = normalizeSavedQueryBody((await request.json()) as Record<string, unknown>);

    const query = await db.savedQuery.create({
      data: {
        userId: user.id,
        title: body.title,
        rankingMode: body.rankingMode,
        windowDays: body.windowDays,
        keyword: body.keyword,
        language: body.language,
        topic: body.topic,
        limit: body.limit,
        keywordMode: body.keywordMode,
        excludeForks: body.excludeForks,
        excludeArchived: body.excludeArchived,
        channelPreset: body.channelPreset,
        scheduleCron: body.scheduleCron,
        isActive: body.isActive,
        nextRunAt: body.isActive ? getNextRunAtForCron(body.scheduleCron) : null
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
        error: error instanceof Error ? error.message : "创建订阅失败"
      },
      { status: 400 }
    );
  }
}
