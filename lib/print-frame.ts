/**
 * 지원자 PDF 의 고정 틀.
 *
 * 항목 하나하나의 크기를 못박는다. 글은 정해진 줄 수까지만 찍고 넘치면 말줄임표로
 * 자른다(CSS line-clamp). 목록은 정해진 개수까지만 싣는다. 그래서 어떤 지원자든
 * 한 항목이 차지하는 자리가 같고, 긴 글 하나가 뒤 섹션을 밀어내지 못한다.
 *
 * 섹션끼리는 빈틈 없이 이어 붙인다. 내용이 없는 섹션은 한 줄 안내로 접고
 * 다음 섹션이 바로 올라온다. 상자를 크게 잡아 두고 비우는 방식은 쓰지 않는다.
 *
 * 줄 수는 지원자 340명의 실측 분포에서 정했다. 인쇄 폭에서 한 줄에 들어가는
 * 글자수로 환산하면 대략 중앙값은 다 들어가고 p90 부근부터 잘린다.
 *   직무적합 근거   중앙 91자 · p90 132  → 3줄(약 105자)
 *   자소서 본문     중앙 63자 · p90  85  → 2줄(약 86자)
 *   면접 질문       중앙 90자 · p90 111  → 3줄(약 120자)
 *
 * 잘리는 글을 모델로 줄여 넣을 자리는 fitText 의 condensed 다. 백엔드가 줄인
 * 문장을 함께 주면 그쪽을 쓰고, 화면 쪽은 고칠 것이 없다.
 */

/** 섹션별 개수 상한. 줄 수는 page.tsx 의 line-clamp 클래스가 정한다 */
export const PRINT_LIMIT = {
  summaryLines: 3,
  timelineRows: 8,
  deptFitItems: 7,
  /** 직군 근거는 같이 쓰는 목록 부품 안에서 그려져 줄 수로 못 자른다. 글자수로 자른다 */
  deptFitReason: 90,
  essayItemsPerQuestion: 3,
  interviewQuestions: 8,
  papers: 5,
} as const;

/**
 * 글을 글자수 상한에 맞춘다.
 *
 * condensed 는 같은 뜻을 줄여 쓴 문장이다. 지금은 아무도 주지 않지만, 나중에
 * 백엔드가 모델로 줄인 문장을 실어 보내면 통째로 잘라내는 대신 그쪽을 쓴다.
 */
export function fitText(
  raw: string | null | undefined,
  limit: number,
  condensed?: string | null,
): string {
  const text = (raw ?? "").trim();
  if (text.length <= limit) return text;
  const alt = (condensed ?? "").trim();
  if (alt && alt.length <= limit) return alt;
  const src = alt || text;
  return src.slice(0, Math.max(1, limit - 1)).trimEnd() + "…";
}

/** 목록을 개수 상한에 맞춰 자르고, 몇 건이 빠졌는지 함께 돌려준다 */
export function fitList<T>(items: readonly T[], limit: number): { shown: T[]; hidden: number } {
  return { shown: items.slice(0, limit), hidden: Math.max(0, items.length - limit) };
}
