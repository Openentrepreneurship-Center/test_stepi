import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  const token = req.cookies.get(SESSION_COOKIE)?.value ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  const ok = secret ? await verifySession(token, secret) : false;
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // 확장자로 거르지 않는다: /jobs/<id>/applicants/x.png 처럼 화면 주소 끝에 확장자를 붙여 로그인을 건너뛸 수 있었다.
  // public/ 의 그림은 import 로 쓰여 /_next/ 아래로 나간다
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
