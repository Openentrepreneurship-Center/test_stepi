"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { ApiError, AttachOffsetError, failText, prelim } from "@/lib/api";

// 첨부 zip 전송을 화면과 떼어 둠. 결과 화면으로 넘어가도 이어지고, 새로고침·창 닫기로 끊기면 서버가 받은 곳부터 다시 보냄(PRELIM-002)
// done: 다 보냈고 서버가 검사 대기로 바꾼 것. 결과 화면이 다시 읽기 전까지 멈춘 것으로 보이지 않게 남겨 둠
export type AttachUpload = { ratio: number; error: string | null; done?: boolean };

// 기관 nginx 의 요청당 상한(8G)보다 작게 나눠 보냄
const PIECE = 512 * 1024 ** 2;
const uploads = new Map<string, AttachUpload>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const warn = (e: BeforeUnloadEvent) => e.preventDefault();
const sending = () => [...uploads.values()].some((u) => !u.error && !u.done);
// 끊긴 앞 요청을 서버가 아직 쥐고 있을 때의 409. 잠깐 뒤 다시 보내면 됨
const BUSY = "다른 창에서 이 첨부를 올리고 있습니다.";

/** 이 창에서 보내고 있지 않은 업로드는 멈춘 것 */
export const isPaused = (status: string | undefined, up: AttachUpload | null) =>
  status === "uploading" && (!up || !!up.error);

async function sendAll(ticket: string, file: File, from: number | null, id?: string | null) {
  const attachId = from === null ? (await prelim.attach.prepare(ticket, file)).attach_id : id;
  let offset = from ?? 0;
  let tries = 0;
  // 다 받았는데 대기로 못 바꾼 채 끊겼으면 빈 조각으로 마무리함
  let status = "uploading";
  while (status === "uploading") {
    try {
      const start = offset;
      const r = await prelim.attach.sendFrom(ticket, file.slice(start, start + PIECE), start, attachId, (sent) => {
        const ratio = (start + sent) / file.size;
        // 화면에 보이는 % 가 바뀔 때만 알림(진행 이벤트마다 결과 화면 전체가 다시 그려지지 않게 함)
        if (Math.round(ratio * 100) === Math.round((uploads.get(ticket)?.ratio ?? -1) * 100)) return;
        uploads.set(ticket, { ratio, error: null });
        emit();
      });
      // 보낼 것이 없는데 서버가 더 기다리면 크기가 어긋난 것. 빈 조각을 거듭 보내지 않음
      if (start >= file.size && r.attach_status === "uploading") throw new ApiError(409, "처음부터 다시 올려 주십시오.");
      offset = r.received;
      status = r.attach_status;
      tries = 0;
    } catch (err) {
      if (err instanceof AttachOffsetError) offset = err.received;
      // 연결 끊김·서버 오류·쓰는 중이면 기다렸다가 같은 위치부터 다시 보냄(어긋나면 서버가 받은 곳을 알려 줌)
      else if (++tries > 5 || (err instanceof ApiError && err.status < 500 && err.reason !== BUSY)) throw err;
      else await new Promise((r) => setTimeout(r, 3000 * tries));
    }
  }
}

/** from 이 null 이면 처음부터(준비 요청 포함), 숫자면 서버가 받은 그 위치부터 id 로 이어 보냄 */
export function startAttachUpload(ticket: string, file: File, from: number | null, id?: string | null) {
  uploads.set(ticket, { ratio: from && file.size ? from / file.size : 0, error: null });
  window.addEventListener("beforeunload", warn);
  emit();
  sendAll(ticket, file, from, id)
    .then(
      () => {
        uploads.set(ticket, { ratio: 1, error: null, done: true });
        void forgetZip(ticket);
      },
      (err) => {
        const error = failText(err, "첨부 실적 업로드에 실패하였습니다.");
        uploads.set(ticket, { ratio: 0, error });
        window.alert(error);
      },
    )
    .finally(() => {
      if (!sending()) window.removeEventListener("beforeunload", warn);
      emit();
    });
}

export function useAttachUpload(ticket: string): AttachUpload | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    () => uploads.get(ticket) ?? null,
    () => null,
  );
}

// 고른 zip 을 기억해 새로고침 뒤 다시 고르지 않고 이어 보냄. 파일 핸들을 쓸 수 있는 브라우저(Chrome·Edge)의 https·localhost 화면에서만 됨
export type ZipHandle = FileSystemFileHandle & {
  requestPermission?: (o: { mode: "read" }) => Promise<PermissionState>;
};
type Picker = (o: object) => Promise<ZipHandle[]>;

// 브라우저가 파일 기억 창을 막으면 이 창에서는 일반 파일 창만 씀
let pickerOff = false;
export const canRememberZip = () =>
  !pickerOff && typeof window !== "undefined" && window.isSecureContext && "showOpenFilePicker" in window;

/** zip 파일 칸의 onClick. 기억할 수 있으면 핸들까지 넘기고, 막히면 일반 파일 창을 엶(고르면 칸의 onChange 로 감) */
export function browseZip(e: MouseEvent<HTMLInputElement>, onFile: (f: File, h: ZipHandle) => void) {
  if (!canRememberZip()) return;
  e.preventDefault();
  const input = e.currentTarget;
  (window as unknown as { showOpenFilePicker: Picker })
    .showOpenFilePicker({ types: [{ description: "zip", accept: { "application/zip": [".zip"] } }] })
    .then(async ([h]) => onFile(await h.getFile(), h))
    .catch((err) => {
      if (err instanceof DOMException && err.name === "AbortError") return;
      pickerOff = true;
      // 바로 거절되면 아직 처음 클릭을 처리하는 중이라 같은 칸의 click() 이 무시됨. 다음 차례로 미룸
      setTimeout(() => input.click());
    });
}

function zipStore<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("stepi-prelim", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("attach-zip");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const req = run(open.result.transaction("attach-zip", mode).objectStore("attach-zip"));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    };
  });
}

// 저장소를 못 쓰는 환경(사생활 보호 창 등)은 기억 없이 다시 고르기로 이어짐
export const rememberZip = (ticket: string, h: ZipHandle) =>
  zipStore("readwrite", (s) => s.put(h, ticket)).catch(() => undefined);
export const recallZip = (ticket: string) =>
  zipStore<ZipHandle | undefined>("readonly", (s) => s.get(ticket)).catch(() => undefined);
export const forgetZip = (ticket: string) =>
  zipStore("readwrite", (s) => s.delete(ticket)).catch(() => undefined);

/** 기억한 파일을 읽음. 버튼을 누를 때 불러야 브라우저 권한 확인이 뜸. 거절하거나 못 읽으면 null */
export async function readZip(h: ZipHandle): Promise<File | null> {
  try {
    if (h.requestPermission && (await h.requestPermission({ mode: "read" })) !== "granted") return null;
    return await h.getFile();
  } catch {
    return null;
  }
}
