import type { AiDetection } from "./api";

export function aiDetectionStatus(detection?: AiDetection): string {
  switch (detection?.status) {
    case "running": return "검토 중";
    case "succeeded": return "검토 완료";
    case "failed": return "최근 검토 실패";
    case "insufficient_input": return "입력 부족 · 문항 확인 필요";
    default: return "미분석";
  }
}

export function aiUsageHeadline(detection?: AiDetection): { value: string; unit: string; sub: string } {
  const result = detection?.last_success;
  if (!result) return { value: aiDetectionStatus(detection), unit: "", sub: "실험용 AI 의심 점수" };
  const notes = ["실험용"];
  if (detection?.stale) notes.push("이전 입력 · 재분석 필요");
  if (detection?.status !== "succeeded") notes.push(aiDetectionStatus(detection));
  return { value: result.score.toFixed(1), unit: " / 100점", sub: notes.join(" · ") };
}

export function aiAnalysisTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "시각 확인 불가" : new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date) + " (한국 시간)";
}
