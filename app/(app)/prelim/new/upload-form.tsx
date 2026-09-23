"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import PageHeader from "@/components/page-header";
import { prelim, type PrelimRefSummary } from "@/lib/api";
import "../prelim.css";

type Slot = "essay" | "attach" | "origin";

const EMPTY_TEXT = "파일을 여기로 끌어다 놓으세요";

// 암호를 건 xlsx·xlsm 은 zip 이 아니라 OLE 문서(D0 CF 11 E0)로 저장된다
async function isLockedExcel(f: File): Promise<boolean> {
  if (!/\.xls[xm]$/i.test(f.name)) return false;
  const b = new Uint8Array(await f.slice(0, 4).arrayBuffer());
  return b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0;
}

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
  onPick: (f: File | null) => Promise<boolean>;
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
        onChange={async (e) => {
          const input = e.currentTarget;
          // 거절한 파일은 입력칸에서도 비워 같은 파일을 다시 골라도 반응하게 한다
          if (!(await onPick(input.files?.[0] ?? null))) input.value = "";
        }}
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
  });
  const [evalDate, setEvalDate] = useState("");
  const [saveName, setSaveName] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [ref, setRef] = useState<PrelimRefSummary | null>(null);

  // 내부위원·섭외 심사위원·연구기관은 제척 기준 정보 탭에서 읽는다는 안내용 건수
  useEffect(() => {
    let alive = true;
    prelim.reference
      .summary()
      .then((r) => alive && setRef(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const pick = (slot: Slot, label?: string) => async (f: File | null) => {
    if (f && label && (await isLockedExcel(f))) {
      setFiles((prev) => ({ ...prev, [slot]: null }));
      window.alert(
        `${label} 파일에 암호가 걸려 있어 올릴 수 없습니다.\n` +
          "엑셀에서 암호를 지운 뒤(파일 > 정보 > 통합 문서 보호 > 암호 설정) 다시 올려 주세요.",
      );
      return false;
    }
    setFiles((prev) => ({ ...prev, [slot]: f }));
    return true;
  };
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
                <span className="hint">필수 1개 · 선택 2개</span>
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
                  onPick={pick("essay", "자기소개서")}
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
                    지원정보 <span className="tag opt">선택</span>
                  </div>
                  <div className="hint">.xlsx 또는 .xlsm 파일</div>
                  <div className="hint">지원자 학력·경력을 읽습니다. 없으면 제척 검토가 빠집니다</div>
                  <SheetHint sheets={["공고별 지원자 관리"]} note="마이다스인 지원정보 내보내기, 원본 시트도 읽음" />
                </div>
                <DropBox
                  accept=".xlsx,.xlsm"
                  label="지원정보 파일 선택"
                  file={files.origin}
                  onPick={pick("origin", "지원정보")}
                />
              </div>

              <div className="file-row">
                <div>
                  <div className="name">
                    제척 기준 정보 <span className="tag opt">자동</span>
                  </div>
                  <div className="hint">파일을 올리지 않아도 됩니다</div>
                </div>
                <div className="refbox">
                  <span>
                    제척 기준 정보에서 불러옵니다
                    {ref && (
                      <>
                        {" "}
                        · 내부위원 <b>{ref.staff.count}명</b> · 섭외 심사위원 <b>{ref.reviewers.count}명</b> · 연구기관{" "}
                        <b>{ref.orgs.count}곳</b>
                      </>
                    )}
                  </span>
                  <Link href="/prelim/reference" className="btn link">
                    제척 기준 정보 보기 →
                  </Link>
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
