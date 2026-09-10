"use client";

import { useEffect, useRef, useState } from "react";
import { FileArchive, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

type Status = {
  status: "running" | "ready" | "error";
  done: number;
  total: number;
  failed: string[];
  error: string | null;
};

const POLL_MS = 2000;
const STORAGE_PREFIX = "stepi:bulk-pdf:";

/** 비공개 모드 등에서 localStorage 접근 자체가 막힐 수 있다 */
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
    /* 저장 못 해도 이번 화면에서는 그대로 진행된다 */
  }
}

/**
 * 전체 지원자 PDF 를 ZIP 으로 받는다.
 *
 * 한 번의 요청으로 끝내지 않는 이유는 Cloudflare 원본 타임아웃(100초)이다. 지원자가
 * 수백 명이면 동기 요청은 반드시 끊긴다. 그래서 시작 → 진행률 폴링 → 내려받기로 나눈다.
 *
 * task_id 를 localStorage 에 남기는 이유는, 화면을 떠나도 렌더러는 계속 만들고 결과를
 * 6시간 보관하기 때문이다. 열쇠를 안 들고 있으면 다 만들어진 ZIP 을 못 받고 처음부터
 * 다시 만들게 된다. 담당자가 다른 지원자를 보러 다녀오는 건 자연스러운 동작이다.
 */
export default function BulkPdfButton({ jobId }: { jobId: string }) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [state, setState] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 서버 렌더에는 localStorage 가 없으므로 첫 그림 뒤에 읽는다
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
        const res = await fetch(
          `${API_BASE}/analysis-jobs/${encodeURIComponent(jobId)}/applicants-report/${taskId}`,
          { cache: "no-store" },
        );
        // 렌더러가 재기동됐거나 보관 기한이 지났다. 없는 작업을 붙들지 말고 처음으로 돌린다
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
          setError(next.error ?? "생성에 실패했습니다.");
          setBusy(false);
        } else {
          // 완료분은 열쇠를 남겨 둔다. 보관 기한 안에는 다시 들어와도 받을 수 있다
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
      if (!res.ok) throw new Error(body?.error ?? "요청에 실패했습니다.");
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
      ? `${API_BASE}/analysis-jobs/${encodeURIComponent(jobId)}/applicants-report/${taskId}.zip`
      : null;

  const showProgress = busy && state != null && state.total > 0;
  const showFailed = state?.status === "ready" && state.failed.length > 0;

  return (
    <div className="relative flex flex-col items-end">
      {/* 상태 줄은 버튼 위에 띄운다. 자리를 차지하면 옆 버튼들과 높이가 어긋난다 */}
      {(showProgress || showFailed || error) && (
        <div className="absolute bottom-full right-0 mb-1 flex flex-col items-end gap-0.5">
          {showProgress && (
            <span className="text-[12px] text-[var(--ink-muted)] tabular-nums whitespace-nowrap">
              {state.done} / {state.total}명
            </span>
          )}
          {showFailed && (
            <span className="text-[12px] text-[var(--bad)] whitespace-nowrap">
              {state.failed.length}명 실패 (나머지는 담겨 있습니다)
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
          title="지원자별 PDF 를 모두 만들어 ZIP 으로 묶습니다"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <FileArchive size={13} />}
          {busy ? "만드는 중" : "전체 지원자 PDF"}
        </button>
      )}
    </div>
  );
}
