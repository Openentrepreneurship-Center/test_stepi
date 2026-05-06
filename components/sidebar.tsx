"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import StepiLogo from "./stepi-logo";

export default function Sidebar() {
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

  return (
    <aside className="hidden md:flex md:w-60 lg:w-72 shrink-0 flex-col border-r border-[var(--line-strong)] bg-[var(--bg)]">
      <div className="px-7 lg:px-8 pt-9 pb-7 border-b border-[var(--line)]">
        <Link href="/" className="block">
          <StepiLogo size={26} />
          <div className="mt-2.5 text-[12px] text-[var(--ink-muted)]">
            지원자 직무적합성 분석
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-7 lg:px-8 py-6">
        {items.map(({ href, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`block py-2.5 text-[15px] transition border-l-2 pl-4 -ml-4 ${
                active
                  ? "text-[var(--ink)] font-medium border-[var(--secondary)]"
                  : "text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-7 lg:px-8 py-6 border-t border-[var(--line)]">
        <button
          onClick={logout}
          className="text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] transition"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
