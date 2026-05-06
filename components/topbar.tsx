"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import StepiLogo from "./stepi-logo";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { href: "/", label: "대시보드" },
    { href: "/jobs/new", label: "새 분석" },
  ];

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/85 backdrop-blur-sm border-b border-[var(--ink)]">
      {/* very thin top edition strip */}
      <div className="hidden md:flex items-center justify-between px-8 lg:px-14 h-7 text-[10.5px] tracking-[0.18em] uppercase text-[var(--ink-muted)] border-b border-[var(--line)]">
        <span>제 01 호 · {today}</span>
        <span className="font-mono normal-case tracking-normal text-[11px]">
          AI Job-Fit Diagnostics
        </span>
      </div>

      <div className="flex items-center justify-between px-8 lg:px-14 h-16">
        <div className="flex items-center gap-10">
          <Link href="/" className="block leading-none">
            <StepiLogo size={22} />
            <div className="mt-1 text-[10px] tracking-[0.04em] text-[var(--ink-muted)]">
              지원자 직무적합성 분석
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {items.map(({ href, label }) => {
              const active = pathname === href || (href !== "/" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 py-1.5 text-sm transition ${
                    active
                      ? "text-[var(--ink)] font-medium"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute left-3 right-3 -bottom-[18px] h-[2px] bg-[var(--secondary)]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={logout}
          className="text-xs tracking-[0.14em] uppercase text-[var(--ink-muted)] hover:text-[var(--ink)] transition"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
