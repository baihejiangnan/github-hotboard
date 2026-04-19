import { NextResponse } from "next/server";

import { getGitHubAccessToken, requireUser } from "@/lib/auth";
import { GitHubClient } from "@/lib/github/client";
import { collectCandidates } from "@/lib/github/search";
import { rankNewHot } from "@/lib/ranking";
import type { RankedRepository } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();
    const accessToken = await getGitHubAccessToken(user.id);
    const client = new GitHubClient(accessToken);
    const input = {
      rankingMode: "new_hot" as const,
      windowDays: 7 as const,
      limit: 10 as const,
      keywordMode: "broad" as const,
      excludeForks: true as const,
      excludeArchived: true as const
    };

    const searchResult = await collectCandidates(client, input);
    const ranked = rankNewHot(
      searchResult.candidates.map((candidate) => ({ ...candidate })) as RankedRepository[],
      input
    );

    return NextResponse.json({
      ok: true,
      partial: searchResult.partial,
      quotaSnapshot: searchResult.quotaSnapshot,
      candidateCount: searchResult.candidates.length,
      rankedCount: ranked.length,
      results: ranked.slice(0, 5).map((repo) => ({
        fullName: repo.fullName,
        htmlUrl: repo.htmlUrl,
        totalStars: repo.totalStars,
        createdAt: repo.createdAt.toISOString()
      }))
    });
  } catch (error) {
    console.error("[debug-run][error]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown run debug failure."
      },
      { status: 500 }
    );
  }
}

