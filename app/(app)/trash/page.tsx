import { api } from "@/lib/api";
import JobStatusBadge from "@/components/job-status-badge";
import TrashRowActions from "@/components/trash-row-actions";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const list = await api.listJobs({ limit: 200, trashed: true }).catch(() => null);
  const jobs = list?.items ?? [];

  return (
    <div className="px-8 lg:px-14 py-12 max-w-[1400px] mx-auto fade-up">
      <header className="pb-8 border-b border-[var(--line-strong)]">
        <h1 className="serif text-[36px] leading-[1.15]">휴지통</h1>
        <p className="mt-4 text-[14px] leading-[1.8] text-[var(--ink-muted)] max-w-[60ch]">
          삭제된 분석 작업들이 보관됩니다. 복구하거나 영구 삭제할 수 있습니다.
          영구 삭제 시 원본 자소서·분석 결과·논문·평가 모두 함께 사라집니다.
        </p>
      </header>

      <section className="mt-10">
        {list === null ? (
          <div className="border-t border-b border-[var(--line-strong)] py-20 text-center">
            <p className="text-[15px] text-[var(--ink-muted)]">백엔드에 연결할 수 없습니다.</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="border-t border-b border-[var(--line-strong)] py-20 text-center">
            <p className="serif text-[20px] mb-2">휴지통이 비어있습니다.</p>
            <p className="text-[13px] text-[var(--ink-muted)]">삭제된 작업이 여기로 옵니다.</p>
          </div>
        ) : (
          <div className="border-t border-[var(--line-strong)]">
            <div className="grid grid-cols-12 gap-4 px-1 py-3 border-b border-[var(--line)] text-[12px] text-[var(--ink-soft)]">
              <div className="col-span-5">작업</div>
              <div className="col-span-2">상태</div>
              <div className="col-span-2 text-right">진행</div>
              <div className="col-span-3 text-right">삭제일 / 작업</div>
            </div>
            {jobs.map((j) => {
              const label = (j.request_id || "").replace(/^excel:/, "") || "이름 없는 배치";
              return (
                <div
                  key={j.job_id}
                  className="grid grid-cols-12 items-center gap-4 px-1 py-5 border-b border-[var(--line)]"
                >
                  <div className="col-span-5">
                    <div className="text-[15px] text-[var(--ink-muted)] truncate">{label}</div>
                    <div className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                      {j.job_id}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <JobStatusBadge status={j.status} />
                  </div>
                  <div className="col-span-2 text-right text-[14px] tabular-nums text-[var(--ink-muted)]">
                    {j.progress.done} / {j.progress.total}
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-3">
                    <span className="text-[12px] text-[var(--ink-soft)] tabular-nums">
                      {j.deleted_at
                        ? new Date(j.deleted_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                        : "—"}
                    </span>
                    <TrashRowActions jobId={j.job_id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
