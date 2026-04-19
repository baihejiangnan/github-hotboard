import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const run = await prisma.queryRun.findFirst({
      where: {
        id,
        userId: user.id
      },
      include: {
        results: {
          orderBy: {
            rank: "asc"
          },
          include: {
            repository: true
          }
        }
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load run."
      },
      { status: 400 }
    );
  }
}

