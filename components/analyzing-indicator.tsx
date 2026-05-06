"use client";

import { useEffect, useState } from "react";

export default function AnalyzingIndicator({
  text = "분석중",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 450);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`inline-flex items-baseline ${className}`}>
      <span className="pulse-dot mr-2 self-center" />
      <span>{text}</span>
      <span className="inline-block w-[1.4em] text-left">{dots}</span>
    </span>
  );
}
