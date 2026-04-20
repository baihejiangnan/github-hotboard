import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { AdminClient } from "@/components/admin-client";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/explore");
  }

  const fullUser = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { email: true }
  });

  if (!isAdmin(fullUser?.email)) {
    redirect("/explore");
  }

  return (
    <div className={styles.layout}>
      <DashboardSidebar active="explore" userName={session?.user?.name} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className="stack">
            <span className="eyebrow">Admin</span>
            <h1>管理中心</h1>
            <p className={styles.muted}>
              管理用户、批量生成兑换码、查看系统配置。
            </p>
          </div>
        </section>

        <AdminClient />
      </main>
    </div>
  );
}
