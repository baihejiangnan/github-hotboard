import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  mergeShareDraftPayload,
  normalizeShareDraft,
  parseShareDraftPayload,
  serializeShareDraftPayload,
  shareDraftPayloadPatchSchema
} from "@/lib/share-drafts";
import type { ShareChannel } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = (await request.json()) as { payload?: unknown };

    const draft = await prisma.shareDraft.findFirst({
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

    const payloadPatch = shareDraftPayloadPatchSchema.parse(body.payload ?? {});
    const currentPayload = parseShareDraftPayload(draft.payload, {
      channel: draft.channel as ShareChannel,
      sourceRunId: draft.queryRunId
    });
    const nextPayload = mergeShareDraftPayload(currentPayload, payloadPatch);

    const updated = await prisma.shareDraft.update({
      where: {
        id: draft.id
      },
      data: {
        payload: serializeShareDraftPayload(nextPayload)
      }
    });

    return NextResponse.json({
      ok: true,
      draft: normalizeShareDraft(updated)
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
