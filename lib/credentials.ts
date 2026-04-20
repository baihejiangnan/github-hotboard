import { prisma } from "@/lib/prisma";

import { decryptApiKey, encryptApiKey, maskApiKey } from "@/lib/crypto";
import { getJuheVideoApiKey, getJuheTtsApiKey } from "@/lib/env";

export type SupportedCredentialProvider = "juhe_video" | "juhe_tts";

export async function getUserApiKey(
  userId: string,
  provider: SupportedCredentialProvider
): Promise<string | null> {
  const record = await prisma.userApiCredential.findUnique({
    where: {
      userId_provider: {
        userId,
        provider
      }
    }
  });

  if (record) {
    try {
      return decryptApiKey(record.encryptedApiKey);
    } catch {
      return null;
    }
  }

  const systemKey = getSystemKeyForProvider(provider);
  return systemKey ?? null;
}

export async function saveUserApiKey(
  userId: string,
  provider: SupportedCredentialProvider,
  key: string
): Promise<string> {
  const masked = maskApiKey(key);
  const encrypted = encryptApiKey(key);

  await prisma.userApiCredential.upsert({
    where: {
      userId_provider: {
        userId,
        provider
      }
    },
    update: {
      encryptedApiKey: encrypted,
      maskedPreview: masked,
      updatedAt: new Date()
    },
    create: {
      userId,
      provider,
      encryptedApiKey: encrypted,
      maskedPreview: masked
    }
  });

  return masked;
}

export async function deleteUserApiKey(
  userId: string,
  provider: SupportedCredentialProvider
): Promise<void> {
  await prisma.userApiCredential.deleteMany({
    where: {
      userId,
      provider
    }
  });
}

export async function getUserCredentialMask(
  userId: string,
  provider: SupportedCredentialProvider
): Promise<{ hasKey: boolean; masked: string | null }> {
  const record = await prisma.userApiCredential.findUnique({
    where: {
      userId_provider: {
        userId,
        provider
      }
    },
    select: {
      maskedPreview: true
    }
  });

  if (record) {
    return { hasKey: true, masked: record.maskedPreview };
  }

  const systemKey = getSystemKeyForProvider(provider);
  return {
    hasKey: !!systemKey,
    masked: systemKey ? maskApiKey(systemKey) : null
  };
}

function getSystemKeyForProvider(provider: SupportedCredentialProvider): string | null {
  if (provider === "juhe_video") {
    const key = getJuheVideoApiKey();
    return key || null;
  }
  if (provider === "juhe_tts") {
    const key = getJuheTtsApiKey();
    return key || null;
  }
  return null;
}
