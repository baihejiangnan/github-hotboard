import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

const batchSchema = z.object({
  count: z.number().min(1).max(100),
  durationDays: z.number().min(1).max(3650),
  expiresInDays: z.number().min(1).max(365)
});

function generateCode(): string {
  const part1 = randomBytes(2).toString("hex").toUpperCase();
  const part2 = randomBytes(2).toString("hex").toUpperCase();
  return `HB-${part1}-${part2}`;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true }
    });

    if (!isAdmin(fullUser?.email)) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const body = await request.json();
    const input = batchSchema.parse(body);

    const db = prisma as any;
    const codes = [];
    const expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

    for (let i = 0; i < input.count; i++) {
      const fullCode = generateCode();
      const codeHash = hashCode(fullCode);
      const codePreview = fullCode.replace(/(.{3})(.{4})(.{4})/, "$1-****-****");

      await db.membershipCode.create({
        data: {
          codeHash,
          codePreview,
          durationDays: input.durationDays,
          expiresAt,
          createdByAdminEmail: fullUser?.email ?? "unknown"
        }
      });

      codes.push(fullCode);
    }

    return NextResponse.json({ codes, count: codes.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "批量生成失败";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
