import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Download, FileText } from "lucide-react";
import { api } from "@/lib/api";
import ApplicantDeleteButton from "@/components/applicant-delete-button";
import JobStatusBadge from "@/components/job-status-badge";
import JobAutoRefresh from "./auto-refresh";
import AnalyzingIndicator from "@/components/analyzing-indicator";
import JobControlButtons from "@/components/job-control-buttons";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const status = await api.getStatus(id).catch(() => null);
  // 진행 중(running/pending)이어도 그때까지 끝난 지원자 부분 결과를 같이 가져온다
  const result =
    status && (status.progress.done > 0 || status.status === "done" || status.status === "failed")
      ? await api.getResult(id).catch(() => null)
      : null;

  // v2 dept-fit + 논문 분석 상태를 지원자별로 병렬 fetch
  const perApplicant = await Promise.all(
    (result?.results ?? []).map(async (a) => {
      const [papers, deptFit] = await Promise.all([
        api.listPapers(id, a.applicant_id).catch(() => []),
        api.getDeptFit(id, a.applicant_id).catch(() => null),
      ]);
      const analyzed = papers.filter((p) => p.status === "analyzed").length;
      return {
        applicantId: a.applicant_id,
        analyzed,
        totalPapers: papers.length,
        topDept: deptFit?.items?.[0] ?? null,
        deptSkipped: deptFit?.skipped ?? false,
      };
    }),
  );
  const perApplicantById = new Map(perApplicant.map((p) => [p.applicantId, p]));

  if (!status) {
    return (
      <div className="px-8 lg:px-14 py-12 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)] mb-8"
        >
          <ArrowLeft size={13} /> 목록으로
        </Link>
        <div className="border-t border-b border-[var(--line-strong)] py-20 text-center">
          <h2 className="serif text-3xl mb-2">Job을 찾을 수 없습니다.</h2>
          <p className="text-sm text-[var(--ink-muted)] font-mono">{id}</p>
        </div>
      </div>
    );
  }

  const isRunning = status.status === "running" || status.status === "pending";
  const pct = status.progress.total ? (status.progress.done / status.progress.total) * 100 : 5;

  return (
    <div className="px-8 lg:px-14 py-12 max-w-[1400px] mx-auto fade-up">
      {isRunning && <JobAutoRefresh />}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] mb-8 transition"
      >
        <ArrowLeft size={13} /> 목록으로
      </Link>

      <header className="grid grid-cols-12 gap-8 pb-8 border-b border-[var(--line-strong)]">
        <div className="col-span-12 lg:col-span-8">
          <h1 className="serif text-[40px] leading-[1.15]">분석 보고</h1>
          <div className="mt-3 font-mono text-[13px] text-[var(--ink-soft)] break-all">
            {id}
          </div>
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col justify-end gap-4">
          <Stat label="상태" valueNode={<JobStatusBadge status={status.status} />} />
          <Stat
            label="진행"
            valueNode={
              <span className="text-[20px] text-[var(--ink)] tabular-nums">
                {status.progress.done}
                <span className="text-[var(--ink-muted)]"> / {status.progress.total}</span>
              </span>
            }
            sub={status.progress.failed > 0 ? `실패 ${status.progress.failed}` : undefined}
          />
          <div className="pt-1">
            <JobControlButtons jobId={id} status={status.status} />
          </div>
          <Stat
            label="개시"
            valueNode={
              <span className="text-[14px] tabular-nums text-[var(--ink)]">
                {new Date(status.created_at).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            }
          />
        </div>
      </header>

      {status.error && (
        <div className="mt-8 border-l-2 border-[var(--bad)] pl-4 py-2">
          <div className="text-[12px] text-[var(--bad)] font-medium mb-1">분석 실패</div>
          <div className="text-[13px] font-mono text-[var(--ink-muted)] break-all">
            {status.error}
          </div>
        </div>
      )}

      {isRunning && (
        <section className="mt-10 grid grid-cols-12 gap-6 items-center">
          <div className="col-span-12 lg:col-span-3 text-[14px] text-[var(--ink)]">
            <AnalyzingIndicator text="분석중" />
          </div>
          <div className="col-span-12 lg:col-span-9">
            <div className="flex items-baseline justify-between mb-2 text-[13px] text-[var(--ink-muted)]">
              <span>완료율</span>
              <span className="text-[var(--ink)] tabular-nums">{pct.toFixed(0)}%</span>
            </div>
            <div className="h-px w-full bg-[var(--line)]">
              <div
                className="h-px bg-[var(--ink)] transition-[width] duration-700"
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        </section>
      )}

      {result?.results && (
        <>
          <div className="flex items-end justify-between mt-12 mb-6">
            <h2 className="serif text-[22px]">
              지원자 명부
              <span className="ml-3 text-[14px] font-normal text-[var(--ink-muted)]">
                {result.results.length}명
                {isRunning && status.progress.total > result.results.length && (
                  <span className="ml-2 text-[var(--secondary-2)]">
                    · 분석 중 (전체 {status.progress.total}명, 잠시 후 자동 갱신)
                  </span>
                )}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <a href={api.resultCsvUrl(id)} className="btn-ghost inline-flex items-center gap-2" target="_blank" rel="noreferrer">
                <Download size={13} /> CSV
              </a>
              <a href={api.reportPdfUrl(id)} className="btn-ghost inline-flex items-center gap-2" target="_blank" rel="noreferrer">
                <FileText size={13} /> PDF
              </a>
            </div>
          </div>

          <div className="border-t border-[var(--line-strong)]">
            <div className="grid grid-cols-12 gap-4 px-1 py-3 border-b border-[var(--line)] text-[12px] text-[var(--ink-soft)]">
              <div className="col-span-1">No.</div>
              <div className="col-span-3">지원자</div>
              <div className="col-span-2">직군</div>
              <div className="col-span-2 text-right">직무적합 평균</div>
              <div className="col-span-1 text-center">게재</div>
              <div className="col-span-2">상위 부서 (v2)</div>
              <div className="col-span-1"></div>
            </div>
            {result.results.map((a, i) => {
              const fitVals = Object.values(a.scores?.job_fit ?? {});
              const fitAvg100 =
                fitVals.length > 0
                  ? (fitVals.reduce((s, v) => s + v.score, 0) / fitVals.length) * 10
                  : 0;
              const meta = perApplicantById.get(a.applicant_id);
              return (
                <Link
                  key={a.applicant_id}
                  href={`/jobs/${id}/applicants/${encodeURIComponent(a.applicant_id)}`}
                  className="grid grid-cols-12 gap-4 items-center px-1 py-5 border-b border-[var(--line)] hover:bg-[var(--paper)] group transition"
                >
                  <div className="col-span-1 text-[13px] tabular-nums text-[var(--ink-muted)]">
                    {String(i + 1).padStart(3, "0")}
                  </div>
                  <div className="col-span-3">
                    <div className="text-[16px] text-[var(--ink)] group-hover:underline underline-offset-4 decoration-[var(--secondary)]">
                      {a.applicant_id}
                    </div>
                    {a.job_field && (
                      <div className="text-[12px] text-[var(--ink-soft)] mt-0.5">
                        {a.job_field}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2 text-[14px] text-[var(--ink-muted)]">
                    {a.job_track}
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="serif text-[20px] text-[var(--ink)] tabular-nums">
                      {fitAvg100.toFixed(0)}
                    </span>
                    <span className="text-[12px] text-[var(--ink-muted)] ml-1">/ 100</span>
                  </div>
                  <div className="col-span-1 text-center text-[13px] tabular-nums">
                    {meta && meta.totalPapers > 0 ? (
                      <span className="text-[var(--ink)]">
                        {meta.analyzed}/{meta.totalPapers}
                      </span>
                    ) : (
                      <span className="text-[var(--ink-soft)]">—</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-2">
                    {meta?.topDept ? (
                      <>
                        <span className="text-[14px] truncate">{meta.topDept.dept_name}</span>
                        <span className="text-[13px] tabular-nums text-[var(--ink-muted)]">
                          {meta.topDept.score.toFixed(0)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] text-[var(--ink-soft)]">
                        {meta?.deptSkipped ? "행정직" : "—"}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <ApplicantDeleteButton jobId={id} applicantId={a.applicant_id} />
                    <ArrowUpRight
                      size={14}
                      strokeWidth={1.6}
                      className="text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 transition"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  valueNode,
  sub,
}: {
  label: string;
  valueNode: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="border-b border-[var(--line)] pb-3 flex items-baseline justify-between gap-3">
      <div className="text-[13px] text-[var(--ink-muted)]">{label}</div>
      <div className="text-right">
        {valueNode}
        {sub && <div className="text-[12px] text-[var(--bad)] mt-1">{sub}</div>}
      </div>
    </div>
  );
}


