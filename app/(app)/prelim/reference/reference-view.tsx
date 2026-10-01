"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, Database, Download, Plus, Upload, X } from "lucide-react";
import PageHeader from "@/components/page-header";
import { Bar } from "@/components/page-skeleton";
import {
  prelim,
  type PrelimRefImportApplied,
  type PrelimRefImportPreview,
  type PrelimRefKind,
  type PrelimRefRow,
} from "@/lib/api";
import "../prelim.css";

/** 엑셀 올리기 버튼을 보일지. 문제가 생기면 false 로 끈다(내려받기는 그대로) */
const IMPORT_ENABLED = true;

type Field = {
  key: string;
  label: string;
  type?: "date" | "choice";
  options?: string[];
  required?: boolean;
  max?: number;
  wide?: boolean;
};
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
      { key: "origin", label: "내부/외부", type: "choice", options: ["내부", "외부"] },
      { key: "org", label: "소속", wide: true },
      { key: "title", label: "직급", max: 60 },
      { key: "phone", label: "전화번호", max: 40 },
      { key: "mail", label: "메일", wide: true },
      { key: "note", label: "비고", max: 255, wide: true },
    ],
  },
];

const ORG_FORM: Section[] = [
  {
    fields: [
      { key: "kind", label: "계열", type: "choice", options: ["NRC", "NST"], required: true },
      { key: "name", label: "기관명", required: true, max: 120, wide: true },
      { key: "note", label: "비고", max: 255, wide: true },
    ],
  },
];

const FORMS: Record<PrelimRefKind, Section[]> = { staff: STAFF_FORM, reviewers: REVIEWER_FORM, orgs: ORG_FORM };
const NOUN: Record<PrelimRefKind, string> = { staff: "내부위원", reviewers: "심사위원", orgs: "연구기관" };

const TABS: { kind: PrelimRefKind; label: string; unit: string; desc: string; add: string }[] = [
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
    add: "연구기관 추가",
    desc: "지원자가 최근 2년 안에 재직했거나 졸업한 기관이면 외부 제척으로 표시합니다.",
  },
];

type Drawer = { kind: PrelimRefKind; id: number | "new"; values: Record<string, string>; dirty: boolean };

const JOBS = ["연구직", "전문연구직", "행정직"];
const STAGES = ["서류", "필기", "면접"];
const ORG_KINDS = ["NRC", "NST"];
const FOLD = 6;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const matches = (r: PrelimRefRow, q: string) =>
  !q ||
  Object.entries(r).some(
    ([k, v]) => !["id", "created_at", "updated_at"].includes(k) && str(v).toLowerCase().includes(q),
  );
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const splitJobs = (v: unknown) =>
  str(v)
    .split(/[\/,·]/)
    .map((j) => j.trim())
    .filter(Boolean);

const recruitmentOf = (r: PrelimRefRow) => str(r.recruitment) || "채용명 없음";

/** 행정직이 없는 채용의 필기 위원은 보이지 않는다(D9). 채용명으로 묶고 직군을 합쳐 판단.
 * 엑셀 내려받기도 같은 규칙(prelim_reference.py hidden_written_ids) */
function hiddenWritten(rows: PrelimRefRow[]) {
  const groups = new Map<string, PrelimRefRow[]>();
  for (const r of rows) groups.set(recruitmentOf(r), [...(groups.get(recruitmentOf(r)) ?? []), r]);
  const out = new Set<number>();
  for (const group of groups.values()) {
    if (group.flatMap((r) => splitJobs(r.job_group)).includes("행정직")) continue;
    for (const r of group) if (str(r.stage) === "필기") out.add(r.id);
  }
  return out;
}

