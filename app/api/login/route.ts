import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, signSession } from "@/lib/auth";

export const runtime = "nodejs";

// simple constant-time-ish compare
function compare(got: string, expected: string): boolean {
  let same = got.length === expected.length;
  for (let i = 0; i < Math.max(got.length, expected.length); i++) {
    if (got.charCodeAt(i) !== expected.charCodeAt(i)) same = false;
  }
  return same;
}

// 로그인 실패 잠금(RATE-001). 화면 서버 메모리라 재시작하면 처음부터 셈
const failures = new Map<string, { at: number[]; lockedUntil: number }>();
let warnedBadRule = false;

const WHOLE = /^\s*\d+\s*$/;

function loginRule() {
  const rawLimit = process.env.LOGIN_FAIL_LIMIT ?? "";
  const rawLock = process.env.LOGIN_LOCK_SECONDS ?? "";
  const parts = rawLimit.split("/");
  const [limit, window] = parts.map(Number);
  const lock = Number(rawLock);
  if (parts.length === 2 && limit > 0 && window > 0 && lock > 0) return { limit, window, lock };
  // 0 이나 빈 값은 꺼짐으로 봄(백엔드와 같음). 값이 있는데 형식이 틀릴 때만 알림
  const bad = (rawLimit.trim() !== "" && (parts.length !== 2 || !parts.every((p) => WHOLE.test(p)))) ||
    (rawLock.trim() !== "" && !WHOLE.test(rawLock));
  if (bad && !warnedBadRule) {
    warnedBadRule = true;
    console.warn("LOGIN_FAIL_LIMIT(횟수/초)·LOGIN_LOCK_SECONDS(초) 값이 잘못돼 로그인 잠금이 꺼져 있다");
  }
  return null;
}

// 기관 nginx 는 이 머리글을 실제 접속 주소 하나로 덮어씀
const clientAddr = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

function tooMany(seconds: number, addr: string) {
  const at = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).replace(" ", "T") + "+09:00";
  console.warn(`rate_limited kind=login addr=${addr} at=${at}`);
  return NextResponse.json(
    { error: `로그인 시도가 너무 많습니다. ${seconds}초 뒤 다시 시도해 주십시오.` },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  );
}

export async function POST(req: Request) {
  const rule = loginRule();
  const addr = clientAddr(req);
  const now = Date.now() / 1000;
  const locked = rule ? (failures.get(addr)?.lockedUntil ?? 0) : 0;
  if (locked > now) return tooMany(Math.ceil(locked - now), addr);
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const accepted = [process.env.AUTH_PASSWORD, process.env.AUTH_PASSWORD_2].filter(
    (p): p is string => !!p,
  );
  const secret = process.env.SESSION_SECRET ?? "";
  if (accepted.length === 0 || !secret) {
    return NextResponse.json({ error: "서버 설정 오류입니다. 시스템 관리자에게 문의해 주십시오." }, { status: 500 });
  }
  const got = body.password ?? "";
  // every candidate is checked even after a match, so timing does not leak which one it was
  let same = false;
  for (const expected of accepted) {
    if (compare(got, expected)) same = true;
  }
  if (!same) {
    if (rule) {
      const rec = failures.get(addr) ?? { at: [], lockedUntil: 0 };
      rec.at = rec.at.filter((t) => t > now - rule.window).concat(now);
      if (rec.at.length >= rule.limit) {
        rec.lockedUntil = now + rule.lock;
        rec.at = [];
      }
      failures.set(addr, rec);
    }
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const token = await signSession(exp, secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // https 가 없는 기관 내부망 대비. 기본은 켜짐
    secure: process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return res;
}
