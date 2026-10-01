"use client";

import type { PrelimResult } from "@/lib/api";

export type NotUploadedKind = "essay" | "attach" | "origin";

const TEXT: Record<NotUploadedKind, string> = {
  essay: "이 검토에는 자기소개서 파일을 올리지 않았습니다",
  attach: "첨부 실적 zip 을 올리지 않았습니다",
  origin: "이 검토에는 지원정보 파일을 올리지 않았습니다",
};

/** 파일을 올리지 않아 비는 탭이면 그 파일 종류, 아니면 null. 올린 파일 기록이 없는 옛 검토는 안내하지 않는다 */
export function notUploadedKind(data: PrelimResult, tab: string): NotUploadedKind | null {
  const f = data.files_used;
  if (!f) return null;
  if (tab === "essay") return f.apply_xlsx ? null : "essay";
  if (tab === "attach") return data.attach_status === "none" ? "attach" : null;
  if (tab === "inx" || tab === "exx") return f.raw_xlsm ? null : "origin";
  return null;
}

/** 비는 탭은 보이되 내용 대신 이 안내만 보여 준다(9/30 결정) */
export default function NotUploaded({ kind }: { kind: NotUploadedKind }) {
  return <div className="empty">{TEXT[kind]}</div>;
}
