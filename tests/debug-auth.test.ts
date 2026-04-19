import { describe, expect, it } from "vitest";

import { buildAuthDebugPayload } from "@/lib/debug-auth";

describe("buildAuthDebugPayload", () => {
  it("returns only safe configuration status fields", () => {
    const payload = buildAuthDebugPayload({
      nextAuthUrl: "http://localhost:3000",
      githubId: "github-client-id",
      githubSecret: "super-secret",
      nextAuthSecret: "another-secret"
    });

    expect(payload).toEqual({
      nextAuthUrl: "http://localhost:3000",
      expectedCallbackUrl: "http://localhost:3000/api/auth/callback/github",
      hasNextAuthSecret: true,
      hasGitHubId: true,
      hasGitHubSecret: true
    });
    expect(payload).not.toHaveProperty("githubIdPreview");
    expect(payload).not.toHaveProperty("githubSecretLength");
    expect(payload).not.toHaveProperty("nextAuthSecretLength");
  });

  it("keeps callback information null when NEXTAUTH_URL is missing", () => {
    const payload = buildAuthDebugPayload({});

    expect(payload).toEqual({
      nextAuthUrl: null,
      expectedCallbackUrl: null,
      hasNextAuthSecret: false,
      hasGitHubId: false,
      hasGitHubSecret: false
    });
  });
});
