import Link from "next/link";
import type { Route } from "next";
import { getServerSession } from "next-auth";

import { GitHubSignInButton } from "@/components/github-sign-in-button";
import { authOptions } from "@/lib/auth";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/queries", label: "My Queries" },
  { href: "/share", label: "Share Studio" },
  { href: "/videos", label: "Video Studio" },
  { href: "/settings", label: "Settings" }
];

export async function AppShell({
  pathname,
  children
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="app-shell">
      <div className="shell-grid">
        <aside className="sidebar">
          <div className="brand">
            <h1>GitHub Hotboard</h1>
            <p>采集 GitHub 热榜、沉淀个人订阅、生成发布稿与带配音视频。</p>
          </div>

          <nav>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                className={`nav-link ${pathname.startsWith(link.href) ? "is-active" : ""}`}
              >
                <span>{link.label}</span>
                <span>→</span>
              </Link>
            ))}
          </nav>

          <div className="panel" style={{ marginTop: 24, padding: 18 }}>
            <h4>{session?.user?.name || "未登录"}</h4>
            <p>{session ? "GitHub 账号已连接，可运行个人榜单与导出。" : "先连接 GitHub，系统才能读取公开仓库数据。"}</p>
            <div className="actions">
              {session ? (
                <a className="ghost-button" href="/api/auth/signout">
                  Sign out
                </a>
              ) : (
                <GitHubSignInButton />
              )}
            </div>
          </div>
        </aside>

        <main className="main-panel">{children}</main>
      </div>
    </div>
  );
}
