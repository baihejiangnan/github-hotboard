export function buildAuthDebugPayload(input: {
  nextAuthUrl?: string | null;
  githubId?: string | null;
  githubSecret?: string | null;
  nextAuthSecret?: string | null;
}) {
  const nextAuthUrl = input.nextAuthUrl || null;

  return {
    nextAuthUrl,
    expectedCallbackUrl: nextAuthUrl
      ? `${nextAuthUrl}/api/auth/callback/github`
      : null,
    hasNextAuthSecret: Boolean(input.nextAuthSecret),
    hasGitHubId: Boolean(input.githubId),
    hasGitHubSecret: Boolean(input.githubSecret)
  };
}
