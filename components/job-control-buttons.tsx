"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api, type JobStatus } from "@/lib/api";

export default function JobControlButtons({
  jobId,
  status,
}: {
  jobId: string;
  status: JobStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const canCancel = status === "running" || status === "pending";
  const canResume = status === "cancelled" || status === "failed";

  const cancel = () => {
    if (!confirm("진행 중인 분석을 중단합니다.\n현재 처리 중인 1명까지는 끝까지 처리되고 멈춥니다 (최대 ~2분). 계속할까요?")) return;
    setErr(null);
    startTransition(async () => {
      try {
        await api.cancelJob(jobId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "중단 실패");
      }
    });
  };

  const resume = () => {
    setErr(null);
    startTransition(async () => {
      try {
        await api.resumeJob(jobId);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "재개 실패");
      }
    });
  };

  const trash = () => {
    const msg = canCancel
      ? "진행 중인 분석을 중단하고 휴지통으로 이동합니다. 계속할까요?\n(휴지통에서 복구 또는 영구삭제 가능)"
      : "이 작업을 휴지통으로 이동합니다. 계속할까요?\n(휴지통에서 복구 또는 영구삭제 가능)";
    if (!confirm(msg)) return;
    setErr(null);
    startTransition(async () => {
      try {
        await api.softDeleteJob(jobId);
        router.replace("/");
      } catch (e) {
        setErr(e instanceof Error ? e.message : "삭제 실패");
      }
    });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {canCancel && (
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="btn-ghost"
          style={{ borderColor: "var(--bad)", color: "var(--bad)" }}
        >
          {pending ? "처리 중…" : "분석 중단"}
        </button>
      )}
      {canResume && (
        <button type="button" onClick={resume} disabled={pending} className="btn-primary">
          {pending ? "처리 중…" : "분석 재개"}
        </button>
      )}
      <button
        type="button"
        onClick={trash}
        disabled={pending}
        title="휴지통으로 이동"
        aria-label="휴지통으로 이동"
        className="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--line-strong)] px-3 py-[7px] text-[13px] text-[var(--ink-muted)] hover:border-[var(--bad)] hover:text-[var(--bad)] hover:bg-[var(--bad)]/5 transition disabled:opacity-50"
      >
        <Trash2 size={14} strokeWidth={1.7} />
        삭제
      </button>
      {err && <span className="text-[12px] text-[var(--bad)]">{err}</span>}
    </div>
  );
}
