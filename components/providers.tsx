"use client";

import { SessionProvider } from "next-auth/react";

import { AuthToast } from "@/components/auth-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <AuthToast />
    </SessionProvider>
  );
}

