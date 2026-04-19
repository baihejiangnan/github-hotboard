import type { RateLimitSnapshot } from "@/lib/types";

interface RestSearchRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  topics?: string[];
  language: string | null;
  default_branch: string | null;
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
  created_at: string;
  pushed_at: string | null;
  owner: {
    login: string;
  };
}

interface SearchResponse {
  items: RestSearchRepository[];
}

interface StargazerGraphResponse {
  data?: {
    repository: {
      stargazers: {
        edges: { starredAt: string }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
    rateLimit?: {
      remaining: number;
      limit: number;
      resetAt: string;
      cost: number;
    };
  };
  errors?: { message: string }[];
}

export class GitHubClient {
  private restRateLimit: RateLimitSnapshot = { source: "rest" };
  private graphRateLimit: RateLimitSnapshot = { source: "graphql" };

  constructor(private readonly accessToken: string) {}

  private getHeaders(extra?: HeadersInit) {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "github-hotboard",
      ...extra
    };
  }

  private captureRestRateLimit(response: Response) {
    this.restRateLimit = {
      source: "rest",
      remaining: response.headers.get("x-ratelimit-remaining")
        ? Number(response.headers.get("x-ratelimit-remaining"))
        : undefined,
      limit: response.headers.get("x-ratelimit-limit")
        ? Number(response.headers.get("x-ratelimit-limit"))
        : undefined,
      resetAt: response.headers.get("x-ratelimit-reset")
        ? new Date(Number(response.headers.get("x-ratelimit-reset")) * 1000).toISOString()
        : undefined
    };
  }

  async searchRepositories(query: string, sort: "stars" | "updated", perPage = 100) {
    const response = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=${sort}&order=desc&per_page=${perPage}`,
      {
        headers: this.getHeaders()
      }
    );

    this.captureRestRateLimit(response);

    if (!response.ok) {
      throw new Error(`GitHub search failed: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as SearchResponse;
  }

  async fetchReadme(owner: string, repo: string) {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: this.getHeaders({
        Accept: "application/vnd.github.raw+json"
      })
    });

    this.captureRestRateLimit(response);

    if (response.status === 404) {
      return "";
    }

    if (!response.ok) {
      throw new Error(`GitHub README fetch failed: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  async fetchRecentStargazers(owner: string, repo: string, cursor?: string | null) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: this.getHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        query: `
          query RepoStargazers($owner: String!, $name: String!, $cursor: String) {
            repository(owner: $owner, name: $name) {
              stargazers(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
                edges {
                  starredAt
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
            rateLimit {
              remaining
              limit
              resetAt
              cost
            }
          }
        `,
        variables: {
          owner,
          name: repo,
          cursor
        }
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub GraphQL stargazers failed: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as StargazerGraphResponse;

    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).join("; "));
    }

    const rateLimit = json.data?.rateLimit;
    if (rateLimit) {
      this.graphRateLimit = {
        source: "graphql",
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        resetAt: rateLimit.resetAt
      };
    }

    return json.data?.repository?.stargazers ?? { edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  getQuotaSnapshot(): RateLimitSnapshot[] {
    return [this.restRateLimit, this.graphRateLimit];
  }
}

