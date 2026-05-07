"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepiLogo from "@/components/stepi-logo";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? `로그인 실패 (${res.status})`);
        setLoading(false);
        return;
      }
      router.replace(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "네트워크 오류");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-12">
      {/* Left — intro */}
      <section className="col-span-12 lg:col-span-7 border-r border-[var(--line)] px-8 lg:px-16 py-14 lg:py-20 flex flex-col justify-between min-w-0">
        <StepiLogo size={26} />

        <div className="mt-14 lg:mt-20 max-w-[44ch]">
          <h1 className="serif text-[clamp(30px,4vw,46px)] leading-[1.32] text-[var(--ink)]">
            지원자의 글에서{" "}
            <span className="relative inline-block">
              의사결정의 근거
              <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-[var(--secondary)]" />
            </span>
            를 읽습니다.
          </h1>
          <p className="mt-7 text-[15px] leading-[1.85] text-[var(--ink-muted)]">
            자기소개서를 다축으로 분석하여 핵심인재 유사도, 직무 적합도, 직군 매칭, 그리고 면접 질문 후보를 제시합니다.
            본 시스템은 채용 의사결정의 보조 지표로 사용되며, 최종 판단은 면접관의 몫입니다.
          </p>
        </div>

        <div className="hidden lg:block text-[12px] text-[var(--ink-soft)] mt-12">
          과학기술정책연구원
        </div>
      </section>

      {/* Right — login */}
      <section className="col-span-12 lg:col-span-5 px-8 lg:px-14 py-14 lg:py-20 flex flex-col">
        <div className="lg:hidden mb-12">
          <StepiLogo size={22} />
        </div>

        <div className="max-w-[360px]">
          <h2 className="serif text-[28px] leading-tight mb-2">로그인</h2>
          <p className="text-[14px] text-[var(--ink-muted)] leading-[1.7] mb-10">
            인사팀에 공유된 비밀번호를 입력하세요.
          </p>

          <form onSubmit={submit} className="space-y-6">
            <label className="block">
              <span className="block text-[13px] text-[var(--ink-muted)] mb-2">
                비밀번호
              </span>
              <input
                type="password"
                className="input"
                placeholder="비밀번호 입력"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onInput={(e) => setPw((e.target as HTMLInputElement).value)}
                autoFocus
                required
                autoComplete="current-password"
              />
            </label>

            {err && (
              <div className="text-[14px] text-[var(--bad)] border-l-2 border-[var(--bad)] pl-3 py-1">
                {err}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? "확인 중…" : "들어가기"}
            </button>
          </form>

          <p className="mt-12 pt-6 border-t border-[var(--line)] text-[12.5px] text-[var(--ink-muted)] leading-[1.7]">
            본 콘솔은 권한이 부여된 사용자만 접근할 수 있습니다. 비밀번호 분실 시 시스템 관리자에게 문의해주세요.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
