import { describe, expect, it } from "vitest";

import { buildGitHubDebugPayload } from "@/lib/debug-github";

describe("buildGitHubDebugPayload", () => {
  it("returns a safe debug payload without token previews", () => {
    const payload = buildGitHubDebugPayload({
      userId: "user-1",
      hasGitHubAccessToken: true,
      quotaSnapshot: [{ remaining: 42, source: "rest" }],
      results: [
        {
          fullName: "owner/repo",
          htmlUrl: "https://github.com/owner/repo",
          stars: 123
        }
      ]
    });

    expect(payload).toEqual({
      ok: true,
      userId: "user-1",
      hasGitHubAccessToken: true,
      quotaSnapshot: [{ remaining: 42, source: "rest" }],
      results: [
        {
          fullName: "owner/repo",
          htmlUrl: "https://github.com/owner/repo",
          stars: 123
        }
      ]
    });
    expect(payload).not.toHaveProperty("tokenPreview");
  });
});
