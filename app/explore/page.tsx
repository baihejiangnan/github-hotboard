import { getServerSession } from "next-auth";

import styles from "@/app/queries/queries.module.css";
import { DashboardPage } from "@/components/dashboard-page";
import { ExploreForm } from "@/components/explore-form";
import { authOptions } from "@/lib/auth";

export default async function ExplorePage() {
  const session = await getServerSession(authOptions);

  return (
    <DashboardPage
      active="explore"
      actions={null}
      description="手动跑榜、保存热榜订阅、设置定时计划都从这里开始。输入条件后可以立刻查看结果，也可以把它保存成自动化订阅。"
      eyebrow="Explore"
      title="热榜探索台"
      userName={session?.user?.name}
    >
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div className="stack">
            <h2>立即跑榜</h2>
            <p className={styles.muted}>默认支持新锐热榜和增长榜两种口径，并兼容关键词、语言、Topic 与定时订阅。</p>
          </div>
        </div>

        <article className={styles.compactCard}>
          <ExploreForm />
        </article>
      </section>
    </DashboardPage>
  );
}
