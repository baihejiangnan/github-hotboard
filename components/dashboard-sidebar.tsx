"use client";

import Link from "next/link";

import styles from "@/app/queries/queries.module.css";

type DashboardSidebarProps = {
  active: "explore" | "queries" | "share" | "videos" | "settings";
  userName?: string | null;
};

const navItems = [
  { key: "explore", href: "/explore", label: "Explore" },
  { key: "queries", href: "/queries", label: "My Queries" },
  { key: "share", href: "/share", label: "Share Studio" },
  { key: "videos", href: "/videos", label: "Video Studio" },
  { key: "settings", href: "/settings", label: "Settings" }
] as const;

export function DashboardSidebar({ active, userName }: DashboardSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <h1>GitHub Hotboard</h1>
        <p className={styles.muted}>采集 GitHub 热榜、沉淀个人订阅、生成发布稿与带配音视频。</p>
      </div>

      <nav aria-label="主导航" className={styles.nav}>
        {navItems.map((item) => {
          const isActive = item.key === active;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`.trim()}
              href={item.href}
              key={item.key}
            >
              <span>{item.label}</span>
              <span aria-hidden="true">→</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.userCard}>
        <strong>{userName || "已登录用户"}</strong>
        <p className={styles.muted}>GitHub 账号已连接，可运行个人榜单与自动化订阅。</p>
        <Link className="ghost-button" href="/api/auth/signout" onClick={(e) => {
          e.preventDefault();
          window.location.href = "/api/auth/signout?callbackUrl=/explore";
        }}>
          Sign out
        </Link>
      </div>
    </aside>
  );
}
