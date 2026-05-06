import Link from "next/link";
import { readJobIndex } from "@/lib/job-index";
import JobStatusBadge from "@/components/job-status-badge";
import { api } from "@/lib/api";

export const dynamic = "force-dynamic";

async function fetchJobs() {
  const index = await readJobIndex();
  const jobs = await Promise.all(
    index.map(async (rec) => {
      try {
        const s = await api.getStatus(rec.job_id);
        return { ...rec, ...s };
      } catch {
        return {
          ...rec,
          status: "failed" as const,
          progress: { total: 0, done: 0, failed: 0 },
          updated_at: rec.created_at,
          error: "백엔드 응답 없음",
        };
      }
    }),
  );
  return jobs.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export default async function DashboardPage() {
  const jobs = await fetchJobs();

  return (
    <div className="px-8 lg:px-14 py-12 max-w-[1400px] mx-auto fade-up">
      <header className="pb-8 border-b border-[var(--line-strong)]">
        <h1 className="serif text-[44px] leading-[1.15]">지원자 분석 현황</h1>
        <p className="mt-5 text-[15px] leading-[1.8] text-[var(--ink-muted)] max-w-[60ch]">
          업로드된 자기소개서 배치 단위로 분석 결과를 관리합니다.
          새 배치를 시작하거나 진행 상태를 확인할 수 있습니다.
        </p>
      </header>

      <section className="mt-12">
        <div className="flex items-end justify-between mb-6">
          <h2 className="serif text-[22px]">분석 작업</h2>
          <Link href="/jobs/new" className="btn-primary">
            새 분석 시작
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="border-t border-b border-[var(--line-strong)] py-20 text-center">
            <p className="serif text-[24px] mb-3">아직 분석 이력이 없습니다.</p>
            <p className="text-[14px] text-[var(--ink-muted)]">
              자기소개서 xlsx 파일을 업로드하여 첫 분석을 시작해보세요.
            </p>
            <Link href="/jobs/new" className="btn-primary inline-block mt-7">
              자소서 업로드
            </Link>
          </div>
        ) : (
          <div className="border-t border-[var(--line-strong)]">
            {jobs.map((j) => (
              <Link
                key={j.job_id}
                href={`/jobs/${j.job_id}`}
                className="grid grid-cols-12 items-center gap-6 px-1 py-5 border-b border-[var(--line)] hover:bg-[var(--paper)] transition group"
              >
                <div className="col-span-6">
                  <div className="text-[16px] text-[var(--ink)] group-hover:underline underline-offset-4 decoration-[var(--secondary)]">
                    {j.label || "이름 없는 배치"}
                  </div>
                  <div className="mt-1 font-mono text-[12px] text-[var(--ink-soft)]">
                    {j.job_id}
                  </div>
                </div>
                <div className="col-span-2">
                  <JobStatusBadge status={j.status} />
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-[16px] text-[var(--ink)] tabular-nums">
                    {j.progress?.done ?? 0}
                    <span className="text-[var(--ink-muted)]"> / {j.progress?.total ?? 0}</span>
                  </span>
                  {(j.progress?.failed ?? 0) > 0 && (
                    <div className="text-[12px] text-[var(--bad)] mt-0.5">
                      실패 {j.progress?.failed}
                    </div>
                  )}
                </div>
                <div className="col-span-2 text-right text-[13px] text-[var(--ink-muted)] tabular-nums">
                  {new Date(j.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

