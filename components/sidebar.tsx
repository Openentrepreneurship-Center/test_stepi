"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FilePlus2, Trash2, Settings, ChevronsLeft, ChevronsRight, Activity, ShieldAlert } from "lucide-react";
import StepiLogo from "./stepi-logo";

const STORAGE_KEY = "stepi-sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "1") setCollapsed(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed, hydrated]);

  const items = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/jobs/new", label: "새 분석", icon: FilePlus2 },
    { href: "/turing", label: "Turing", icon: Activity },
    { href: "/prelim", label: "사전위배검토시스템", icon: ShieldAlert },
    { href: "/trash", label: "휴지통", icon: Trash2 },
    { href: "/settings", label: "표시 설정", icon: Settings },
  ];

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const widthClass = collapsed ? "md:w-16" : "md:w-60 lg:w-72";

  return (
    <aside
      className={`hidden md:flex ${widthClass} shrink-0 flex-col border-r border-[var(--line-strong)] bg-[var(--bg)] transition-[width] duration-200`}
    >
      <div
        className={`${collapsed ? "px-2 pt-4 pb-4 flex flex-col items-center gap-3" : "px-4 lg:px-5 pt-4 pb-5 flex items-start justify-between gap-3"} border-b border-[var(--line)]`}
      >
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition p-1.5 rounded-md hover:bg-[var(--bg-2)] shrink-0"
          title={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
        </button>
        <Link
          href="/"
          className={collapsed ? "block" : "block flex-1 pl-2 pt-1"}
          title="대시보드"
        >
          <StepiLogo size={collapsed ? 22 : 26} />
          {!collapsed && (
            <div className="mt-2.5 text-[12px] text-[var(--ink-muted)]">
              지원자 직무적합성 분석
            </div>
          )}
        </Link>
      </div>

      <nav className={`flex-1 ${collapsed ? "px-2 py-4 flex flex-col items-center gap-1" : "px-7 lg:px-8 py-6"}`}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          if (collapsed) {
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`flex items-center justify-center w-10 h-10 rounded-md transition ${
                  active
                    ? "text-[var(--ink)] bg-[var(--bg-2)]"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
                }`}
              >
                <Icon size={18} strokeWidth={1.6} />
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 py-2.5 text-[15px] transition border-l-2 pl-4 -ml-4 ${
                active
                  ? "text-[var(--ink)] font-medium border-[var(--secondary)]"
                  : "text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]"
              }`}
            >
              <Icon size={15} strokeWidth={1.6} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className={`${collapsed ? "px-2 py-4 flex flex-col items-center" : "px-7 lg:px-8 py-6"} border-t border-[var(--line)]`}>
        <button
          onClick={logout}
          title="로그아웃"
          className={collapsed
            ? "text-[var(--ink-muted)] hover:text-[var(--ink)] transition p-1.5 rounded-md hover:bg-[var(--bg-2)] text-[10px]"
            : "text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] transition"}
        >
          {collapsed ? "OUT" : "로그아웃"}
        </button>
      </div>
    </aside>
  );
}
