"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PrelimPrefFile, PrelimPrefRow } from "@/lib/api";
import NotUploaded from "./not-uploaded";
import { Fold, XBtn, shownNo } from "./parts";
import type { Ctx } from "./result-view";
import { attachFileUrl, attachPageUrl } from "./tab-attach";

export const PREF_LABEL: Record<string, string> = { grant: "가점 부여", deny: "가점 미부여", hold: "보류" };
const PREF_CLS: Record<string, string> = { grant: "ok", deny: "v", hold: "hd" };
const PREF_BTN: [string, string][] = [["grant", "d"], ["deny", "c"], ["hold", "h"]];
// 한 번에 그리는 쪽 수. 넘으면 원본 다운로드 안내
const MAX_PAGES = 30;

export function PrefText({ value }: { value?: string | null }) {
  return value ? <span className={`jtext ${PREF_CLS[value]}`}>{PREF_LABEL[value]}</span> : <span className="jtext non">미판정</span>;
}

export function PrefCats({ row }: { row: PrelimPrefRow }) {
  return (
    <div className="grid gap-0.5">
      {row.cats.map((c) => (
        <div key={c.cat}>
          <span className="font-semibold">{c.cat}</span> <span className="text-[var(--ink-muted)]">{c.raw}</span>
        </div>
      ))}
    </div>
  );
}

export type PrefOpen = { file: PrelimPrefFile; folder: string; row: PrelimPrefRow };

