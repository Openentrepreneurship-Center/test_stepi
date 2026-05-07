"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { api } from "@/lib/api";

export default function JobRowDeleteButton({
  jobId,
  label,
}: {
  jobId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onClick = (e: React.MouseEvent) => {
    // 행 자체가 <Link> 라서 navigation 막음
    e.preventDefault();
    e.stopPropagation();
    const name = label?.trim() || jobId;
    if (
      !confirm(
        `"${name}" 작업을 휴지통으로 이동합니다.\n진행 중이면 자동으로 중단되며, 휴지통에서 복구 가능합니다.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await api.softDeleteJob(jobId);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "삭제 실패");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title="휴지통으로 이동"
      aria-label="휴지통으로 이동"
      className="grid place-items-center h-8 w-8 rounded-[2px] border border-transparent text-[var(--ink-soft)] opacity-0 group-hover:opacity-100 hover:border-[var(--bad)] hover:bg-[var(--bad)]/8 hover:text-[var(--bad)] transition disabled:opacity-50"
    >
      <Trash2 size={14} strokeWidth={1.7} />
    </button>
  );
}
