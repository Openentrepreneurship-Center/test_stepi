"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/components/page-header";
import {
  prelim,
  type PrelimDerived,
  type PrelimResult,
  type PrelimStage,
  type PrelimUploadKind,
  type PrelimVerdicts,
} from "@/lib/api";
import "../prelim.css";
import { STAGES } from "./parts";
import SummaryTab from "./tab-summary";
import EssayTab from "./tab-essay";
import AttachTab from "./tab-attach";
import InternalTab from "./tab-internal";
import ExternalTab from "./tab-external";
import PersonView from "./person-view";

export type TabKey = "summary" | "essay" | "attach" | "inx" | "exx" | "person";

const TABS: [Exclude<TabKey, "person">, string][] = [
  ["summary", "요약"],
  ["essay", "자기소개서 위배"],
  ["attach", "첨부 실적 내 위배"],
  ["inx", "제척(내부)"],
  ["exx", "제척(외부)"],
];
const BADGE_CLS: Record<string, string> = {
  essay: "navy",
  attach: "navy",
  inx: "red",
  exx: "red",
};
// 전체 엑셀은 담당자 HTML 과 같은 순서로 9개를 따로 내려받는다
const ALL_KEYS = [
  "essay",
  "attach",
  "inx-staff",
  "inx",
  "work",
  "degree",
  "exx-org",
  "exx-com",
  "exx",
];
const FILE_LABELS: [string, string][] = [
  ["apply_xlsx", "자기소개서"],
  ["attach", "첨부 실적"],
  ["raw_xlsm", "내부위원 학력정보"],
  ["academic_xlsx", "학력제척"],
];

