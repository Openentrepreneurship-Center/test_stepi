const encoder = new TextEncoder();

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): ArrayBuffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

// 세션 쿠키: <exp>.<sig> 또는 <exp>:<아이디>.<sig> (아이디 글자는 백엔드 USERNAME_RE)
const SESSION_RE = /^(\d+)(?::([a-z0-9._-]{3,32}))?\.([A-Za-z0-9_-]+)$/;

export async function signSession(expSeconds: number, secret: string, account?: string): Promise<string> {
  const key = await getKey(secret);
  const payload = account ? `${expSeconds}:${account}` : String(expSeconds);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(sig)}`;
}

export async function verifySession(token: string, secret: string): Promise<boolean> {
  const m = SESSION_RE.exec(token ?? "");
  if (!m || Number(m[1]) * 1000 < Date.now()) return false;
  // 개인 계정 로그인을 켜면 아이디 없는 공유 세션은 받지 않음(ACCT-001)
  if (process.env.ACCOUNT_LOGIN === "1" && !m[2]) return false;
  try {
    const key = await getKey(secret);
    const sig = fromBase64Url(m[3]);
    return await crypto.subtle.verify("HMAC", key, sig, encoder.encode(token.slice(0, token.lastIndexOf("."))));
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "polaris_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

/** 검증을 마친 세션의 만료 시각(초). API 토큰이 세션보다 오래 살지 않게 씀 */
export const sessionExp = (token: string): number => Number(SESSION_RE.exec(token)?.[1]) || 0;

/** 검증을 마친 세션의 아이디. 공유 비밀번호 세션이면 null */
export const sessionAccount = (token: string): string | null => SESSION_RE.exec(token)?.[2] ?? null;

/**
 * 백엔드 app/api_auth.py 가 검증하는 토큰. 키는 서버 전용 API_AUTH_SECRET (로그인 키와 별개).
 * 형식: v1.<base64url(JSON)>.<base64url(HMAC-SHA256("v1.<body>"))>
 */
export async function signApiToken(claims: Record<string, unknown>, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(claims)).buffer as ArrayBuffer);
  const sig = await crypto.subtle.sign("HMAC", await getKey(secret), encoder.encode(`v1.${body}`));
  return `v1.${body}.${toBase64Url(sig)}`;
}
