"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import {
  prelimRetention,
  type PrelimRetentionError,
  type PrelimRetentionPreview,
  type PrelimRetentionRun,
} from "@/lib/api";
import { useFocusTrap } from "@/lib/use-focus-trap";

type Msg = { ok: boolean; text: string } | null;

// 서버가 준 "2026-10-15T10:20:30" 을 "2026-10-15 10:20" 으로만 바꿔 보인다
const stamp = (s: string) => s.replace("T", " ").slice(0, 16);

/** 영구 삭제 확인 창. 엑셀 업로드 미리보기 창과 같은 모양, 배경을 눌러도 닫지 않는다 */
function ConfirmDelete({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  useFocusTrap(boxRef);
  useEffect(() => {
    // 엑셀 업로드 미리보기 창처럼 뒤 화면 스크롤을 잠그고, 스크롤바 폭만큼 채워 화면이 밀리지 않게 한다
    const body = document.body.style;
    const prev = { overflow: body.overflow, paddingRight: body.paddingRight };
    const width = document.body.getBoundingClientRect().width;
    body.overflow = "hidden";
    const gap = document.body.getBoundingClientRect().width - width;
    if (gap > 0) body.paddingRight = `${gap}px`;
    return () => {
      Object.assign(body, prev);
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(27,26,64,0.32)] p-4">
      <div
        ref={boxRef}
        tabIndex={-1}
        className="imp-box"
        style={{ width: "min(480px, 100%)" }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rt-confirm-title"
        aria-describedby="rt-confirm-desc"
      >
        <header className="imp-head">
          <h2 id="rt-confirm-title">외부위원 회차 정리</h2>
        </header>
        <div className="imp-body">
          <p id="rt-confirm-desc" className="m-0">
            <b>{count}건</b>을 영구 삭제합니다. 삭제한 회차는 복원할 수 없습니다.
            <br />
            계속할까요?
          </p>
        </div>
        <footer className="imp-foot">
          <div className="flex justify-end gap-3">
            <button type="button" className="btn sm quiet" onClick={onCancel}>
              취소
            </button>
            <button type="button" className="btn sm primary" onClick={onConfirm}>
              영구 삭제
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function RetentionPanel() {
  const [preview, setPreview] = useState<PrelimRetentionPreview | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PrelimRetentionRun[] | null>(null);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      setPreview(await prelimRetention.preview());
      setPreviewFailed(false);
    } catch {
      setPreview(null);
      setPreviewFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setHistory((await prelimRetention.history()).items);
      setHistoryFailed(false);
    } catch {
      setHistoryFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 첫 조회
    void loadPreview();
    void loadHistory();
  }, [loadPreview, loadHistory]);

  function refresh() {
    setMsg(null);
    void loadPreview();
    void loadHistory();
  }

  async function run() {
    setAsking(false);
    if (!preview || running) return;
    setRunning(true);
    setMsg(null);
    try {
      const r = await prelimRetention.run({ token: preview.token, base_date: preview.base_date, count: preview.count });
      setMsg({ ok: true, text: `${r.deleted_count}건을 삭제했습니다.` });
    } catch (e) {
      const err = e as PrelimRetentionError;
      setMsg({
        ok: false,
        text:
          err.status === undefined
            ? "응답을 받지 못했습니다. 삭제되었는지 아래 실행 이력과 대상 목록에서 확인해 주세요."
            : err.status === 409
              ? `${err.message} 대상을 새로 불러왔습니다.`
              : err.message,
      });
    } finally {
      setRunning(false);
      await Promise.all([loadPreview(), loadHistory()]);
      // 확인 창이 닫힐 때 삭제 버튼이 비활성이라 초점이 빠지므로 결과 문구로 옮긴다
      msgRef.current?.focus();
    }
  }

  const count = preview?.count ?? 0;
  const canDelete = !!preview && count > 0 && !loading && !running;

  return (
    <div className="prelim mt-6 grid gap-6">
      {previewFailed ? (
        <div className="empty" role="alert">
          대상을 불러오지 못했습니다. 잠시 뒤 미리보기 새로고침을 눌러 주세요.
        </div>
      ) : !preview ? (
        <div className="empty" role="status">
          대상을 불러오는 중입니다.
        </div>
      ) : (
        <dl className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-[var(--line)] border border-[var(--line)]">
          {[
            ["기준일", preview.base_date, "서버 기준 오늘"],
            ["경계일", preview.cutoff, "이 날짜 전 회차가 대상, 당일은 남김"],
            ["삭제 대상", `${preview.count}건`, "외부위원 회차"],
            ["남기는 내부위원 회차", `${preview.excluded_internal}건`, "경계일 전이라도 남김"],
            [
              "확인 필요",
              `${preview.needs_check.unknown_origin + preview.needs_check.missing_date}건`,
              `내부/외부 미지정 ${preview.needs_check.unknown_origin}건, 일자 없음 ${preview.needs_check.missing_date}건. 자동으로 지우지 않습니다.`,
            ],
          ].map(([k, v, sub]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-[13.5px] text-[var(--muted)]">{k}</dt>
              <dd className="mt-1 text-[19px] font-semibold tabular-nums">{v}</dd>
              <dd className="mt-1 text-[13px] leading-[1.45] text-[var(--muted)]">{sub}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn sm quiet" onClick={refresh} disabled={loading || running}>
          <RefreshCw size={16} aria-hidden="true" className={loading ? "animate-spin" : undefined} />
          미리보기 새로고침
        </button>
        <button
          type="button"
          className="btn sm primary"
          onClick={() => setAsking(true)}
          disabled={!canDelete}
        >
          <Trash2 size={16} aria-hidden="true" />
          {running ? "삭제하는 중" : preview ? `대상 ${count}건 삭제` : "대상 삭제"}
        </button>
        {loading && preview && (
          <span className="hint" role="status">
            대상을 다시 불러오는 중입니다.
          </span>
        )}
      </div>

      {asking && preview && <ConfirmDelete count={count} onCancel={() => setAsking(false)} onConfirm={() => void run()} />}

      {msg && (
        <p ref={msgRef} tabIndex={-1} role={msg.ok ? "status" : "alert"} className={msg.ok ? "upload-note" : "ref-error"}>
          {msg.text}
        </p>
      )}

      {preview && (
        <section className="grid gap-3">
          <h2>삭제 대상 회차</h2>
          {preview.items.length === 0 ? (
            <div className="empty">정리할 회차가 없습니다. 경계일 전의 외부위원 회차가 없습니다.</div>
          ) : (
            <table className="dtable">
              <thead>
                <tr>
                  <th>채용명</th>
                  <th>전형</th>
                  <th>일자</th>
                  <th>성명</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((r) => (
                  <tr key={r.id}>
                    <td>{r.recruitment ?? ""}</td>
                    <td>{r.stage ?? ""}</td>
                    <td className="mono">{r.held_on}</td>
                    <td className="nm">{r.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="grid gap-3">
        <h2>
          실행 이력 <span className="hint">최근 20건, 실행 시각·기준일·삭제 건수만 남깁니다</span>
        </h2>
        {historyFailed ? (
          <div className="empty" role="alert">
            실행 이력을 불러오지 못했습니다. 잠시 뒤 미리보기 새로고침을 눌러 주세요.
          </div>
        ) : !history ? (
          <div className="empty" role="status">
            실행 이력을 불러오는 중입니다.
          </div>
        ) : history.length === 0 ? (
          <div className="empty">아직 실행한 기록이 없습니다.</div>
        ) : (
          <table className="dtable">
            <thead>
              <tr>
                <th>실행 시각</th>
                <th>기준일</th>
                <th>경계일</th>
                <th>삭제 건수</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="mono">{stamp(h.run_at)}</td>
                  <td className="mono">{h.base_date}</td>
                  <td className="mono">{h.cutoff}</td>
                  <td className="tabular-nums">{h.deleted_count}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
