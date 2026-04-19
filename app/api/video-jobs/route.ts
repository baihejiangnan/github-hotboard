import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { publishVideoJob } from "@/lib/jobs";
import { prisma } from "@/lib/prisma";
import { shouldInlineRender } from "@/lib/env";
import { videoJobRequestSchema } from "@/lib/types";
import { createVideoJob, processVideoJob } from "@/lib/workflows";

export async function GET() {
  try {
    const user = await requireUser();
    const jobs = await prisma.videoJob.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json(jobs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list video jobs.";
    return NextResponse.json(
      {
        error: message
      },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = videoJobRequestSchema.parse(body);

    const run = await prisma.queryRun.findFirst({
      where: {
        id: input.runId,
        userId: user.id
      }
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }

    const job = await createVideoJob(run.id, user.id, input.format);

    if (shouldInlineRender()) {
      await processVideoJob(job.id);
    } else {
      try {
        await publishVideoJob(job.id);
      } catch {
        // Keep the job in pending state when the queue is unavailable.
      }
    }

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create video job.";
    return NextResponse.json(
      {
        error: message
      },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
