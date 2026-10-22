import type { AiDetection } from "@/lib/api";
import type { AiDetectionExplanation } from "@/lib/ai-detection";
import { aiAnalysisTime, aiDetectionStatus, aiUsageHeadline } from "@/lib/ai-usage";

function PatternExcerpt({ item }: { item: AiDetectionExplanation["items"][number] }) {
  const chars = Array.from(item.excerpt);
  return <blockquote className="mt-3 break-words rounded-md bg-[var(--bg-2)] p-4 leading-7">
    {chars.slice(0, item.match_start).join("")}
    <mark className="rounded-sm bg-amber-100 px-0.5 font-semibold text-slate-900">{chars.slice(item.match_start, item.match_end).join("")}</mark>
    {chars.slice(item.match_end).join("")}
  </blockquote>;
}

/** Rendering and printing only read stored results. */
export default function AiUsageSection({ detection }: { detection?: AiDetection }) {
  const result = detection?.last_success;
  const explanation = result?.explanation;
  const headline = aiUsageHeadline(detection);
  return (
    <div className="space-y-7 text-base leading-7">
      <section aria-label="AI 검토 결과 요약" className="rounded-lg border border-[var(--line-strong)] bg-[var(--bg-2)] p-5">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-[var(--ink-muted)]">실험 의심 점수</dt>
            <dd className="mt-2 text-3xl font-bold leading-tight tabular-nums">{result ? headline.value : "—"}<span className="text-base font-medium">{headline.unit}</span></dd>
          </div>
          <div className="space-y-3">
            <div><dt className="font-medium text-[var(--ink-muted)]">검토 상태</dt><dd className="font-semibold">{aiDetectionStatus(detection)}</dd></div>
            {result && <div><dt className="font-medium text-[var(--ink-muted)]">마지막 성공 분석 시각</dt><dd>{aiAnalysisTime(result.analyzed_at)}</dd></div>}
          </div>
        </dl>
        {!result && <p className="mt-4">저장된 분석 점수가 없습니다. 미분석이나 실패는 0점을 뜻하지 않습니다.</p>}
        {detection?.stale && <p role="status" className="mt-4 font-semibold">이전 자소서의 결과입니다. 현재 자소서로 다시 검토해 주세요.</p>}
        {result && detection?.status !== "succeeded" && <p className="mt-4">표시된 점수와 근거는 마지막 성공 결과입니다. 최근 검토 상태와 구분해 확인해 주세요.</p>}
      </section>

      <section aria-label="점수에 영향을 준 표현" className="space-y-3">
        <h3 className="text-lg font-bold">어디에서 점수에 영향을 주었나요?</h3>
        {explanation ? <>
          <p>아래 표현은 비교 자료에서 배운 문자 패턴과 연결되어 점수를 올리거나 내렸습니다. AI가 작성했다고 입증하는 문장이나 오류를 찾은 것은 아닙니다.</p>
          <p className="text-[var(--ink-muted)]">분석에 사용한 정규화된 발췌입니다. 영문 대소문자와 공백 등이 원문과 다를 수 있습니다. 표시된 위치는 대표 예시이며, 영향은 답변 전체의 패턴을 기준으로 계산합니다.</p>
          {explanation.items.length ? <ul className="grid gap-4 xl:grid-cols-2">
            {explanation.items.map((item, index) => <li key={`${item.question_index}-${item.pattern}-${index}`} className="break-inside-avoid rounded-lg border border-[var(--line-strong)] p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-bold">문항 {item.question_index + 1}</span>
                <span className="font-semibold">{item.direction === "raises" ? "점수를 올린 표현" : "점수를 내린 표현"}</span>
              </div>
              <p className="mt-1">비교된 패턴: <strong className="break-all">“{item.pattern}”</strong></p>
              <PatternExcerpt item={item} />
              <p className="mt-2 text-[var(--ink-2)]">이 패턴은 학습된 비교 기준에서 {item.direction === "raises" ? "AI 작성 예시 쪽으로" : "사람 작성 예시 쪽으로"} 점수를 움직였습니다. 이 표현만으로 작성 주체를 판단할 수는 없습니다.</p>
            </li>)}
          </ul> : <p>표시할 수 있는 대표 표현이 없습니다. 이를 사람 작성 또는 AI 미사용의 근거로 해석하지 않습니다.</p>}
          <p className="text-[var(--ink-muted)]">공백 없는 패턴 중 점수를 올리는 방향과 내리는 방향에서 영향이 큰 패턴을 각각 최대 3개 표시합니다. 겹치는 패턴과 표시되지 않은 패턴도 계산에 포함되므로, 이 목록만으로 전체 점수를 재계산할 수는 없습니다.</p>
        </> : <p className="rounded-md border border-[var(--line-strong)] p-4">{result ? "이전 분석 결과에는 표현별 근거가 저장되어 있지 않습니다. ‘AI 검토 실행’을 다시 누르면 점수와 근거를 함께 저장합니다." : "AI 검토를 실행하면 점수에 영향을 준 표현과 해당 문항의 발췌를 함께 확인할 수 있습니다."}</p>}
      </section>

      <section aria-label="사용한 분석 방법" className="space-y-3">
        <h3 className="text-lg font-bold">어떤 방법으로 분석했나요?</h3>
        <p>한 가지 문자 패턴 모델이 아래 순서로 계산합니다.</p>
        <ol className="list-decimal space-y-3 pl-6">
          <li><strong>짧은 문자 패턴 비교</strong><br />자소서를 2~4글자의 짧은 조각으로 나누고, 각 패턴이 얼마나 나타나는지 비교합니다. 뜻을 이해하거나 사실 여부를 확인하는 방식은 아닙니다.</li>
          <li><strong>각 패턴의 영향 합산</strong><br />사람 작성 자료와 AI 작성 예시로 미리 학습한 비교 모델이 패턴마다 점수를 올리거나 내리는 영향을 계산해 합칩니다. 여러 검출기를 함께 실행하는 방식은 아닙니다.</li>
          <li><strong>100점 척도로 변환</strong><br />합산 결과를 0~100점으로 바꿉니다. 높을수록 학습한 AI 예시의 문자 패턴 쪽에 가깝다는 뜻이며, AI 사용 비율이나 작성 확률을 뜻하지 않습니다.</li>
        </ol>
      </section>

      <section aria-label="해석 시 유의사항" className="space-y-3 rounded-lg border border-[var(--line-strong)] p-5">
        <h3 className="text-lg font-bold">검토할 때 함께 확인해 주세요</h3>
        <p>생성 모델, 문항, 글 길이가 달라지면 결과가 달라질 수 있습니다. 높은 점수나 강조된 표현만으로 AI 사용을 확정하지 말고, 자소서 내용과 다른 확인 자료를 함께 검토해 주세요.</p>
        {!!result?.warnings.length && <ul className="list-disc space-y-2 pl-5">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      </section>

      {result && <details className="break-words border-t border-[var(--line-strong)] pt-4">
        <summary className="cursor-pointer font-semibold">분석 버전 및 계산 세부정보</summary>
        <dl className="mt-3 space-y-2">
          <div><dt className="font-medium">모델 버전</dt><dd>{result.model_version}</dd></div>
          <div><dt className="font-medium">점수 보정 버전</dt><dd>{result.calibration_version}</dd></div>
          <div><dt className="font-medium">입력 처리 버전</dt><dd>{result.normalization_version}</dd></div>
          <div><dt className="font-medium">실험 기준 비교</dt><dd>{result.threshold_exceeded ? "초과" : "이하"} · 기준 점수 {result.threshold_score.toPrecision(6)} / 100. 반올림 전 점수로 비교하며 AI 작성 확정 판정은 아닙니다.</dd></div>
        </dl>
        {detection?.last_attempt?.error_code && <p className="mt-3">최근 실행 상태 코드: {detection.last_attempt.error_code}</p>}
      </details>}
    </div>
  );
}
