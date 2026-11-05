"use client";

import { useEffect, useRef, useState } from "react";
import { FileArchive, Loader2 } from "lucide-react";
import { apiFetch, downloadUrl } from "@/lib/api";

type Status = {
  status: "running" | "ready" | "error";
  done: number;
  total: number;
  failed: string[];
  error: string | null;
};

const POLL_MS = 2000;
const STORAGE_PREFIX = "stepi:bulk-pdf:";

/** 비공개 모드 등에서 localStorage 접근 자체가 막힐 수 있음 */
function readTaskId(jobId: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + jobId);
  } catch {
    return null;
  }
}

function saveTaskId(jobId: string, taskId: string | null): void {
  try {
    if (taskId) localStorage.setItem(STORAGE_PREFIX + jobId, taskId);
    else localStorage.removeItem(STORAGE_PREFIX + jobId);
  } catch {
    /* 저장 못 해도 이번 화면에서는 그대로 진행됨 */
  }
}

/**
 * 전체 지원자 PDF 를 ZIP 으로 받음
 *
 * 한 번의 요청으로 끝내지 않는 이유는 Cloudflare 원본 타임아웃(100초) 때문임. 지원자가
 * 수백 명이면 동기 요청은 반드시 끊김. 그래서 시작, 진행률 폴링, 내려받기로 나눔.
 *
 * task_id 를 localStorage 에 남기는 이유는, 화면을 떠나도 렌더러는 계속 만들고 결과를
 * 6시간 보관하기 때문임. 열쇠를 안 들고 있으면 다 만들어진 ZIP 을 못 받고 처음부터
 * 다시 만들게 됨. 담당자가 다른 지원자를 보러 다녀오는 건 자연스러운 동작임
 */
export default function BulkPdfButton({ jobId }: { jobId: string }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [state, setState] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 서버 렌더에는 localStorage 가 없으므로 첫 그림 뒤에 읽음
  useEffect(() => {
    const saved = readTaskId(jobId);
    if (!saved) return;
    setTaskId(saved);
    setBusy(true);
  }, [jobId]);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await apiFetch(
          `/analysis-jobs/${encodeURIComponent(jobId)}/applicants-report/${taskId}`,
          { cache: "no-store" },
        );
        // 렌더러가 재기동됐거나 보관 기한이 지났음. 없는 작업을 붙들지 말고 처음으로 돌림
        if (res.status === 404) {
          saveTaskId(jobId, null);
          if (cancelled) return;
          setTaskId(null);
          setState(null);
          setBusy(false);
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const next = (await res.json()) as Status;
        if (cancelled) return;
        setState(next);
        if (next.status === "running") {
          timerRef.current = setTimeout(poll, POLL_MS);
        } else if (next.status === "error") {
          saveTaskId(jobId, null);
          setError(next.error ?? "생성에 실패하였습니다.");
          setBusy(false);
        } else {
          // 완료분은 열쇠를 남겨 둠. 보관 기한 안에는 다시 들어와도 받을 수 있음
          setBusy(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [taskId, jobId]);

  const start = async () => {
    setBusy(true);
    setError(null);
    setState(null);
    setTaskId(null);
    try {
      const res = await fetch(`/api/bulk-pdf/${encodeURIComponent(jobId)}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "요청에 실패하였습니다.");
      setTaskId(body.task_id);
      saveTaskId(jobId, body.task_id);
      setState({ status: "running", done: 0, total: body.total ?? 0, failed: [], error: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const zipUrl =
    taskId && state?.status === "ready"
      ? downloadUrl(`/analysis-jobs/${encodeURIComponent(jobId)}/applicants-report/${taskId}.zip`)
      : null;

  const showProgress = busy && state != null && state.total > 0;
  const showFailed = state?.status === "ready" && state.failed.length > 0;

  return (
    <div className="relative flex flex-col items-end">
      {/* 상태 줄은 버튼 위에 띄움. 자리를 차지하면 옆 버튼들과 높이가 어긋남 */}
      {(showProgress || showFailed || error) && (
        <div className="absolute bottom-full right-0 mb-1 flex flex-col items-end gap-0.5">
          {showProgress && (
            <span className="text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
              {state.done} / {state.total}명
            </span>
          )}
          {showFailed && (
            <span className="text-[12px] text-[var(--bad)] whitespace-nowrap">
              {state.failed.length}명 실패(나머지 지원자는 ZIP 파일에 포함)
            </span>
          )}
          {error && (
            <span className="text-[12px] text-[var(--bad)] max-w-[280px] text-right">{error}</span>
          )}
        </div>
      )}

      {zipUrl ? (
        <a href={zipUrl} className="btn-ghost inline-flex items-center gap-2" download>
          <FileArchive size={13} /> ZIP 내려받기 ({state?.total}명)
        </a>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
          title="지원자별 PDF를 생성하여 ZIP 파일로 묶습니다."
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <FileArchive size={13} />}
          {busy ? "생성 중" : "전체 지원자 PDF"}
        </button>
      )}
    </div>
  );
}
