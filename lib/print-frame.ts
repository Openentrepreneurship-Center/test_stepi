/**
 * 지원자 PDF 의 고정 틀.
 *
 * 최우선 목표는 빈칸 없는 인쇄물이다. 그래서 쪽이나 섹션 자리를 고정하지 않는다.
 * 대신 항목 하나의 크기를 못박는다.
 *
 * 1. 항목마다 줄 수를 고정한다(page.tsx 의 line-clamp). 넘치면 말줄임표
 * 2. 목록은 개수를 고정한다(PRINT_LIMIT). 넘친 만큼 "외 N건 생략"
 * 3. 섹션은 앞 섹션이 끝난 자리에 바로 이어 붙이고, 쪽은 항목 단위로만 넘긴다.
 *    그래서 쪽 끝에 남는 빈칸은 항목 하나 높이를 넘지 않는다
 * 4. 기입되지 않은 섹션은 제목과 안내 한 줄로 접고 다음 섹션을 당겨 붙인다
 *
 * 2026-09-22 에 쪽과 자리를 px 로 고정하는 방식을 두 번 시도했으나, 자리는 가장 긴
 * 지원자에 맞출 수밖에 없어 보통 지원자에게는 빈칸이 됐다. 다시 쓰지 말 것.
 *
 * 잘리는 글을 모델로 줄여 넣을 자리는 fitText 의 condensed 다.
 */

export const PRINT_LIMIT = {
  summaryLines: 3,
  timelineRows: 8,
  deptFitItems: 7,
  deptFitReason: 90,
  essayItemsPerQuestion: 3,
  interviewQuestions: 8,
  papers: 5,
} as const;

export function fitText(raw: string | null | undefined, limit: number, condensed?: string | null): string {
  const text = (raw ?? "").trim();
  if (text.length <= limit) return text;
  const alt = (condensed ?? "").trim();
  if (alt && alt.length <= limit) return alt;
  const src = alt || text;
  return src.slice(0, Math.max(1, limit - 1)).trimEnd() + "…";
}

export function fitList<T>(items: readonly T[], limit: number): { shown: T[]; hidden: number } {
  return { shown: items.slice(0, limit), hidden: Math.max(0, items.length - limit) };
}
