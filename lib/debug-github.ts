import type { RateLimitSnapshot } from "@/lib/types";

type GitHubDebugResult = {
  fullName: string;
  htmlUrl: string;
  stars: number;
};

export function buildGitHubDebugPayload(input: {
  userId: string;
  hasGitHubAccessToken: boolean;
  quotaSnapshot: RateLimitSnapshot[];
  results: GitHubDebugResult[];
}) {
  return {
    ok: true,
    userId: input.userId,
    hasGitHubAccessToken: input.hasGitHubAccessToken,
    quotaSnapshot: input.quotaSnapshot,
    results: input.results
  };
}
