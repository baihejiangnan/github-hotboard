import { NextResponse } from "next/server";

function mask(value?: string) {
  if (!value) return null;
  if (value.length <= 8) return `${value[0] ?? ""}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export async function GET() {
  const nextAuthUrl = process.env.NEXTAUTH_URL || null;
  const githubId = process.env.GITHUB_ID || "";
  const githubSecret = process.env.GITHUB_SECRET || "";
  const nextAuthSecret = process.env.NEXTAUTH_SECRET || "";

  return NextResponse.json({
    nextAuthUrl,
    expectedCallbackUrl: nextAuthUrl ? `${nextAuthUrl}/api/auth/callback/github` : null,
    hasNextAuthSecret: Boolean(nextAuthSecret),
    nextAuthSecretLength: nextAuthSecret.length,
    hasGitHubId: Boolean(githubId),
    githubIdPreview: mask(githubId),
    hasGitHubSecret: Boolean(githubSecret),
    githubSecretLength: githubSecret.length
  });
}

