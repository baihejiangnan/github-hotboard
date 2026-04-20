import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

function generateCode(): string {
  const bytes = randomBytes(8);
  const part = (n: number) => Math.abs(n).toString(36).toUpperCase().padStart(4, "0").slice(0, 4);
  return `${part(bytes.readInt32LE(0))}-${part(bytes.readInt32LE(4))}`;
}

function maskCode(code: string): string {
  return code.slice(0, 4) + "-****";
}

const createCodeSchema = z.object({
  durationDays: z.number().int().min(1).max(3650),
  expiresInDays: z.number().int().min(1).max(365).optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const db = prisma as any;
    const codes = await db.membershipCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        codeHash: true,
        codePreview: true,
        durationDays: true,
        expiresAt: true,
        redeemedByUserId: true,
        redeemedAt: true,
        disabledAt: true,
        createdByAdminEmail: true,
        createdAt: true
      }
    });

    return NextResponse.json(codes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch codes.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const input = createCodeSchema.parse(body);

    const code = generateCode();
    const codeHash = hashCode(code);
    const codePreview = maskCode(code);
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const db = prisma as any;
    const record = await db.membershipCode.create({
      data: {
        codeHash,
        codePreview,
        durationDays: input.durationDays,
        expiresAt: expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        createdByAdminEmail: user.email ?? "unknown"
      }
    });

    return NextResponse.json({
      id: record.id,
      code,
      codePreview,
      durationDays: record.durationDays,
      expiresAt: record.expiresAt,
      fullCode: code
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create code.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
