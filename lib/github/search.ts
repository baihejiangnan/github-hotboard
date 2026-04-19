import { buildSearchQueries } from "@/lib/query-input";
import type { QueryInput, SearchCandidate } from "@/lib/types";
import { GitHubClient } from "@/lib/github/client";

function inferMatchedFields(candidate: SearchCandidate, keyword?: string) {
  if (!keyword) {
    return [];
  }

  const needle = keyword.toLowerCase();
  const matchedFields = new Set<string>();

  if (candidate.fullName.toLowerCase().includes(needle) || candidate.name.toLowerCase().includes(needle)) {
    matchedFields.add("name");
  }

  if (candidate.description?.toLowerCase().includes(needle)) {
    matchedFields.add("description");
  }

  if (candidate.topics.some((topic) => topic.toLowerCase().includes(needle))) {
    matchedFields.add("topics");
  }

  return [...matchedFields];
}

function transformRepository(
  item: Awaited<ReturnType<GitHubClient["searchRepositories"]>>["items"][number],
  keyword?: string
): SearchCandidate {
  const base: SearchCandidate = {
    githubId: String(item.id),
    owner: item.owner.login,
    name: item.name,
    fullName: item.full_name,
    htmlUrl: item.html_url,
    description: item.description,
    topics: item.topics ?? [],
    language: item.language,
    defaultBranch: item.default_branch,
    totalStars: item.stargazers_count,
    fork: item.fork,
    archived: item.archived,
    createdAt: new Date(item.created_at),
    pushedAt: item.pushed_at ? new Date(item.pushed_at) : null,
    matchedFields: []
  };

  return {
    ...base,
    matchedFields: inferMatchedFields(base, keyword)
  };
}

export async function collectCandidates(client: GitHubClient, input: QueryInput) {
  const queries = buildSearchQueries(input);
  const deduped = new Map<string, SearchCandidate>();
  let partial = false;

  for (const searchQuery of queries) {
    const payload = await client.searchRepositories(searchQuery.query, searchQuery.sort);

    for (const item of payload.items) {
      const candidate = transformRepository(item, input.keyword);
      const existing = deduped.get(candidate.githubId);

      if (existing) {
        existing.matchedFields = [...new Set([...existing.matchedFields, ...candidate.matchedFields])];
        existing.totalStars = Math.max(existing.totalStars, candidate.totalStars);
        continue;
      }

      deduped.set(candidate.githubId, candidate);
    }

    if (deduped.size >= 300) {
      partial = true;
      break;
    }
  }

  const candidates = [...deduped.values()].slice(0, 300);

  if (input.keyword) {
    for (const candidate of candidates) {
      if (candidate.matchedFields.length > 0) {
        continue;
      }

      try {
        const readme = await client.fetchReadme(candidate.owner, candidate.name);
        if (readme.toLowerCase().includes(input.keyword.toLowerCase())) {
          candidate.matchedFields.push("readme");
        }
      } catch {
        partial = true;
      }
    }
  }

  return {
    partial,
    quotaSnapshot: client.getQuotaSnapshot(),
    candidates: input.keyword
      ? candidates.filter((candidate) => candidate.matchedFields.length > 0)
      : candidates
  };
}

