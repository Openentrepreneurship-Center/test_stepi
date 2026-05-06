import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "과학기술정책연구원 - 지원자 직무적합 분석",
  description: "AI 기반 직무적합성 분석 및 역량 진단 시스템",
  icons: { icon: [] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
