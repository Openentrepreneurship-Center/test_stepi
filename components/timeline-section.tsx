import { GraduationCap, Briefcase } from "lucide-react";

type EducationItem = {
  kind: string;
  school?: string;
  degree?: string;
  major?: string;
  major_field?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  gpa?: string;
  gpa_scale?: string;
};

type CareerItem = {
  company: string;
  department?: string;
  title?: string;
  duties?: string;
  employment_type?: string;
  period?: string;
  start_date?: string;
  end_date?: string;
};

type TimelineEntry =
  | { type: "edu"; sortKey: string; data: EducationItem }
  | { type: "car"; sortKey: string; data: CareerItem };

function yearOf(s?: string): string {
  if (!s) return "";
  const m = s.match(/^(\d{4})/);
  return m ? m[1] : "";
}

function rangeLabel(start?: string, end?: string): string {
  const s = yearOf(start);
  const e = end && !/재직|현재/.test(end) ? yearOf(end) : end || "";
  if (!s && !e) return "";
  if (!e) return s;
  if (!s) return e;
  return s === e ? s : `${s} – ${e}`;
}

export default function TimelineSection({
  education,
  career,
}: {
  education: EducationItem[] | null | undefined;
  career: CareerItem[] | null | undefined;
}) {
  const entries: TimelineEntry[] = [
    ...(education || []).map((e) => ({
      type: "edu" as const,
      sortKey: (e.start_date || e.end_date || "0000").slice(0, 10),
      data: e,
    })),
    ...(career || []).map((c) => ({
      type: "car" as const,
      sortKey: (c.start_date || c.end_date || "0000").slice(0, 10),
      data: c,
    })),
  ];
  // 최신순 (역시간순)
  entries.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));

  if (entries.length === 0) {
    return (
      <p className="text-[13px] text-[var(--ink-soft)] italic py-3">
        학력·이력 정보가 없습니다. (지원정보 xlsx 미주입)
      </p>
    );
  }

  return (
    <div className="relative pl-7">
      {/* 좌측 세로선 */}
      <div className="absolute left-2 top-1 bottom-1 w-px bg-[var(--line)]" />
      {entries.map((entry, i) => {
        const Icon = entry.type === "edu" ? GraduationCap : Briefcase;
        const isLast = i === entries.length - 1;
        return (
          <div key={i} className={`relative ${isLast ? "" : "pb-5"}`}>
            <div className="absolute -left-[22px] top-[3px] w-4 h-4 rounded-full bg-[var(--bg)] border-2 border-[var(--ink-muted)] flex items-center justify-center">
              <Icon size={9} strokeWidth={2} className="text-[var(--ink-muted)]" />
            </div>
            {entry.type === "edu" ? <EduRow item={entry.data} /> : <CarRow item={entry.data} />}
          </div>
        );
      })}
    </div>
  );
}

function EduRow({ item }: { item: EducationItem }) {
  const range = rangeLabel(item.start_date, item.end_date);
  const title = item.kind === "대학교"
    ? `${item.school}${item.degree ? ` · ${item.degree}` : ""}`
    : `${item.school || item.kind}`;
  const detail = [item.major, item.status]
    .filter((x): x is string => !!x && x !== "졸업")
    .join(" · ");
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[14px] text-[var(--ink)] font-medium">{title}</span>
        {item.status === "졸업" && (
          <span className="text-[11px] text-[var(--ink-soft)]">졸업</span>
        )}
        {range && (
          <span className="text-[12px] tabular-nums text-[var(--ink-muted)] ml-auto">
            {range}
          </span>
        )}
      </div>
      {detail && (
        <div className="text-[12px] text-[var(--ink-muted)] mt-0.5">{detail}</div>
      )}
      {item.gpa && item.gpa !== "-" && (
        <div className="text-[11px] text-[var(--ink-soft)] mt-0.5 tabular-nums">
          학점 {item.gpa}
          {item.gpa_scale && item.gpa_scale !== "-" ? ` / ${item.gpa_scale}` : ""}
        </div>
      )}
    </div>
  );
}

function CarRow({ item }: { item: CareerItem }) {
  const range = rangeLabel(item.start_date, item.end_date);
  const main = [item.company, item.title].filter(Boolean).join(" · ");
  const sub = [item.department, item.employment_type].filter(Boolean).join(" · ");
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[14px] text-[var(--ink)] font-medium">{main}</span>
        {item.period && (
          <span className="text-[11px] text-[var(--ink-soft)]">({item.period})</span>
        )}
        {range && (
          <span className="text-[12px] tabular-nums text-[var(--ink-muted)] ml-auto">
            {range}
          </span>
        )}
      </div>
      {sub && <div className="text-[12px] text-[var(--ink-muted)] mt-0.5">{sub}</div>}
      {item.duties && (
        <div className="text-[12px] text-[var(--ink-muted)] mt-0.5 line-clamp-2">
          {item.duties}
        </div>
      )}
    </div>
  );
}
