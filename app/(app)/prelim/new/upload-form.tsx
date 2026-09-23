"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/components/page-header";
import { prelim, type PrelimBaseResponse } from "@/lib/api";
import "../prelim.css";

type Slot = "essay" | "attach" | "origin" | "edu";

const EMPTY_TEXT = "파일을 여기로 끌어다 놓으세요";

function DropBox({
  accept,
  label,
  file,
  onPick,
  disabled,
  required,
}: {
  accept: string;
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  disabled?: boolean;
  required?: boolean;
}) {
  const [over, setOver] = useState(false);
  const cls = ["drop", over && "over", file && "filled"]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={cls}
      onDragEnter={() => !disabled && setOver(true)}
      onDragOver={() => !disabled && setOver(true)}
      onDragLeave={() => setOver(false)}
      onDrop={() => setOver(false)}
    >
      <span className="fname">{file ? file.name : EMPTY_TEXT}</span>
      <input
        type="file"
        accept={accept}
        required={required}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <span className="btn tertiary">{file ? "변경" : "파일 선택"}</span>
    </div>
  );
}

export default function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<Slot, File | null>>({
    essay: null,
    attach: null,
    origin: null,
    edu: null,
  });
  const [pw, setPw] = useState("2216");
  const [showPw, setShowPw] = useState(false);
  const [evalDate, setEvalDate] = useState("");
  const [saveName, setSaveName] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [base, setBase] = useState<PrelimBaseResponse | null>(null);

  // 등록된 기준 자료. 안 올린 칸은 이걸로 채워진다는 안내용
  useEffect(() => {
    let alive = true;
    prelim.base
      .get()
      .then((r) => alive && setBase(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const baseHint = (kind: "raw_xlsm" | "academic_xlsx") => {
    const f = base?.items[kind];
    return f ? (
      <div className="hint sheets basehint">
        <div>비우면 기준 파일 사용</div>
        <div className="one">{f.file_name}</div>
        <div className="one note">{f.uploaded_at.slice(0, 10)} 등록</div>
      </div>
    ) : base ? (
      <div className="hint sheets basehint" style={{ color: "var(--red-text)" }}>
        <div>등록된 기준 파일이 없습니다</div>
        <div className="one bad">올리지 않으면 이 검사는 빠집니다</div>
      </div>
    ) : null;
  };

  const pick = (slot: Slot) => (f: File | null) =>
    setFiles((prev) => ({ ...prev, [slot]: f }));
  const ready = !!files.essay;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.essay || running) return;
    setRunning(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("apply_xlsx", files.essay);
      if (files.origin) form.append("raw_xlsm", files.origin);
      if (files.edu) form.append("academic_xlsx", files.edu);
      if (files.edu && pw.trim()) form.append("academic_password", pw.trim());
      if (evalDate) form.append("eval_date", evalDate);
      if (saveName.trim()) form.append("label", saveName.trim());
      const res = await prelim.run(form);
      if (files.attach) {
        setProgress(0);
        try {
          await prelim.attach.send(res.ticket, files.attach, setProgress);
        } catch (err) {
          // 자기소개서 검토는 이미 끝났다. 결과 화면은 열어 주고 첨부 실패만 알린다
          window.alert(
            `첨부 실적은 올리지 못했습니다. ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
      router.push(`/prelim/${encodeURIComponent(res.ticket)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  }

  return (
    <div className="px-8 lg:px-12 py-9 max-w-[1400px] mx-auto fade-up">
      <PageHeader
        back={{ href: "/prelim", label: "분석 현황" }}
        eyebrow="사전스크리닝 검토"
        icon={ShieldAlert}
        title="신규 검토 생성"
        description="자기소개서·첨부 실적의 블라인드 위배 여부와 내부·외부 제척사항을 한 번에 점검합니다."
        wideDescription
      />
      <div className="prelim mt-8">
        <div className="upload-cols">
          <form className="stack" style={{ gap: 32 }} onSubmit={submit}>
            <section className="stack">
              <div className="sec-head">
                <h2>1. 검토 파일</h2>
                <span className="hint">필수 1개 · 선택 3개</span>
              </div>

              <div className="file-row">
                <div>
                  <div className="name">
                    자기소개서 <span className="tag req">필수</span>
                  </div>
                  <div className="hint">.xlsx 파일</div>
                  <SheetHint sheets={["지원자 관리(서술형)", "블라인드 점검"]} />
                </div>
                <DropBox
                  accept=".xlsx"
                  label="자기소개서 xlsx 파일 선택"
                  file={files.essay}
                  onPick={pick("essay")}
                  required
                />
              </div>

              <div className="file-row">
                <div>
                  <div className="name">
                    첨부 실적 <span className="tag opt">선택</span>
                  </div>
                  <div className="hint">.zip 파일 (pdf·docx·이미지)</div>
                  <div className="hint">
                    첨부 실적은 5GB 까지 올릴 수 있습니다
                  </div>
                </div>
                <DropBox
                  accept=".zip"
                  label="첨부 실적 zip 파일 선택"
                  file={files.attach}
                  onPick={pick("attach")}
                />
              </div>

              <div className="file-row">
                <div>
                  <div className="name">
                    내부위원 학력정보 <span className="tag opt">선택</span>
                  </div>
                  <div className="hint">.xlsm 파일</div>
                  <SheetHint sheets={["원본", "내부제척", "외부제척"]} />
                  {baseHint("raw_xlsm")}
                </div>
                <DropBox
                  accept=".xlsm"
                  label="내부위원 학력정보 xlsm 파일 선택"
                  file={files.origin}
                  onPick={pick("origin")}
                />
              </div>

              <div className="file-row">
                <div>
                  <div className="name">
                    학력제척 <span className="tag opt">선택</span>
                  </div>
                  <div className="hint">암호화된 .xlsx 파일</div>
                  <SheetHint sheets={["학력제척"]} note="학력제척_백데이터1 은 있으면 사용" />
                  {baseHint("academic_xlsx")}
                </div>
                <DropBox
                  accept=".xlsx"
                  label="학력제척 xlsx 파일 선택"
                  file={files.edu}
                  onPick={pick("edu")}
                />
                <div className="field pw">
                  <label htmlFor="prelim-pw">파일 열기 암호</label>
                  <div className="pw-box">
                    <input
                      className="input"
                      id="prelim-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password"
                      data-1p-ignore
                      data-lpignore="true"
                      placeholder="2216"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-pressed={showPw}
                      onClick={() => setShowPw((v) => !v)}
                    >
                      {showPw ? "숨김" : "표시"}
                    </button>
                  </div>
                  <div className="hint">
                    <div>학력제척 파일을 여는 데만 사용합니다.</div>
                    <div>기본값 2216, 파일 암호가 다르면 고쳐 주세요.</div>
                  </div>
                </div>
              </div>
            </section>

            <section className="stack">
              <h2>2. 검토 설정</h2>
              <div className="two">
                <div className="field">
                  <label htmlFor="prelim-evaldate">평가기준일</label>
                  <input
                    className="input"
                    id="prelim-evaldate"
                    type="date"
                    value={evalDate}
                    onChange={(e) => setEvalDate(e.target.value)}
                  />
                  <span className="hint">
                    비워 두면 오늘 날짜를 기준으로 검토합니다.
                  </span>
                </div>
                <div className="field">
                  <label htmlFor="prelim-savename">저장명</label>
                  <input
                    className="input"
                    id="prelim-savename"
                    type="text"
                    placeholder="예: 2026년 1차"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <span className="hint">검토 결과를 구분하는 이름입니다.</span>
                </div>
              </div>
            </section>

            <div className="run">
              <button
                className="btn primary"
                type="submit"
                disabled={!ready || running}
                style={{ minWidth: 200, justifyContent: "space-between" }}
              >
                {running
                  ? progress !== null
                    ? `첨부 올리는 중 ${Math.round(progress * 100)}%`
                    : "검토 중"
                  : "검토 실행"}{" "}
                <span aria-hidden="true">→</span>
              </button>
              <span
                role={error ? "alert" : undefined}
                style={error ? { color: "var(--red-text)" } : undefined}
              >
                {error ??
                  (ready
                    ? "필수 파일이 준비되었습니다. 선택 파일 없이도 검토할 수 있습니다."
                    : "자기소개서 파일을 올리면 검토를 실행할 수 있습니다.")}
              </span>
            </div>
          </form>

          <aside className="info">
            <h2>이 검토에서 확인하는 항목</h2>
            <div>
              <b>자기소개서 위배</b>
              <p>
                자기소개서 항목별로 블라인드 기준을 벗어난 표현이 있는지
                확인합니다.
              </p>
            </div>
            <div>
              <b>첨부 실적 내 위배</b>
              <p>
                제출한 실적 파일의 본문·파일명에 지원자 성명이 남아 있는지
                확인합니다.
              </p>
            </div>
            <div>
              <b>제척(내부·외부)</b>
              <p>
                평가기준일 기준 최근 2년 내 내부 과제 참여·외부기관 재직 경력을
                확인합니다.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/** 파일 칸의 "읽는 시트" 안내. 이름은 한 줄에 하나씩 */
function SheetHint({ sheets, note }: { sheets: string[]; note?: string }) {
  return (
    <div className="hint sheets">
      <div>읽는 시트</div>
      {sheets.map((name) => (
        <div key={name} className="one">
          {name}
        </div>
      ))}
      {note && <div className="one note">({note})</div>}
    </div>
  );
}
