"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Clock3, RefreshCcw, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/page-header";
import { api, type TuringMetricsResponse, type TuringRiskItem } from "@/lib/api";

const REFRESH_MS = 10000;

type Slot<T> = { data: T | null; error: string | null; at: Date | null };
const EMPTY_SLOT = { data: null, error: null, at: null };

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);
const clock = (d: Date) => d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function TuringMonitor() {
  // 두 요청을 따로 들고 있어야 한쪽만 실패해도 다른 쪽 결과를 정상처럼 섞어 보이지 않는다
  const [m, setM] = useState<Slot<TuringMetricsResponse>>(EMPTY_SLOT);
  const [r, setR] = useState<Slot<TuringRiskItem[]>>(EMPTY_SLOT);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [metricsRes, risksRes] = await Promise.allSettled([
      api.getTuringMetrics(50),
      api.getTuringRisks(5, 8),
    ]);
    const at = new Date();
    setM((prev) =>
      metricsRes.status === "fulfilled"
        ? { data: metricsRes.value, error: null, at }
        : { ...prev, error: errorText(metricsRes.reason, "turing. 지표를 불러오지 못했습니다.") },
    );
    setR((prev) =>
      risksRes.status === "fulfilled"
        ? { data: risksRes.value.items, error: null, at }
        : { ...prev, error: errorText(risksRes.reason, "검수 권장 목록을 불러오지 못했습니다.") },
    );
    setLoading(false);
  };

  useEffect(() => {
    const tick = () => {
      void load();
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, REFRESH_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  const data = m.data;
  const risks = r.data;
  const metrics = data?.metrics;
  // 성공한 지표가 없을 때는 0·빈 목록 대신 지금 상태를 쓴다
  const metricState = data ? null : m.error ? "불러오지 못했습니다" : "불러오는 중";
  // duration_seconds 가 없는 행의 1명당 시간은 백엔드가 대표값으로 채운 추정값이라(routers/turing.py) 평균·표에서 미측정으로 둔다
  const perAppTimes = (data?.jobs ?? [])
    .filter((j) => j.duration_seconds != null)
    .map((j) => j.avg_seconds_per_applicant)
    .filter((v): v is number => v != null);
  const perAppAvgSec = perAppTimes.length
    ? perAppTimes.reduce((a, b) => a + b, 0) / perAppTimes.length
    : null;
  const perApplicantMinutes = perAppAvgSec == null ? null : perAppAvgSec / 60;
  const tMin = perAppTimes.length ? Math.min(...perAppTimes) : null;
  const tMax = perAppTimes.length ? Math.max(...perAppTimes) : null;
  const latestRows = useMemo(() => data?.jobs.slice(0, 12) ?? [], [data]);
  const shownAt = [m.at, r.at].filter((d): d is Date => d != null).sort((a, b) => a.getTime() - b.getTime())[0];
  const failures = [
    { label: "turing. 지표를", slot: m },
    { label: "검수 권장 목록을", slot: r },
  ].filter((f) => f.slot.error);

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        eyebrow="AI 품질 점검"
        icon={Activity}
        title="turing."
        description={"AI가 생성한 분석 결과의 신뢰성을 자동으로 점검합니다.\n① 제출 자료에 없는 내용을 생성하지 않았는지,\n② 모든 항목이 빠짐없이 완성됐는지,\n③ 지원자 1명당 처리 시간을 최근 작업 기준으로 보여줍니다."}
        aside={
          <div className="flex items-center gap-3 text-[14px] text-[var(--ink-muted)]">
            {shownAt && (
              <span className="tabular-nums">
                {shownAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준
              </span>
            )}
            <button onClick={load} className="btn-ghost inline-flex items-center gap-2">
              <RefreshCcw size={14} /> 새로고침
            </button>
          </div>
        }
      />

      {failures.length > 0 && (
        <div className="mt-8 border-l-2 border-[var(--bad)] pl-4 py-2 text-[14px] text-[var(--bad)] space-y-1.5">
          {failures.map(({ label, slot }) => (
            <div key={label}>
              {label} 불러오지 못했습니다.
              {slot.data != null && slot.at && ` ${clock(slot.at)}에 조회한 이전 결과를 표시합니다.`}
              <div className="text-[12.5px] text-[var(--ink-muted)] break-all">{slot.error}</div>
            </div>
          ))}
        </div>
      )}

      <section className="grid grid-cols-12 gap-5 mt-10">
        <MetricPanel
          icon={<ShieldCheck size={20} />}
          label="할루시네이션 방지"
          hint="분석이 제출 자료에 충실하게 작성된 정도"
          value={metrics?.hallucination_prevention.rate}
          empty={metricState ?? "검사 대상 없음"}
          suffix="%"
          detail="분석 속 숫자·이름·기관을 제출 자료와 대조"
        />
        <MetricPanel
          icon={<ShieldCheck size={20} />}
          label="결과 완성도"
          hint="모든 분석 항목이 빠짐없이 작성된 정도"
          value={metrics?.format_compliance.rate}
          empty={metricState ?? "검사 대상 없음"}
          suffix="%"
          detail={metrics ? `전체 ${metrics.format_compliance.total.toLocaleString()}개 항목 중 ${metrics.format_compliance.passed.toLocaleString()}개 충족` : ""}
        />
        <MetricPanel
          icon={<Clock3 size={20} />}
          label="1명당 분석 시간"
          hint="지원자 한 명당 평균 소요 시간"
          value={perApplicantMinutes}
          empty={metricState ?? "미측정"}
          suffix="분/명"
          decimals={2}
          detail={tMin != null && tMax != null && tMax - tMin > 1 ? `최단 ${minutes(tMin)} · 최장 ${minutes(tMax)}` : "최근 분석 작업 기준"}
        />
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em]"><span className="mark" />검수 권장 분석</h2>
          <span className="inline-flex items-center gap-2 text-[13px] text-[var(--ink-muted)]"><AlertTriangle size={14} /> 제출 자료와 일치하지 않을 가능성이 있는 항목</span>
        </div>
        <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
          {risks === null ? (
            <div className="py-10 px-4 text-[14px] text-[var(--ink-muted)]">
              {r.error ? "검수 권장 목록을 불러오지 못했습니다." : "불러오는 중"}
            </div>
          ) : risks.length === 0 ? (
            <div className="py-10 px-4 text-[14px] text-[var(--ink-muted)]">검수가 필요한 항목이 없습니다.</div>
          ) : (
          <>
          <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--line-strong)] text-[13.5px] font-semibold tracking-wide text-[var(--ink-muted)]">
            <div className="col-span-3">지원자</div>
            <div className="col-span-2">유형</div>
            <div className="col-span-3">지적 사항</div>
            <div className="col-span-4">상세</div>
          </div>
          {risks.map((item, idx) => {
            const isHallucinationFlag =
              item.risk_type === "nli_contradiction"
              || item.risk_type === "llm_contradiction"
              || item.risk_type === "llm_unsupported";
            return (
              <Link
                key={`${item.job_id}-${item.applicant_id}-${item.risk_type ?? "x"}-${idx}`}
                href={`/jobs/${item.job_id}`}
                className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-2)] transition"
              >
                <div className="col-span-12 lg:col-span-3 min-w-0">
                  <div className="font-mono text-[14px] text-[var(--ink)] truncate">{item.applicant_id}</div>
                  <div className="font-mono text-[12px] text-[var(--ink-soft)] truncate">{item.request_id || item.job_id}</div>
                </div>
                <div className="col-span-4 lg:col-span-2 tabular-nums text-[14px]">{riskLabel(item)}</div>
                <div className="col-span-8 lg:col-span-3 text-[13px] text-[var(--bad)] min-w-0">
                  {isHallucinationFlag ? flagLabel(item.risk_type) : misses(item.numeric_misses, "숫자")}
                </div>
                <div className="col-span-12 lg:col-span-4 text-[13px] text-[var(--ink-muted)] min-w-0">
                  {isHallucinationFlag ? (
                    <div>
                      <div className="line-clamp-2 text-[var(--ink)]">AI 분석: {item.nli_contradictions?.[0]?.generated || item.generated_excerpt}</div>
                      <div className="mt-1 line-clamp-2">실제 자료: {item.nli_contradictions?.[0]?.source || "—"}</div>
                      {item.reason && <div className="mt-1 line-clamp-2 text-[var(--ink-soft)]">확인 사유: {item.reason}</div>}
                    </div>
                  ) : (
                    <div>
                      <div className="truncate">{misses(item.entity_misses, "이름·기관")}</div>
                      <div className="mt-1 line-clamp-2">{item.generated_excerpt}</div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
          </>
          )}
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em]"><span className="mark" />최근 분석 점검 내역</h2>
          {loading && <span className="text-[14px] text-[var(--ink-muted)] dots-anim">집계 중</span>}
        </div>
        <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--line-strong)] text-[13.5px] font-semibold tracking-wide text-[var(--ink-muted)]">
            <div className="col-span-3">분석 작업</div>
            <div className="col-span-1 text-center">상태</div>
            <div className="col-span-2 text-right">할루시네이션 방지</div>
            <div className="col-span-2 text-right">완성도</div>
            <div className="col-span-2 text-right">1명당 시간</div>
            <div className="col-span-2 text-right">지원자</div>
          </div>
          {metricState ? (
            <div className="py-16 text-center text-[15px] text-[var(--ink-muted)]">
              {metricState === "불러오는 중" ? metricState : "최근 분석 점검 내역을 불러오지 못했습니다."}
            </div>
          ) : latestRows.length === 0 ? (
            <div className="py-16 text-center text-[15px] text-[var(--ink-muted)]">
              아직 집계할 분석 결과가 없습니다.
            </div>
          ) : latestRows.map((row) => (
            <Link
              key={row.job_id}
              href={`/jobs/${row.job_id}`}
              className="grid grid-cols-12 gap-4 items-center px-4 py-4 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-2)] transition"
            >
              <div className="col-span-3 min-w-0">
                <div className="font-mono text-[14px] truncate text-[var(--ink)]">{row.request_id || row.job_id}</div>
                <div className="font-mono text-[12px] truncate text-[var(--ink-soft)]">{row.job_id}</div>
              </div>
              <div className="col-span-1 text-center text-[13px] text-[var(--ink-muted)]">{statusLabel(row.status)}</div>
              <div className="col-span-2 text-right tabular-nums">{percent(row.hallucination_prevention_rate)}</div>
              <div className="col-span-2 text-right tabular-nums">{percent(row.format_compliance_rate)}</div>
              <div className="col-span-2 text-right tabular-nums">{minutes(row.duration_seconds == null ? null : row.avg_seconds_per_applicant)}</div>
              <div className="col-span-2 text-right tabular-nums text-[var(--ink-muted)]">
                {row.applicants_done}/{row.applicants_total}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5 grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-4 panel">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]"><Activity size={15} className="text-[var(--secondary-2)]" /> 점검 방식</div>
          <p className="mt-3 text-[14px] leading-6 text-[var(--ink-muted)]">
            AI가 작성한 문장 속 숫자와 이름·기관을, 지원자가 제출한 자료·논문과 하나씩 대조합니다. 자료에 없거나 다른 값이 발견되면 위 &lsquo;검수 권장 분석&rsquo;에 모아 표시합니다.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-8 panel">
          <div className="grid grid-cols-2 gap-4 text-[14px]">
            <StatusItem label="분석 대상 지원자" value={metrics ? `${metrics.hallucination_prevention.samples}명` : (metricState ?? "")} />
            <StatusItem label="1명당 평균 처리 시간" value={metricState ?? minutes(perAppAvgSec)} />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricPanel({ icon, label, hint, value, empty, suffix, detail, decimals = 1 }: { icon: React.ReactNode; label: string; hint: string; value?: number | null; empty: string; suffix: string; detail: string; decimals?: number }) {
  return (
    <div className="col-span-12 lg:col-span-4 panel min-h-[170px] relative overflow-hidden">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-[var(--secondary)]" />
      <div className="flex items-center gap-2 text-[14.5px] font-semibold text-[var(--ink-2)]">
        <span className="text-[var(--secondary-2)]">{icon}</span>{label}
      </div>
      <div className="mt-1.5 text-[13px] text-[var(--ink-muted)]">{hint}</div>
      <div className="mt-3 flex items-baseline gap-2 min-h-[52px]">
        {value == null ? (
          <span className="self-end text-[20px] font-semibold text-[var(--ink-muted)]">{empty}</span>
        ) : (
          <>
            <span className="numeral text-[52px] leading-none text-[var(--ink)]">{value.toFixed(decimals)}</span>
            <span className="text-[15px] font-medium text-[var(--ink-muted)]">{suffix}</span>
          </>
        )}
      </div>
      <div className="mt-4 pt-3 border-t border-[var(--line)] text-[13.5px] text-[var(--ink-muted)]">{detail}</div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="leader"><span className="text-[var(--ink-muted)]">{label}</span><span /><b className="font-mono text-[var(--ink)] truncate">{value}</b></div>
  );
}

function percent(value?: number | null) {
  return value == null ? "검사 대상 없음" : `${value.toFixed(1)}%`;
}

function minutes(value?: number | null) {
  return value == null ? "미측정" : `${(value / 60).toFixed(2)}분`;
}

function statusLabel(status: string) {
  switch (status) {
    case "done":
    case "completed": return "완료";
    case "running": return "분석 중";
    case "pending": return "대기";
    case "failed": return "실패";
    case "canceled":
    case "cancelled": return "취소";
    default: return status;
  }
}

function misses(items: string[], label: string) {
  if (items.length === 0) return `${label} 모두 일치`;
  return `자료에 없는 ${label} ${items.slice(0, 4).join(", ")}`;
}

function riskLabel(item: TuringRiskItem) {
  switch (item.risk_type) {
    case "llm_contradiction": return "내용 모순";
    case "llm_unsupported": return "근거 없음";
    case "nli_contradiction": return "자료와 불일치";
    default: return "숫자·이름 불일치";
  }
}

function flagLabel(rt?: TuringRiskItem["risk_type"]) {
  switch (rt) {
    case "llm_contradiction": return "분석 내용 간 상호 모순";
    case "llm_unsupported": return "제출 자료에 근거 없음";
    case "nli_contradiction": return "제출 자료와 불일치 가능성";
    default: return "";
  }
}
