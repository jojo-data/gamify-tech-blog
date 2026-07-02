import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "技术博客游戏化学习系统",
  description: "将技术博客文章转化为可玩的学习游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
