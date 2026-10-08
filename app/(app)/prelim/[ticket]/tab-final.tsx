"use client";

import { useState } from "react";
import type { PrelimFinal, PrelimFinalRow } from "@/lib/api";
import { BLABEL, XBtn } from "./parts";
import type { Ctx } from "./result-view";

type Filter = "all" | PrelimFinalRow["st"];

const FILTERS: [Filter, string][] = [
  ["all", "전체"],
  ["confirm", "위배 확정"],
  ["hold", "보류"],
  ["", "미판정"],
  ["dismiss", "문제 없음"],
];
const JCLS: Record<string, string> = { confirm: "v", hold: "h", dismiss: "ok" };

/** 블라인드 최종 결과. 판정은 표시만 하고 바꾸는 곳은 자기소개서·첨부 탭이다 */
export default function FinalTab({ ctx, final }: { ctx: Ctx; final: PrelimFinal }) {
  const { exportUrl, focusNo, go } = ctx;
  const [filter, setFilter] = useState<Filter>("all");
  const rows = filter === "all" ? final.rows : final.rows.filter((r) => r.st === filter);
  const people = new Set(rows.map((r) => r.no)).size;
  const jump = (r: PrelimFinalRow) => go(r.kind === "자기소개서" ? "essay" : "attach", { focus: r.no });

  return (
    <div className="panel">
      <header>
        <h2>검토 결과 요약표</h2>
        <div className="hdtools">
          <div className="seg2" aria-label="판정 필터">
            {FILTERS.map(([k, label]) => (
              <button key={label} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <span className="hint">
            {rows.length}건 · 지원자 {people}명
          </span>
          <XBtn href={exportUrl("final")} title="전체 엑셀 다운로드" />
          <XBtn href={exportUrl("final-v")} cap="위배" title="위배 확정(감점 대상) 엑셀 다운로드" />
        </div>
      </header>
      <div className="tblwrap">
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 150 }}>수험번호</th>
              <th style={{ width: 110 }}>구분</th>
              <th style={{ width: 150 }}>위배 항목</th>
              <th>위배 단어</th>
              <th style={{ width: 220 }}>위치</th>
              <th className="jcol" style={{ width: 140 }}>판정</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr
                  key={r.id}
                  data-no={r.no}
                  data-jump
                  tabIndex={0}
                  title={`${r.kind === "자기소개서" ? "자기소개서 위배" : "첨부 실적 내 위배"} 화면에서 보기`}
                  className={focusNo === r.no ? "focus" : undefined}
                  onClick={() => jump(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target === e.currentTarget) jump(r);
                  }}
                >
                  <td className="mono">{r.no}</td>
                  <td>{r.kind}</td>
                  <td>{r.cat}</td>
                  <td>
                    <mark>{r.word}</mark>
                    {r.file && <span className="sub">{r.file}</span>}
                  </td>
                  <td>{r.where}</td>
                  <td className="jcol">
                    <span className={`jb ${JCLS[r.st] ?? ""}`}>{BLABEL[r.st] ?? "미판정"}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no2">
                  해당하는 판정이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="penline">
        <b>감점 대상 {final.penalty.length}명</b>
        {final.penalty.length ? (
          final.penalty.map((p) => (
            <span className="chip" key={p.no}>
              <span className="mono">{p.no}</span>&nbsp;위배 확정 {p.count}건
            </span>
          ))
        ) : (
          <span className="hint">아직 위배 확정된 지원자가 없습니다.</span>
        )}
        <span className="hint rest">
          위배 확정이 있는 지원자는 감점됩니다 · 보류·미판정 {final.pending}건 남음
        </span>
      </div>
    </div>
  );
}
