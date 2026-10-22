import type { AiDetection } from "@/lib/api";
import { aiAnalysisTime, aiDetectionStatus, aiUsageHeadline } from "@/lib/ai-usage";

/** Rendering and printing only read stored results. */
export default function AiUsageSection({ detection }: { detection?: AiDetection }) {
  const result = detection?.last_success;
  const headline = aiUsageHeadline(detection);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <p className="text-[17px] font-semibold">{headline.value}{headline.unit}</p>
      <p>{aiDetectionStatus(detection)}</p>
      {detection?.stale && <p role="status">이전 자소서에 대한 결과입니다. 현재 입력으로 재분석이 필요합니다.</p>}
      {result && detection?.status !== "succeeded" && <p>아래 점수와 정보는 마지막 성공 결과입니다. 최근 실행 결과와 구분해 확인해 주세요.</p>}
      {result ? <>
        <p>분석 시각: {aiAnalysisTime(result.analyzed_at)}</p>
        <p>실험 기준 {result.threshold_exceeded ? "초과" : "이하"} · 기준 점수 {result.threshold_score.toPrecision(6)} / 100</p>
        <p className="text-[var(--ink-muted)]">기준 비교에는 반올림 전 점수를 사용합니다. AI 작성 확정 판정이 아닙니다.</p>
        {result.warnings.length > 0 && <ul className="list-disc pl-5">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        <details className="break-all">
          <summary>분석 버전</summary>
          <p>모델: {result.model_version}</p><p>보정: {result.calibration_version}</p><p>입력 정규화: {result.normalization_version}</p>
        </details>
      </> : <p>저장된 분석 점수가 없습니다. 미분석이나 실패는 0점을 뜻하지 않습니다.</p>}
      {detection?.last_attempt?.error_code && <p>최근 실행 상태 코드: {detection.last_attempt.error_code}</p>}
      <p className="rounded-md border border-[var(--line-strong)] bg-[var(--bg-2)] p-3 text-[var(--ink-2)]">
        문자 패턴을 CPU 분류기로 비교한 실험용 점수입니다. AI 사용 비율이나 작성 확률이 아니며, 문장별 작성 근거를 제공하지 않습니다. 생성 모델과 글 길이에 따라 결과가 달라질 수 있습니다.
      </p>
    </div>
  );
}
