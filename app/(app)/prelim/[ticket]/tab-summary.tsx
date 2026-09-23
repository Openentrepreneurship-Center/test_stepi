"use client";

import Link from "next/link";
import type { Ctx, TabKey } from "./result-view";

const CELL_TITLE: Record<string, string> = {
  essay: "자기소개서 위배",
  attach: "첨부 실적 내 위배",
  inx: "제척(내부)",
  exx: "제척(외부)",
};

export default function SummaryTab({ ctx }: { ctx: Ctx }) {
  const { derived, stage, go } = ctx;
  const s = derived.summary_fixed;
  const { kpi, progress } = s;
  const C = 2 * Math.PI * 34;
  const ratio = progress.total ? progress.done / progress.total : 0;
  const max = s.org_bars.length ? s.org_bars[0][1] : 1;
  const exCom = derived.exx[stage].restricted_committee;
  const inStaff = s.internal_staff;
  const restMissing = kpi.missing.count - kpi.missing.rows.length;

  const cell = (n: number, cls: string, no: string, tab: Exclude<TabKey, "person" | "summary">) =>
    n ? (
      <span
        className={`cell ${cls}`}
        role="button"
        tabIndex={0}
        title={`${CELL_TITLE[tab]} 화면에서 보기`}
        onClick={(e) => {
          e.stopPropagation();
          go(tab, { focus: no });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.stopPropagation();
            go(tab, { focus: no });
          }
        }}
      >
        {n}
      </span>
    ) : (
      <span className="cell none" aria-label="없음" />
    );

  return (
    <>
      <section className="band">
        <div>
          <div className="big">
            확인이 필요한 지원자{" "}
            <button
              type="button"
              title="사전스크리닝 검토 해당 지원자로 이동"
              onClick={() => document.getElementById("matrix")?.scrollIntoView({ block: "start", behavior: "smooth" })}
            >
              {s.people_matrix.length}명
            </button>
          </div>
          <p>
            자기소개서 위배 {kpi.essay_total}건 · 첨부 실적 위배 후보 {kpi.attach_total}건 · 제척(내부) {kpi.internal_total}건 ·
            제척(외부) {kpi.external_total}건
          </p>
        </div>
        <div className="pring">
          <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
            <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="8" />
            <circle cx="42" cy="42" r="34" fill="none" stroke="#ed911a" strokeWidth="8" strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} />
          </svg>
          <div className="t">
            판정 완료
            <b>
              {progress.done} / {progress.total}건
            </b>
          </div>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi blind">
          <div className="k-top">
            <span className="ico">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1.5 9S4.2 4 9 4s7.5 5 7.5 5-2.7 5-7.5 5S1.5 9 1.5 9Z" />
                <path d="M3 15 15 3" />
              </svg>
            </span>
            자기소개서 위배
          </div>
          <div className="num">
            {kpi.essay_total}
            <small>건 · 지원자 {kpi.essay_people}명</small>
          </div>
          <div className="chips">
            {kpi.essay_by_type
              .filter(([, n]) => n)
              .map(([t, n]) => (
                <span className="chip" key={t}>
                  {t} {n}
                </span>
              ))}
          </div>
          <button className="cta" type="button" onClick={() => go("essay")}>
            위배 구절 →
          </button>
        </div>

        <div className="kpi att">
          <div className="k-top">
            <span className="ico">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12.5 5 6 11.5a2.1 2.1 0 0 0 3 3l6-6a4.2 4.2 0 0 0-6-6L3 8.5" />
              </svg>
            </span>
            첨부 실적 내 위배
          </div>
          <div className="num">
            {s.attach_confirmed}
            <small>건 확정 · 후보 {kpi.attach_total}건</small>
          </div>
          <div className="chips">
            판정 완료{" "}
            <span className="chip">
              {kpi.attach_done} / {kpi.attach_total}
            </span>{" "}
            미판정 <span className="chip">{kpi.attach_total - kpi.attach_done}</span>
          </div>
          <button className="cta" type="button" onClick={() => go("attach")}>
            실적 파일 →
          </button>
        </div>

        <div className="kpi excl">
          <div className="k-top">
            <span className="ico">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="9" r="6.5" />
                <path d="m4.5 13.5 9-9" />
              </svg>
            </span>
            제척
          </div>
          <div className="num">
            {kpi.internal_total + kpi.external_total}
            <small>건</small>
          </div>
          <div className="split" aria-hidden="true">
            <i style={{ flex: kpi.external_total, background: "var(--red)" }} />
            <i style={{ flex: kpi.internal_total, border: "2px solid var(--red)" }} />
          </div>
          <div className="legend">
            <span>
              <i style={{ background: "var(--red)" }} />
              제척(외부) {kpi.external_total}건
            </span>
            <span>
              <i style={{ border: "2px solid var(--red)" }} />
              제척(내부) {kpi.internal_total}건
            </span>
          </div>
          <button className="cta" type="button" onClick={() => go("inx")}>
            제척 내역 →
          </button>
        </div>

        <div className="kpi miss">
          <div className="k-top">
            <span className="ico">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 2 16.5 15.5h-15L9 2Z" />
                <path d="M9 7v4M9 13v.4" />
              </svg>
            </span>
            수험번호 누락
          </div>
          <div className="num">
            {kpi.missing.count}
            <small>줄</small>
          </div>
          <div className="chips">
            {kpi.missing.rows.map((r) => (
              <span className="chip" key={r}>
                {r}행
              </span>
            ))}
            {restMissing > 0 && <span>외 {restMissing}줄</span>}
          </div>
          <Link className="cta" href="/prelim/new" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            파일 재업로드 →
          </Link>
        </div>
      </section>

      <section className="sum-cols">
        <div className="panel">
          <header id="matrix">
            <h2>사전스크리닝 검토 해당 지원자</h2>
            <span className="hint">지원자를 누르면 개인별 화면, 숫자를 누르면 해당 검토 화면으로 이동합니다</span>
          </header>
          <div className="tblwrap">
            <table className="matrix">
              <thead>
                <tr>
                  <th>지원자</th>
                  <th>
                    자기소개서
                    <br />
                    위배
                  </th>
                  <th>
                    첨부 실적
                    <br />
                    위배
                  </th>
                  <th>
                    제척
                    <br />
                    (내부)
                  </th>
                  <th>
                    제척
                    <br />
                    (외부)
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {s.people_matrix.map((p) => (
                  <tr
                    key={p.no}
                    data-person={p.no}
                    tabIndex={0}
                    onClick={() => go("person", { person: p.no })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.target === e.currentTarget) go("person", { person: p.no });
                    }}
                  >
                    <td className="who">
                      <span className="mono">{p.no}</span>
                      <small>{p.name}</small>
                    </td>
                    <td>{cell(p.essay, "b", p.no, "essay")}</td>
                    <td>{cell(p.attach, "a", p.no, "attach")}</td>
                    <td>{cell(p.internal, "s", p.no, "inx")}</td>
                    <td>{cell(p.external, "h", p.no, "exx")}</td>
                    <td className="go">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <header>
            <h2>제척 외부기관</h2>
            <span className="hint">지원자 수 · 최근 2년</span>
          </header>
          <div className="bars">
            {s.org_bars.map(([org, n]) => (
              <div className="bar-row" key={org}>
                <div className="l">
                  <span>{org}</span>
                  <b>{n}명</b>
                </div>
                <div className="track">
                  <div className="fill" style={{ width: `${(n / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <header style={{ borderTop: "1px solid var(--line)" }}>
            <h2>제척 외부위원</h2>
            <span className="hint">{exCom.length ? `${exCom.length}명 · ${stage}전형 기준` : "등록된 섭외 심사위원 없음"}</span>
          </header>
          {exCom.length ? (
            <div className="nolist">
              {exCom.map((c) => (
                <div className="row" key={`${c.name}|${c.org}`}>
                  <span className="nm" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {c.name}
                  </span>
                  <span className="nm">{c.org}</span>
                  <span className="pj">{c.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">제척 기준 정보 화면에서 섭외 심사위원을 등록하면 제척 외부위원이 표시됩니다.</div>
          )}
          <header style={{ borderTop: "1px solid var(--line)" }}>
            <h2>내부 제척위원</h2>
            <span className="hint">{inStaff.length ? `${inStaff.length}명` : "확인 자료 업로드 전"}</span>
          </header>
          {inStaff.length ? (
            <div className="nolist">
              {inStaff.map((r) => (
                <div className="row" key={r.name}>
                  <span className="nm" style={{ color: "var(--ink)", fontWeight: 600 }}>
                    {r.name}
                  </span>
                  <span className="nm">
                    {r.title} · {r.dept}
                  </span>
                  <span className="pj">{r.reasons.join("·")}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              제척(내부) 화면에서 연구 목록·인사기록·후보위원 학력 파일을 업로드하면 내부 제척위원이 표시됩니다.
            </div>
          )}
          <div className="note">
            제척 외부위원은 2년 이내 재직 지원자가 있는 기관 소속 섭외위원, 내부 제척위원은 참여과제 연구책임자·소속(상위)부서장·동일학력
            내부직원입니다.
          </div>
        </div>
      </section>
    </>
  );
}
