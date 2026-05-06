"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useState, useTransition } from "react";
import { api } from "@/lib/api";

interface Props {
  jobId: string;
  applicantId: string;
  component: string;
  itemKey?: string;
  initialRating: boolean | null;
  label?: string;
  size?: "sm" | "md";
}

export default function FeedbackButtons({
  jobId,
  applicantId,
  component,
  itemKey = "",
  initialRating,
  label,
  size = "md",
}: Props) {
  const [rating, setRating] = useState<boolean | null>(initialRating);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconSize = size === "sm" ? 14 : 16;

  const set = (next: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        if (rating === next) {
          await api.deleteFeedback(jobId, applicantId, component, itemKey);
          setRating(null);
        } else {
          await api.upsertFeedback(jobId, applicantId, {
            component,
            item_key: itemKey,
            rating: next,
          });
          setRating(next);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      }
    });
  };

  const baseBtn = `${dim} grid place-items-center rounded-[2px] border transition disabled:opacity-50`;

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[11px] uppercase tracking-wider text-[var(--ink-muted)] mr-1">
          {label}
        </span>
      )}
      <button
        type="button"
        aria-label="좋아요"
        onClick={() => set(true)}
        disabled={isPending}
        className={`${baseBtn} ${
          rating === true
            ? "bg-[var(--good)]/12 border-[var(--good)] text-[var(--good)]"
            : "border-[var(--line-strong)] text-[var(--ink-muted)] hover:bg-[var(--bg-2)]"
        }`}
      >
        <ThumbsUp size={iconSize} strokeWidth={1.8} />
      </button>
      <button
        type="button"
        aria-label="싫어요"
        onClick={() => set(false)}
        disabled={isPending}
        className={`${baseBtn} ${
          rating === false
            ? "bg-[var(--bad)]/10 border-[var(--bad)] text-[var(--bad)]"
            : "border-[var(--line-strong)] text-[var(--ink-muted)] hover:bg-[var(--bg-2)]"
        }`}
      >
        <ThumbsDown size={iconSize} strokeWidth={1.8} />
      </button>
      {error && <span className="text-xs text-[var(--bad)]">!</span>}
    </div>
  );
}
