interface Props {
  size?: number;
  inverted?: boolean;
  className?: string;
}

export default function StepiLogo({ size = 38, inverted = false, className }: Props) {
  const ink = inverted ? "#FFFFFF" : "#33307A";
  const accent = "#F39200";
  const accentDim = inverted ? "#FFFFFF" : "#33307A";

  return (
    <svg
      width={size * 2.6}
      height={size}
      viewBox="0 0 260 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="STEPI"
    >
      <text
        x="0"
        y="78"
        fontFamily="Pretendard, system-ui, sans-serif"
        fontWeight={800}
        fontSize="84"
        letterSpacing="-2"
        fill={ink}
      >
        STEPI
      </text>
      {/* dot pattern, top-right */}
      <g>
        {Array.from({ length: 4 }).flatMap((_, col) =>
          Array.from({ length: 3 }).map((_, row) => {
            const cx = 200 + col * 14;
            const cy = 8 + row * 14;
            // top-right cluster orange
            const isOrange = (col >= 2 && row === 0) || (col === 3 && row === 1);
            return (
              <circle
                key={`${col}-${row}`}
                cx={cx}
                cy={cy}
                r={5}
                fill={isOrange ? accent : accentDim}
              />
            );
          }),
        )}
      </g>
    </svg>
  );
}
