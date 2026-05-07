import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const job = url.searchParams.get("job");
  const applicant = url.searchParams.get("applicant");
  if (!job || !applicant) {
    return NextResponse.json({ error: "missing job or applicant" }, { status: 400 });
  }
  const target = `${API_BASE}/analysis-jobs/${encodeURIComponent(job)}/applicants/${encodeURIComponent(applicant)}/regenerate-summary`;
  const res = await fetch(target, { method: "POST" });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
