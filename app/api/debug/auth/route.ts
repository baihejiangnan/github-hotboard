import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { buildAuthDebugPayload } from "@/lib/debug-auth";

export async function GET() {
  try {
    await requireUser();

    return NextResponse.json(
      buildAuthDebugPayload({
        nextAuthUrl: process.env.NEXTAUTH_URL,
        githubId: process.env.GITHUB_ID,
        githubSecret: process.env.GITHUB_SECRET,
        nextAuthSecret: process.env.NEXTAUTH_SECRET
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to inspect auth configuration."
      },
      { status: 401 }
    );
  }
}
