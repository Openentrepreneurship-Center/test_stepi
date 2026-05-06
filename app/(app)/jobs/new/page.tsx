"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, FileSpreadsheet, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

const TRACKS = [
  { value: "", label: "자동 추정 (시트 이름 기반)" },
  { value: "연구직", label: "연구직" },
  { value: "전문연구직", label: "전문연구직" },
  { value: "행정직", label: "행정직" },
];

export default function NewJobPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [track, setTrack] = useState("");
  const [mode, setMode] = useState<"full" | "score_only" | "questions_only">("full");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api.uploadExcel(file, {
        request_id: label || undefined,
        mode,
        job_track: track || undefined,
      });
      await fetch("/api/jobs/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: r.job_id, label, created_at: r.created_at }),
      });
      router.push(`/jobs/${r.job_id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "업로드 실패");
      setBusy(false);
    }
  };

  return (
    <div className="px-8 lg:px-14 py-12 max-w-3xl mx-auto fade-up">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] mb-8 transition"
      >
        <ArrowLeft size={13} /> 대시보드
      </Link>
      <h1 className="serif text-[36px] leading-[1.15] mb-4 border-b border-[var(--line-strong)] pb-6">
        자기소개서 배치 업로드
      </h1>
      <p className="text-[15px] text-[var(--ink-muted)] leading-[1.8] mb-10 max-w-[54ch]">
        엑셀 파일에 담긴 지원자 자소서를 일괄 분석합니다. 분석은 비동기로 진행되며,
        진행 상태는 다음 화면에서 실시간으로 확인할 수 있습니다.
      </p>

      <form onSubmit={submit} className="space-y-10">
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-muted)] mb-2">
            엑셀 파일 (.xlsx)
          </span>
          <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--bg-2)]/40 hover:bg-[var(--bg-2)] transition cursor-pointer py-10 px-6">
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
            {file ? (
              <>
                <FileSpreadsheet size={28} strokeWidth={1.4} className="text-[var(--gold-2)]" />
                <div className="text-center">
                  <div className="text-sm font-medium">{file.name}</div>
                  <div className="text-xs text-[var(--ink-muted)] mt-1">
                    {(file.size / 1024).toFixed(0)} KB · 클릭하여 변경
                  </div>
                </div>
              </>
            ) : (
              <>
                <UploadCloud size={28} strokeWidth={1.4} className="text-[var(--ink-muted)]" />
                <div className="text-center">
                  <div className="text-sm font-medium">파일을 끌어놓거나 클릭해서 선택하세요</div>
                  <div className="text-xs text-[var(--ink-muted)] mt-1">
                    .xlsx · 시트당 한 직군 권장
                  </div>
                </div>
              </>
            )}
          </label>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-muted)] mb-2">
              배치 라벨 (선택)
            </span>
            <input
              className="input"
              placeholder="예) 2026 상반기 연구직 1차"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-muted)] mb-2">
              직군 지정
            </span>
            <select
              className="input appearance-none"
              value={track}
              onChange={(e) => setTrack(e.target.value)}
            >
              {TRACKS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--ink-muted)] mb-3">
            분석 깊이
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { v: "full", t: "전체", d: "요약 + 채점 + 면접질문" },
              { v: "score_only", t: "채점만", d: "직무적합도 5축만 (~빠름)" },
              { v: "questions_only", t: "면접질문만", d: "RAG 질문 6–8개" },
            ].map((opt) => (
              <label
                key={opt.v}
                className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                  mode === opt.v
                    ? "border-[var(--gold)] bg-[var(--gold)]/8"
                    : "border-[var(--line-strong)] hover:bg-[var(--bg-2)]"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={opt.v}
                  checked={mode === opt.v}
                  onChange={() => setMode(opt.v as typeof mode)}
                  className="sr-only"
                />
                <div className="font-medium text-sm">{opt.t}</div>
                <div className="text-xs text-[var(--ink-muted)] mt-1">{opt.d}</div>
              </label>
            ))}
          </div>
        </fieldset>

        {err && (
          <div className="text-sm text-[var(--bad)] bg-[var(--bad)]/8 border border-[var(--bad)]/30 rounded-lg px-3.5 py-2.5">
            {err}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" className="btn-primary" disabled={!file || busy}>
            {busy ? "업로드 중…" : "분석 시작"}
          </button>
        </div>
      </form>
    </div>
  );
}
