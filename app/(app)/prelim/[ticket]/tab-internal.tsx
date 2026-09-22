"use client";

import { Dash, UpBtn, XBtn, Y2 } from "./parts";
import type { Ctx } from "./result-view";

const REASON_CLS: Record<string, string> = { 연구책임자: "r-pi", 소속부서장: "r-hd", 동일학력: "r-dg" };
const STEPI = "과학기술정책연구원";

export default function InternalTab({ ctx }: { ctx: Ctx }) {
  const { derived, uploads, busy, upload, focusNo, exportUrl } = ctx;
  const { staff_rows: rows, pending_count: pendingCnt, internal, work, degree } = derived.inx;
  const fcls = (no: string) => (focusNo === no ? "focus" : undefined);

  return (
    <>
      <div className="guide">
        <b>제척 기준</b>
        <span className="hint lines">
          평가기준일 <span className="mono">{derived.end}</span> 기준 최근 2년(<span className="mono">{derived.win}</span> 이후) 종료된 내부 과제의
          연구책임자, 근무부서의 소속(상위)부서장, 학위별 학교·학과·지도교수가 모두 일치하는 동일학력 내부직원을 평가에서 제척합니다.
          <br />
          확인 항목은 아래 각 표의 파일 업로드로 채워집니다.
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
                    제척 내부위원이 없습니다. 연구 목록·인사기록·후보위원 학력 파일을 업로드하면 산출됩니다.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>
                  제척사유 · <b>연구책임자</b>(참여과제 연구책임자·상급결재권자) / <b>소속부서장</b>(근무부서 부서장·상위부서장) / <b>동일학력</b>(학위별
                  학교·학과·지도교수 일치). 아래 종류별 표의 2년 기준 해당 건만 집계합니다.
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
            <XBtn href={exportUrl("inx")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("inx-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
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
            <XBtn href={exportUrl("work")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("work-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
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
            <UpBtn kind="degree" label="후보위원 학력 정보 업로드" fileName={uploads.degree?.file_name} busy={busy === "up:degree"} onPick={upload} />
            <XBtn href={exportUrl("degree")} title="전체 엑셀 다운로드" />
            <XBtn href={exportUrl("degree-v")} cap="제척" title="제척위원 엑셀 다운로드" />
          </div>
        </header>
        <div className="guide" style={{ background: "#fff", borderBottom: "1px solid var(--line)" }}>
          <span className="hint upfmt">
            업로드 형식 · <b>이름 / 학사(학교·전공·지도교수) / 석사(학교·전공·지도교수) / 박사(학교·전공·지도교수)</b>. 업로드하면 학위별 완전 일치자만 산출됩니다.
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
                  같은 학위 구분 안에서 학교·학과(전공)·지도교수 3개가 모두 일치하는 경우만 추출합니다. 후보위원 학력 정보 파일을 업로드하면 실제 일치자로
                  교체되어 위 전체 목록에 반영됩니다.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
