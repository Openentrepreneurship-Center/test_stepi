"use client";

import { useEffect, useState } from "react";
import { API_BASE, type PrelimAttachItem, type PrelimVerdict } from "@/lib/api";
import { XBtn } from "./parts";
import type { Ctx } from "./result-view";

export const pageLabel = (a: PrelimAttachItem) =>
  a.is_image ? "표지" : a.hits.length ? a.hits.map((n) => `${n}p`).join(", ") : "파일명";
const IMAGE_RE = /\.(jpe?g|png|bmp|tiff?|gif)$/i;
/** 쪽 그림을 보여 줄 수 있는 형식(pdf, 이미지). docx·hwp 는 발췌 문장만 */
export const canRender = (a: PrelimAttachItem) => /\.pdf$/i.test(a.file) || IMAGE_RE.test(a.file);
export const attachPageUrl = (ticket: string, id: string, n: number) =>
  `${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/attach/${encodeURIComponent(id)}/page/${n}`;
export const langLabel = (a: PrelimAttachItem) => `${a.lang}(${a.match})`;

/** 담당자가 누른 판정이 없으면 시스템 제안 판정을 보여 준다 */
export function attachState(a: PrelimAttachItem, v: Record<string, PrelimVerdict>): { value?: string; reason?: string | null } {
  const mine = v[a.id];
  if (mine) return mine;
  return a.suggested ?? {};
}

export function attText(st: { value?: string; reason?: string | null }) {
  if (!st.value) return { cls: "non", t: "미판정" };
  if (st.value === "confirm") return { cls: "v", t: "위배" };
  if (st.value === "hold") return { cls: "hd", t: "보류" };
  return { cls: "ok", t: `위배 아님(${st.reason || "사유 입력 필요"})` };
}

export const attachFileUrl = (ticket: string, id: string) =>
  `${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/attach/${encodeURIComponent(id)}`;

function Excerpt({ text, match }: { text: string; match: string }) {
  const i = match ? text.indexOf(match) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b>{match}</b>
      {text.slice(i + match.length)}
    </>
  );
}

