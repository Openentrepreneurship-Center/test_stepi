"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Plus, X } from "lucide-react";
import PageHeader from "@/components/page-header";
import { prelim, type PrelimRefKind, type PrelimRefRow } from "@/lib/api";
import "../prelim.css";

type Field = { key: string; label: string; type?: "date"; required?: boolean; max?: number; wide?: boolean };
type Section = { title?: string; fields: Field[] };

const STAFF_FORM: Section[] = [
  {
    fields: [
      { key: "name", label: "성명", required: true, max: 40 },
      { key: "grade", label: "직급", max: 40 },
      { key: "dept", label: "부서", wide: true },
    ],
  },
  ...(
    [
      ["학부", "ug", "대학"],
      ["석사", "ms", "대학"],
      ["박사", "phd", "대학원"],
    ] as const
  ).map(([title, p, school]) => ({
    title,
    fields: [
      { key: `${p}_school`, label: school },
      { key: `${p}_major`, label: "전공" },
      { key: `${p}_advisor`, label: "지도교수 (여럿이면 쉼표로)", wide: true },
    ],
  })),
  { fields: [{ key: "note", label: "비고", max: 255, wide: true }] },
];

const REVIEWER_FORM: Section[] = [
  {
    title: "채용",
    fields: [
      { key: "recruitment", label: "채용명 (예: 2025년 9차)", wide: true },
      { key: "job_group", label: "직군" },
      { key: "employment", label: "고용형태", max: 40 },
      { key: "stage", label: "전형 (서류·필기·면접)", max: 40 },
      { key: "held_on", label: "일자", type: "date" },
    ],
  },
  {
    title: "위원",
    fields: [
      { key: "name", label: "성명", required: true, max: 40 },
      { key: "title", label: "직급", max: 60 },
      { key: "org", label: "소속", wide: true },
      { key: "phone", label: "전화번호", max: 40 },
      { key: "mail", label: "메일" },
      { key: "note", label: "비고", max: 255, wide: true },
    ],
  },
];

const TABS: { kind: PrelimRefKind; label: string; unit: string; desc: string; add?: string }[] = [
  {
    kind: "staff",
    label: "내부위원 학력정보",
    unit: "명",
    add: "내부위원 추가",
    desc: "학교·전공·지도교수가 모두 같은 지원자를 동일학력 제척으로 표시하고, 지원자 지도교수가 내부위원인지 확인합니다.\n위원을 클릭하면 수정이 가능합니다.",
  },
  {
    kind: "reviewers",
    label: "섭외 심사위원 목록",
    unit: "명",
    add: "심사위원 추가",
    desc: "채용마다 모신 심사위원을 기록합니다. 검토를 실행하면 지원자의 지도교수가 이 목록에 있을 때 제척으로 표시하고, 제척(외부) 화면의 외부위원 목록표에도 이 목록을 씁니다. 채용 시기와 직군 구분은 아직 대조에 넣지 않습니다.",
  },
  {
    kind: "orgs",
    label: "연구기관 목록(외부 제척)",
    unit: "곳",
    desc: "지원자가 최근 2년 안에 재직했거나 졸업한 기관이면 외부 제척으로 표시합니다.",
  },
];

type Drawer = { kind: "staff" | "reviewers"; id: number | "new"; values: Record<string, string>; dirty: boolean };

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const matches = (r: PrelimRefRow, q: string) =>
  !q ||
  Object.entries(r).some(
    ([k, v]) => !["id", "created_at", "updated_at"].includes(k) && str(v).toLowerCase().includes(q),
  );

