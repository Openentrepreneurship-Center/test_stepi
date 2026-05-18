// LLM (Qwen3-4B) 어색한 어미 보정 — display-time only.
// 프롬프트 v1.1 재생성 후에는 사실상 no-op 이 되지만 레거시 데이터를 위해 유지.
//
// 대상: 한국어 동사 "보이다/보여주다" 의 비표준 명사형 종결
//   보여함 / 보여냄 → 보여줌 (보여주다의 명사형)
//   보여짐         → 보임 (보이다 피동 표현 어색)
// 안전성: 단어 경계가 한글 사이라 단순 치환해도 다른 표현과 충돌 적음.

const REPLACEMENTS: Array<[RegExp, string]> = [
  [/보여함/g, "보여줌"],
  [/보여냄/g, "보여줌"],
  [/보여짐/g, "보임"],
];

export function cleanReason(text: string | null | undefined): string {
  if (!text) return "";
  let out = text;
  for (const [re, rep] of REPLACEMENTS) out = out.replace(re, rep);
  return out;
}
