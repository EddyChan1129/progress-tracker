import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "學習進度追蹤",
  description: "記錄學習內容，同一步步達成學習目標。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
