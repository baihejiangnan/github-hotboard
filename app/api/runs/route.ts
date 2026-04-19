import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { queryInputSchema } from "@/lib/types";
import { runRankingWorkflow } from "@/lib/workflows";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = queryInputSchema.parse(body);

    const run = await prisma.queryRun.create({
      data: {
        userId: user.id,
        inputJson: input
      }
    });

    // Manual runs should complete immediately so the user lands on a filled result page.
    // Scheduled jobs still use the worker path from lib/jobs.ts.
    await runRankingWorkflow(run.id);

    return NextResponse.json({ runId: run.id }, { status: 201 });
  } catch (error) {
    console.error("[api/runs][error]", error);
    const message = error instanceof Error ? error.message : "Unable to create run.";
    return NextResponse.json(
      {
        error: message
      },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
