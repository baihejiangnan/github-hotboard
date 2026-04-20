import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { getUserCredentialMask } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";

const settingsPatchSchema = z.object({
  videoMode: z.enum(["local", "premium"]).optional(),
  videoProvider: z.string().optional(),
  speechProvider: z.string().optional(),
  defaultVideoFormat: z.enum(["vertical_60", "horizontal_90"]).optional(),
  promptTargetPlatform: z.string().optional()
});

export async function GET() {
  try {
    const user = await requireUser();
    const db = prisma as any;

    const [fullUser, settings] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          membershipTier: true,
          membershipActivatedAt: true,
          membershipExpiresAt: true,
          createdAt: true
        }
      }),
      db.userSettings.findUnique({
        where: { userId: user.id }
      })
    ]);

    const [videoCred, ttsCred] = await Promise.all([
      getUserCredentialMask(user.id, "juhe_video"),
      getUserCredentialMask(user.id, "juhe_tts")
    ]);

    const adminEmails = (prisma as any)._isPrisma = true;

    return NextResponse.json({
      user: {
        id: fullUser.id,
        name: fullUser.name,
        email: fullUser.email,
        image: fullUser.image,
        membershipTier: fullUser.membershipTier,
        membershipActivatedAt: fullUser.membershipActivatedAt,
        membershipExpiresAt: fullUser.membershipExpiresAt,
        isAdmin: isAdmin(fullUser.email)
      },
      settings: {
        videoMode: settings?.videoMode ?? "local",
        videoProvider: settings?.videoProvider ?? "local_template",
        speechProvider: settings?.speechProvider ?? "piper",
        defaultVideoFormat: settings?.defaultVideoFormat ?? "vertical_60",
        promptTargetPlatform: settings?.promptTargetPlatform ?? "generic"
      },
      credentials: {
        juhe_video: videoCred,
        juhe_tts: ttsCred
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch settings.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = settingsPatchSchema.parse(body);
    const db = prisma as any;

    await db.userSettings.upsert({
      where: { userId: user.id },
      update: {
        ...(input.videoMode !== undefined && { videoMode: input.videoMode }),
        ...(input.videoProvider !== undefined && { videoProvider: input.videoProvider }),
        ...(input.speechProvider !== undefined && { speechProvider: input.speechProvider }),
        ...(input.defaultVideoFormat !== undefined && { defaultVideoFormat: input.defaultVideoFormat }),
        ...(input.promptTargetPlatform !== undefined && { promptTargetPlatform: input.promptTargetPlatform })
      },
      create: {
        userId: user.id,
        videoMode: input.videoMode ?? "local",
        videoProvider: input.videoProvider ?? "local_template",
        speechProvider: input.speechProvider ?? "piper",
        defaultVideoFormat: input.defaultVideoFormat ?? "vertical_60",
        promptTargetPlatform: input.promptTargetPlatform ?? "generic"
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update settings.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