export default function ReferenceView() {
  const [tab, setTab] = useState<PrelimRefKind>("staff");
  const [rows, setRows] = useState<Partial<Record<PrelimRefKind, PrelimRefRow[]>>>({});
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);

  const spec = TABS.find((t) => t.kind === tab)!;

  const load = useCallback(async () => {
    try {
      const all = await Promise.all(TABS.map((t) => prelim.reference.list(t.kind)));
      setRows(Object.fromEntries(TABS.map((t, i) => [t.kind, all[i].items])));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 조회
    void load();
  }, [load]);

  useEffect(() => {
    if (savedId === null) return;
    const t = setTimeout(() => setSavedId(null), 3000);
    return () => clearTimeout(t);
  }, [savedId]);

  // 고치던 내용이 있으면 버릴지 묻는다
  const leaveDrawer = () =>
    !drawer?.dirty || window.confirm("저장하지 않은 수정 내용이 있습니다. 버리고 닫을까요?");

  const closeDrawer = () => {
    if (!leaveDrawer()) return;
    setDrawer(null);
    setDrawerError(null);
  };

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function switchTab(kind: PrelimRefKind) {
    if (kind === tab || !leaveDrawer()) return;
    setDrawer(null);
    setError(null);
    setQuery("");
    setGrade(null);
    setTab(kind);
  }

  function openDrawer(kind: "staff" | "reviewers", row: PrelimRefRow | null, preset?: Record<string, string>) {
    if (!leaveDrawer()) return;
    const form = kind === "staff" ? STAFF_FORM : REVIEWER_FORM;
    const values = Object.fromEntries(
      form.flatMap((s) => s.fields).map((f) => [f.key, row ? str(row[f.key]) : (preset?.[f.key] ?? "")]),
    );
    setDrawerError(null);
    setDrawer({ kind, id: row ? row.id : "new", values, dirty: false });
  }

  async function saveDrawer() {
    if (!drawer || saving) return;
    const form = drawer.kind === "staff" ? STAFF_FORM : REVIEWER_FORM;
    const missing = form.flatMap((s) => s.fields).find((f) => f.required && !drawer.values[f.key]?.trim());
    if (missing) {
      setDrawerError(`${missing.label}은(는) 비워 둘 수 없습니다.`);
      return;
    }
    setSaving(true);
    setDrawerError(null);
    try {
      const body = Object.fromEntries(
        Object.entries(drawer.values).map(([k, v]) => [k, v.trim() || null]),
      );
      const saved =
        drawer.id === "new"
          ? await prelim.reference.create(drawer.kind, body)
          : await prelim.reference.update(drawer.kind, drawer.id, body);
      // 서버 정렬 자리에 보이도록 목록을 다시 받는다
      const items = (await prelim.reference.list(drawer.kind)).items;
      setRows((prev) => ({ ...prev, [drawer.kind]: items }));
      setDrawer(null);
      setSavedId(saved.id);
    } catch (e) {
      setDrawerError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(kind: PrelimRefKind, row: PrelimRefRow) {
    const who = str(row.name) || "이 항목";
    if (!window.confirm(`${who}을(를) 삭제할까요? 삭제한 뒤에는 되돌릴 수 없습니다.`)) return false;
    setError(null);
    try {
      await prelim.reference.remove(kind, row.id);
      setRows((prev) => ({ ...prev, [kind]: (prev[kind] ?? []).filter((r) => r.id !== row.id) }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
      return false;
    }
  }

  const list = rows[tab];
  const q = query.trim().toLowerCase();

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        eyebrow="사전스크리닝 검토"
        icon={Database}
        title="제척 기준 정보"
        description="제척 검토에 쓰는 내부위원·기관·심사위원 정보입니다. 여기서 고친 내용은 다음에 만드는 검토부터 반영됩니다."
        wideDescription
        aside={
          <div className="prelim">
            <a className="btn sm quiet" href={prelim.reference.exportUrl()} download>
              엑셀 내려받기
            </a>
          </div>
        }
      />
      <div className="prelim mt-6 ref">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.kind}
              type="button"
              role="tab"
              aria-selected={t.kind === tab}
              onClick={() => switchTab(t.kind)}
            >
              {t.label}
              <span className="badge">
                {rows[t.kind] ? `${rows[t.kind]!.length}${t.unit}` : "-"}
              </span>
            </button>
          ))}
        </div>

        <p className="ref-desc">{spec.desc}</p>
        <div className="ref-bar">
          {tab === "staff" && list ? (
            <GradeChips rows={list} grade={grade} onGrade={setGrade} />
          ) : (
            <span />
          )}
          <div className="ref-actions">
            <input
              className="ref-search"
              type="search"
              placeholder="이름·학교·기관 검색"
              aria-label={`${spec.label} 검색`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {spec.add && (
              <button
                type="button"
                className="btn sm primary"
                onClick={() => openDrawer(tab as "staff" | "reviewers", null)}
              >
                <Plus size={16} aria-hidden="true" /> {spec.add}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="ref-error">
            {error}
          </p>
        )}

        {failed ? (
          <div className="empty">제척 기준 정보를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</div>
        ) : !list ? (
          <div className="empty">불러오는 중입니다.</div>
        ) : tab === "staff" ? (
          <StaffList
            rows={list}
            query={q}
            grade={grade}
            savedId={savedId}
            openId={drawer?.kind === "staff" ? drawer.id : null}
            onOpen={(r) => openDrawer("staff", r)}
          />
        ) : tab === "orgs" ? (
          <OrgLists
            rows={list}
            query={q}
            onRows={(next) => setRows((prev) => ({ ...prev, orgs: next }))}
            onError={setError}
          />
        ) : (
          <ReviewerGroups
            rows={list}
            query={q}
            savedId={savedId}
            openId={drawer?.kind === "reviewers" ? drawer.id : null}
            onOpen={(r, preset) => openDrawer("reviewers", r, preset)}
          />
        )}

        {drawer && (
          <>
            <div className="ref-scrim" onClick={closeDrawer} aria-hidden="true" />
            <aside
              className="ref-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={drawer.kind === "staff" ? "내부위원 편집" : "심사위원 편집"}
            >
              <header>
                <h2>
                  {drawer.kind === "staff" ? "내부위원" : "심사위원"}{" "}
                  {drawer.id === "new" ? "추가" : "수정"}
                </h2>
                <button type="button" className="ref-close" onClick={closeDrawer} aria-label="닫기">
                  <X size={20} />
                </button>
              </header>
              <form
                className="ref-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveDrawer();
                }}
              >
                <div className="ref-form-body">
                  {(drawer.kind === "staff" ? STAFF_FORM : REVIEWER_FORM).map((s, i) => (
                    <fieldset key={i}>
                      {s.title && <legend>{s.title}</legend>}
                      <div className="ref-fields">
                        {s.fields.map((f) => (
                          <label key={f.key} className={f.wide ? "wide" : undefined}>
                            <span>
                              {f.label}
                              {f.required && <em> 필수</em>}
                            </span>
                            <input
                              className="input"
                              type={f.type === "date" ? "date" : "text"}
                              maxLength={f.max ?? 120}
                              value={drawer.values[f.key] ?? ""}
                              autoFocus={i === 0 && f === s.fields[0]}
                              onChange={(e) =>
                                setDrawer((d) =>
                                  d ? { ...d, dirty: true, values: { ...d.values, [f.key]: e.target.value } } : d,
                                )
                              }
                            />
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <footer>
                  {drawerError && (
                    <p role="alert" className="ref-error">
                      {drawerError}
                    </p>
                  )}
                  <div className="ref-form-btns">
                    {drawer.id !== "new" && (
                      <button
                        type="button"
                        className="btn sm link ref-del"
                        onClick={async () => {
                          const row = rows[drawer.kind]?.find((r) => r.id === drawer.id);
                          if (row && (await removeRow(drawer.kind, row))) setDrawer(null);
                        }}
                      >
                        삭제
                      </button>
                    )}
                    <button type="button" className="btn sm quiet" onClick={closeDrawer} disabled={saving}>
                      취소
                    </button>
                    <button type="submit" className="btn sm primary" disabled={saving}>
                      {saving ? "저장 중" : "저장"}
                    </button>
                  </div>
                </footer>
              </form>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}

/** 학위 한 칸: 학교(진하게) / 전공 / 지도교수 */
function Degree({ school, major, advisor }: { school: unknown; major: unknown; advisor: unknown }) {
  if (!school && !major) return <span className="ref-dim">없음</span>;
  return (
    <div className="deg">
      <b>{str(school)}</b>
      <span>{str(major)}</span>
      {advisor ? <small>지도교수 {str(advisor)}</small> : null}
    </div>
  );
}

/** 내부위원 직급으로 거르기 */
function GradeChips({
  rows,
  grade,
  onGrade,
}: {
  rows: PrelimRefRow[];
  grade: string | null;
  onGrade: (g: string | null) => void;
}) {
  const grades = Array.from(new Set(rows.map((r) => str(r.grade)).filter(Boolean)));
  return (
    <div className="ref-chips" role="group" aria-label="직급으로 거르기">
      {[null, ...grades].map((g) => (
        <button key={g ?? "all"} type="button" aria-pressed={grade === g} onClick={() => onGrade(g)}>
          {g ?? "전체"} <span>{g ? rows.filter((r) => str(r.grade) === g).length : rows.length}</span>
        </button>
      ))}
    </div>
  );
}

function StaffList({
  rows,
  query,
  grade,
  savedId,
  openId,
  onOpen,
}: {
  rows: PrelimRefRow[];
  query: string;
  grade: string | null;
  savedId: number | null;
  openId: number | "new" | null;
  onOpen: (r: PrelimRefRow) => void;
}) {
  const shown = rows.filter((r) => (!grade || str(r.grade) === grade) && matches(r, query));
  return (
    <>
      <div className="ref-list staff">
        <div className="ref-head" aria-hidden="true">
          <span>성명</span>
          <span>학부</span>
          <span>석사</span>
          <span>박사</span>
          <span />
        </div>
        {shown.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`ref-row${openId === r.id ? " open" : ""}`}
            onClick={() => onOpen(r)}
          >
            <div className="who">
              <b>{str(r.name)}</b>
              <span>
                {r.grade ? <em className="grade">{str(r.grade)}</em> : null}
                {r.dept ? str(r.dept) : null}
              </span>
              {r.note ? <small>{str(r.note)}</small> : null}
            </div>
            <Degree school={r.ug_school} major={r.ug_major} advisor={r.ug_advisor} />
            <Degree school={r.ms_school} major={r.ms_major} advisor={r.ms_advisor} />
            <Degree school={r.phd_school} major={r.phd_major} advisor={r.phd_advisor} />
            <span className="go">
              {savedId === r.id ? (
                <span className="ref-saved" role="status">
                  저장됨
                </span>
              ) : (
                "수정 ›"
              )}
            </span>
          </button>
        ))}
        {!shown.length && <div className="ref-none">{query || grade ? "조건에 맞는 내부위원이 없습니다." : "등록된 내부위원이 없습니다."}</div>}
      </div>
    </>
  );
}

function ReviewerGroups({
  rows,
  query,
  savedId,
  openId,
  onOpen,
}: {
  rows: PrelimRefRow[];
  query: string;
  savedId: number | null;
  openId: number | "new" | null;
  onOpen: (r: PrelimRefRow | null, preset?: Record<string, string>) => void;
}) {
  if (!rows.length)
    return (
      <div className="ref-emptycard">
        <b>아직 기록된 심사위원이 없습니다</b>
        <p>
          채용이 끝나면 그 채용에 모신 서류·필기·면접 위원을 기록해 두세요.
          <br />
          직전 채용과 동일 직군 채용의 위원은 다음 채용에서 다시 모실 수 없어, 이 목록이 기준이 됩니다.
        </p>
        <button type="button" className="btn sm primary" onClick={() => onOpen(null)}>
          <Plus size={16} aria-hidden="true" /> 첫 심사위원 기록하기
        </button>
      </div>
    );
  const shown = rows.filter((r) => matches(r, query));
  const groups = new Map<string, PrelimRefRow[]>();
  for (const r of shown) {
    const k = str(r.recruitment) || "채용명 없음";
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  if (!groups.size) return <div className="ref-none box">검색 결과가 없습니다.</div>;
  return (
    <div className="ref-groups">
      {[...groups.entries()].map(([name, group]) => {
        // 채용 안에서는 전형 순서대로(날짜 오름차순)
        const members = [...group].sort((a, b) => str(a.held_on).localeCompare(str(b.held_on)));
        const first = members[0];
        return (
          <section key={name} className="ref-group">
            <header>
              <div>
                <h3>{name}</h3>
                <span className="ref-tags">
                  {first.job_group ? <em>{str(first.job_group)}</em> : null}
                  {first.employment ? <em>{str(first.employment)}</em> : null}
                  <span>위원 {members.length}명</span>
                </span>
              </div>
              <button
                type="button"
                className="btn sm link"
                onClick={() =>
                  onOpen(null, {
                    recruitment: str(first.recruitment),
                    job_group: str(first.job_group),
                    employment: str(first.employment),
                  })
                }
              >
                <Plus size={15} aria-hidden="true" /> 이 채용에 위원 추가
              </button>
            </header>
            {members.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`ref-row rv${openId === r.id ? " open" : ""}`}
                onClick={() => onOpen(r)}
              >
                <span className="stage">
                  {str(r.stage) || "전형 미정"}
                  <small>{str(r.held_on)}</small>
                </span>
                <b>{str(r.name)}</b>
                <span>
                  {str(r.org)}
                  {r.title ? <small>{str(r.title)}</small> : null}
                </span>
                <span className="contact">
                  {str(r.phone)}
                  {r.mail ? <small>{str(r.mail)}</small> : null}
                </span>
                <span className="go">
                  {savedId === r.id ? (
                    <span className="ref-saved" role="status">
                      저장됨
                    </span>
                  ) : (
                    "수정 ›"
                  )}
                </span>
              </button>
            ))}
          </section>
        );
      })}
    </div>
  );
}

const ORG_KINDS = ["NRC", "NST"] as const;
type OrgKind = (typeof ORG_KINDS)[number];

/** 연구기관은 이름뿐인 목록이라 표 대신 계열별 목록 두 개로 보여 준다 */
function OrgLists({
  rows,
  query,
  onRows,
  onError,
}: {
  rows: PrelimRefRow[];
  query: string;
  onRows: (rows: PrelimRefRow[]) => void;
  onError: (msg: string | null) => void;
}) {
  const [adding, setAdding] = useState<Record<OrgKind, string>>({ NRC: "", NST: "" });
  const [edit, setEdit] = useState<{ id: number; name: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  useEffect(() => {
    if (savedId === null) return;
    const t = setTimeout(() => setSavedId(null), 3000);
    return () => clearTimeout(t);
  }, [savedId]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    onError(null);
    try {
      await fn();
    } catch (e) {
      onError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  const reload = async () => onRows((await prelim.reference.list("orgs")).items);

  const add = (kind: OrgKind) => {
    const name = adding[kind].trim();
    if (!name) return onError("기관명을 입력해 주세요.");
    void run(async () => {
      const saved = await prelim.reference.create("orgs", { kind, name });
      await reload();
      setAdding((a) => ({ ...a, [kind]: "" }));
      setSavedId(saved.id);
    });
  };

  const saveEdit = () => {
    if (!edit) return;
    if (!edit.name.trim()) return onError("기관명은(는) 비워 둘 수 없습니다.");
    void run(async () => {
      const saved = await prelim.reference.update("orgs", edit.id, {
        name: edit.name.trim(),
        note: edit.note.trim() || null,
      });
      await reload();
      setEdit(null);
      setSavedId(saved.id);
    });
  };

  const remove = (row: PrelimRefRow) => {
    if (!window.confirm(`${str(row.name)}을(를) 연구기관 목록에서 삭제할까요?`)) return;
    void run(async () => {
      await prelim.reference.remove("orgs", row.id);
      await reload();
    });
  };

  const editKeys = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEdit(null);
  };

  return (
    <div className="org-cols">
      {ORG_KINDS.map((kind) => {
        const all = rows.filter((r) => r.kind === kind);
        const shown = all.filter((r) => matches(r, query));
        return (
          <section key={kind} className="org-col" aria-label={`${kind} 계열`}>
            <header>
              <h3>{kind} 계열</h3>
              <span>{all.length}곳</span>
            </header>
            <ol className="org-list">
              {shown.map((r, i) =>
                edit?.id === r.id ? (
                  <li key={r.id} className="editing">
                    <input
                      aria-label="기관명"
                      value={edit.name}
                      maxLength={120}
                      autoFocus
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      onKeyDown={editKeys}
                    />
                    <input
                      aria-label="비고"
                      placeholder="비고"
                      value={edit.note}
                      maxLength={255}
                      onChange={(e) => setEdit({ ...edit, note: e.target.value })}
                      onKeyDown={editKeys}
                    />
                    <button type="button" className="jbtn save" onClick={saveEdit} disabled={busy}>
                      저장
                    </button>
                    <button type="button" className="jbtn" onClick={() => setEdit(null)} disabled={busy}>
                      취소
                    </button>
                  </li>
                ) : (
                  <li key={r.id}>
                    <span className="org-no">{i + 1}</span>
                    <span className="org-name">
                      {str(r.name)}
                      {r.note && <small>{str(r.note)}</small>}
                    </span>
                    {savedId === r.id && (
                      <span className="ref-saved" role="status">
                        저장됨
                      </span>
                    )}
                    <span className="org-acts">
                      <button
                        type="button"
                        className="jbtn"
                        onClick={() => setEdit({ id: r.id, name: str(r.name), note: str(r.note) })}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="jbtn"
                        aria-label={`${str(r.name)} 삭제`}
                        onClick={() => remove(r)}
                        disabled={busy}
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ),
              )}
              {!shown.length && (
                <li className="org-none">{query ? "검색 결과가 없습니다." : "등록된 기관이 없습니다."}</li>
              )}
            </ol>
            <div className="org-add">
              <input
                aria-label={`${kind} 계열 기관 추가`}
                placeholder={`${kind} 기관명 입력 후 Enter`}
                value={adding[kind]}
                maxLength={120}
                onChange={(e) => setAdding((a) => ({ ...a, [kind]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && add(kind)}
              />
              <button type="button" className="btn sm tertiary" onClick={() => add(kind)} disabled={busy}>
                추가
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
