"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface Props {
  jobId: string;
  applicantId: string;
}

export default function RegenerateSummaryButton({ jobId, applicantId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const click = async () => {
    if (busy) return;
    if (!confirm("이 지원자의 종합 요약 + 자기소개서 핵심을 다시 생성합니다. 약 1~2분 소요. 계속할까요?")) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/regenerate-summary?job=${encodeURIComponent(jobId)}&applicant=${encodeURIComponent(applicantId)}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`${res.status}: ${t || "재생성 요청 실패"}`);
      }
      setMsg("재생성 큐잉 완료 — 잠시 후 새로고침");
      // 2분 후 자동 새로고침; 그 전에 사용자가 직접 새로고침해도 됨.
      setTimeout(() => router.refresh(), 90_000);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "오류");
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={click}
        disabled={busy}
        title="요약 재생성"
        className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-md border transition ${
          busy
            ? "border-[var(--line)] text-[var(--ink-soft)] cursor-not-allowed"
            : "border-[var(--line-strong)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-2)]"
        }`}
      >
        <RefreshCw size={12} className={busy ? "animate-spin" : ""} />
        {busy ? "재생성 중…" : "요약 재생성"}
      </button>
      {msg && (
        <span className="text-[11px] text-[var(--ink-muted)] max-w-[24ch] text-right leading-tight">
          {msg}
        </span>
      )}
    </div>
  );
}
