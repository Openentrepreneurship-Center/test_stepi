import { NextResponse, type NextRequest } from "next/server";
import { API_BASE } from "@/lib/api";
import { SESSION_COOKIE, sessionExp, signApiToken, verifySession } from "@/lib/auth";

export const runtime = "nodejs";

// 제안값(시험용). 브라우저 PDF 보기의 이어받기 요청까지 덮을 만큼만 둔다
const TTL_SECONDS = 300;

// <a href>·<img src> 로 여는 백엔드 주소만. 새 다운로드를 만들면 여기에 추가한다
const ALLOWED = [
  /^\/analysis-jobs\/[^/]+\/(report\.pdf|result\.csv)$/,
  /^\/analysis-jobs\/[^/]+\/applicants\/[^/]+\/papers\/\d+\/pdf$/,
  /^\/analysis-jobs\/[^/]+\/applicants-report\/[^/]+\.zip$/,
  /^\/prelim\/reference\/export\.xlsx$/,
  /^\/prelim\/results\/[^/]+\/export\/[^/]+$/,
  /^\/prelim\/results\/[^/]+\/attach\/[^/]+(\/page\/\d+)?$/,
];

/** 로그인을 확인한 뒤, 이 경로 하나에만 쓸 수 있는 서명을 붙여 백엔드로 넘긴다 */
export async function GET(req: NextRequest) {
  const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  const session = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (!sessionSecret || !(await verifySession(session, sessionSecret))) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStore });
  }
  const raw = req.nextUrl.searchParams.get("u") ?? "";
  // 브라우저가 실제로 보낼 인코딩 형태로 맞춘 뒤 서명한다 (백엔드는 받은 경로 그대로 대조)
  const parsed = raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("..") ? new URL(raw, "http://x") : null;
  const query = parsed?.search.slice(1) ?? "";
  if (!parsed || !ALLOWED.some((re) => re.test(parsed.pathname)) || /(^|&)_t=/.test(query)) {
    return NextResponse.json({ error: "허용되지 않은 주소입니다." }, { status: 400, headers: noStore });
  }
  const u = parsed.pathname + parsed.search;
  const apiSecret = process.env.API_AUTH_SECRET ?? "";
  let target = `${API_BASE}${u}`;
  if (apiSecret) {
    const exp = Math.min(Math.floor(Date.now() / 1000) + TTL_SECONDS, sessionExp(session));
    const token = await signApiToken({ p: "url", m: "GET", u, exp }, apiSecret);
    target += `${query ? "&" : "?"}_t=${token}`;
  }
  return NextResponse.redirect(target, { status: 302, headers: noStore });
}
