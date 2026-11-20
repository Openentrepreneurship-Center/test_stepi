"use client";

import { useSyncExternalStore } from "react";
import { failText, prelim } from "@/lib/api";

// 첨부 zip 전송을 화면과 떼어 둠. 검토를 만든 뒤 결과 화면으로 바로 넘어가도 전송이 이어짐(새로고침·창 닫기에는 끊김)
export type AttachUpload = { ratio: number; error: string | null };

const uploads = new Map<string, AttachUpload>();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const warn = (e: BeforeUnloadEvent) => e.preventDefault();
const sending = () => [...uploads.values()].some((u) => !u.error);

export function startAttachUpload(ticket: string, file: File) {
  uploads.set(ticket, { ratio: 0, error: null });
  window.addEventListener("beforeunload", warn);
  emit();
  prelim.attach
    .send(ticket, file, (ratio) => {
      uploads.set(ticket, { ratio, error: null });
      emit();
    })
    .then(
      () => void uploads.delete(ticket),
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
