"use client";

import { useState } from "react";
import { BLABEL, Dash, Y2 } from "./parts";
import type { Ctx } from "./result-view";
import { Viewer, attText, attachFileUrl, attachState, langLabel, pageLabel } from "./tab-attach";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel">
      <header>
        <h2>{title}</h2>
      </header>
      {children}
    </div>
  );
}
const None = () => <div className="empty">해당 없음</div>;

export default function PersonView({ ctx, no }: { ctx: Ctx; no: string }) {
  const { data, derived, verdicts, go, ticket } = ctx;
  const [viewing, setViewing] = useState<{ id: string; mode: "hit" | "all" } | null>(null);
  const p = derived.summary_fixed.people_matrix.find((x) => x.no === no) ?? {
    no, name: "-", essay: 0, attach: 0, internal: 0, external: 0, essay_done: false, out: null,
  };
  const essay = data.view.essay.filter((b) => b.no === no);
  const attach = data.view.attach.filter((a) => a.no === no);
  const internal = derived.inx.internal.filter((f) => f.no === no);
  const external = derived.exx_detail.filter((f) => f.no === no);
  const current = viewing ? attach.find((a) => a.id === viewing.id) : null;

  return (
    <>
      <button className="backlink" type="button" onClick={() => go("summary")}>
        ← 요약 화면으로
      </button>
      <div className="phead">
        <div>
          <div className="eyebrow">개인별 위배·제척 정리</div>
          <h2>
            <b>{p.no}</b> {p.name}
          </h2>
        </div>
        <div className="pstat">
          <div>
            자기소개서 위배<b>{p.essay}건</b>
          </div>
          <div>
            첨부 실적 위배<b>{p.attach}건</b>
          </div>
          <div>
            제척(내부)<b>{p.internal}건</b>
          </div>
          <div>
            제척(외부) 2년 이내<b>{p.external}건</b>
          </div>
        </div>
      </div>

      <Sec title="자기소개서 위배">
        {essay.length ? (
          <div className="tblwrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>위배 항목</th>
                  <th style={{ width: 150 }}>자기소개서 항목</th>
                  <th>위배 단어</th>
                  <th>위배 사유</th>
                  <th style={{ width: 110 }}>판정</th>
                </tr>
              </thead>
              <tbody>
                {essay.map((b) => {
                  const d = verdicts.essay[b.id]?.value;
                  return (
                    <tr key={b.id}>
                      <td>{b.type}</td>
                      <td>{b.item}</td>
                      <td>
                        <mark>{b.hit}</mark>
                      </td>
                      <td>{b.why}</td>
                      <td className={d ? "" : "no2"}>{d ? BLABEL[d] : "미판정"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <None />
        )}
      </Sec>

      <Sec title="첨부 실적 내 위배">
        {attach.length ? (
          <div className="tblwrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>실적 카테고리</th>
                  <th>파일명</th>
                  <th style={{ width: 130 }}>매칭 언어</th>
                  <th style={{ width: 100 }}>매칭 페이지</th>
                  <th style={{ width: 240 }}>판정 내용</th>
                </tr>
              </thead>
              <tbody>
                {attach.map((a) => {
                  const t = attText(attachState(a, verdicts.attach));
                  return (
                    <tr key={a.id}>
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
                      <td>{langLabel(a)}</td>
                      <td className="mono">{pageLabel(a)}</td>
                      <td>
                        <span className={`jtext ${t.cls}`}>{t.t}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <None />
        )}
      </Sec>

      <Sec title="제척(내부)">
        {internal.length ? (
          <div className="tblwrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>참여과제(실적)명</th>
                  <th style={{ width: 150 }}>참여 구분</th>
                  <th style={{ width: 110 }}>참여 시작일</th>
                  <th style={{ width: 110 }}>참여 종료일</th>
                  <th style={{ width: 120 }}>연구책임자</th>
                  <th style={{ width: 140 }}>2년 기준 여부</th>
                </tr>
              </thead>
              <tbody>
                {internal.map((f) => (
                  <tr key={f.id}>
                    <td>{f.project}</td>
                    <td>{f.kind}</td>
                    <td className="mono">
                      <Dash v={f.from ?? (f.kind === "내부참여" ? f.dfrom : null)} />
                    </td>
                    <td className="mono">
                      <Dash v={f.to ?? (f.kind === "내부참여" ? f.dto : null)} />
                    </td>
                    <td className="nm">{f.pi || "-"}</td>
                    <td>{f.flag ? <Y2 yes={f.flag === "yes"} /> : <span className="no2">연구 종료일 미입력</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <None />
        )}
      </Sec>

      <Sec title="제척(외부)">
        {external.length ? (
          <div className="tblwrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th>경력기관명</th>
                  <th style={{ width: 120 }}>근무 시작일</th>
                  <th style={{ width: 120 }}>근무 종료일</th>
                  <th style={{ width: 170 }}>평가기준일 2년 이내 여부</th>
                </tr>
              </thead>
              <tbody>
                {external.map((f) => (
                  <tr key={f.id}>
                    <td>{f.org}</td>
                    <td className="mono">
                      <Dash v={f.from} />
                    </td>
                    <td className="mono">
                      <Dash v={f.to} />
                    </td>
                    <td>
                      <Y2 yes={f.within2y} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <None />
        )}
      </Sec>

      {current && viewing && (
        <Viewer ticket={ticket} item={current} mode={viewing.mode} onMode={(m) => setViewing({ id: current.id, mode: m })} onClose={() => setViewing(null)} />
      )}
    </>
  );
}
