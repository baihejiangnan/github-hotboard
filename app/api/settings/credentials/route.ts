import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { saveUserApiKey, deleteUserApiKey, type SupportedCredentialProvider } from "@/lib/credentials";

const supportedProviders: SupportedCredentialProvider[] = ["juhe_video", "juhe_tts"];

const credentialPutSchema = z.object({
  provider: z.enum(["juhe_video", "juhe_tts"]),
  apiKey: z.string().min(1).max(200)
});

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const input = credentialPutSchema.parse(body);

    const masked = await saveUserApiKey(user.id, input.provider as SupportedCredentialProvider, input.apiKey);

    return NextResponse.json({ ok: true, maskedPreview: masked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save credential.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider || !supportedProviders.includes(provider as SupportedCredentialProvider)) {
      return NextResponse.json({ error: "Unsupported provider." }, { status: 400 });
    }

    await deleteUserApiKey(user.id, provider as SupportedCredentialProvider);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete credential.";
    return NextResponse.json(
      { error: message },
      { status: message === "Authentication required." ? 401 : 400 }
    );
  }
}
