import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  if (!(await verifySession(session, process.env.SESSION_SECRET ?? ""))) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const origin = req.headers.get("origin");
  // Explicit public origin is needed behind proxies where req.url uses an internal hostname.
  // Never trust client-supplied forwarded host headers as the allowlist.
  const allowedOrigin = process.env.AI_DETECTION_ALLOWED_ORIGIN || new URL(req.url).origin;
  if (!origin || origin !== allowedOrigin) {
    return NextResponse.json({ error: "origin_not_allowed" }, { status: 403 });
  }
  const url = new URL(req.url);
  const job = url.searchParams.get("job"); const applicant = url.searchParams.get("applicant");
  if (!job || !applicant) return NextResponse.json({ error: "missing_job_or_applicant" }, { status: 400 });
  const key = process.env.AI_DETECTION_API_TOKEN;
  if (!key) return NextResponse.json({ error: "ai_detection_disabled" }, { status: 503 });
  try {
    const res = await apiFetch(`/analysis-jobs/${encodeURIComponent(job)}/applicants/${encodeURIComponent(applicant)}/ai-detection`, {
      method: "POST", headers: { "X-AI-Detection-Key": key }, cache: "no-store", signal: AbortSignal.timeout(90_000),
    });
    return new NextResponse(await res.text(), { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timedOut ? "ai_detection_timeout" : "ai_detection_unavailable" }, { status: timedOut ? 504 : 503 });
  }
}
