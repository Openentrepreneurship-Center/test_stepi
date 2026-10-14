"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import PageHeader from "@/components/page-header";
import PrelimList from "../prelim-list";
import RetentionPanel from "./retention-panel";
import "../prelim.css";

type Tab = "reviews" | "retention";
const TABS: { key: Tab; label: string }[] = [
  { key: "reviews", label: "검토 삭제 항목" },
  { key: "retention", label: "외부위원 회차 정리" },
];

export default function TrashTabs({ initial }: { initial: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);

  function pick(t: Tab) {
    setTab(t);
    // 새로고침해도 같은 탭이 열리게 주소에 남긴다
    window.history.replaceState(null, "", t === "retention" ? "?tab=retention" : window.location.pathname);
  }

  const bar = (
    <div className="prelim mt-2">
      <div className="tabs" role="tablist" aria-label="삭제 항목 종류">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} onClick={() => pick(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (tab === "reviews") return <PrelimList trashed tabs={bar} />;
  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        eyebrow="사전스크리닝 검토"
        icon={Trash2}
        title="삭제 항목"
        description={"섭외 심사위원 목록에서 기준일로부터 2년이 지난 외부위원 회차를 정리합니다.\n같은 위원의 최근 회차와 내부위원 회차는 남기며, 삭제한 회차는 복원할 수 없습니다."}
      />
      {bar}
      <RetentionPanel />
    </div>
  );
}
