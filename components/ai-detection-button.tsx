"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AiDetection } from "@/lib/api";
import { aiDetectionStatus } from "@/lib/ai-usage";

export default function AiDetectionButton({ jobId, applicantId, running = false }: { jobId: string; applicantId: string; running?: boolean }) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  async function run() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/ai-detection?job=${encodeURIComponent(jobId)}&applicant=${encodeURIComponent(applicantId)}`, { method: "POST" });
      if (!response.ok || response.redirected) {
        const errors: Record<number, string> = {
          401: "로그인이 필요합니다.", 403: "검토 실행 권한을 확인해 주세요.",
          404: "작업 또는 지원자를 찾을 수 없습니다.", 409: "분석 완료 상태와 현재 실행 상태를 확인해 주세요.",
          422: "저장된 문항과 답변을 확인해 주세요.",
          503: "AI 검토 기능이 비활성화되어 있거나 계산 서비스에 연결할 수 없습니다.",
          504: "응답 대기 시간이 초과됐습니다. 새로고침으로 저장 상태를 확인해 주세요.",
        };
        throw new Error(response.redirected ? "로그인이 필요합니다." : errors[response.status] ?? "검토 요청에 실패했습니다. 이전 저장 결과는 유지됩니다.");
      }
      const result = await response.json() as AiDetection;
      setMessage(aiDetectionStatus(result));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "검토 요청에 실패했습니다.");
    } finally {
      setBusy(false); lock.current = false;
      startTransition(() => router.refresh());
    }
  }
  return <div className="mb-4 space-y-2 print:hidden">
    <button type="button" onClick={run} disabled={busy || refreshing || running} className="rounded-md border border-[var(--line-strong)] px-3 py-2 text-sm disabled:opacity-50">
      {busy || running ? "AI 검토 중…" : refreshing ? "결과 갱신 중…" : "AI 검토 실행"}
    </button>
    {running && <button type="button" onClick={() => startTransition(() => router.refresh())} disabled={refreshing} className="ml-3 underline">진행 상태 확인</button>}
    <p className="text-xs text-[var(--ink-muted)]">분석이 완료된 작업의 저장된 자소서로 실행합니다.</p>
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}
