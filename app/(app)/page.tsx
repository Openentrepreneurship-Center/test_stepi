import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import JobStatusBadge from "@/components/job-status-badge";
import JobRowDeleteButton from "@/components/job-row-delete-button";
import PageHeader from "@/components/page-header";
import { api } from "@/lib/api";
import JobAutoRefresh from "./jobs/[id]/auto-refresh";

export const dynamic = "force-dynamic";

// 좁은 화면(xl 미만)에서는 생성일, 시작시간 칸을 숨겨 분석명과 종료시간이 잘리지 않게 한다.
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_110px_100px_120px_40px] xl:grid-cols-[minmax(0,1fr)_110px_100px_110px_110px_120px_40px] items-center gap-5";
const WIDE_ONLY = "hidden xl:block";

// 백엔드가 KST 벽시계 시각을 시간대 없이 내려주므로 파싱과 출력을 같은 기준으로 맞춘다.
function formatTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 요청 양식대로 시:분:초만 쓰되, 밤을 넘기는 분석은 날짜를 앞에 붙인다.
function formatEta(value: string, startedAt?: string | null) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  const time = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  const s = startedAt ? new Date(startedAt) : null;
  const sameDay = s && s.toDateString() === d.toDateString();
  return sameDay ? time : `${p(d.getMonth() + 1)}.${p(d.getDate())} ${time}`;
}

export default async function DashboardPage() {
  const list = await api.listJobs({ limit: 200 }).catch(() => null);
  const jobs = list?.items ?? [];
  const hasActive = jobs.some((j) => j.status === "running" || j.status === "pending");

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      {(hasActive || list === null) && <JobAutoRefresh />}
      <PageHeader
        eyebrow="지원자 분석"
        icon={LayoutDashboard}
        title="분석 현황"
        description={"업로드된 자기소개서를 분석하여 직무적합성 분석 결과를 제공합니다.\n새 분석을 시작하거나 분석 진행 현황을 확인할 수 있습니다."}
        wideDescription
        aside={
          <Link href="/jobs/new" className="btn-primary">
            + 신규 분석 생성
          </Link>
        }
      />

      <section className="mt-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em]">
            <span className="mark" />
            분석 작업
            {list && (
              <span className="text-[15px] font-semibold text-[var(--ink-muted)] tabular-nums">
                {list.total}
              </span>
            )}
          </h2>
        </div>

        {list === null ? (
          <div className="panel py-16 text-center">
            <p className="text-[19px] font-bold mb-2">백엔드에 연결할 수 없습니다.</p>
            <p className="text-[13.5px] text-[var(--ink-muted)]">
              잠시 후 다시 시도해주세요.
            </p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="panel py-16 text-center">
            <p className="text-[22px] font-bold mb-3">아직 분석 이력이 없습니다.</p>
            <p className="text-[14px] text-[var(--ink-muted)]">
              자기소개서 xlsx 파일을 업로드하여 첫 분석을 시작해보세요.
            </p>
            <Link href="/jobs/new" className="btn-primary inline-block mt-6">
              자기소개서 업로드
            </Link>
          </div>
        ) : (
          <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
            <div className={`${ROW_GRID} px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--line-strong)] text-[12.5px] font-semibold tracking-wide text-[var(--ink-muted)]`}>
              <div>분석명</div>
              <div>상태</div>
              <div className="text-right">진행률</div>
              <div className={`${WIDE_ONLY} text-right`}>생성일</div>
              <div className={`${WIDE_ONLY} text-right`}>시작시간</div>
              <div className="text-right">종료시간</div>
              <div></div>
            </div>
            {jobs.map((j) => {
              const label = (j.request_id || "").replace(/^excel:/, "") || "이름 없는 분석";
              return (
                <Link
                  key={j.job_id}
                  href={`/jobs/${j.job_id}`}
                  className={`${ROW_GRID} px-4 py-4 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-2)] transition group`}
                >
                  <div className="min-w-0">
                    <div className="text-[16.5px] font-medium text-[var(--ink)] group-hover:underline underline-offset-4 decoration-[var(--secondary)] truncate">
                      {label}
                    </div>
                  </div>
                  <div>
                    <JobStatusBadge status={j.status} />
                  </div>
                  <div className="text-right">
                    <span className="text-[16.5px] font-medium text-[var(--ink)] tabular-nums">
                      {j.progress.done}
                      <span className="text-[var(--ink-muted)] font-normal"> / {j.progress.total}</span>
                    </span>
                    {j.progress.failed > 0 && (
                      <div className="text-[12.5px] text-[var(--bad)] mt-0.5">
                        실패 {j.progress.failed}
                      </div>
                    )}
                  </div>
                  <div className={`${WIDE_ONLY} text-right text-[13.5px] text-[var(--ink-muted)] tabular-nums`}>
                    {new Date(j.created_at).toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </div>
                  <div className={`${WIDE_ONLY} text-right text-[13.5px] text-[var(--ink-muted)] tabular-nums`}>
                    {formatTime(j.started_at)}
                  </div>
                  <div className="text-right text-[13.5px] text-[var(--ink-muted)] tabular-nums">
                    {j.status === "pending" ? (
                      "-"
                    ) : j.status !== "running" ? (
                      formatTime(j.finished_at)
                    ) : j.estimated_overdue ? (
                      "곧 종료"
                    ) : j.estimated_finished_at ? (
                      <>
                        <div className="text-[12px]">(예상종료시간)</div>
                        <div>{formatEta(j.estimated_finished_at, j.started_at)}</div>
                      </>
                    ) : (
                      "계산중"
                    )}
                  </div>
                  <div className="flex justify-end">
                    <JobRowDeleteButton jobId={j.job_id} label={label} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
