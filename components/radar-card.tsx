"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface Props {
  data: Array<{ axis: string; value: number }>;
  color?: string;
  max?: number;
}

export default function RadarCard({ data, color = "#33307A", max = 10 }: Props) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--line)" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.18}
            isAnimationActive
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--ink)",
            }}
            formatter={(v) => [typeof v === "number" ? v.toFixed(1) : String(v), "점수"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
