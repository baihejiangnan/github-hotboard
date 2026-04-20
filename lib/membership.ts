import type { MembershipTier } from "@prisma/client";

import { getAdminEmails } from "@/lib/env";

export function isPremiumUser(
  membershipTier: MembershipTier | null | undefined,
  membershipExpiresAt: Date | null | undefined
): boolean {
  if (membershipTier === "god") {
    return true;
  }
  if (membershipTier !== "plus") {
    return false;
  }
  if (!membershipExpiresAt) {
    return true;
  }
  return membershipExpiresAt > new Date();
}

export const PREMIUM_ONLY_PROVIDERS = new Set([
  "juhe_video",
  "juhe_tts",
  "ark_video",
  "openai_tts",
  "zai_tts",
  "ark_tts"
]);

export function isPremiumProvider(provider: string): boolean {
  return PREMIUM_ONLY_PROVIDERS.has(provider);
}

export function canUseProvider(
  membershipTier: MembershipTier | null | undefined,
  membershipExpiresAt: Date | null | undefined,
  provider: string
): boolean {
  if (!isPremiumProvider(provider)) {
    return true;
  }
  return isPremiumUser(membershipTier, membershipExpiresAt);
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getAdminEmails();
  return admins.includes(email.toLowerCase().trim());
}

export function membershipTimeLeft(expiresAt: Date | null): string | null {
  if (!expiresAt) return null;
  const now = new Date();
  if (expiresAt <= now) return null;

  const diffMs = expiresAt.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 365) {
    const years = Math.floor(diffDays / 365);
    return `${years} 年`;
  }
  if (diffDays >= 30) {
    const months = Math.floor(diffDays / 30);
    return `${months} 个月`;
  }
  return `${diffDays} 天`;
}

export function getMembershipLabel(tier: MembershipTier | null | undefined): string {
  if (tier === "god") return "神明大人";
  if (tier === "plus") return "Plus 会员";
  return "免费用户";
}
