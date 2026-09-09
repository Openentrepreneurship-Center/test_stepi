"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

/**
 * 지원자 1명 PDF 저장 — 인쇄 화면을 숨긴 iframe 으로 불러 인쇄 대화상자를 띄운다.
 *
 * 새 탭을 열지 않는 이유는 담당자가 보던 화면을 잃지 않게 하기 위해서다. 인쇄 화면은
 * 탭 없이 한 장으로 펼친 별도 라우트라 어딘가에 실어야 하는데, iframe 이면 눈에 띄지
 * 않게 실을 수 있다. 대기(폰트·차트·논문 상세)는 그 안의 PrintAuto 가 그대로 맡는다.
 *
 * display:none 대신 화면 밖으로 미는 것은 레이더 차트(recharts) 때문이다.
 * ResponsiveContainer 는 칸의 실제 크기를 재서 그리므로, 크기가 0 이면 빈 그림이 인쇄된다.
 * 크기는 일괄 다운로드 렌더러의 뷰포트와 맞춰 결과물이 어긋나지 않게 한다.
 *
 * 명부의 행 전체가 링크라 여기서 클릭이 위로 번지지 않게 막는다.
 */

/** pdf-renderer 의 뷰포트와 같은 값 */
const FRAME_WIDTH = 1400;
const FRAME_HEIGHT = 2000;
/** 인쇄 대화상자가 끝내 뜨지 않아도 iframe 과 버튼이 묶여 있지 않게 잘라 준다 */
const MAX_WAIT_MS = 30000;

export default function ApplicantPdfButton({
  jobId,
  applicantId,
  variant = "icon",
}: {
  jobId: string;
  applicantId: string;
  variant?: "icon" | "button";
}) {
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    frameRef.current?.remove();
    frameRef.current = null;
    setBusy(false);
  };

  // 저장 중에 다른 지원자로 넘어가면 iframe 이 그대로 남는다
  useEffect(() => cleanup, []);

  const open = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:fixed;left:-${FRAME_WIDTH + 100}px;top:0;width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;border:0;`;
    frame.src = `/jobs/${jobId}/applicants/${encodeURIComponent(applicantId)}/print?auto=1`;

    frame.onload = () => {
      const win = frame.contentWindow;
      // 대화상자를 띄우는 데까지 성공했으면 잘라 낼 이유가 없다. 사람이 저장 위치를
      // 고르는 동안 iframe 이 사라지면 인쇄가 통째로 취소된다
      win?.addEventListener("beforeprint", () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      });
      // 대화상자가 닫히면(저장했든 취소했든) 정리한다
      win?.addEventListener("afterprint", cleanup);
    };

    frameRef.current = frame;
    document.body.appendChild(frame);
    timerRef.current = setTimeout(cleanup, MAX_WAIT_MS);
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={open}
        disabled={busy}
        className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
      >
        {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        {busy ? "준비 중" : "PDF"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      title="이 지원자만 PDF 로 저장"
      className="text-[var(--ink-muted)] hover:text-[var(--ink)] transition p-0.5 disabled:opacity-50"
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
    </button>
  );
}
