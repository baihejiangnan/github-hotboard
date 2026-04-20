"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function AuthToast() {
  const { status } = useSession();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/explore") {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, pathname]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        padding: "16px 20px",
        borderRadius: "16px",
        background: "linear-gradient(135deg, rgba(255, 248, 241, 0.98), rgba(255, 243, 235, 0.98))",
        border: "1px solid rgba(209, 190, 169, 0.5)",
        boxShadow: "0 20px 60px rgba(163, 124, 87, 0.2)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "400px",
        animation: "slideIn 0.3s ease"
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: "#ff6b35",
          flexShrink: 0
        }}
      />
      <div>
        <strong style={{ display: "block", marginBottom: "4px", color: "#18140f" }}>
          请先登录
        </strong>
        <p style={{ margin: 0, fontSize: "14px", color: "#61584c" }}>
          需要登录 GitHub 才能访问此页面
        </p>
      </div>
      <button
        onClick={() => setShow(false)}
        style={{
          marginLeft: "auto",
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "20px",
          color: "#61584c",
          padding: "4px"
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
