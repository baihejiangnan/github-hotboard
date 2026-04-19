import { NextResponse } from "next/server";

import { getGitHubAccessToken, requireUser } from "@/lib/auth";
import { buildGitHubDebugPayload } from "@/lib/debug-github";
import { GitHubClient } from "@/lib/github/client";

export async function GET() {
  try {
    const user = await requireUser();
    const accessToken = await getGitHubAccessToken(user.id);
    const client = new GitHubClient(accessToken);
    const payload = await client.searchRepositories(
      "stars:>50000 fork:false archived:false",
      "stars",
      3
    );

    return NextResponse.json(
      buildGitHubDebugPayload({
        userId: user.id,
        hasGitHubAccessToken: Boolean(accessToken),
        quotaSnapshot: client.getQuotaSnapshot(),
        results: payload.items.map((item) => ({
          fullName: item.full_name,
          htmlUrl: item.html_url,
          stars: item.stargazers_count
        }))
      })
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown GitHub debug failure."
      },
      { status: 500 }
    );
  }
}
