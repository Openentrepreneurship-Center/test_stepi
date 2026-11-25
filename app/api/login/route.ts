import { NextResponse, type NextRequest } from "next/server";
import { API_BASE } from "@/lib/api";
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, sessionAccount, signApiToken, signSession, verifySession } from "@/lib/auth";

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
// logged: 이번 잠금 중 시도를 접근 로그에 남겼는지(AUDIT-001)
const failures = new Map<string, { at: number[]; lockedUntil: number; logged?: boolean }>();
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

const SERVER_ERROR = "서버 설정 오류입니다. 시스템 관리자에게 문의해 주십시오.";
const BAD_LOGIN = "아이디 또는 비밀번호가 올바르지 않습니다.";
// 개인 계정 로그인(ACCT-001). 비밀번호 바꾸기 단계의 표는 이 경로에서만 보임
const PENDING_COOKIE = "polaris_pending";
const accountLogin = () => process.env.ACCOUNT_LOGIN === "1";
// https 가 없는 기관 내부망 대비. 기본은 켜짐
const secureCookie = () => process.env.NODE_ENV === "production" && process.env.SESSION_COOKIE_SECURE !== "false";

/** 로그인 화면은 아이디 칸을, 사이드바는 로그인한 아이디를 보일지 여기서 봄 */
export async function GET(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const ok = await verifySession(session, process.env.SESSION_SECRET ?? "");
  return NextResponse.json(
    { account_login: accountLogin(), account: ok ? sessionAccount(session) : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function countFailure(rule: ReturnType<typeof loginRule>, addr: string, now: number) {
  if (!rule) return;
  const rec = failures.get(addr) ?? { at: [], lockedUntil: 0 };
  rec.at = rec.at.filter((t) => t > now - rule.window).concat(now);
  if (rec.at.length >= rule.limit) {
    rec.lockedUntil = now + rule.lock;
    rec.at = [];
    rec.logged = false;
  }
  failures.set(addr, rec);
}

async function startSession(secret: string, account?: string) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signSession(exp, secret, account), {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  res.cookies.delete({ name: PENDING_COOKIE, path: "/api/login" });
  return res;
}

/** 백엔드 로그인 단계를 서버끼리 부름. 연결이 안 되면 null */
async function backend(path: string, body: unknown, apiSecret: string): Promise<Response | null> {
  const token = await signApiToken({ p: "api", exp: Math.floor(Date.now() / 1000) + 60 }, apiSecret);
  try {
    // 기관은 화면 서버가 백엔드를 내부 주소로 부름(hr-ai lib/api.ts 와 같음)
    return await fetch(`${process.env.API_INTERNAL_BASE_URL || API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

const detail = async (r: Response, fallback: string) =>
  ((await r.json().catch(() => ({}))) as { detail?: unknown }).detail?.toString() ?? fallback;

export async function POST(req: NextRequest) {
  const rule = loginRule();
  const addr = clientAddr(req);
  const now = Date.now() / 1000;
  const locked = rule ? (failures.get(addr)?.lockedUntil ?? 0) : 0;
  let body: Body;
  try {
    body = await req.json();
  } catch {
    if (locked > now) return tooMany(Math.ceil(locked - now), addr);
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (locked > now) {
    const rec = failures.get(addr);
    // 잠금 한 번에 첫 시도만 남김. 거절마다 백엔드를 부르면 잠금이 백엔드를 지켜 주지 못함
    if (accountLogin() && rec && !rec.logged) {
      rec.logged = true;
      await logLocked(req, body, addr).catch(() => {});
    }
    return tooMany(Math.ceil(locked - now), addr);
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const secret = process.env.SESSION_SECRET ?? "";
  if (accountLogin()) return accountPost(req, body, secret, rule, addr, now);
  const accepted = [process.env.AUTH_PASSWORD, process.env.AUTH_PASSWORD_2].filter(
    (p): p is string => !!p,
  );
  if (accepted.length === 0 || !secret) {
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
  const got = body.password ?? "";
  // every candidate is checked even after a match, so timing does not leak which one it was
  let same = false;
  for (const expected of accepted) {
    if (compare(got, expected)) same = true;
  }
  if (!same) {
    countFailure(rule, addr, now);
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  return startSession(secret);
}

type Body = { username?: string; password?: string; new_password?: string; code?: string };

/** 잠금으로 거절한 시도도 접근 로그에 남김(AUDIT-001). 남기지 못해도 거절은 그대로 */
async function logLocked(req: NextRequest, body: Body | null, addr: string) {
  const apiSecret = process.env.API_AUTH_SECRET ?? "";
  if (!apiSecret) return;
  const stage = body?.new_password !== undefined ? "change_password" : body?.code !== undefined ? "otp" : "password";
  const ticket = req.cookies.get(PENDING_COOKIE)?.value ?? "";
  await backend("/auth/log", { username: String(body?.username ?? ""), ticket, addr, stage }, apiSecret);
}

type Step = { account: string; step: string | null; ticket: string | null; enroll?: unknown };

/** 백엔드가 다음 단계를 주면 임시 쿠키를 새 표로 바꾸고, 없으면 로그인을 끝냄 */
async function proceed(r: Response, secret: string) {
  const got = (await r.json()) as Step;
  if (!got.step || !got.ticket) return startSession(secret, got.account);
  // 등록 단계의 비밀 키는 화면에 한 번만 넘김(MFA-001). 저장하지 않음
  const res = NextResponse.json({ step: got.step, enroll: got.enroll }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(PENDING_COOKIE, got.ticket, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie(),
    path: "/api/login",
    maxAge: 300,
  });
  return res;
}

async function accountPost(
  req: NextRequest,
  body: Body,
  secret: string,
  rule: ReturnType<typeof loginRule>,
  addr: string,
  now: number,
) {
  const apiSecret = process.env.API_AUTH_SECRET ?? "";
  // 키가 없으면 백엔드가 요청한 계정을 알 수 없음
  if (!secret || !apiSecret) return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  const unreachable = () =>
    NextResponse.json({ error: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주십시오." }, { status: 502 });

  // 비밀번호 바꾸기·2차 인증 코드 단계. 표는 임시 쿠키에만 있음
  const ticket = req.cookies.get(PENDING_COOKIE)?.value;
  const pending =
    body.new_password !== undefined ? { path: "/auth/password", new_password: body.new_password }
    : body.code !== undefined ? { path: "/auth/otp", code: body.code }
    : null;
  if (pending) {
    const { path, ...rest } = pending;
    // addr: 실제 접속 주소를 접근 로그에 남김(AUDIT-001)
    const r = ticket ? await backend(path, { ticket, ...rest, addr }, apiSecret) : undefined;
    if (r === null) return unreachable();
    if (r?.ok) return proceed(r, secret);
    if (r?.status === 400) return NextResponse.json({ error: await detail(r, "요청 형식이 올바르지 않습니다.") }, { status: 400 });
    if (r?.status === 422) return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    if (r?.status === 429) {
      return NextResponse.json(
        { error: await detail(r, "인증 코드 입력이 너무 많습니다. 잠시 후 다시 시도해 주십시오.") },
        { status: 429, headers: { "Retry-After": r.headers.get("Retry-After") ?? "60" } },
      );
    }
    if (r && r.status !== 401) return unreachable();
    const why = r ? await detail(r, "") : "";
    // 틀린 코드는 같은 단계에서 다시 넣음. 표가 없거나 5분이 지났으면 처음부터
    if (why && !why.startsWith("로그인이 필요합니다")) return NextResponse.json({ error: why }, { status: 401 });
    const res = NextResponse.json({ error: "로그인이 필요합니다.", restart: true }, { status: 401 });
    res.cookies.delete({ name: PENDING_COOKIE, path: "/api/login" });
    return res;
  }

  const r = await backend("/auth/login", { username: body.username ?? "", password: body.password ?? "", addr }, apiSecret);
  if (!r) return unreachable();
  // 백엔드 키가 없거나 다르면 401 이 와도 비밀번호 탓이 아님. 실패로 세지 않음
  if (r.status === 422 || (r.status === 401 && (await detail(r, "")) === BAD_LOGIN)) {
    countFailure(rule, addr, now);
    return NextResponse.json({ error: BAD_LOGIN }, { status: 401 });
  }
  if (r.status === 401) return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  if (!r.ok) return unreachable();
  return proceed(r, secret);
}
