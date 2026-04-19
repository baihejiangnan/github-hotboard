import { ReactNode } from "react";

import styles from "@/app/queries/queries.module.css";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

type DashboardPageProps = {
  active: "explore" | "queries" | "share" | "videos";
  userName?: string | null;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function DashboardPage({
  active,
  userName,
  eyebrow,
  title,
  description,
  actions,
  children
}: DashboardPageProps) {
  return (
    <div className={styles.layout}>
      <DashboardSidebar active={active} userName={userName} />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className="stack">
            <span className="eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p className={styles.muted}>{description}</p>
          </div>
          {actions ? <div className={styles.heroActions}>{actions}</div> : null}
        </section>

        {children}
      </main>
    </div>
  );
}
