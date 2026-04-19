import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
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

    const draft = await db.shareDraft.findFirst({
      where: {
        id,
        userId: user.id
      }
    });

    if (!draft) {
      return NextResponse.json(
        {
          ok: false,
          error: "草稿不存在"
        },
        { status: 404 }
      );
    }

    const currentPayload =
      draft.payload && typeof draft.payload === "object" && !Array.isArray(draft.payload)
        ? (draft.payload as Record<string, unknown>)
        : {};
    const patchPayload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : body;
    const nextPayload = {
      ...currentPayload,
      ...patchPayload
    };

    const nextTitleOptions =
      Array.isArray(body.titleOptions) ? normalizeStringArray(body.titleOptions) : draft.titleOptions;
    const nextHashtags =
      Array.isArray(body.hashtags) ? normalizeStringArray(body.hashtags) : draft.hashtags;

    const updated = await db.shareDraft.update({
      where: {
        id: draft.id
      },
      data: {
        titleOptions: nextTitleOptions,
        body: typeof body.body === "string" ? body.body : draft.body,
        hashtags: nextHashtags,
        coverText: typeof body.coverText === "string" ? body.coverText : draft.coverText,
        payload: nextPayload
      }
    });

    return NextResponse.json({
      ok: true,
      draft: updated
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "保存草稿失败"
      },
      { status: 400 }
    );
  }
}
