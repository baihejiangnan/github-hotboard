import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";

import { requireUser } from "@/lib/auth";
import { isPremiumUser } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

const redeemSchema = z.object({
  code: z.string().min(1).max(100)
});

function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = redeemSchema.parse(body);

    const db = prisma as any;
    const codeHash = hashCode(input.code);

    const membershipCode = await db.membershipCode.findUnique({
      where: { codeHash }
    });

    if (!membershipCode) {
      return NextResponse.json({ error: "兑换码无效。" }, { status: 400 });
    }

    if (membershipCode.disabledAt) {
      return NextResponse.json({ error: "兑换码已停用。" }, { status: 400 });
    }

    if (membershipCode.expiresAt < new Date()) {
      return NextResponse.json({ error: "兑换码已过期。" }, { status: 400 });
    }

    if (membershipCode.redeemedByUserId) {
      return NextResponse.json({ error: "兑换码已被使用。" }, { status: 400 });
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
      select: { membershipTier: true, membershipExpiresAt: true }
    });

    const currentExpires = fullUser?.membershipExpiresAt ?? new Date();
    const now = new Date();
    const baseDate = now > currentExpires ? now : currentExpires;
    const newExpires = new Date(baseDate.getTime() + membershipCode.durationDays * 24 * 60 * 60 * 1000);

    await db.$transaction([
      db.membershipCode.update({
        where: { codeHash },
        data: {
          redeemedByUserId: user.id,
          redeemedAt: new Date()
        }
      }),
      db.user.update({
        where: { id: user.id },
        data: {
          membershipTier: "plus",
          membershipActivatedAt: fullUser?.membershipActivatedAt ?? new Date(),
          membershipExpiresAt: newExpires
        }
      })
    ]);

    return NextResponse.json({
      ok: true,
      membershipTier: "plus",
      membershipExpiresAt: newExpires
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "兑换失败。";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
