"use client";

import type { PrelimUploadKind } from "@/lib/api";

export const BLABEL: Record<string, string> = { confirm: "위배 확정", dismiss: "문제 없음", hold: "보류" };
export const STAGES = ["서류", "필기", "면접"] as const;
export const OUT_STAGES = ["서류", "필기"] as const;

export function Dash({ v, mono }: { v: string | null | undefined; mono?: boolean }) {
  return v ? <span className={mono ? "mono" : undefined}>{v}</span> : <span className="no2">-</span>;
}

export function Y2({ yes }: { yes: boolean }) {
  return yes ? <span className="yes2">해당(2년 이내)</span> : <span className="no2">미해당</span>;
}

function XIcon({ cap }: { cap: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="2.5" y="1.5" width="17" height="15" rx="1.5" fill="#1d6f42" />
      <path d="M6.6 5.2 11 12.8M11 5.2 6.6 12.8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.2 5.6h3.4M13.2 9h3.4M13.2 12.4h3.4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
      {cap && <rect x="4" y="15" width="14" height="6.4" rx="1.4" fill="#a2191f" />}
    </svg>
  );
}

/** 표별 엑셀 버튼. 서버가 attachment 로 내려주므로 링크로 연다 */
export function XBtn({ href, cap, title }: { href: string; cap?: string; title: string }) {
  return (
    <button
      className={`xbtn${cap ? " xmark" : ""}`}
      type="button"
      title={title}
      aria-label={title}
      onClick={() => {
        const a = document.createElement("a");
        a.href = href;
        a.download = "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }}
    >
      <XIcon cap={!!cap} />
      <span>{cap || "전체"}</span>
    </button>
  );
}

export function UpBtn({
  kind,
  label,
  fileName,
  busy,
  onPick,
}: {
  kind: PrelimUploadKind;
  label: string;
  fileName?: string;
  busy: boolean;
  onPick: (kind: PrelimUploadKind, file: File) => void;
}) {
  return (
    <label className={`upbtn${fileName ? " done" : ""}`} aria-disabled={busy}>
      <span aria-hidden="true">{fileName ? "✓" : "⬆"}</span>
      {busy ? "올리는 중" : fileName || label}
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onPick(kind, f);
        }}
      />
    </label>
  );
}
