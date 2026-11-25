"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StepiLogo from "@/components/stepi-logo";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  // 우리 사이트 안 경로만 허용 (//, /\ 는 다른 사이트로 갈 수 있음)
  const raw = params.get("next") ?? "";
  const next = /^\/(?![/\\])/.test(raw) ? raw : "/prelim";
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 개인 계정 로그인(ACCT-001): 켜져 있으면 아이디 칸, 비밀번호를 바꿔야 하면 바꾸기 단계
  // 설정을 받기 전에는 로그인 단추를 막음(아이디 칸 없이 보내지 않게)
  const [accountLogin, setAccountLogin] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [changing, setChanging] = useState(false);
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    fetch("/api/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { account_login?: boolean }) => setAccountLogin(!!j.account_login))
      .catch(() => setAccountLogin(false));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (changing && pw !== pw2) {
      setErr("새 비밀번호가 서로 다릅니다.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changing ? { new_password: pw } : accountLogin ? { username, password: pw } : { password: pw }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 바꾸기 단계가 끝났으면 처음부터 다시 로그인
        if (changing && res.status === 401) setChanging(false);
        setErr(j.error ?? "로그인에 실패하였습니다.");
        setLoading(false);
        return;
      }
      if (j.step === "change_password") {
        setChanging(true);
        setPw("");
        setPw2("");
        setLoading(false);
        return;
      }
      router.replace(next);
    } catch {
      setErr("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주십시오.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-12">
      {/* Left: intro */}
      <section className="col-span-12 lg:col-span-7 border-r border-[var(--line)] px-8 lg:px-16 py-14 lg:py-20 flex flex-col justify-between min-w-0">
        <StepiLogo size={64} />

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
            자기소개서를 다각도로 분석하여 핵심인재 유사도, 직무 적합도, 직군 매칭 결과와 면접 질문 후보를 제시합니다.
            본 시스템은 채용 의사결정의 보조 지표로 사용되며, 최종 판단은 면접관이 합니다.
          </p>
        </div>

        <div className="hidden lg:block text-[12px] text-[var(--ink-soft)] mt-12">
          과학기술정책연구원
        </div>
      </section>

      {/* Right: login */}
      <section className="col-span-12 lg:col-span-5 px-8 lg:px-14 py-14 lg:py-20 flex flex-col">
        <div className="lg:hidden mb-12">
          <StepiLogo size={48} />
        </div>

        <div className="max-w-[360px]">
          <h2 className="serif text-[28px] leading-tight mb-2">로그인</h2>
          <p className="text-[14px] text-[var(--ink-muted)] leading-[1.7] mb-10">
            {changing
              ? "비밀번호를 바꿔야 로그인이 끝납니다. 9자 이상이고 영문자·숫자·특수문자를 모두 넣어 주십시오."
              : accountLogin
                ? "개인 아이디와 비밀번호를 입력해 주십시오."
                : "인사팀에 공유된 비밀번호를 입력해 주십시오."}
          </p>

          <form onSubmit={submit} className="space-y-6">
            {accountLogin && !changing && (
              <label className="block">
                <span className="block text-[13px] text-[var(--ink-muted)] mb-2">아이디</span>
                <input
                  className="input"
                  placeholder="아이디 입력"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </label>
            )}
            <label className="block">
              <span className="block text-[13px] text-[var(--ink-muted)] mb-2">
                {changing ? "새 비밀번호" : "비밀번호"}
              </span>
              <input
                key={changing ? "new" : "current"}
                type="password"
                className="input"
                placeholder="비밀번호 입력"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onInput={(e) => setPw((e.target as HTMLInputElement).value)}
                autoFocus={!accountLogin || changing}
                required
                autoComplete={changing ? "new-password" : "current-password"}
              />
            </label>
            {changing && (
              <label className="block">
                <span className="block text-[13px] text-[var(--ink-muted)] mb-2">새 비밀번호 확인</span>
                <input
                  type="password"
                  className="input"
                  placeholder="비밀번호 입력"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </label>
            )}

            {err && (
              <div className="text-[14px] text-[var(--bad)] border-l-2 border-[var(--bad)] pl-3 py-1">
                {err}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || accountLogin === null}
            >
              {loading ? "확인 중" : changing ? "비밀번호 바꾸기" : "로그인"}
            </button>
          </form>

          <p className="mt-12 pt-6 border-t border-[var(--line)] text-[12.5px] text-[var(--ink-muted)] leading-[1.7]">
            본 시스템은 권한이 부여된 사용자만 이용할 수 있습니다. 비밀번호 분실 시 시스템 관리자에게 문의해 주십시오.
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
