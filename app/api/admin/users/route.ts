import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true }
    });

    if (!isAdmin(fullUser?.email)) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }

    const db = prisma as any;
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        membershipTier: true,
        membershipActivatedAt: true,
        membershipExpiresAt: true,
        createdAt: true,
        _count: {
          select: {
            queryRuns: true,
            videoJobs: true,
            shareDrafts: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : "获取用户列表失败";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 500 }
    );
  }
}
