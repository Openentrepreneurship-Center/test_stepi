import { NextResponse } from "next/server";
import { appendJobToIndex } from "@/lib/job-index";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { job_id?: string; label?: string; created_at?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!body.job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });
  await appendJobToIndex({
    job_id: body.job_id,
    label: body.label ?? null,
    created_at: body.created_at ?? new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
