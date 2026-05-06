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

export async function signSession(expSeconds: number, secret: string): Promise<string> {
  const key = await getKey(secret);
  const payload = String(expSeconds);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${toBase64Url(sig)}`;
}

export async function verifySession(token: string, secret: string): Promise<boolean> {
  if (!token) return false;
  const [payload, sigB64] = token.split(".");
  if (!payload || !sigB64) return false;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  try {
    const key = await getKey(secret);
    const sig = fromBase64Url(sigB64);
    return await crypto.subtle.verify("HMAC", key, sig, encoder.encode(payload));
  } catch {
    return false;
  }
}

export const SESSION_COOKIE = "polaris_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days
