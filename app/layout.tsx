import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daniel的小小暑假 · 2026 成长计划",
  description: "暑期课程、自由活动、打卡与心情体验记录。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