export function Viewer({
  ticket,
  item,
  mode,
  onMode,
  onClose,
}: {
  ticket: string;
  item: PrelimAttachItem;
  mode: "hit" | "all";
  onMode: (m: "hit" | "all") => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  let pages: number[];
  if (mode === "hit") pages = item.hits;
  else {
    const upto = Math.min(item.total, 8);
    pages = Array.from({ length: upto }, (_, i) => i + 1);
    item.hits.forEach((h) => {
      if (!pages.includes(h)) pages.push(h);
    });
    pages.sort((x, y) => x - y);
  }
  const render = canRender(item);

  return (
    <div className="vw" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vw-box" role="dialog" aria-modal="true" aria-labelledby="vw-title">
        <header className="vw-head">
          <div>
            <h2 id="vw-title">{item.file}</h2>
            <div className="hint">
              수험번호 <span className="mono">{item.no}</span> · {item.name} · {item.cat} · 매칭 {pageLabel(item)} ({item.lang})
            </div>
          </div>
          <div className="vw-tools">
            <div className="seg2">
              <button type="button" aria-pressed={mode === "hit"} onClick={() => onMode("hit")}>
                해당 페이지만
              </button>
              <button type="button" aria-pressed={mode === "all"} onClick={() => onMode("all")}>
                전체 보기
              </button>
            </div>
            <a className="btn quiet sm" href={attachFileUrl(ticket, item.id)} style={{ textDecoration: "none" }}>
              내려받기
            </a>
            <button className="btn sm" type="button" onClick={onClose}>
              닫기
            </button>
          </div>
        </header>
        <div className="vw-body">
          {item.in_filename && (
            <div className="rulebox">파일명에 성명이 있습니다: <b>{item.file}</b></div>
          )}
          {pages.length === 0 && !item.in_filename && <div className="vw-more">본문에서 검출된 쪽이 없습니다</div>}
          {pages.map((n) => {
            const hit = item.hits.includes(n);
            const boxes = item.boxes?.[String(n)] ?? [];
            return (
              <div className={`pg ${hit ? "hit" : ""} ${render ? "img" : ""}`} key={n}>
                <div className="pg-no">
                  <span>{item.is_image ? "표지" : `${n} / ${item.total}p`}</span>
                  {hit && <span className="tag hard">성명 매칭{render && boxes.length === 0 ? " · 위치를 표시하지 못했습니다" : ""}</span>}
                </div>
                {render ? (
                  <div className="pgimg">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 백엔드가 그린 PNG, 크기 미리 알 수 없음 */}
                    <img src={attachPageUrl(ticket, item.id, n)} alt={`${item.file} ${n}쪽`} loading="lazy" draggable={false} />
                    {boxes.map(([x0, y0, x1, y1], i) => (
                      <span
                        key={i}
                        className="hl"
                        style={{ left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="sk m" />
                    <div className="sk" />
                  </>
                )}
                {hit ? (
                  <p className="line">
                    <Excerpt text={item.excerpts?.[String(n)] ?? item.snip} match={item.match} />
                  </p>
                ) : (
                  !render && <div className="sk s" />
                )}
                {!render && (
                  <>
                    <div className="sk" />
                    <div className="sk s" />
                  </>
                )}
              </div>
            );
          })}
          {!render && (
            <div className="vw-more">이 형식은 쪽 그림을 보여 주지 못합니다. 내려받기로 원본을 확인하세요</div>
          )}
          {mode === "all" && item.total > pages.length && (
            <div className="vw-more">
              전체 {item.total}p 중 {pages.length}p 표시 · 나머지는 내려받기로 원본을 확인하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReasonBox({ ctx, item, value }: { ctx: Ctx; item: PrelimAttachItem; value: { value?: string; reason?: string | null } }) {
  const [text, setText] = useState(value.reason ?? "");
  const active = value.value === "dismiss";
  return (
    <textarea
      rows={2}
      disabled={!active}
      value={text}
      placeholder={active ? "사유를 입력하세요 (예: 가림 확인, 다중 성명 나열, 동명이인 확인)" : "문제 없음 선택 시 사유 입력"}
      aria-label="위배 아님 사유"
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (active && text !== (value.reason ?? "")) ctx.judge("attach", item.id, "dismiss", text || null);
      }}
    />
  );
}

export default function AttachTab({ ctx }: { ctx: Ctx }) {
  const { data, derived, verdicts, busy, judge, focusNo, exportUrl, ticket } = ctx;
  const [viewing, setViewing] = useState<{ id: string; mode: "hit" | "all" } | null>(null);
  const attach = data.view.attach;
  const kpi = derived.summary_fixed.kpi;
  const current = viewing ? attach.find((a) => a.id === viewing.id) : null;
  const status = data.attach_status;

  return (
    <>
      <div className="guide">
        <b>점검 기준</b>
        <span className="hint lines">
          첨부 실적(zip) 안의 pdf·docx·이미지 본문과 파일명에서 지원자 성명을 한글·영문·한자 표기로 검출합니다.
          <br />
          검출된 파일은 위배 후보이며, 원본을 확인해 <b>위배 확정 / 문제 없음(사유 입력) / 보류</b>로 판정합니다.
          <br />
          가림 처리·다중 성명 나열·동명이인·이미지 텍스트 미검출은 위배로 보지 않습니다.
        </span>
      </div>

      <div className="panel">
        <header>
          <h2>검토 결과 요약표</h2>
          <div className="hdtools">
            <span className="hint">
              {kpi.attach_total}건 중 {kpi.attach_done}건 판정
            </span>
            <XBtn href={exportUrl("attach")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("attach-v")} cap="위배" title="위배 확정 엑셀 다운로드" />
          </div>
        </header>
        {status === "none" ? (
          <div className="empty">첨부 실적 zip 을 올리지 않았습니다</div>
        ) : status === "failed" ? (
          <div className="empty" role="alert">
            첨부 실적 검사에 실패했습니다. {data.attach_error ?? ""}
          </div>
        ) : status !== "done" && attach.length === 0 ? (
          <div className="empty">
            첨부 실적을 검사하고 있습니다. {data.attach_total ? `${data.attach_done ?? 0} / ${data.attach_total}개` : ""}
          </div>
        ) : (
          <div className="tblwrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th style={{ width: 88 }}>수험번호</th>
                  <th style={{ width: 76 }}>성명</th>
                  <th style={{ width: 100 }}>실적 카테고리</th>
                  <th>파일명 · 원본 확인</th>
                  <th style={{ width: 140 }}>매칭 언어</th>
                  <th style={{ width: 90 }}>매칭 페이지</th>
                  <th style={{ width: 290 }}>판정 내용</th>
                </tr>
              </thead>
              <tbody>
                {attach.map((a) => {
                  const st = attachState(a, verdicts.attach);
                  const t = attText(st);
                  const waiting = busy === `attach:${a.id}`;
                  const jbtn = (val: "confirm" | "dismiss" | "hold", cls: string, label: string) => (
                    <button
                      className={`jbtn ${cls}`}
                      type="button"
                      aria-pressed={st.value === val}
                      disabled={waiting}
                      onClick={() =>
                        judge("attach", a.id, verdicts.attach[a.id]?.value === val ? null : val, val === "dismiss" ? (st.reason ?? null) : null)
                      }
                    >
                      {label}
                    </button>
                  );
                  return (
                    <tr key={a.id} data-no={a.no} className={focusNo === a.no ? "focus" : undefined}>
                      <td className="mono">{a.no}</td>
                      <td className="nm">{a.name}</td>
                      <td>{a.cat}</td>
                      <td>
                        <div className="fcell">
                          <span className="fname2">{a.file}</span>
                          <div className="jbtns">
                            <button className="jbtn" type="button" onClick={() => setViewing({ id: a.id, mode: "hit" })}>
                              해당 페이지 보기
                            </button>
                            <button className="jbtn" type="button" onClick={() => setViewing({ id: a.id, mode: "all" })}>
                              전체 보기
                            </button>
                            <a className="jbtn" href={attachFileUrl(ticket, a.id)} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", color: "inherit" }}>
                              내려받기
                            </a>
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>{langLabel(a)}</td>
                      <td className="mono">{pageLabel(a)}</td>
                      <td>
                        <div className="jcell">
                          <div className="jbtns">
                            {jbtn("confirm", "c", "위배 확정")}
                            {jbtn("dismiss", "d", "문제 없음")}
                            {jbtn("hold", "h", "보류")}
                          </div>
                          <ReasonBox key={`${a.id}:${st.value}:${st.reason ?? ""}`} ctx={ctx} item={a} value={st} />
                          <span className={`jtext ${t.cls}`}>{t.t}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={7}>
                    판정 내용 예시 · 위배 / 위배 아님(가림 확인) / 위배 아님(다중 성명 나열) / 위배 아님(텍스트 확인 결과 성명 미검출) / 위배 아님(동명이인
                    확인). 사유는 자유 입력(글자 수 제한 없음)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {current && viewing && (
        <Viewer ticket={ticket} item={current} mode={viewing.mode} onMode={(m) => setViewing({ id: current.id, mode: m })} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
