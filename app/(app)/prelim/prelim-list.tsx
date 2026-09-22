"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, Trash2, Undo2 } from "lucide-react";
import PageHeader from "@/components/page-header";
import { prelim, type PrelimSummary } from "@/lib/api";

// 지원자 분석의 분석 현황·삭제 항목과 같은 틀을 쓴다
const ROW_GRID =
  "grid grid-cols-[minmax(0,1fr)_90px_90px_110px_40px] xl:grid-cols-[minmax(0,1fr)_100px_80px_90px_90px_80px_80px_90px_110px_40px] items-center gap-5";
const TRASH_GRID = "grid grid-cols-12 items-center gap-4";
const WIDE_ONLY = "hidden xl:block";
const CELL = "text-right text-[13.5px] text-[var(--ink-muted)] tabular-nums";

function formatTime(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function PrelimList({ trashed }: { trashed: boolean }) {
  const [items, setItems] = useState<PrelimSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await prelim.list({ trashed, limit: 200 })).items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [trashed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 조회
    void load();
  }, [load]);

  async function act(ticket: string, fn: () => Promise<unknown>) {
    setBusy(ticket);
    try {
      await fn();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "처리하지 못했습니다");
    } finally {
      setBusy(null);
    }
  }

  const name = (r: PrelimSummary) => r.notice || r.label || "이름 없는 검토";

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      {trashed ? (
        <PageHeader
          eyebrow="사전스크리닝 검토"
          icon={Trash2}
          title="삭제 항목"
          description={"삭제한 검토 결과를 보관합니다. 복구하거나 영구 삭제할 수 있습니다.\n영구 삭제 시 검토 결과, 판정, 올린 확인 자료와 첨부 파일이 모두 삭제되며 복구할 수 없습니다."}
        />
      ) : (
        <PageHeader
          eyebrow="사전스크리닝 검토"
          icon={ShieldAlert}
          title="분석 현황"
          description={"자기소개서·첨부 실적의 블라인드 위배 여부와 내부·외부 제척사항을 점검합니다.\n새 검토를 시작하거나 공고별 검토 결과를 확인할 수 있습니다."}
          wideDescription
          aside={
            <Link href="/prelim/new" className="btn-primary">
              + 신규 검토 생성
            </Link>
          }
        />
      )}

      <section className="mt-8">
        {!trashed && (
          <div className="flex items-end justify-between mb-4">
            <h2 className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.01em]">
              <span className="mark" />
              검토 작업
              {items && <span className="text-[15px] font-semibold text-[var(--ink-muted)] tabular-nums">{items.length}</span>}
            </h2>
          </div>
        )}

        {failed ? (
          <div className="panel py-16 text-center">
            <p className="text-[19px] font-bold mb-2">백엔드에 연결할 수 없습니다.</p>
            <p className="text-[13.5px] text-[var(--ink-muted)]">잠시 후 다시 시도해주세요.</p>
          </div>
        ) : items === null ? (
          <div className="panel py-16 text-center">
            <p className="text-[14px] text-[var(--ink-muted)]">목록을 불러오는 중입니다.</p>
          </div>
        ) : items.length === 0 ? (
          trashed ? (
            <div className="panel py-16 text-center">
              <p className="text-[19px] font-bold mb-2">삭제 항목이 비어있습니다.</p>
              <p className="text-[14.5px] text-[var(--ink-muted)]">삭제된 검토가 여기로 옵니다.</p>
            </div>
          ) : (
            <div className="panel py-16 text-center">
              <p className="text-[22px] font-bold mb-3">아직 검토 이력이 없습니다.</p>
              <p className="text-[14px] text-[var(--ink-muted)]">자기소개서 xlsx 파일을 업로드하여 첫 검토를 시작해보세요.</p>
              <Link href="/prelim/new" className="btn-primary inline-block mt-6">
                자기소개서 업로드
              </Link>
            </div>
          )
        ) : trashed ? (
          <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
            <div className={`${TRASH_GRID} px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--line-strong)] text-[13.5px] font-semibold tracking-wide text-[var(--ink-muted)]`}>
              <div className="col-span-5">검토</div>
              <div className="col-span-2">평가기준일</div>
              <div className="col-span-2 text-right">지원자 수</div>
              <div className="col-span-3 text-right">삭제일 / 작업</div>
            </div>
            {items.map((r) => (
              <div key={r.ticket} className={`${TRASH_GRID} px-4 py-4 border-b border-[var(--line)] last:border-b-0`}>
                <div className="col-span-5 min-w-0">
                  <div className="text-[16px] font-medium text-[var(--ink-muted)] truncate">{name(r)}</div>
                  <div className="mt-0.5 font-mono text-[13px] text-[var(--ink-soft)]">{r.ticket}</div>
                </div>
                <div className="col-span-2 text-[15px] tabular-nums text-[var(--ink-muted)]">{r.eval_date || "-"}</div>
                <div className="col-span-2 text-right text-[15px] tabular-nums text-[var(--ink-muted)]">{r.applicant_count}명</div>
                <div className="col-span-3 flex items-center justify-end gap-3">
                  <span className="text-[13px] text-[var(--ink-soft)] tabular-nums">
                    {r.deleted_at
                      ? new Date(r.deleted_at).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
                      : "-"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy === r.ticket}
                      title="복구"
                      aria-label="복구"
                      onClick={() => act(r.ticket, () => prelim.restore(r.ticket))}
                      className="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--line-strong)] px-2.5 py-1.5 text-[13.5px] text-[var(--ink)] hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition disabled:opacity-50"
                    >
                      <Undo2 size={13} strokeWidth={1.7} />
                      복구
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.ticket}
                      title="영구 삭제"
                      aria-label="영구 삭제"
                      onClick={() => {
                        if (confirm("이 검토를 영구 삭제합니다.\n검토 결과·판정·올린 파일이 모두 사라지며 복구 불가합니다. 계속할까요?"))
                          void act(r.ticket, () => prelim.remove(r.ticket, true));
                      }}
                      className="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--line-strong)] px-2.5 py-1.5 text-[13.5px] text-[var(--ink-muted)] hover:border-[var(--bad)] hover:bg-[var(--bad)] hover:text-white transition disabled:opacity-50"
                    >
                      <Trash2 size={13} strokeWidth={1.7} />
                      영구삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
            <div className={`${ROW_GRID} px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--line-strong)] text-[12.5px] font-semibold tracking-wide text-[var(--ink-muted)]`}>
              <div>검토 공고명</div>
              <div className={`${WIDE_ONLY} text-right`}>평가기준일</div>
              <div className="text-right">지원자 수</div>
              <div className={`${WIDE_ONLY} text-right`}>자소서 위배</div>
              <div className={`${WIDE_ONLY} text-right`}>첨부 위배</div>
              <div className={`${WIDE_ONLY} text-right`}>제척(내부)</div>
              <div className={`${WIDE_ONLY} text-right`}>제척(외부)</div>
              <div className="text-right">판정 진행</div>
              <div className="text-right">실행시간</div>
              <div></div>
            </div>
            {items.map((r) => {
              const vc = r.view_counts;
              const n = (v?: number) => (vc ? `${v}건` : "-");
              return (
                <Link
                  key={r.ticket}
                  href={`/prelim/${encodeURIComponent(r.ticket)}`}
                  className={`${ROW_GRID} px-4 py-4 border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--bg-2)] transition group`}
                >
                  <div className="min-w-0">
                    <div className="text-[16.5px] font-medium text-[var(--ink)] group-hover:underline underline-offset-4 decoration-[var(--secondary)] truncate">
                      {name(r)}
                    </div>
                    {r.notice && r.label && r.label !== r.notice && (
                      <div className="mt-0.5 text-[13px] text-[var(--ink-soft)] truncate">{r.label}</div>
                    )}
                  </div>
                  <div className={`${WIDE_ONLY} ${CELL}`}>{r.eval_date || "-"}</div>
                  <div className={CELL}>{r.applicant_count}명</div>
                  <div className={`${WIDE_ONLY} ${CELL}`}>{vc ? n(vc.essay) : `${r.counts.blind_total}건`}</div>
                  <div className={`${WIDE_ONLY} ${CELL}`}>{n(vc?.attach)}</div>
                  <div className={`${WIDE_ONLY} ${CELL}`}>{n(vc?.inx)}</div>
                  <div className={`${WIDE_ONLY} ${CELL}`}>{n(vc?.exx)}</div>
                  <div className="text-right">
                    {vc ? (
                      <span className="text-[16.5px] font-medium text-[var(--ink)] tabular-nums">
                        {r.judged ?? 0}
                        <span className="text-[var(--ink-muted)] font-normal"> / {vc.essay + vc.attach}</span>
                      </span>
                    ) : (
                      <span className={CELL}>-</span>
                    )}
                  </div>
                  <div className={CELL}>{formatTime(r.computed_at)}</div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={busy === r.ticket}
                      title="삭제 항목으로 이동"
                      aria-label="삭제 항목으로 이동"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm(`"${name(r)}" 검토를 삭제 항목으로 이동합니다.\n삭제 항목에서 복구 가능합니다.`))
                          void act(r.ticket, () => prelim.remove(r.ticket));
                      }}
                      className="grid place-items-center h-9 w-9 rounded-[2px] border border-transparent text-[var(--ink-muted)] opacity-0 group-hover:opacity-100 hover:border-[var(--bad)] hover:bg-[var(--bad)] hover:text-white transition disabled:opacity-50"
                    >
                      <Trash2 size={17} strokeWidth={2} />
                    </button>
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
