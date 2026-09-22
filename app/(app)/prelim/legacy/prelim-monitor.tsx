"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, FileSearch, Upload, Loader2, Download } from "lucide-react";
import PageHeader from "@/components/page-header";
import {
  prelim,
  type PrelimRunResponse,
  type PrelimSummary,
  type BlindHit,
  type RecusalHit,
} from "@/lib/api";

type Tab = "blind" | "recusal" | "summary";

export default function PrelimMonitor({ initialTicket }: { initialTicket?: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<PrelimRunResponse | null>(null);
  const [history, setHistory] = useState<PrelimSummary[]>([]);
  const [tab, setTab] = useState<Tab>("summary");

  useEffect(() => {
    prelim.list().then((d) => setHistory(d.items)).catch(() => {});
  }, [current]);

  useEffect(() => {
    if (!initialTicket) return;
    prelim
      .get(initialTicket)
      .then(setCurrent)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [initialTicket]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const form = new FormData(e.currentTarget);
      const res = await prelim.run(form);
      setCurrent(res);
      setTab("summary");
      openTicket(res.ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  // 결과는 주소에 담는다. 그래야 사이드바 메뉴로 돌아왔을 때 첫 화면이 나온다
  function openTicket(t: string) {
    router.push(`/prelim/legacy?ticket=${encodeURIComponent(t)}`);
  }

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        eyebrow="사전스크리닝검토"
        icon={ShieldAlert}
        title="지원자 적정성 검토"
        description={"자기소개서의 블라인드 위배 여부와 위원·기관 제척사항을 한 번에 점검합니다.\n파일 업로드 후 자동으로 점검이 시작됩니다."}
      />

      {/* 업로드 폼 */}
      <section id="prelim-upload" className="mt-6 mb-8 panel scroll-mt-6">
        <div className="flex items-center gap-2.5 pb-3.5 mb-5 border-b border-[var(--line)]">
          <span className="mark" />
          <h2 className="text-[18px] font-bold tracking-[-0.012em] text-[var(--ink)]">검토 파일 업로드</h2>
        </div>
        <form onSubmit={onSubmit} className="grid grid-cols-12 gap-5">
          <FileField name="apply_xlsx" label="자기소개서 xlsx" required />
          <FileField name="raw_xlsm" label="원본 xlsm (선택)" />
          <FileField name="academic_xlsx" label="학력제척 xlsx (선택)" />
          <TextField name="eval_date" label="평가기준일" placeholder="YYYY-MM-DD (기본: 오늘)" />
          <TextField name="label" label="저장명" placeholder="2026년 1차 등" />
          <div className="col-span-12 flex items-center gap-3 mt-2">
            <button
              type="submit"
              disabled={running}
              className="btn-primary inline-flex items-center gap-2"
            >
              {running ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {running ? "실행 중…" : "검토 실행"}
            </button>
            {error && <span className="text-[13px] text-[var(--bad)]">{error}</span>}
          </div>
        </form>
      </section>

      {/* 결과 */}
      {current && (
        <section className="mb-12">
          <div className="flex items-center gap-6 border-b border-[var(--line-strong)] pb-3 mb-5">
            <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>요약</TabButton>
            <TabButton active={tab === "blind"} onClick={() => setTab("blind")}>
              블라인드 ({current.counts.blind_total})
            </TabButton>
            <TabButton active={tab === "recusal"} onClick={() => setTab("recusal")}>
              제척 ({current.counts.recusal_total})
            </TabButton>
            <span className="ml-auto text-[13px] text-[var(--ink-muted)] font-mono">
              ticket: {current.ticket} · eval: {current.eval_date}
            </span>
            <a
              href={prelim.exportUrl(current.ticket)}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--line-strong)] px-3 py-1.5 text-[13.5px] font-semibold text-[var(--ink)] transition hover:border-[var(--ink)] hover:bg-[var(--bg-2)]"
            >
              <Download size={14} strokeWidth={2} />
              엑셀 다운로드
            </a>
          </div>

          <PrelimWarnings res={current} />

          {tab === "summary" && <SummaryTab res={current} />}
          {tab === "blind" && <BlindTab hits={current.blind_hits} truncated={current.truncated_blind} />}
          {tab === "recusal" && <RecusalTab hits={current.recusal_hits} truncated={current.truncated_recusal} />}
        </section>
      )}

      {/* 히스토리 */}
      <section>
        <h2 className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em] mb-4"><span className="mark" />최근 실행 기록</h2>
        <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="py-10 px-4 text-[14px] text-[var(--ink-muted)]">아직 실행 기록이 없습니다.</div>
          ) : history.map((h) => (
            <button
              key={h.ticket}
              onClick={() => openTicket(h.ticket)}
              className="w-full text-left grid grid-cols-12 gap-4 px-4 py-3.5 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-2)] transition"
            >
              <div className="col-span-3 font-mono text-[13px] text-[var(--ink-soft)] truncate">{h.ticket}</div>
              <div className="col-span-3 text-[14px] truncate">{h.label || "—"}</div>
              <div className="col-span-2 text-[13px] text-[var(--ink-muted)]">
                지원자 {h.applicant_count}
              </div>
              <div className="col-span-2 text-[13px] text-[var(--ink-muted)]">
                블라인드 {h.counts?.blind_total ?? 0} · 제척 {h.counts?.recusal_total ?? 0}
              </div>
              <div className="col-span-2 text-[13px] text-[var(--ink-muted)] text-right">
                {new Date(h.computed_at).toLocaleString("ko-KR")}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function FileField({ name, label, hint, required }: { name: string; label: string; hint?: string; required?: boolean }) {
  return (
    <label className="col-span-12 lg:col-span-4 block">
      <div className="text-[13px] text-[var(--ink-muted)] mb-1">
        {label} {required && <span className="text-[var(--bad)]">*</span>}
      </div>
      <input
        type="file"
        name={name}
        required={required}
        accept=".xlsx,.xlsm"
        className="block w-full text-[14px] file:mr-3 file:px-3 file:py-1 file:border file:border-[var(--line-strong)] file:bg-transparent file:text-[13px] file:cursor-pointer"
      />
      {hint && <div className="text-[12px] text-[var(--ink-soft)] mt-1">{hint}</div>}
    </label>
  );
}

function TextField({ name, label, defaultValue, placeholder }: { name: string; label: string; defaultValue?: string; placeholder?: string }) {
  return (
    <label className="col-span-6 lg:col-span-3 block">
      <div className="text-[13px] text-[var(--ink-muted)] mb-1">{label}</div>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="block w-full px-2 py-1 border border-[var(--line-strong)] bg-transparent text-[14px]"
      />
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`pb-2 text-[15px] border-b-2 ${active ? "border-[var(--ink)] text-[var(--ink)]" : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}
    >
      {children}
    </button>
  );
}

// 백엔드 경고 문구 중 파일을 고쳐 다시 올려야 풀리는 것. 나머지는 조치 없는 안내로 본다
const REUPLOAD_RE = /다시 올려|읽지 못해|시트가 없습니다|파일을 읽는 중|건너뜀/;

/** 수험번호 누락·시트 읽기 실패를 결과 위에 그대로 드러낸다 (조용한 합성 번호 방지). */
function PrelimWarnings({ res }: { res: PrelimRunResponse }) {
  const lines = res.warnings ?? res.counts.skipped ?? [];
  if (lines.length === 0) return null;
  const infoOnly = lines.every((w) => !REUPLOAD_RE.test(w));

  const focusUpload = () => {
    const form = document.getElementById("prelim-upload");
    form?.scrollIntoView({ behavior: "smooth", block: "start" });
    form?.querySelector<HTMLInputElement>('input[type="file"]')?.focus({ preventScroll: true });
  };

  return (
    <section
      className={`notice mb-5${infoOnly ? " is-info" : ""}`}
      role="alert"
      aria-labelledby="notice-title"
    >
      <div className="notice-head">
        <span id="notice-title">확인 필요</span>
        <span className="notice-count">{lines.length}건</span>
      </div>
      <ol className="notice-list">
        {lines.map((w, i) => (
          <li key={i}>
            {emphasizeCounts(w)}
            {REUPLOAD_RE.test(w) && (
              <button type="button" className="notice-action" onClick={focusUpload}>
                파일 다시 올리기
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 문장 속 "48건" 같은 건수만 굵게 */
function emphasizeCounts(text: string) {
  return text.split(/(\d[\d,]*건)/).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

function SummaryTab({ res }: { res: PrelimRunResponse }) {
  const c = res.counts;
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-4 panel">
        <div className="flex items-center gap-2 text-[var(--ink-muted)] mb-3">
          <ShieldAlert size={15} /> 블라인드 위배
        </div>
        <div className="text-[40px] leading-none numeral">{c.blind_total}</div>
        <div className="mt-2 text-[13px] text-[var(--ink-soft)]">지원자 {c.applicants}명 중</div>
        <div className="mt-5 text-[14px] space-y-1">
          {Object.entries(c.blind_by_category).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span>{k}</span><span className="tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-12 lg:col-span-4 panel">
        <div className="flex items-center gap-2 text-[var(--ink-muted)] mb-3">
          <FileSearch size={15} /> 제척
        </div>
        <div className="text-[40px] leading-none numeral">{c.recusal_total}</div>
        <div className="mt-2 text-[13px] text-[var(--ink-soft)]">지원자 {c.applicants}명 중</div>
        <div className="mt-5 text-[14px] space-y-1">
          {Object.entries(c.recusal_by_rule).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="truncate pr-2">{k}</span><span className="tabular-nums">{v}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-12 lg:col-span-4 panel text-[13px] text-[var(--ink-muted)]">
        <div className="mb-3 text-[var(--ink)]">참고</div>
        <p className="leading-6">
          블라인드 hit 은 substring + 5단계 FP 필터를 통과한 키워드. 최종 위배 판단은 검수자가 함.
        </p>
        <p className="leading-6 mt-3">
          제척 verdict — <b>제척대상</b>: 내부 위원 대상 제외. <b>제척</b>: 외부 위원/기관 섭외 불가. <b>검토필요</b>: 정보 부족, 운영자 확인.
        </p>
      </div>
    </div>
  );
}

function BlindTab({ hits, truncated }: { hits: BlindHit[]; truncated: boolean }) {
  if (hits.length === 0) {
    return <div className="py-8 text-[14px] text-[var(--ink-muted)]">블라인드 hit 없음.</div>;
  }
  return (
    <div>
      <div className="grid grid-cols-12 gap-4 px-1 py-2 border-b border-[var(--line-strong)] text-[13px] text-[var(--ink-soft)]">
        <div className="col-span-2">지원자</div>
        <div className="col-span-1">문항</div>
        <div className="col-span-1">카테고리</div>
        <div className="col-span-2">키워드</div>
        <div className="col-span-5">스니펫</div>
        <div className="col-span-1 text-right">offset</div>
      </div>
      {hits.map((h, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 px-1 py-2 border-b border-[var(--line)] text-[14px]">
          <div className="col-span-2 font-mono text-[13px] truncate">{h.applicant_id}</div>
          <div className="col-span-1">Q{h.essay_no}</div>
          <div className="col-span-1">{h.category}</div>
          <div className="col-span-2 font-mono text-[13px] truncate">{h.term}</div>
          <div className="col-span-5 text-[var(--ink-muted)] truncate">{h.snippet}</div>
          <div className="col-span-1 tabular-nums text-[13px] text-right text-[var(--ink-soft)]">{h.offset}</div>
        </div>
      ))}
      {truncated && (
        <div className="mt-3 text-[13px] text-[var(--ink-muted)]">
          (500 건으로 자름 — 전체는 ticket get API)
        </div>
      )}
    </div>
  );
}

function RecusalTab({ hits, truncated }: { hits: RecusalHit[]; truncated: boolean }) {
  if (hits.length === 0) {
    return <div className="py-8 text-[14px] text-[var(--ink-muted)]">제척 hit 없음.</div>;
  }
  return (
    <div>
      <div className="grid grid-cols-12 gap-4 px-1 py-2 border-b border-[var(--line-strong)] text-[13px] text-[var(--ink-soft)]">
        <div className="col-span-2">지원자</div>
        <div className="col-span-3">규칙</div>
        <div className="col-span-1">verdict</div>
        <div className="col-span-6">제척 사유</div>
      </div>
      {hits.map((h, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 px-1 py-2 border-b border-[var(--line)] text-[14px]">
          <div className="col-span-2 font-mono text-[13px] truncate">{h.applicant_id}</div>
          <div className="col-span-3 text-[13px]">{h.rule}</div>
          <div className="col-span-1 text-[13px] font-medium">
            <span className={
              h.verdict === "제척대상" ? "text-[var(--bad)]"
              : h.verdict === "제척" ? "text-[var(--bad)]"
              : "text-[var(--ink-muted)]"
            }>{h.verdict}</span>
          </div>
          {/* 사유 문장이 본문. 옛 결과엔 reason 이 없어 그때만 원본 값을 보여준다 */}
          <div className="col-span-6 text-[13px] leading-6" title={JSON.stringify(h.matched)}>
            {h.reason ?? (
              <span className="text-[var(--ink-muted)] font-mono break-all">
                {JSON.stringify(h.matched, null, 0)}
              </span>
            )}
          </div>
        </div>
      ))}
      {truncated && (
        <div className="mt-3 text-[13px] text-[var(--ink-muted)]">
          (500 건으로 자름 — 전체는 ticket get API)
        </div>
      )}
    </div>
  );
}
