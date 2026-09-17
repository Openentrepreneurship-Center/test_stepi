/**
 * 아직 개발되지 않은 값에 붙이는 배지. 카드 제목 옆에 단다.
 * 문구는 어디서나 같아야 하므로 바꿀 수 없게 두었다.
 */
export function MockBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[2px] bg-[var(--bad)] px-2.5 py-1 text-[13.5px] font-bold leading-[1.4] text-white align-middle">
      미개발, 예시 데이터
    </span>
  );
}

