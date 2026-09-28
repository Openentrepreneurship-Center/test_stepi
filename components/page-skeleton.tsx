// 서버에서 데이터를 받는 동안 보여 주는 화면 뼈대. 각 화면의 loading.tsx 가 쓴다.

interface Props {
  /** 제목 위 작은 이름 (예: 지원자 분석). 알면 글자로, 모르면 회색 막대 */
  eyebrow?: string;
  /** 고정 제목이면 글자로 보여 주고, 분석명처럼 바뀌는 제목이면 비워 막대로 */
  title?: string;
  /** list: 표 한 개, detail: 숫자 칸 + 구역 여러 개 */
  variant?: "list" | "detail";
  /** 뒤로 가기 링크 자리 */
  back?: boolean;
  /** 지원자 상세처럼 넓은 화면 */
  wide?: boolean;
}

export function Bar({ className = "" }: { className?: string }) {
  // span 이라 <p> 안(PageHeader 설명 자리)에도 둘 수 있다
  return <span className={`block rounded-[3px] bg-[var(--bg-2)] ${className}`} />;
}

/** 분석 현황 목록과 같은 테두리 표. 머리 줄은 회색 띠, 본문은 줄마다 막대 */
function TableBox({ rows }: { rows: number }) {
  return (
    <div className="bg-[var(--paper)] border border-[var(--line-strong)] rounded-xl overflow-hidden">
      <div className="h-[45px] bg-[var(--bg-2)] border-b border-[var(--line-strong)]" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-5 px-4 py-5 border-b border-[var(--line)] last:border-b-0">
          <Bar className="h-4 flex-1 max-w-[380px]" />
          <Bar className="h-4 w-16 ml-auto" />
          <Bar className="h-4 w-16 hidden xl:block" />
          <Bar className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** 화면 머리는 이미 그려져 있고 데이터 자리만 비었을 때 쓰는 표 뼈대 */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">불러오는 중입니다</span>
      <div className="animate-pulse" aria-hidden="true">
        <TableBox rows={rows} />
      </div>
    </div>
  );
}

export default function PageSkeleton({ eyebrow, title, variant = "list", back, wide }: Props) {
  const frame = wide
    ? "px-6 lg:px-10 py-8 max-w-[1480px] mx-auto"
    : "px-8 lg:px-12 py-9 max-w-[1400px] mx-auto";

  return (
    <div className={frame} role="status" aria-live="polite">
      <span className="sr-only">불러오는 중입니다</span>
      <div className="animate-pulse" aria-hidden="true">
        {back && <Bar className="h-4 w-24 mb-5" />}

        <div className="pb-5">
          {eyebrow ? (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="h-4 w-[3px] rounded-full bg-[var(--secondary)]" />
              <span className="text-[12.5px] font-bold tracking-[0.08em] text-[var(--ink-muted)]">{eyebrow}</span>
            </div>
          ) : (
            <Bar className="h-4 w-28 mb-3" />
          )}
          {title ? (
            <h1 className="text-[clamp(27px,3.1vw,34px)] font-bold tracking-[-0.02em] leading-[1.12] text-[var(--ink)]">
              {title}
            </h1>
          ) : (
            <Bar className="h-9 w-[min(420px,70%)]" />
          )}
          <Bar className="h-4 w-[min(560px,90%)] mt-4" />
        </div>
        <div className="relative h-[3px] w-full bg-[var(--line)]">
          <span className="absolute left-0 top-0 h-[3px] w-20 bg-[var(--secondary)]" />
        </div>

        {variant === "detail" && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-l border-[var(--line)] first:border-l-0 pl-5 first:pl-0">
                <Bar className="h-3.5 w-16" />
                <Bar className="h-7 w-20 mt-3" />
              </div>
            ))}
          </div>
        )}

        {variant === "list" && (
          <section className="mt-8">
            <Bar className="h-5 w-28 mb-4" />
            <TableBox rows={8} />
          </section>
        )}

        {variant === "detail" && [5, 3].map((rows, s) => (
          <section key={s} className="mt-10">
            <Bar className="h-5 w-32 mb-4" />
            <div className="border-t border-[var(--line)]">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-5 py-4 border-b border-[var(--line)]">
                  <Bar className="h-4 flex-1 max-w-[420px]" />
                  <Bar className="h-4 w-20 ml-auto" />
                  <Bar className="h-4 w-24 hidden md:block" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
