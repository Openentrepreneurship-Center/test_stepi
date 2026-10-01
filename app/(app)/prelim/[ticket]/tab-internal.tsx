"use client";

import { Dash, UpBtn, XBtn, Y2 } from "./parts";
import type { Ctx } from "./result-view";

const REASON_CLS: Record<string, string> = { 연구책임자: "r-pi", 소속부서장: "r-hd", 동일학력: "r-dg", 지도교수: "r-dg" };
const STEPI = "과학기술정책연구원";

/** 올린 연구 목록·인사기록 파일에서 빠진 열·빈 칸 알림. 열 이름의 **굵게** 를 반영한다 */
function UpWarn({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return (
    <div
      role="note"
      style={{ background: "var(--warn-bg)", color: "var(--warn-text)", borderBottom: "1px solid var(--line)", padding: "12px 24px", fontSize: 14.5, lineHeight: 1.6 }}
    >
      {list.map((w, i) => (
        <div key={i}>{w.split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <strong key={j}>{p}</strong> : p))}</div>
      ))}
    </div>
  );
}

export default function InternalTab({ ctx }: { ctx: Ctx }) {
  const { derived, uploads, busy, upload, focusNo, exportUrl } = ctx;
  const { staff_rows: rows, pending_count: pendingCnt, internal, work, degree } = derived.inx;
  const advisor = derived.inx.advisor ?? [];
  const fcls = (no: string) => (focusNo === no ? "focus" : undefined);

  return (
    <>
      <div className="guide">
        <b>제척 기준</b>
        <span className="hint lines">
          평가기준일 <span className="mono">{derived.end}</span> 기준 최근 2년(<span className="mono">{derived.win}</span> 이후) 종료된 내부 과제의
          연구책임자, 근무부서의 소속(상위)부서장, 학위별 학교·학과·지도교수가 모두 일치하는 동일학력 내부직원, 지원자의 지도교수인 내부직원을 평가에서 제척합니다.
          <br />
          참여과제·근무부서 확인 항목은 아래 연구 목록·인사기록 파일 업로드로 채워집니다. 동일학력·지도교수는 제척 기준 정보와 대조한 결과입니다.
        </span>
      </div>

      <div className="panel">
        <header>
          <h2>제척 내부위원 전체 목록</h2>
          <div className="hdtools">
            <span className="hint">
              제척 내부위원 {rows.length}명{pendingCnt ? ` · 확인 자료 미업로드 ${pendingCnt}건` : ""}
            </span>
            <XBtn href={exportUrl("inx-staff")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("inx-staff-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 90 }}>이름</th>
                <th style={{ width: 110 }}>직급/직위</th>
                <th style={{ width: 200 }}>소속부서명</th>
                <th style={{ width: 260 }}>제척사유</th>
                <th style={{ minWidth: 320 }}>관련 수험번호</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.name}>
                    <td className="nm">{r.name}</td>
                    <td>{r.title}</td>
                    <td>{r.dept}</td>
                    <td>
                      <div className="chips">
                        {r.reasons.map((x) => (
                          <span className={`tag rtag ${REASON_CLS[x] ?? ""}`} key={x}>
                            {x}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="nos">
                        {r.nos.map((n) => (
                          <span className="chip mono" key={n}>
                            {n}
                          </span>
                        ))}
                        <span className="hint">{r.nos.length}명</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="no2">
                    제척 내부위원이 없습니다. 연구 목록·인사기록 파일을 업로드하면 산출됩니다.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  제척사유 · <b>연구책임자</b>(참여과제 연구책임자·상급결재권자) / <b>소속부서장</b>(근무부서 부서장·상위부서장) / <b>동일학력</b>(학위별
                  학교·학과·지도교수 일치) / <b>지도교수</b>(지원자 지도교수가 내부직원). 아래 종류별 표의 2년 기준 해당 건만 집계합니다.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="panel">
        <header>
          <h2>참여과제 연구책임자</h2>
          <div className="hdtools">
            <span className="hint">시스템 추출 {internal.length}건</span>
            <UpBtn kind="inx" label="연구 목록 파일 업로드" fileName={uploads.inx?.file_name} busy={busy === "up:inx"} onPick={upload} />
            <a className="tpl-link" style={{ marginTop: 0 }} href="/templates/연구 목록 양식.xlsx" download="연구 목록 양식.xlsx">
              양식 내려받기
            </a>
            <XBtn href={exportUrl("inx")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("inx-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
        <UpWarn list={uploads.inx?.warnings} />
        <div className="guide" style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
          <span className="hint upfmt">
            업로드 형식 · <b>순번 / 과제명 / 연구책임자 / 연구시작일 / 연구종료일</b>. 업로드하면 과제명 매칭으로 내부 확인 항목이 자동으로 채워집니다.
          </span>
        </div>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th className="grp" colSpan={5}>
                  지원자 정보 (시스템 추출)
                </th>
                <th className="grp in" colSpan={5}>
                  내부 확인 항목 (연구 목록 파일)
                </th>
              </tr>
              <tr>
                <th style={{ width: 88 }}>수험번호</th>
                <th style={{ width: 80 }}>지원자 성명</th>
                <th style={{ minWidth: 220 }}>참여과제(실적)명</th>
                <th style={{ width: 100 }}>참여 시작일</th>
                <th style={{ width: 100 }}>참여 종료일</th>
                <th style={{ width: 88 }}>연구책임자</th>
                <th style={{ width: 100 }}>연구 시작일</th>
                <th style={{ width: 100 }}>연구 종료일</th>
                <th style={{ width: 104 }}>상급결재권자</th>
                <th style={{ width: 118 }}>2년 기준 여부</th>
              </tr>
            </thead>
            <tbody>
              {internal.map((f) => (
                <tr key={f.id} data-no={f.no} className={fcls(f.no)}>
                  <td className="mono">{f.no}</td>
                  <td className="nm">{f.name}</td>
                  <td>{f.project}</td>
                  <td className="mono">
                    <Dash v={f.from ?? (f.kind === "내부참여" ? f.dfrom : null)} />
                  </td>
                  <td className="mono">
                    <Dash v={f.to ?? (f.kind === "내부참여" ? f.dto : null)} />
                  </td>
                  <td className="nm">
                    <Dash v={f.pi} />
                  </td>
                  <td className="mono">
                    <Dash v={f.s} />
                  </td>
                  <td className="mono">
                    <Dash v={f.e} />
                  </td>
                  <td>
                    <Dash v={f.ap} />
                  </td>
                  <td>{f.flag ? <Y2 yes={f.flag === "yes"} /> : <span className="no2">연구 목록 업로드 후 자동 계산</span>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10}>
                  2년 기준 여부는 <b>연구 종료일</b>과 평가기준일을 비교해 자동 계산됩니다. 해당 시 연구책임자·상급결재권자를 평가에서 제척합니다.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="panel">
        <header>
          <h2>소속(상위)부서장</h2>
          <div className="hdtools">
            <span className="hint">
              {STEPI} 근무 이력 {work.length}건
            </span>
            <UpBtn kind="work" label="인사기록 파일 업로드" fileName={uploads.work?.file_name} busy={busy === "up:work"} onPick={upload} />
            <a className="tpl-link" style={{ marginTop: 0 }} href="/templates/인사기록 양식.xlsx" download="인사기록 양식.xlsx">
              양식 내려받기
            </a>
            <XBtn href={exportUrl("work")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("work-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
        <UpWarn list={uploads.work?.warnings} />
        <div className="guide" style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
          <span className="hint upfmt">
            업로드 형식 · <b>이름 / 직위명 / 소속부서명 / 근무시작일 / 근무종료일</b>. 업로드하면 부서명 매칭으로 부서장·상위부서장이 자동으로 채워집니다.
          </span>
        </div>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th className="grp" colSpan={5}>
                  근무 이력 (시스템 추출)
                </th>
                <th className="grp in" colSpan={3}>
                  확인 항목 (인사기록 파일)
                </th>
              </tr>
              <tr>
                <th style={{ width: 88 }}>수험번호</th>
                <th style={{ width: 80 }}>지원자 성명</th>
                <th>근무부서명</th>
                <th style={{ width: 100 }}>근무 시작일</th>
                <th style={{ width: 100 }}>근무 종료일</th>
                <th style={{ width: 130 }}>부서장</th>
                <th style={{ width: 130 }}>상위부서장</th>
                <th style={{ width: 118 }}>2년 이내 여부</th>
              </tr>
            </thead>
            <tbody>
              {work.map((w) => (
                <tr key={w.id} data-no={w.no} className={fcls(w.no)}>
                  <td className="mono">{w.no}</td>
                  <td className="nm">{w.name}</td>
                  <td>{w.dept}</td>
                  <td className="mono">
                    <Dash v={w.from} />
                  </td>
                  <td className="mono">
                    <Dash v={w.to} />
                  </td>
                  <td>
                    <Dash v={w.hd} />
                  </td>
                  <td>
                    <Dash v={w.up} />
                  </td>
                  <td>
                    <Y2 yes={w.within2y} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8}>
                  2년 이내 여부는 근무 종료일과 평가기준일(<span className="mono">{derived.end}</span>)을 비교해 자동 계산됩니다. 해당 시 부서장·상위부서장을
                  평가에서 제척합니다.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="panel">
        <header>
          <h2>학위별 동일학력</h2>
          <div className="hdtools">
            <span className="hint">3개 항목 모두 일치 {degree.length}건</span>
            <XBtn href={exportUrl("degree")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("degree-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
        <div className="guide" style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
          <span className="hint upfmt">
            제척 기준 정보 화면의 <b>내부위원 학력정보</b>와 대조합니다. 학위별 학교·전공·지도교수가 모두 일치하는 경우만 산출됩니다.
          </span>
        </div>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th className="grp" colSpan={6}>
                  지원자
                </th>
                <th className="grp in" colSpan={3}>
                  일치 내부직원
                </th>
                <th style={{ width: 150 }}>판정</th>
              </tr>
              <tr>
                <th style={{ width: 88 }}>수험번호</th>
                <th style={{ width: 76 }}>성명</th>
                <th style={{ width: 60 }}>학위</th>
                <th style={{ minWidth: 140 }}>학교</th>
                <th style={{ minWidth: 130 }}>학과(전공)</th>
                <th style={{ width: 84 }}>지도교수</th>
                <th style={{ width: 84 }}>성명</th>
                <th style={{ minWidth: 150 }}>소속부서</th>
                <th style={{ width: 60 }}>학위</th>
                <th style={{ width: 150 }}>일치 항목</th>
              </tr>
            </thead>
            <tbody>
              {degree.map((d) => (
                <tr key={d.id} data-no={d.no} className={fcls(d.no)}>
                  <td className="mono">{d.no}</td>
                  <td className="nm">{d.name}</td>
                  <td>{d.deg}</td>
                  <td>{d.school}</td>
                  <td>{d.major}</td>
                  <td>{d.prof}</td>
                  <td className="nm">{d.staff}</td>
                  <td>{d.staffDept}</td>
                  <td>{d.staffDeg}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <span className="yes2">학교·학과·지도교수 일치</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={10}>
                  같은 학위 구분 안에서 학교·학과(전공)·지도교수 3개가 모두 일치하는 경우만 추출합니다. 검토를 실행할 때의 제척 기준 정보와 대조한 결과이며
                  위 전체 목록에 반영됩니다.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="panel">
        <header>
          <h2>지도교수</h2>
          <div className="hdtools">
            <span className="hint">지원자 지도교수가 내부직원 {advisor.length}건</span>
          </div>
        </header>
        <div className="tblwrap">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 88 }}>수험번호</th>
                <th style={{ width: 76 }}>성명</th>
                <th style={{ width: 120 }}>지원자 지도교수</th>
                <th style={{ width: 120 }}>일치 내부직원</th>
                <th>일치 항목</th>
              </tr>
            </thead>
            <tbody>
              {advisor.length ? (
                advisor.map((a) => (
                  <tr key={a.id} data-no={a.no} className={fcls(a.no)}>
                    <td className="mono">{a.no}</td>
                    <td className="nm">{a.name}</td>
                    <td>{a.advisor}</td>
                    <td className="nm">{a.advisor}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="yes2">지도교수 성명이 제척 기준 정보의 내부위원과 같음</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="no2">
                    지도교수가 내부직원인 지원자가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  지원정보의 지도교수 성명을 제척 기준 정보의 내부위원 학력정보 성명과 비교합니다. 동명이인일 수 있으니 소속을 확인해 주세요.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