/** 경고문을 문장 단위로 나눈다. 괄호 안의 마침표는 문장 끝으로 보지 않는다 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  for (const ch of text) {
    buf += ch;
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (ch === "." && depth === 0) {
      out.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [text];
}

export interface Ctx {
  ticket: string;
  data: PrelimResult;
  derived: PrelimDerived;
  verdicts: PrelimVerdicts;
  uploads: PrelimResult["uploads"];
  stage: PrelimStage;
  focusNo: string | null;
  busy: string | null;
  go: (tab: TabKey, opts?: { focus?: string; person?: string }) => void;
  setStage: (s: PrelimStage) => void;
  judge: (
    kind: "essay" | "attach" | "out",
    itemId: string,
    value: string | null,
    reason?: string | null,
  ) => void;
  upload: (kind: PrelimUploadKind, file: File) => void;
  exportUrl: (key: string) => string;
}

export default function ResultView({ ticket }: { ticket: string }) {
  const sp = useSearchParams();
  const tab = ((sp.get("tab") as TabKey) || "summary") as TabKey;
  const person = sp.get("person");
  const focusNo = sp.get("focus");
  const stage = (STAGES as readonly string[]).includes(sp.get("stage") ?? "")
    ? (sp.get("stage") as PrelimStage)
    : "서류";

  const [data, setData] = useState<PrelimResult | null>(null);
  const [derived, setDerived] = useState<PrelimDerived | null>(null);
  const [verdicts, setVerdicts] = useState<PrelimVerdicts | null>(null);
  const [uploads, setUploads] = useState<PrelimResult["uploads"]>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await prelim.result(ticket);
      setData(r);
      setDerived(r.derived);
      setVerdicts(r.verdicts);
      setUploads(r.uploads ?? {});
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [ticket]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 조회
    void load();
  }, [load]);

  // 첨부 검사 중에는 5초마다 다시 읽는다
  const scanning =
    data && ["uploading", "queued", "scanning"].includes(data.attach_status);
  useEffect(() => {
    if (!scanning) return;
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [scanning, load]);

  const setQuery = useCallback(
    (next: Record<string, string | null>, scrollTop: boolean) => {
      const q = new URLSearchParams(window.location.search);
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") q.delete(k);
        else q.set(k, v);
      }
      const qs = q.toString();
      window.history.pushState(
        null,
        "",
        qs ? `?${qs}` : window.location.pathname,
      );
      if (scrollTop) window.scrollTo(0, 0);
    },
    [],
  );

  const go = useCallback<Ctx["go"]>(
    (t, opts) => {
      setQuery(
        {
          tab: t === "summary" ? null : t,
          person: opts?.person ?? null,
          focus: opts?.focus ?? null,
        },
        !opts?.focus,
      );
    },
    [setQuery],
  );

  // 이동해 온 지원자 줄로 스크롤
  useEffect(() => {
    if (!focusNo || !derived) return;
    const el = paneRef.current?.querySelector(
      `[data-no="${CSS.escape(focusNo)}"]`,
    );
    if (el) setTimeout(() => el.scrollIntoView({ block: "center" }), 0);
  }, [focusNo, tab, derived]);

  const judge = useCallback<Ctx["judge"]>(
    async (kind, itemId, value, reason) => {
      setBusy(`${kind}:${itemId}`);
      setNotice(null);
      try {
        const r = await prelim.verdict.put(ticket, {
          kind,
          item_id: itemId,
          value,
          reason,
        });
        setVerdicts(r.verdicts);
        setDerived(r.derived);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [ticket],
  );

  const upload = useCallback<Ctx["upload"]>(
    async (kind, file) => {
      setBusy(`up:${kind}`);
      setNotice(null);
      try {
        const r = await prelim.upload.put(ticket, kind, file);
        setUploads(r.uploads);
        setDerived(r.derived);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
      }
    },
    [ticket],
  );

  const exportUrl = useCallback(
    (key: string) =>
      prelim.exportKeyUrl(
        ticket,
        key,
        key.startsWith("exx-com") ? stage : undefined,
      ),
    [ticket, stage],
  );

  async function downloadAll() {
    setDownloading(true);
    for (const key of ALL_KEYS) {
      const a = document.createElement("a");
      a.href = exportUrl(key);
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 300));
    }
    setDownloading(false);
  }

  const head = (description?: ReactNode, aside?: ReactNode) => (
    <PageHeader
      back={{ href: "/prelim", label: "분석 현황" }}
      eyebrow="사전스크리닝 검토"
      icon={ShieldAlert}
      title="사전스크리닝 검토 결과"
      description={description}
      wideDescription
      aside={aside}
    />
  );

  if (error) {
    return (
      <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
        {head()}
        <div className="prelim result">
          <div className="empty" role="alert">
            검토 결과를 불러오지 못했습니다. {error}
          </div>
        </div>
      </div>
    );
  }
  if (!data || !derived || !verdicts) {
    return (
      <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
        {head()}
        <div className="prelim result">
          <div className="empty">검토 결과를 불러오는 중입니다.</div>
        </div>
      </div>
    );
  }

  const counts = derived.summary_fixed.tab_counts as Record<string, number>;
  const baseUsed = (data.files_used?.base ?? {}) as Record<string, string | null>;
  const files = FILE_LABELS.filter(([k]) =>
    k === "attach" ? data.attach_status !== "none" : !!data.files_used?.[k],
  ).map(([k, label]) => (baseUsed[k] ? `${label}(기준 자료)` : label));
  const warnings = [...(data.counts.skipped ?? []), ...derived.warnings];
  const ctx: Ctx = {
    ticket,
    data,
    derived,
    verdicts,
    uploads,
    stage,
    focusNo,
    busy,
    go,
    judge,
    upload,
    exportUrl,
    setStage: (s) =>
      setQuery({ stage: s === "서류" ? null : s, focus: null }, false),
  };

  const meta = (
    <>
      검토 공고명{" "}
      <b className="font-semibold text-[var(--ink)]">{data.notice || "-"}</b>
      <span className="mx-3 text-[var(--line)]">|</span>
      평가기준일{" "}
      <b className="font-semibold text-[var(--ink)] tabular-nums">
        {derived.end || "-"}
      </b>
      <span className="mx-3 text-[var(--line)]">|</span>
      검토 파일{" "}
      <b className="font-semibold text-[var(--ink)]">
        {files.length ? files.join(" · ") : "자기소개서"}
      </b>
    </>
  );
  const actions = (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          className="btn-ghost"
          type="button"
          onClick={downloadAll}
          disabled={downloading}
        >
          전체 엑셀 다운로드
        </button>
        <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-[12px] text-[var(--ink-muted)]">
          여러 파일 다운로드를 허용해 주세요
        </span>
      </div>
      <Link href="/prelim/new" className="btn-primary">
        + 새 검토 시작
      </Link>
    </div>
  );

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      {head(meta, actions)}
      <div className="prelim result mt-8">
        <div className="tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              onClick={() => go(k)}
            >
              {label}
              {counts[k] != null && (
                <span className={`badge ${BADGE_CLS[k]}`}>{counts[k]}</span>
              )}
            </button>
          ))}
        </div>

        {notice && (
          <div
            className="rulebox"
            role="alert"
            style={{ borderLeftColor: "var(--red)", color: "var(--red-text)" }}
          >
            {notice}
          </div>
        )}
        {warnings.length > 0 && tab === "summary" && (
          <div className="rulebox warn-list">
            {warnings.map((w, i) => {
              const [first, ...rest] = splitSentences(w);
              return (
                <div key={i} className="warn">
                  <div>{first}</div>
                  {rest.map((t, j) => (
                    <div key={j} className="cont">
                      {t}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div ref={paneRef} style={{ display: "grid", gap: 24 }}>
          {tab === "summary" && <SummaryTab ctx={ctx} />}
          {tab === "essay" && <EssayTab ctx={ctx} />}
          {tab === "attach" && <AttachTab ctx={ctx} />}
          {tab === "inx" && <InternalTab ctx={ctx} />}
          {tab === "exx" && <ExternalTab ctx={ctx} />}
          {tab === "person" && <PersonView ctx={ctx} no={person ?? ""} />}
        </div>
      </div>
    </div>
  );
}
