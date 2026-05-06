interface Props {
  data: Array<{ department: string; score: number }>;
}

export default function DeptBar({ data }: Props) {
  const max = Math.max(...data.map((d) => d.score), 10);
  return (
    <ul className="space-y-3">
      {data.map((d) => {
        const pct = (d.score / max) * 100;
        return (
          <li key={d.department} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm text-[var(--ink)] truncate">{d.department}</span>
                <span className="serif text-sm tabular-nums text-[var(--ink-muted)]">
                  {d.score.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{
                    width: `${pct}%`,
                    background:
                      "linear-gradient(90deg, var(--gold), var(--gold-2))",
                  }}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