export function PrefFiles({ row, onOpen }: { row: PrelimPrefRow; onOpen: (o: PrefOpen) => void }) {
  if (!row.folders.length) return <span className="font-semibold text-[var(--red-text)]">증빙 없음</span>;
  return (
    <div className="grid gap-2">
      {row.folders.map((g) => (
        <div key={g.folder}>
          <b className="block mb-1 text-[14px] font-semibold text-[var(--ink-muted)]">{g.folder}</b>
          {g.files.map((f) => (
            <div className="fcell" key={f.id}>
              <span className="fname2">{f.file}</span>
              <div className="jbtns">
                <button className="jbtn" type="button" onClick={() => onOpen({ file: f, folder: g.folder, row })}>
                  원본 보기
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function PrefViewer({ ticket, open, onClose }: { ticket: string; open: PrefOpen; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const { file, folder, row } = open;
  const pages = Array.from({ length: Math.min(file.total, MAX_PAGES) }, (_, i) => i + 1);
  return (
    <div className="vw" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vw-box" role="dialog" aria-modal="true" aria-labelledby="vw-title">
        <header className="vw-head">
          <div>
            <h2 id="vw-title">{file.file}</h2>
            <div className="hint">
              수험번호 <span className="mono">{shownNo(row.no)}</span> · {row.name} · {folder}
            </div>
          </div>
          <div className="vw-tools">
            <a className="btn quiet sm" href={attachFileUrl(ticket, file.id)} style={{ textDecoration: "none" }}>
              다운로드
            </a>
            <button className="btn sm" type="button" onClick={onClose}>
              닫기
            </button>
          </div>
        </header>
        <div className="vw-body">
          {!file.renderable && (
            <div className="vw-more">이 파일 형식은 페이지 미리보기를 지원하지 않습니다. 원본을 다운로드하여 확인해 주십시오.</div>
          )}
          {pages.map((n) => (
            <div className="pg img" key={n}>
              <div className="pg-no">
                <span>
                  {n} / {file.total}p
                </span>
              </div>
              <div className="pgimg">
                {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 그린 PNG, 크기 미리 알 수 없음 */}
                <img src={attachPageUrl(ticket, file.id, n)} alt={`${file.file} ${n}페이지`} loading="lazy" draggable={false} />
              </div>
            </div>
          ))}
          {file.total > pages.length && (
            <div className="vw-more">
              전체 {file.total}p 중 {pages.length}p 표시 · 나머지는 원본을 다운로드하여 확인해 주십시오.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrefTab({ ctx }: { ctx: Ctx }) {
  const { data, derived, judge, focusNo, exportUrl, ticket } = ctx;
  const [open, setOpen] = useState<PrefOpen | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const pref = derived.pref;
  const status = data.attach_status;

  // 첨부 업로드·검사 중에는 첨부 탭과 같이 진행 중 표시만(사용자 11/20)
  if (["uploading", "queued", "scanning"].includes(status)) {
    return (
      <div className="empty flex items-center justify-center gap-2" role="status" aria-live="polite">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        {status === "uploading" ? "첨부 실적 zip 파일을 업로드하고 있습니다." : "첨부 실적을 검사하고 있습니다."}
      </div>
    );
  }
  if (!pref || pref.legacy) return <div className="empty">이 검토는 가산점 증빙 검토 기능 이전에 생성되었습니다.</div>;
  if (!pref.read) return <NotUploaded kind="origin" />;

  const rows = pref.rows;
  const done = rows.filter((r) => r.verdict).length;
  const press = (r: PrelimPrefRow, val: string) => {
    const next = r.verdict?.value === val ? null : val;
    setDrafts((d) => {
      const rest = { ...d };
      delete rest[r.no];
      return rest;
    });
    void judge("pref", r.no, next, next ? (drafts[r.no] ?? r.verdict?.reason ?? null) : null);
  };
  const saveReason = (r: PrelimPrefRow) => {
    const text = drafts[r.no];
    if (text === undefined || !r.verdict || text === (r.verdict.reason ?? "")) return;
    void judge("pref", r.no, r.verdict.value, text || null);
  };

  return (
    <>
      <div className="guide">
        <b>점검 기준</b>
        <span className="hint lines">
          지원정보 엑셀의 장애여부·보훈여부·저소득층여부·수료·인턴증 수여 기간 확인·이전지역/지역인재 중 하나라도 해당하는 지원자를 표시하였습니다.
          <br />
          첨부 실적(zip)의 가점 증빙 폴더의 파일을 확인한 후 <b>가점 부여 / 가점 미부여 / 보류</b>로 판정합니다.
        </span>
      </div>

      {pref.missing_cols.length > 0 && (
        <div className="rulebox" role="status" style={{ borderLeftColor: "var(--orange)" }}>
          <b>못 읽은 열</b> · 지원정보 엑셀에 {pref.missing_cols.map((c) => `'${c}'`).join(", ")} 열이 없습니다. 나머지 열로 대상자를 선택하였습니다.
        </div>
      )}

      <div className="panel">
        <header>
          <h2>검토 결과 요약표</h2>
          <div className="hdtools">
            <span className="hint">
              대상자 {rows.length}명 중 {done}명 판정
            </span>
            <XBtn href={exportUrl("pref")} title="전체 엑셀 다운로드" />
          </div>
        </header>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 110 }}>수험번호</th>
                <th style={{ width: 80 }}>성명</th>
                <th style={{ width: 260 }}>해당 항목</th>
                <th>증빙 파일 · 원본 확인</th>
                <th style={{ width: 120 }}>판정 내용</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">가산점 증빙 검토 대상자가 없습니다.</div>
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.no} data-no={r.no} className={focusNo === r.no ? "focus" : undefined}>
                    <td className="mono">{shownNo(r.no)}</td>
                    <td className="nm">{r.name}</td>
                    <td>
                      <PrefCats row={r} />
                    </td>
                    <td>
                      <PrefFiles row={r} onOpen={setOpen} />
                    </td>
                    <td>
                      <PrefText value={r.verdict?.value} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  <div className="tf-in">
                    해당 없음으로 보는 값 · 빈칸, &apos;-&apos;, &apos;해당없음&apos;, &apos;비대상&apos;, &apos;아니오&apos;. 그 밖의 값이 입력되어 있으면 대상자입니다.
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {rows.length > 0 && (
        <Fold title="지원자별 상세 내역" hint={`대상자 ${rows.length}명 · 펼쳐서 판정합니다`} open={!!focusNo}>
          <div className="bcards">
            {rows.map((r) => (
              <article className={`bcard ${r.verdict ? "done" : ""} ${focusNo === r.no ? "focus" : ""}`} key={r.no}>
                <div className="b-side">
                  <h3>
                    <span className="mono">{shownNo(r.no)}</span>
                    <small>{r.name}</small>
                  </h3>
                  <div className="b-type">
                    해당 항목<span style={{ fontSize: 14, color: "var(--ink)" }}>{r.cats.length}개</span>
                  </div>
                </div>
                <div className="b-main">
                  <div className="vblock">
                    <div className="vhead">
                      {r.cats.map((c) => (
                        <span className="pill" key={c.cat}>
                          {c.cat}
                        </span>
                      ))}
                    </div>
                    <PrefCats row={r} />
                  </div>
                  <div className="vblock">
                    <div className="vhead">
                      <b>증빙 파일</b>
                    </div>
                    <PrefFiles row={r} onOpen={setOpen} />
                  </div>
                  <div className="vblock jcell">
                    <div className="jbtns">
                      {PREF_BTN.map(([val, cls]) => (
                        <button
                          key={val}
                          className={`jbtn ${cls}`}
                          type="button"
                          aria-pressed={r.verdict?.value === val}
                          onClick={() => press(r, val)}
                        >
                          {PREF_LABEL[val]}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      disabled={!r.verdict}
                      value={r.verdict ? (drafts[r.no] ?? r.verdict.reason ?? "") : ""}
                      placeholder={r.verdict ? "사유 입력(예: 저소득층 증빙 없음)" : "판정 선택 시 사유 입력"}
                      aria-label="판정 사유"
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.no]: e.target.value }))}
                      onBlur={() => saveReason(r)}
                    />
                    <PrefText value={r.verdict?.value} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Fold>
      )}

      {open && <PrefViewer ticket={ticket} open={open} onClose={() => setOpen(null)} />}
    </>
  );
}
