import type { JobStatus } from "@/lib/api";

const LABEL: Record<JobStatus, string> = {
  pending: "대기",
  running: "분석 중",
  done: "완료",
  failed: "실패",
  cancelled: "중단",
};

// 색을 채운 배지는 봐야 할 상태, 회색 테두리는 멈춘 상태
const TONE: Record<JobStatus, string> = {
  pending: "border-[var(--line-mid)] bg-white text-[var(--ink-muted)]",
  running: "border-[var(--secondary)] bg-[var(--secondary)] text-white",
  done: "border-[var(--primary)] bg-[var(--primary)] text-white",
  failed: "border-[var(--bad)] bg-[var(--bad)] text-white",
  cancelled: "border-[var(--line-mid)] bg-white text-[var(--ink-muted)]",
};

export default function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-[2px] border px-2.5 py-1 text-[12.5px] font-semibold ${TONE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}
