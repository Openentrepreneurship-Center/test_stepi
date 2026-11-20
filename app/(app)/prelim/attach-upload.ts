"use client";

import { useSyncExternalStore } from "react";
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

async function sendAll(ticket: string, file: File, from: number | null) {
  if (from === null) await prelim.attach.prepare(ticket, file);
  let offset = from ?? 0;
  let tries = 0;
  while (offset < file.size) {
    try {
      const start = offset;
      const r = await prelim.attach.sendFrom(ticket, file.slice(start, start + PIECE), start, (sent) => {
        uploads.set(ticket, { ratio: (start + sent) / file.size, error: null });
        emit();
      });
      offset = r.received;
      tries = 0;
    } catch (err) {
      if (err instanceof AttachOffsetError) offset = err.received;
      else if (err instanceof ApiError || ++tries > 3) throw err;
      else {
        // 연결이 잠깐 끊긴 것. 서버가 받은 만큼을 다시 읽고 이어 보냄
        await new Promise((r) => setTimeout(r, 3000));
        offset = (await prelim.result(ticket)).attach_received ?? offset;
      }
    }
  }
}

/** from 이 null 이면 처음부터(준비 요청 포함), 숫자면 서버가 받은 그 위치부터 이어 보냄 */
export function startAttachUpload(ticket: string, file: File, from: number | null) {
  uploads.set(ticket, { ratio: from && file.size ? from / file.size : 0, error: null });
  window.addEventListener("beforeunload", warn);
  emit();
  sendAll(ticket, file, from)
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

export const canRememberZip = () =>
  typeof window !== "undefined" && window.isSecureContext && "showOpenFilePicker" in window;

/** 고르기를 취소하면 null */
export async function pickZip(): Promise<{ file: File; handle: ZipHandle } | null> {
  try {
    const [handle] = await (window as unknown as { showOpenFilePicker: Picker }).showOpenFilePicker({
      types: [{ description: "zip", accept: { "application/zip": [".zip"] } }],
    });
    return { file: await handle.getFile(), handle };
  } catch {
    return null;
  }
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