const tabCount = (kind: PrelimRefKind, rows: PrelimRefRow[]) =>
  kind === "reviewers" ? rows.length - hiddenWritten(rows).size : rows.length;

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
  const [chips, setChips] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<PrelimRefImportPreview | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setInfo(null);
    setSavedId(null);
    setQuery("");
    setChips([]);
    setTab(kind);
  }

  function openDrawer(kind: PrelimRefKind, row: PrelimRefRow | null, preset?: Record<string, string>) {
    if (!leaveDrawer()) return;
    const values = Object.fromEntries(
      FORMS[kind].flatMap((s) => s.fields).map((f) => [f.key, row ? str(row[f.key]) : (preset?.[f.key] ?? "")]),
    );
    setDrawerError(null);
    setInfo(null);
    setDrawer({ kind, id: row ? row.id : "new", values, dirty: false });
  }

  async function saveDrawer() {
    if (!drawer || saving) return;
    const missing = FORMS[drawer.kind].flatMap((s) => s.fields).find((f) => f.required && !drawer.values[f.key]?.trim());
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
      if (drawer.kind === "reviewers" && hiddenWritten(items).has(saved.id))
        setInfo("행정직이 없는 채용의 필기 위원이라 목록에는 보이지 않습니다. 제척 검토에는 쓰입니다.");
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

  async function readFile(file: File) {
    if (!leaveDrawer()) return;
    setDrawer(null);
    setError(null);
    setReading(true);
    try {
      setPreview(await prelim.reference.importPreview(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "엑셀을 읽지 못했습니다.");
    } finally {
      setReading(false);
    }
  }

  function applied(res: PrelimRefImportApplied) {
    setPreview(null);
    setNote(`${res.file_name} 업로드 완료 · 추가 ${res.add} · 수정 ${res.update} · 삭제 ${res.delete}`);
    void load();
  }

  const list = rows[tab];
  const q = query.trim().toLowerCase();
  const chipBar =
    tab === "reviewers"
      ? { label: "직군", aria: "직군으로 공고 필터", options: JOBS }
      : tab === "orgs"
        ? { label: "계열", aria: "계열로 거르기", options: ORG_KINDS }
        : { label: "직급", aria: "직급으로 거르기", options: [...new Set((list ?? []).map((r) => str(r.grade)).filter(Boolean))] };
  // 올리기·수정으로 사라진 직급 칩이 선택된 채 남지 않게
  const activeChips = chips.filter((c) => chipBar.options.includes(c));

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        eyebrow="사전스크리닝 검토"
        icon={Database}
        title="제척 기준 정보"
        description="제척 검토에 쓰는 내부위원·기관·심사위원 정보입니다. 여기서 고친 내용은 다음에 만드는 검토부터 반영됩니다."
        wideDescription
        aside={
          <div className="prelim ref-head-actions">
            <div className="btns">
              {IMPORT_ENABLED && (
                <>
                  <button
                    type="button"
                    className="btn sm quiet"
                    onClick={() => fileRef.current?.click()}
                    disabled={reading}
                  >
                    <Upload size={16} aria-hidden="true" /> {reading ? "읽는 중" : "엑셀 업로드"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void readFile(f);
                    }}
                  />
                </>
              )}
              <a className="btn sm quiet" href={prelim.reference.exportUrl()} download>
                <Download size={16} aria-hidden="true" /> 엑셀 내려받기
              </a>
            </div>
            <a className="tpl-link" href={prelim.reference.exportUrl(true)} download>
              빈 양식 내려받기
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
              <span className="badge">{rows[t.kind] ? `${tabCount(t.kind, rows[t.kind]!)}${t.unit}` : "-"}</span>
            </button>
          ))}
        </div>

        <p className="ref-desc">{spec.desc}</p>
        {note && (
          <div className="upload-note" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            <span>{note}</span>
          </div>
        )}
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
            {!!list?.length && !!chipBar.options.length && (
              <div className="ref-jobs" role="group" aria-label={chipBar.aria}>
                <span>{chipBar.label}</span>
                {chipBar.options.map((j) => (
                  <button key={j} type="button" aria-pressed={chips.includes(j)} onClick={() => setChips((c) => toggle(c, j))}>
                    <i aria-hidden="true" />
                    {j}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn sm primary" onClick={() => openDrawer(tab, null)}>
            <Plus size={16} aria-hidden="true" /> {spec.add}
          </button>
        </div>

        {error && (
          <p role="alert" className="ref-error">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="hint">
            {info}
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
          <StaffGroups
            rows={list}
            query={q}
            grades={activeChips}
            savedId={savedId}
            openId={drawer?.kind === "staff" ? drawer.id : null}
            onOpen={(r) => openDrawer("staff", r)}
          />
        ) : tab === "orgs" ? (
          <OrgGroups
            rows={list}
            query={q}
            kinds={activeChips}
            savedId={savedId}
            openId={drawer?.kind === "orgs" ? drawer.id : null}
            onOpen={(r, preset) => openDrawer("orgs", r, preset)}
          />
        ) : (
          <ReviewerGroups
            rows={list}
            query={q}
            jobs={activeChips}
            savedId={savedId}
            openId={drawer?.kind === "reviewers" ? drawer.id : null}
            onOpen={(r, preset) => openDrawer("reviewers", r, preset)}
          />
        )}

        {drawer && (
          <>
            <div className="ref-scrim" onClick={closeDrawer} aria-hidden="true" />
            <aside className="ref-drawer" role="dialog" aria-modal="true" aria-label={`${NOUN[drawer.kind]} 편집`}>
              <header>
                <h2>
                  {NOUN[drawer.kind]} {drawer.id === "new" ? "추가" : "수정"}
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
                  {FORMS[drawer.kind].map((s, i) => (
                    <fieldset key={i}>
                      {s.title && <legend>{s.title}</legend>}
                      <div className="ref-fields">
                        {s.fields.map((f) => {
                          const value = drawer.values[f.key] ?? "";
                          const set = (v: string) =>
                            setDrawer((d) => (d ? { ...d, dirty: true, values: { ...d.values, [f.key]: v } } : d));
                          const title = (
                            <span>
                              {f.label}
                              {f.required && <em> 필수</em>}
                            </span>
                          );
                          if (f.type === "choice")
                            return (
                              <div key={f.key} className={`choice${f.wide ? " wide" : ""}`} role="group" aria-label={f.label}>
                                {title}
                                <div className="seg2">
                                  {f.options!.map((o) => (
                                    <button
                                      key={o}
                                      type="button"
                                      aria-pressed={value === o}
                                      onClick={() => set(value === o && !f.required ? "" : o)}
                                    >
                                      {o}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          return (
                            <label key={f.key} className={f.wide ? "wide" : undefined}>
                              {title}
                              <input
                                className="input"
                                type={f.type === "date" ? "date" : "text"}
                                maxLength={f.max ?? 120}
                                value={value}
                                autoFocus={f === FORMS[drawer.kind].flatMap((x) => x.fields).find((x) => x.type !== "choice")}
                                onChange={(e) => set(e.target.value)}
                              />
                            </label>
                          );
                        })}
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

        {preview && <ImportDialog preview={preview} onClose={() => setPreview(null)} onApplied={applied} />}
      </div>
    </div>
  );
}

/** 묶음 한 장: 머리 + 줄들. FOLD 줄 넘으면 "전체 N명 보기" */
function RefGroup({
  head,
  action,
  items,
  unit,
  expanded,
  onExpand,
}: {
  head: ReactNode;
  action?: ReactNode;
  items: ReactNode[];
  unit: string;
  expanded: boolean;
  onExpand: () => void;
}) {
  const folded = !expanded && items.length > FOLD;
  return (
    <section className="ref-group">
      <header>
        <h3>{head}</h3>
        {action}
      </header>
      {folded ? items.slice(0, FOLD) : items}
      {folded && (
        <div className="ref-more">
          <button
            type="button"
            onClick={(e) => {
              // 버튼이 사라지므로 새로 보이는 첫 줄로 포커스를 옮긴다
              const card = e.currentTarget.closest("section");
              onExpand();
              requestAnimationFrame(() => card?.querySelectorAll<HTMLElement>(".ref-row")[FOLD]?.focus());
            }}
          >
            전체 {items.length}
            {unit} 보기 →
          </button>
        </div>
      )}
    </section>
  );
}

/** 줄 한 개: 앞 칸(전형·직급 등 태그) + 이름 + 부가 정보 */
function RefRow({
  row,
  lead,
  sub,
  savedId,
  openId,
  onOpen,
}: {
  row: PrelimRefRow;
  lead?: ReactNode;
  sub?: ReactNode;
  savedId: number | null;
  openId: number | "new" | null;
  onOpen: (r: PrelimRefRow) => void;
}) {
  return (
    <button
      type="button"
      className={`ref-row rv${lead ? "" : " nolead"}${openId === row.id ? " open" : ""}`}
      onClick={() => onOpen(row)}
    >
      {lead ? <span className="stagecell">{lead}</span> : null}
      <span className="name">
        <b>{str(row.name)}</b>
        {sub ? <small>{sub}</small> : null}
      </span>
      <span className="go">
        {savedId === row.id ? (
          <span className="ref-saved" role="status">
            저장됨
          </span>
        ) : (
          "수정 ›"
        )}
      </span>
    </button>
  );
}

/** 방금 저장한 줄이 접힌 자리에 있으면 그 묶음을 펼친다 */
function useExpanded(savedKey: string | null) {
  const [open, setOpen] = useState<string[]>([]);
  if (savedKey !== null && !open.includes(savedKey)) setOpen([...open, savedKey]);
  return [open, (k: string) => setOpen((o) => [...o, k])] as const;
}

function groupBy(rows: PrelimRefRow[], key: (r: PrelimRefRow) => string) {
  const groups = new Map<string, PrelimRefRow[]>();
  for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  return groups;
}

const DEGREES = [
  ["학부", "ug"],
  ["석사", "ms"],
  ["박사", "phd"],
] as const;

/** 내부위원 부가 정보: 학위별 학교·전공(지도교수) */
function degreeLine(r: PrelimRefRow) {
  return DEGREES.flatMap(([lv, p]) => {
    const body = [r[`${p}_school`], r[`${p}_major`]].map(str).filter(Boolean).join(" ");
    if (!body) return [];
    const adv = str(r[`${p}_advisor`]);
    return [`${lv} ${body}${adv ? `(지도교수 ${adv})` : ""}`];
  }).join(" · ");
}

const deptOf = (r: PrelimRefRow) => str(r.dept) || "부서 없음";

function StaffGroups({
  rows,
  query,
  grades,
  savedId,
  openId,
  onOpen,
}: {
  rows: PrelimRefRow[];
  query: string;
  grades: string[];
  savedId: number | null;
  openId: number | "new" | null;
  onOpen: (r: PrelimRefRow) => void;
}) {
  const saved = rows.find((r) => r.id === savedId);
  const [open, expand] = useExpanded(saved ? deptOf(saved) : null);
  const shown = rows.filter((r) => (!grades.length || grades.includes(str(r.grade))) && matches(r, query));
  if (!shown.length)
    return (
      <div className="ref-none box">
        {query || grades.length ? "조건에 맞는 내부위원이 없습니다." : "등록된 내부위원이 없습니다."}
      </div>
    );
  const groups = [...groupBy(shown, deptOf).entries()].sort(
    ([a], [b]) => Number(a === "부서 없음") - Number(b === "부서 없음") || a.localeCompare(b, "ko"),
  );
  return (
    <div className="ref-groups">
      {groups.map(([dept, members]) => (
        <RefGroup
          key={dept}
          head={
            <>
              {dept}
              <span>{members.length}명</span>
            </>
          }
          unit="명"
          expanded={open.includes(dept)}
          onExpand={() => expand(dept)}
          items={members.map((r) => (
            <RefRow
              key={r.id}
              row={r}
              lead={<span className="stage">{str(r.grade) || "직급 없음"}</span>}
              sub={[degreeLine(r), str(r.note)].filter(Boolean).join(" · ")}
              savedId={savedId}
              openId={openId}
              onOpen={onOpen}
            />
          ))}
        />
      ))}
    </div>
  );
}

function OrgGroups({
  rows,
  query,
  kinds,
  savedId,
  openId,
  onOpen,
}: {
  rows: PrelimRefRow[];
  query: string;
  kinds: string[];
  savedId: number | null;
  openId: number | "new" | null;
  onOpen: (r: PrelimRefRow | null, preset?: Record<string, string>) => void;
}) {
  const saved = rows.find((r) => r.id === savedId);
  const [open, expand] = useExpanded(saved ? str(saved.kind) : null);
  // 연구기관은 기관명으로만 찾는다
  const shown = rows.filter((r) => !query || str(r.name).toLowerCase().includes(query));
  const cards = ORG_KINDS.filter((k) => !kinds.length || kinds.includes(k)).flatMap((kind) => {
    const all = rows.filter((r) => r.kind === kind);
    const members = shown.filter((r) => r.kind === kind);
    return query && !members.length ? [] : [{ kind, all, members }];
  });
  if (!cards.length) return <div className="ref-none box">검색 결과가 없습니다.</div>;
  return (
    <div className="ref-groups">
      {cards.map(({ kind, all, members }) => (
        <RefGroup
          key={kind}
          head={
            <>
              {kind} 계열
              <span>{all.length}곳</span>
            </>
          }
          action={
            <button type="button" className="btn sm link" onClick={() => onOpen(null, { kind })}>
              <Plus size={15} aria-hidden="true" /> 이 계열에 기관 추가
            </button>
          }
          unit="곳"
          expanded={open.includes(kind)}
          onExpand={() => expand(kind)}
          items={
            members.length
              ? members.map((r) => (
                  <RefRow
                    key={r.id}
                    row={r}
                    sub={str(r.note)}
                    savedId={savedId}
                    openId={openId}
                    onOpen={onOpen}
                  />
                ))
              : [
                  <div key="none" className="ref-none">
                    등록된 기관이 없습니다.
                  </div>,
                ]
          }
        />
      ))}
    </div>
  );
}

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

function OriginTag({ origin }: { origin: unknown }) {
  const o = str(origin);
  if (!o) return null;
  return <span className={`tag origin ${o === "내부" ? "in" : "ex"}`}>{o}</span>;
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
  const saved = rows.find((r) => r.id === savedId);
  const [open, expand] = useExpanded(saved ? recruitmentOf(saved) : null);
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
  const hidden = hiddenWritten(rows);
  const cards = [...groupBy(rows, recruitmentOf).entries()].flatMap(([name, group]) => {
    // 채용 안에서는 전형 순서대로(날짜 오름차순)
    const all = [...group].filter((r) => !hidden.has(r.id)).sort((a, b) => str(a.held_on).localeCompare(str(b.held_on)));
    if (!all.length) return [];
    const jobList = [...new Set(group.flatMap((r) => splitJobs(r.job_group)))];
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
        return (
          <RefGroup
            key={name}
            head={
              <>
                {name}
                {jobList.map((j) => (
                  <em key={j} className="job">
                    {j}
                  </em>
                ))}
                {employment ? <em className="emp">{employment}</em> : null}
                {dates ? <span>{dates}</span> : null}
              </>
            }
            action={
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
            }
            unit="명"
            expanded={open.includes(name)}
            onExpand={() => expand(name)}
            items={members.map((r) => (
              <RefRow
                key={r.id}
                row={r}
                lead={
                  <>
                    <span className="stage">{str(r.stage) || "전형 미정"}</span>
                    <OriginTag origin={r.origin} />
                  </>
                }
                sub={r.org || r.title ? [r.org, r.title].filter(Boolean).map(str).join(" · ") : null}
                savedId={savedId}
                openId={openId}
                onOpen={onOpen}
              />
            ))}
          />
        );
      })}
    </div>
  );
}

const shown = (v: string) => v || "빈 칸";

/** 엑셀 올리기 확인창: 시트별 건수, 삭제될 이름, 충돌 줄 고르기, 반영 안 할 줄 */
function ImportDialog({
  preview,
  onClose,
  onApplied,
}: {
  preview: PrelimRefImportPreview;
  onClose: () => void;
  onApplied: (res: PrelimRefImportApplied) => void;
}) {
  const [choices, setChoices] = useState<Record<string, "db" | "excel">>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conflicts = preview.sheets.flatMap((s) => s.conflicts);
  const unresolved = conflicts.filter((c) => !choices[c.key]).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function apply() {
    // 한 시트에서 많이 지우면 한 번 더 묻는다(서버도 같은 기준으로 막음)
    const bulk = preview.sheets
      .filter((s) => s.bulk_delete)
      .map((s) => ({
        s,
        n: s.delete + s.conflicts.filter((c) => c.type === "delete" && choices[c.key] === "excel").length,
      }))
      .filter((x) => x.n > 0);
    if (
      bulk.length &&
      !window.confirm(
        `${bulk.map((x) => `${x.s.label} ${x.n}줄`).join(", ")}을(를) 삭제합니다. 삭제한 뒤에는 되돌릴 수 없습니다. 반영할까요?`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      onApplied(
        await prelim.reference.importApply({ token: preview.token, choices, confirm_bulk_delete: bulk.length > 0 }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "반영하지 못했습니다.");
      setBusy(false);
    }
  }

  const when = preview.downloaded_at ? preview.downloaded_at.slice(0, 16).replace("T", " ") : null;
  return (
    <div className="vw" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="vw-box imp" role="dialog" aria-modal="true" aria-labelledby="imp-title">
        <header className="vw-head">
          <div>
            <h2 id="imp-title">{preview.file_name}</h2>
            <div className="hint">
              {preview.form ? `양식 종류 ${preview.form}` : "양식 정보 없음"}
              {when ? ` · 내려받은 시각 ${when}` : ""}
            </div>
          </div>
          <button type="button" className="ref-close" onClick={onClose} aria-label="닫기" disabled={busy}>
            <X size={20} />
          </button>
        </header>
        <div className="vw-body">
          {preview.no_change && <div className="imp-same">바뀌는 내용이 없습니다.</div>}
          {preview.already_applied && !preview.no_change && (
            <p className="imp-warn">
              이 파일로 이미 한 번 반영했습니다. 관리번호가 빈 줄은 다시 추가됩니다. 더 고치려면 엑셀을 다시 내려받아 주세요.
            </p>
          )}
          <div className="tblwrap">
            <table className="dtable imp-count">
              <thead>
                <tr>
                  <th>시트</th>
                  <th>추가</th>
                  <th>수정</th>
                  <th>삭제</th>
                  <th>충돌</th>
                  <th>반영 안 함</th>
                </tr>
              </thead>
              <tbody>
                {preview.sheets.map((s) => (
                  <tr key={s.kind}>
                    <td className="nm">{s.label}</td>
                    <td>{s.add}</td>
                    <td>{s.update}</td>
                    <td className={s.delete ? "del" : undefined}>{s.delete}</td>
                    <td className={s.conflict ? "conf" : undefined}>{s.conflict}</td>
                    <td>{s.skipped.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.sheets.map((s) =>
            s.notes.length || s.add || s.update || s.delete || s.conflict || s.skipped.length ? (
              <section key={s.kind} className="imp-sheet">
                <h3>{s.label}</h3>
                {s.notes.map((n) => (
                  <p key={n} className="hint">
                    {n}
                  </p>
                ))}
                {s.delete > 0 && (
                  <p className="imp-line del">
                    <b>삭제</b> {s.deleted_names.join(", ")}
                  </p>
                )}
                {s.add > 0 && (
                  <p className="imp-line">
                    <b>추가</b>{" "}
                    {s.added.map((a, i) => (
                      <span key={a.row}>
                        {i > 0 && ", "}
                        {a.name}
                        {a.same_name && <em className="imp-same-name"> 같은 이름이 이미 있습니다</em>}
                      </span>
                    ))}
                  </p>
                )}
                {s.update > 0 && (
                  <div className="imp-line">
                    <b>수정</b>
                    <ul>
                      {s.updated.map((u) => (
                        <li key={u.id}>
                          {u.name}:{" "}
                          {u.changes.map((c) => `${c.label} ${shown(c.db)} → ${shown(c.excel)}`).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {s.conflicts.map((c) => (
                  <div key={c.key} className="imp-conf">
                    <p>
                      <b>충돌</b> {c.name}
                      {c.row ? ` (엑셀 ${c.row}행)` : ""}:{" "}
                      {c.type === "delete"
                        ? "엑셀에서 지운 줄인데, 내려받은 뒤 화면에서 고쳤습니다."
                        : "내려받은 뒤 화면에서도 고친 줄입니다."}
                    </p>
                    <table className="dtable">
                      <thead>
                        <tr>
                          <th>항목</th>
                          <th>사이트 값</th>
                          <th>엑셀 값</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.cols.map((col) => (
                          <tr key={col.label}>
                            <td>{col.label}</td>
                            <td>{shown(col.db)}</td>
                            <td>{c.type === "delete" ? "엑셀에서 지움" : shown(col.excel)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="seg2" role="group" aria-label={`${c.name} 쓸 값`}>
                      <button
                        type="button"
                        aria-pressed={choices[c.key] === "db"}
                        onClick={() => setChoices((x) => ({ ...x, [c.key]: "db" }))}
                      >
                        사이트 값 쓰기
                      </button>
                      <button
                        type="button"
                        aria-pressed={choices[c.key] === "excel"}
                        onClick={() => setChoices((x) => ({ ...x, [c.key]: "excel" }))}
                      >
                        {c.type === "delete" ? "엑셀대로 삭제" : "엑셀 값 쓰기"}
                      </button>
                    </div>
                  </div>
                ))}
                {s.skipped.length > 0 && (
                  <div className="imp-line">
                    <b>반영 안 함</b>
                    <ul>
                      {s.skipped.map((k) => (
                        <li key={k.row}>
                          엑셀 {k.row}행{k.name ? ` ${k.name}` : ""}: {k.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ) : null,
          )}
        </div>
        <footer className="imp-foot">
          {error && (
            <p role="alert" className="ref-error">
              {error}
            </p>
          )}
          {unresolved > 0 && <p className="hint">충돌한 줄 {unresolved}개에서 쓸 값을 골라 주세요.</p>}
          <div className="ref-form-btns">
            <button type="button" className="btn sm quiet" onClick={onClose} disabled={busy}>
              {preview.no_change ? "닫기" : "취소"}
            </button>
            {!preview.no_change && (
              <button
                type="button"
                className="btn sm primary"
                onClick={() => void apply()}
                disabled={busy || unresolved > 0}
              >
                {busy ? "반영 중" : "반영"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
