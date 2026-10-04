import type { Metadata } from "next";

import { AuthProvider } from "@/features/auth/components/auth-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "學習進度追蹤",
  description: "記錄學習內容，同一步步達成學習目標。",
  icons: { icon: { url: "/brand/logo.svg", type: "image/svg+xml" }, apple: "/brand/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
