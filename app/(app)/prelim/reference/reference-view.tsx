"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Download, Plus, X } from "lucide-react";
import PageHeader from "@/components/page-header";
import { Bar } from "@/components/page-skeleton";
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

const JOBS = ["연구직", "전문연구직", "행정직"];
const STAGES = ["서류", "필기", "면접"];
const FOLD = 6;

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
  const [jobs, setJobs] = useState<string[]>([]);

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
    setJobs([]);
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
              <Download size={16} aria-hidden="true" /> 엑셀 내려받기
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
          <div className="ref-filters">
            <input
              className="ref-search"
              type="search"
              placeholder="이름·학교·기관 검색"
              aria-label={`${spec.label} 검색`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {tab === "staff" && list && <GradeChips rows={list} grade={grade} onGrade={setGrade} />}
            {tab === "reviewers" && !!list?.length && (
              <div className="ref-jobs" role="group" aria-label="직군으로 공고 필터">
                <span>직군</span>
                {JOBS.map((j) => (
                  <button
                    key={j}
                    type="button"
                    aria-pressed={jobs.includes(j)}
                    onClick={() => setJobs((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j]))}
                  >
                    <i aria-hidden="true" />
                    {j}
                  </button>
                ))}
              </div>
            )}
          </div>
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

        {error && (
          <p role="alert" className="ref-error">
            {error}
          </p>
        )}

        {failed ? (
          <div className="empty">제척 기준 정보를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</div>
        ) : !list ? (
          <div role="status" aria-live="polite">
            <span className="sr-only">불러오는 중입니다</span>
            <div className="animate-pulse" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-6 py-4 border-b border-[var(--line)]">
                  <Bar className="h-4 w-20" />
                  <Bar className="h-4 w-14" />
                  <Bar className="h-4 flex-1 max-w-[520px]" />
                </div>
              ))}
            </div>
          </div>
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
            jobs={jobs}
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

const splitJobs = (v: unknown) =>
  str(v)
    .split(/[\/,·]/)
    .map((j) => j.trim())
    .filter(Boolean);

/** 채용 머리에 적는 전형별 진행 날짜. 서류 → 필기 → 면접 순서 */
function stageDates(rows: PrelimRefRow[]) {
  const by = new Map<string, string[]>();
  for (const r of rows) {
    const st = str(r.stage);
    const d = str(r.held_on);
    if (!st || !d) continue;
    const cur = by.get(st) ?? [];
    if (!cur.includes(d)) by.set(st, [...cur, d]);
  }
  const order = [...STAGES.filter((st) => by.has(st)), ...[...by.keys()].filter((st) => !STAGES.includes(st))];
  return order.map((st) => `${st} ${by.get(st)!.join(", ")}`).join(" · ");
}

function ReviewerGroups({
  rows,
  query,
  jobs,
  savedId,
  openId,
  onOpen,
}: {
  rows: PrelimRefRow[];
  query: string;
  jobs: string[];
  savedId: number | null;
  openId: number | "new" | null;
  onOpen: (r: PrelimRefRow | null, preset?: Record<string, string>) => void;
}) {
  const [open, setOpen] = useState<string[]>([]);
  const groupOf = (r: PrelimRefRow) => str(r.recruitment) || "채용명 없음";
  // 방금 저장한 위원이 접힌 자리에 들어가면 안 보이므로 그 채용은 펼쳐 둔다
  const saved = rows.find((r) => r.id === savedId);
  if (saved && !open.includes(groupOf(saved))) setOpen([...open, groupOf(saved)]);
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
  const groups = new Map<string, PrelimRefRow[]>();
  for (const r of rows) {
    const k = groupOf(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const cards = [...groups.entries()].flatMap(([name, group]) => {
    // 채용 안에서는 전형 순서대로(날짜 오름차순)
    const all = [...group].sort((a, b) => str(a.held_on).localeCompare(str(b.held_on)));
    const jobList = [...new Set(all.flatMap((r) => splitJobs(r.job_group)))];
    if (jobs.length && !jobList.some((j) => jobs.includes(j))) return [];
    const members = all.filter((r) => matches(r, query));
    if (query && !members.length) return [];
    const pick = (key: string) => str(all.find((r) => r[key])?.[key]);
    return [{ name, all, jobList, members, jobGroup: pick("job_group"), employment: pick("employment") }];
  });
  if (!cards.length) return <div className="ref-none box">검색 결과가 없습니다.</div>;
  return (
    <div className="ref-groups">
      {cards.map(({ name, all, jobList, members, jobGroup, employment }) => {
        const dates = stageDates(all);
        const folded = !open.includes(name) && members.length > FOLD;
        return (
          <section key={name} className="ref-group">
            <header>
              <h3>
                {name}
                {jobList.map((j) => (
                  <em key={j} className="job">
                    {j}
                  </em>
                ))}
                {employment ? <em className="emp">{employment}</em> : null}
                {dates ? <span>{dates}</span> : null}
              </h3>
              <button
                type="button"
                className="btn sm link"
                onClick={() =>
                  onOpen(null, {
                    recruitment: str(all[0].recruitment),
                    job_group: jobGroup,
                    employment,
                  })
                }
              >
                <Plus size={15} aria-hidden="true" /> 이 채용에 위원 추가
              </button>
            </header>
            {(folded ? members.slice(0, FOLD) : members).map((r) => (
              <button
                key={r.id}
                type="button"
                className={`ref-row rv${openId === r.id ? " open" : ""}`}
                onClick={() => onOpen(r)}
              >
                <span className="stage">{str(r.stage) || "전형 미정"}</span>
                <span className="name">
                  <b>{str(r.name)}</b>
                  {r.org || r.title ? <small>{[r.org, r.title].filter(Boolean).map(str).join(" · ")}</small> : null}
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
            {folded && (
              <div className="ref-more">
                <button
                  type="button"
                  onClick={(e) => {
                    // 버튼이 사라지므로 새로 보이는 첫 줄로 포커스를 옮긴다
                    const card = e.currentTarget.closest("section");
                    setOpen((o) => [...o, name]);
                    requestAnimationFrame(() => card?.querySelectorAll<HTMLElement>(".ref-row")[FOLD]?.focus());
                  }}
                >
                  전체 {members.length}명 보기 →
                </button>
              </div>
            )}
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
