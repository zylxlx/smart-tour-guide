import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "灵山AI禅意导游",
  description: "灵山胜境 & 拈花湾禅意小镇 AI数字人导游系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
