const BADGE =
  "inline-flex shrink-0 items-center rounded-[2px] bg-[var(--bad)] px-2.5 py-1 text-[13.5px] font-bold leading-[1.4] text-white align-middle";

/**
 * 아직 개발되지 않은 값에 붙이는 배지. 카드 제목 옆에 단다.
 * 문구는 어디서나 같아야 하므로 바꿀 수 없게 두었다.
 */
export function MockBadge() {
  return <span className={BADGE}>준비 중</span>;
}

/** 예시 값도 없이 기능만 비어 있는 카드에 붙인다. 예시 데이터가 없으므로 MockBadge 를 쓰지 않는다 */
export function PendingBadge() {
  return <span className={BADGE}>준비 중</span>;
}

/** AI 검토의 실험 상태. 기존 준비 중 배지와 동일한 디자인을 사용한다. */
export function ExperimentalBadge() {
  return <span className={BADGE}>실험중</span>;
}
