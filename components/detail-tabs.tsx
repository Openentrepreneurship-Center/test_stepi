"use client";

import { useState, type ReactNode } from "react";

interface Props {
  essayContent: ReactNode;
  paperContent: ReactNode;
}

type Tab = "essay" | "paper";

export default function DetailTabs({ essayContent, paperContent }: Props) {
  const [tab, setTab] = useState<Tab>("essay");

  return (
    <div>
      <div className="flex gap-1 border-b border-[var(--line-strong)] mb-8 -mx-1">
        <TabButton active={tab === "essay"} onClick={() => setTab("essay")}>
          자기소개서 분석
        </TabButton>
        <TabButton active={tab === "paper"} onClick={() => setTab("paper")}>
          연구실적 분석
        </TabButton>
      </div>
      <div className={tab === "essay" ? "block" : "hidden"}>{essayContent}</div>
      <div className={tab === "paper" ? "block" : "hidden"}>{paperContent}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-[14px] transition border-b-2 -mb-[1px] ${
        active
          ? "border-[var(--secondary)] text-[var(--ink)] font-medium"
          : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}
