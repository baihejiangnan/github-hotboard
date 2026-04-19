import { NextResponse } from "next/server";

import { getGitHubAccessToken, requireUser } from "@/lib/auth";
import { GitHubClient } from "@/lib/github/client";

function mask(value: string) {
  if (value.length <= 8) {
    return `${value[0] ?? ""}***`;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET() {
  try {
    const user = await requireUser();
    const accessToken = await getGitHubAccessToken(user.id);
    const client = new GitHubClient(accessToken);
    const payload = await client.searchRepositories("stars:>50000 fork:false archived:false", "stars", 3);

    return NextResponse.json({
      ok: true,
      userId: user.id,
      tokenPreview: mask(accessToken),
      quotaSnapshot: client.getQuotaSnapshot(),
      results: payload.items.map((item) => ({
        fullName: item.full_name,
        htmlUrl: item.html_url,
        stars: item.stargazers_count
      }))
    });
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

