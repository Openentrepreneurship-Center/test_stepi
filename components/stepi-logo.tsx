import Image from "next/image";
import ci from "@/public/stepi-ci.png";
import mark from "@/public/stepi-mark.png";

interface Props {
  /** 그림 높이(px). 폭은 원본 비율로 따라간다 */
  size?: number;
  variant?: "full" | "mark";
  /** 어두운 배경용 흰색 */
  inverted?: boolean;
  className?: string;
}

export default function StepiLogo({ size = 38, variant = "full", inverted = false, className }: Props) {
  const src = variant === "full" ? ci : mark;
  const width = Math.round((size * src.width) / src.height);
  return (
    <Image
      src={src}
      alt={variant === "full" ? "과학기술정책연구원 STEPI" : "STEPI"}
      width={width}
      height={size}
      loading="eager"
      className={`${inverted ? "brightness-0 invert" : ""} ${className ?? ""}`}
    />
  );
}
