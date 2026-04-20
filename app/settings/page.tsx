import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { SettingsClient } from "@/components/settings-client";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { getUserCredentialMask } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const db = prisma as any;
  const [fullUser, settings] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        membershipTier: true,
        membershipActivatedAt: true,
        membershipExpiresAt: true
      }
    }),
    db.userSettings.findUnique({
      where: { userId }
    })
  ]);

  const [videoCred, ttsCred] = await Promise.all([
    getUserCredentialMask(userId, "juhe_video"),
    getUserCredentialMask(userId, "juhe_tts")
  ]);

  const initialData = {
    user: {
      id: fullUser.id,
      name: fullUser.name,
      email: fullUser.email,
      image: fullUser.image,
      membershipTier: fullUser.membershipTier,
      membershipActivatedAt: fullUser.membershipActivatedAt
        ? fullUser.membershipActivatedAt.toISOString()
        : null,
      membershipExpiresAt: fullUser.membershipExpiresAt
        ? fullUser.membershipExpiresAt.toISOString()
        : null,
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
  };

  return (
    <div className={styles.layout}>
      <DashboardSidebar active="settings" userName={session?.user?.name} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className="stack">
            <span className="eyebrow">Settings</span>
            <h1>个人设置</h1>
            <p className={styles.muted}>
              管理你的账号、会员状态、媒体生成默认设置、API Key 与 Prompt Studio。
            </p>
          </div>
        </section>

        <SettingsClient initialData={initialData} />
      </main>
    </div>
  );
}
