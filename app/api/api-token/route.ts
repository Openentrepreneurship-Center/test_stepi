import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionExp, signApiToken, verifySession } from "@/lib/auth";

export const runtime = "nodejs";

// 제안값(시험용). 운영 수명은 따로 확정한다
const TTL_SECONDS = 600;

/** 로그인한 화면에 백엔드 호출용 짧은 토큰을 준다. 브라우저는 메모리에만 둔다 */
export async function POST(req: NextRequest) {
  const noStore = { "Cache-Control": "no-store" };
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const session = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  if (!sessionSecret || !(await verifySession(session, sessionSecret))) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401, headers: noStore });
  }
  const now = Math.floor(Date.now() / 1000);
  const apiSecret = process.env.API_AUTH_SECRET ?? "";
  // 키를 아직 넣지 않은 배포에서는 토큰 없이 부른다. 5분 동안 다시 묻지 않는다
  if (!apiSecret) return NextResponse.json({ token: null, ttl: 300 }, { headers: noStore });
  const exp = Math.min(now + TTL_SECONDS, sessionExp(session));
  const token = await signApiToken({ p: "api", exp }, apiSecret);
  // 브라우저는 자기 시계로 남은 시간을 센다(ttl)
  return NextResponse.json({ token, ttl: exp - now }, { headers: noStore });
}
