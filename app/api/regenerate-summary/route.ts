import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const job = url.searchParams.get("job");
  const applicant = url.searchParams.get("applicant");
  if (!job || !applicant) {
    return NextResponse.json({ error: "분석 또는 지원자 정보가 없습니다." }, { status: 400 });
  }
  const target = `/analysis-jobs/${encodeURIComponent(job)}/applicants/${encodeURIComponent(applicant)}/regenerate-summary`;
  const res = await apiFetch(target, { method: "POST" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
