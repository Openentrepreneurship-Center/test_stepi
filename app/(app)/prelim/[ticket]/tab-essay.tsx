"use client";

import { BLABEL, XBtn } from "./parts";
import type { Ctx } from "./result-view";

export default function EssayTab({ ctx }: { ctx: Ctx }) {
  const { data, derived, verdicts, busy, judge, focusNo, exportUrl } = ctx;
  const essay = data.view.essay;
  const kpi = derived.summary_fixed.kpi;
  const people = derived.summary_fixed.people_matrix.filter((p) => p.essay > 0);
  const cur = (id: string) => verdicts.essay[id]?.value;

  const decButtons = (id: string) => {
    const c = cur(id);
    const waiting = busy === `essay:${id}`;
    const btn = (val: "confirm" | "dismiss" | "hold", cls: string) => (
      <button
        className={`btn ${cls} sm`}
        type="button"
        aria-pressed={c === val}
        disabled={waiting}
        onClick={() => judge("essay", id, c === val ? null : val)}
      >
        {BLABEL[val]}
      </button>
    );
    return (
      <div className="dec">
        {btn("confirm", "c")}
        {btn("dismiss", "d")}
        {btn("hold", "h")}
        <span className="now">
          {c ? (
            <>
              처리됨: <b style={{ color: "var(--ink)" }}>{BLABEL[c]}</b> · 같은 버튼을 다시 누르면 취소
            </>
          ) : (
            "아직 판정하지 않았습니다"
          )}
        </span>
      </div>
    );
  };

  return (
    <>
      <div className="guide">
        <b>점검 유형</b>
        {kpi.essay_by_type
          .filter(([t, n]) => t !== "기타" || n > 0)
          .map(([t, n]) => (
            <span
              className="chip"
              key={t}
              style={n ? { borderColor: "var(--navy)", color: "var(--navy)", fontWeight: 600 } : { color: "var(--muted)" }}
            >
              {t} ({n})
            </span>
          ))}
        <span className="hint" style={{ marginLeft: "auto" }}>
          노란색으로 표시된 구절이 위배로 판단된 부분입니다
        </span>
      </div>

      <div className="panel">
        <header>
          <h2>검토 결과 요약표</h2>
          <div className="hdtools">
            <span className="hint">
              {kpi.essay_total}건 · 지원자 {kpi.essay_people}명
            </span>
            <XBtn href={exportUrl("essay")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("essay-v")} cap="위배" title="위배 확정 엑셀 다운로드" />
          </div>
        </header>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 88 }}>수험번호</th>
                <th style={{ width: 100 }}>위배 항목</th>
                <th>위배 단어</th>
                <th style={{ width: 150 }}>자기소개서 항목</th>
                <th style={{ width: 100 }}>판정</th>
              </tr>
            </thead>
            <tbody>
              {essay.map((b) => {
                const d = cur(b.id);
                return (
                  <tr key={b.id}>
                    <td className="mono">{b.no}</td>
                    <td>{b.type}</td>
                    <td>
                      <mark>{b.hit}</mark>
                    </td>
                    <td>{b.item}</td>
                    <td className={d ? "" : "no2"}>{d ? BLABEL[d] : "미판정"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bcards">
        {people.map((p) => {
          const mine = essay.filter((b) => b.no === p.no);
          const types = mine.map((b) => b.type).filter((t, i, a) => a.indexOf(t) === i);
          return (
            <article className={`bcard ${p.essay_done ? "done" : ""} ${focusNo === p.no ? "focus" : ""}`} data-no={p.no} key={p.no}>
              <div className="b-side">
                <h3>
                  <span className="mono">{p.no}</span>
                  <small>{p.name}</small>
                </h3>
                <div className="b-type">
                  위배 유형<b>{types.join(" · ")}</b>
                </div>
                <div className="b-type">
                  위배 건수<span style={{ fontSize: 14, color: "var(--ink)" }}>{p.essay}건</span>
                </div>
              </div>
              <div className="b-main">
                {mine.map((b) => (
                  <div className="vblock" key={b.id}>
                    <div className="vhead">
                      <b>{b.item}</b>
                      {b.itemName && <span className="pill" style={{ height: "auto", minHeight: 22, whiteSpace: "normal" }}>{b.itemName}</span>}
                      <span className="tag hard">{b.type}</span>
                    </div>
                    <blockquote className="quote">
                      <span className="q-label">{b.item} 내 원문</span>
                      {b.before.startsWith("…") ? "" : "…"}
                      {b.before}
                      <mark>{b.hit}</mark>
                      {b.after}
                    </blockquote>
                    <div className="reason">
                      <span>위배 사유</span>
                      <p>{b.why}</p>
                    </div>
                    {decButtons(b.id)}
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
