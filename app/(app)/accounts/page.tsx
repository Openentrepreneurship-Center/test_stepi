"use client";

import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import PageHeader from "@/components/page-header";

type Account = { username: string; status: string; must_change: boolean; password_changed_at: string; created_by: string };

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

/** 관리자 개인 계정 목록과 만들기·비밀번호 초기화·사용 중지·다시 쓰기(ACCT-001). 바꾼 것은 권한 설정 기록에 남음 */
export default function AccountsPage() {
  const [list, setList] = useState<Account[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  const load = useCallback(async () => {
    const r = await apiFetch("/accounts").catch(() => null);
    if (r?.ok) return setList((await r.json()) as Account[]);
    const d = r && (await r.json().catch(() => ({}))).detail;
    setErr(typeof d === "string" ? d : r ? "목록을 불러오지 못했습니다." : "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주십시오.");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 조회
    load();
  }, [load]);

  /** 성공하면 true. 실패하면 응답 detail 을 그대로 보임 */
  const send = async (path: string, body?: object) => {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))).detail;
        setErr(typeof d === "string" ? d : "요청을 처리하지 못했습니다.");
        return false;
      }
      await load();
      return true;
    } catch {
      setErr("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주십시오.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send("/accounts", { username, password })) {
      setUsername("");
      setPassword("");
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetFor && (await send(`/accounts/${encodeURIComponent(resetFor)}/reset-password`, { password: resetPw }))) {
      setResetFor(null);
      setResetPw("");
    }
  };

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1100px] mx-auto">
      <PageHeader
        eyebrow="환경 설정"
        icon={Users}
        title="계정 관리"
        description="관리자 개인 계정을 만들고, 비밀번호를 초기화하고, 사용 중지합니다. 계정은 지우지 않습니다. 바꾼 내용은 권한 설정 기록에 남습니다."
      />

      <section className="mt-8 panel">
        <div className="flex items-center gap-2.5 pb-3.5 mb-4 border-b border-[var(--line)]">
          <span className="mark" />
          <h2 className="text-[16px] font-bold tracking-[-0.01em] text-[var(--ink)]">계정 만들기</h2>
        </div>
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-[13px] text-[var(--ink-muted)] mb-2">아이디</span>
            <input className="input" placeholder="아이디 입력" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="off" autoCapitalize="none" />
          </label>
          <label className="block">
            <span className="block text-[13px] text-[var(--ink-muted)] mb-2">처음 비밀번호</span>
            <input type="password" className="input" placeholder="비밀번호 입력" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </label>
          <button type="submit" className="btn-primary" disabled={busy}>만들기</button>
        </form>
        <p className="mt-3 text-[13px] text-[var(--ink-muted)]">
          비밀번호는 9자 이상이고 영문자·숫자·특수문자를 모두 넣어야 합니다. 처음 로그인할 때 본인이 새 비밀번호로 바꿉니다.
        </p>
      </section>

      {err && <p className="mt-6 text-[14px] text-[var(--bad)]">{err}</p>}

      <section className="mt-6">
        {list === null ? null : (
          <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--line-strong)] text-[13.5px] font-semibold tracking-wide text-[var(--ink-muted)]">
              <div className="col-span-2">아이디</div>
              <div className="col-span-2">상태</div>
              <div className="col-span-2">비밀번호 바꾼 날</div>
              <div className="col-span-2">만든 사람</div>
              <div className="col-span-4 text-right">관리</div>
            </div>
            {list.map((a) => (
              <div key={a.username} className="px-4 py-3.5 border-b border-[var(--line)] last:border-b-0">
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-2 text-[15px] font-medium text-[var(--ink)] truncate">{a.username}</div>
                  <div className="col-span-2 text-[14px] text-[var(--ink-muted)]">
                    {a.status === "active" ? "사용 중" : "사용 중지"}
                    {a.must_change && a.status === "active" ? " · 바꾸기 전" : ""}
                  </div>
                  <div className="col-span-2 text-[13.5px] tabular-nums text-[var(--ink-muted)]">{day(a.password_changed_at)}</div>
                  <div className="col-span-2 text-[13.5px] text-[var(--ink-muted)] truncate">{a.created_by}</div>
                  <div className="col-span-4 flex justify-end gap-2 whitespace-nowrap">
                    <button className="btn-ghost" disabled={busy} onClick={() => { setResetFor(resetFor === a.username ? null : a.username); setResetPw(""); }}>
                      비밀번호 초기화
                    </button>
                    <button className="btn-ghost" disabled={busy} onClick={() => send(`/accounts/${encodeURIComponent(a.username)}/${a.status === "active" ? "disable" : "enable"}`)}>
                      {a.status === "active" ? "사용 중지" : "다시 쓰기"}
                    </button>
                  </div>
                </div>
                {resetFor === a.username && (
                  <form onSubmit={reset} className="mt-3 flex flex-wrap items-center justify-end gap-3">
                    <input type="password" className="input max-w-[260px]" placeholder="새 비밀번호 입력" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required autoFocus autoComplete="new-password" />
                    <button type="submit" className="btn-primary" disabled={busy}>초기화</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
