import { Manrope, Noto_Sans_SC } from "next/font/google";

import "@/app/globals.css";
import { Providers } from "@/components/providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope"
});

const notoSansSc = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-noto-sans-sc",
  weight: ["400", "500", "700"]
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={`${manrope.variable} ${notoSansSc.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
