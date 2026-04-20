import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;
    const db = prisma as any;

    await db.membershipCode.update({
      where: { id },
      data: { disabledAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update code.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
