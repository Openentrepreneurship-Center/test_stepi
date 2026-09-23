"use client";

import type { PrelimCommittee } from "@/lib/api";
import { Dash, OUT_STAGES, STAGES, UpBtn, XBtn, Y2 } from "./parts";
import type { Ctx } from "./result-view";

const SRC_CLS: Record<string, string> = { 직전공고: "src-prev", "동일직군 최근공고": "src-same" };

function ComTag({ c }: { c: PrelimCommittee }) {
  return (
    <span className="srcpills">
      {c.src.map((s) => (
        <span className={`pill srcpill ${SRC_CLS[s] ?? ""}`} key={s}>
          {s}
        </span>
      ))}
    </span>
  );
}

export default function ExternalTab({ ctx }: { ctx: Ctx }) {
  const { derived, uploads, stage, setStage, busy, upload, judge, verdicts, focusNo, exportUrl } = ctx;
  const cur = derived.exx[stage];
  const limitedRows = cur.limited_org_rows;
  const restricted = cur.restricted_committee;
  const com = derived.summary_fixed.committee_list;
  const uploaded = com.length > 0;
  const source = derived.summary_fixed.committee_source;
  const dropped = derived.summary_fixed.dropped_count;
  const detail = derived.exx_detail;
  const kpi = derived.summary_fixed.kpi;
  const peopleCount = detail.filter((f) => f.first).length;

  return (
    <>
      <div className="guide">
        <b>제척 기준</b>
        <span className="hint lines">
          평가기준일 <span className="mono">{derived.end}</span> 기준 최근 2년(<span className="mono">{derived.win}</span> 이후) 재직 이력이 있으면 해당
          기관 소속 외부위원 섭외가 제한됩니다.
          <br />
          외부위원은 제척 기준 정보의 섭외 심사위원 목록에서 가져오고, 제한 기관 소속이면 표시합니다. 채용섭외위원 목록 파일을 올리면 그 파일을 대신 씁니다.
        </span>
      </div>
      {derived.external_edu_count > 0 && (
        <div className="hint">학력 기준 기관 일치 {derived.external_edu_count}건은 기간 정보가 없어 표에서 제외했습니다</div>
      )}

      <div className="panel">
        <header>
          <h2>외부 위원 및 기관 목록</h2>
          <div className="hdtools">
            <div className="stageseg" aria-label="전형 선택">
              {STAGES.map((st) => (
                <button type="button" key={st} aria-pressed={stage === st} onClick={() => setStage(st)}>
                  {st}전형
                </button>
              ))}
            </div>
            <XBtn href={exportUrl("exx-org")} title="제척 외부기관·위원 총괄 엑셀 다운로드" />
          </div>
        </header>
        <div className="guide" style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
          <span className="hint">
            총괄 · <b>{stage}전형</b> 기준 제척대상 기관 {cur.limited_org_count}개(2년 이내 재직 지원자가 있는 기관) · 제척 외부위원 {restricted.length}명.
            {source === "upload" ? "위원은 아래 외부위원 목록표에 올린 채용섭외위원 목록에서 가져옵니다." : "위원은 제척 기준 정보의 섭외 심사위원 목록에서 가져옵니다."}
            {dropped ? ` 현재 탈락 처리 ${dropped}명${cur.gone_orgs.length ? ` · 이 전형에서 빠진 기관: ${cur.gone_orgs.join(", ")}` : ""}` : ""}
          </span>
        </div>
        <div className="two" style={{ padding: "20px 24px", alignItems: "start", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.3fr)" }}>
          <div>
            <div className="hint" style={{ marginBottom: 8 }}>
              <b style={{ color: "var(--ink)" }}>제척대상 기관명</b> · 지원자 경력 기준 {cur.limited_org_count}개
            </div>
            <div className="tblwrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>제척대상 기관명</th>
                    <th style={{ width: 90 }}>지원자 수</th>
                    <th style={{ width: 90 }}>경력 건수</th>
                    <th style={{ width: 110 }}>2년 이내 건수</th>
                  </tr>
                </thead>
                <tbody>
                  {limitedRows.length ? (
                    limitedRows.map((r) => (
                      <tr key={r.org}>
                        <td className="nm">{r.org}</td>
                        <td className="mono">{r.people}명</td>
                        <td className="mono">{r.count}건</td>
                        <td className="mono">{r.within}건</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="no2">
                        이 전형에 남아 있는 지원자 중 2년 이내 재직 이력이 있는 외부 경력기관이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="hint" style={{ marginBottom: 8 }}>
              <b style={{ color: "var(--ink)" }}>제척 외부위원명</b> · 직전공고·동일직군 최근공고 섭외 인원 {restricted.length}명
            </div>
            <div className="tblwrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>성명</th>
                    <th>소속</th>
                    <th style={{ width: 96 }}>직급</th>
                    <th style={{ width: 150 }}>구분</th>
                  </tr>
                </thead>
                <tbody>
                  {restricted.length ? (
                    restricted.map((c) => (
                      <tr key={`${c.name}|${c.org}`}>
                        <td className="nm yes2">{c.name}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{c.org}</td>
                        <td>{c.title}</td>
                        <td>
                          <ComTag c={c} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="no2">
                        제척 기준 정보에 등록된 섭외 심사위원이 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <header>
          <h2>외부위원 목록표</h2>
          <div className="hdtools">
            <span className="hint">
              {uploaded
                ? `${source === "upload" ? "올린 파일" : "제척 기준 정보"} 위원 ${com.length}명 · 제척 ${restricted.length}명`
                : "제척 기준 정보에 등록된 섭외 심사위원이 없습니다"}
            </span>
            <UpBtn kind="com" label="채용섭외위원 목록 업로드" fileName={uploads.com?.file_name} busy={busy === "up:com"} onPick={upload} />
            <XBtn href={exportUrl("exx-com")} title="외부위원 목록 엑셀 다운로드" />
          </div>
        </header>
        <div className="guide" style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
          <span className="hint upfmt">
            기본은 제척 기준 정보 화면의 섭외 심사위원 목록입니다. 다른 명단으로 보려면 <b>구분 / 이름 / 소속회사 / 직급 / 전화번호 / 메일</b> 열이 있는 채용섭외위원 목록을 올리면 이 검토에서는 그 파일을 씁니다.
          </span>
        </div>
        {uploaded ? (
          <div className="tblwrap">
            <table className="dtable">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>성명</th>
                  <th style={{ width: 260 }}>소속</th>
                  <th style={{ width: 110 }}>직급</th>
                  <th>구분</th>
                </tr>
              </thead>
              <tbody>
                {restricted.map((c) => (
                  <tr key={`${c.name}|${c.org}`}>
                    <td className="nm">{c.name}</td>
                    <td>{c.org}</td>
                    <td>{c.title}</td>
                    <td>
                      <ComTag c={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>직전공고·동일직군 최근공고에 섭외된 위원은 모두 제척 외부위원입니다.</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="empty">
            제척 기준 정보 화면에서 섭외 심사위원을 등록하거나 채용섭외위원 목록을 올리면 외부위원 목록표와 제척 외부위원이 표시됩니다.
          </div>
        )}
      </div>

      <div className="panel">
        <header>
          <h2>지원자별 상세 내역</h2>
          <div className="hdtools">
            <span className="hint">
              {kpi.external_total}건 · 지원자 {peopleCount}명
            </span>
            <XBtn href={exportUrl("exx")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("exx-v")} cap="제척" title="2년 이내 해당자 엑셀 다운로드" />
          </div>
        </header>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 88 }}>수험번호</th>
                <th style={{ width: 84 }}>지원자 성명</th>
                <th>경력기관명</th>
                <th style={{ width: 104 }}>근무 시작일</th>
                <th style={{ width: 104 }}>근무 종료일</th>
                <th style={{ width: 150 }}>평가기준일 2년 이내 여부</th>
                <th style={{ width: 170 }}>전형 결과</th>
              </tr>
            </thead>
            <tbody>
              {detail.map((f, i) => {
                const out = verdicts.out[f.no]?.value;
                // 한 지원자의 여러 줄은 전형 결과 칸이 세로로 합쳐져 있어, 줄마다 테두리를 치지 않고 묶음 전체를 한 상자로 강조한다
                const focused = focusNo === f.no;
                const last = detail[i + 1]?.no !== f.no;
                const cls =
                  [f.out ? "dropped" : "", focused ? "gfocus" : "", focused && f.first ? "gf-first" : "", focused && last ? "gf-last" : ""]
                    .filter(Boolean)
                    .join(" ") || undefined;
                return (
                  <tr key={f.id} data-no={f.no} className={cls}>
                    <td className="mono">{f.no}</td>
                    <td className="nm">{f.name}</td>
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
                    {f.first && (
                      <td rowSpan={f.span} className={focused ? "gf-span" : undefined}>
                        <div className="outbtns">
                          {OUT_STAGES.map((st) => (
                            <button
                              className="outbtn"
                              type="button"
                              key={st}
                              aria-pressed={out === st}
                              disabled={busy === `out:${f.no}`}
                              onClick={() => judge("out", f.no, out === st ? null : st)}
                            >
                              {st} 탈락
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7}>
                  서류·필기 탈락을 누르면 그 다음 전형의 외부 위원 및 기관 목록에서 해당 지원자가 제외됩니다. 같은 버튼을 다시 누르면 취소(진행 중)됩니다.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
