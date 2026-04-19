import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runRankingWorkflow } from "@/lib/workflows";

export async function GET() {
  try {
    const user = await requireUser();

    const run = await prisma.queryRun.create({
      data: {
        userId: user.id,
        inputJson: {
          rankingMode: "new_hot",
          windowDays: 7,
          limit: 10,
          keywordMode: "broad",
          excludeForks: true,
          excludeArchived: true
        }
      }
    });

    const results = await runRankingWorkflow(run.id);

    return NextResponse.json({
      ok: true,
      runId: run.id,
      resultCount: results.length,
      preview: results.slice(0, 5)
    });
  } catch (error) {
    console.error("[debug-run-persist][error]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown run persist debug failure."
      },
      { status: 500 }
    );
  }
}

