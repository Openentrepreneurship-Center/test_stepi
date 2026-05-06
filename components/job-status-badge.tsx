import type { JobStatus } from "@/lib/api";

const LABEL: Record<JobStatus, string> = {
  pending: "대기",
  running: "분석 중",
  done: "완료",
  failed: "실패",
};

const TONE: Record<JobStatus, string> = {
  pending: "border-[var(--line-strong)] text-[var(--ink-muted)] bg-[var(--bg-2)]",
  running: "border-[var(--gold)] text-[var(--gold-2)] bg-[var(--gold)]/8",
  done: "border-[var(--good)] text-[var(--good)] bg-[var(--good)]/8",
  failed: "border-[var(--bad)] text-[var(--bad)] bg-[var(--bad)]/8",
};

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.16em] ${TONE[status]}`}
    >
      {status === "running" && <span className="pulse-dot" />}
      {LABEL[status]}
    </span>
  );
}
