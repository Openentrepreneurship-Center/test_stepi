import type { JudgedBy, SourceField, ItemFlag } from "./talent-criteria";
import { API_BASE } from "./api";
export type { JudgedBy, SourceField, ItemFlag };

export type Verdict = "O" | "X" | "N";

export interface Evidence {
  type: "paper" | "education" | "career" | "essay";
  // paper
  title?: string;
  journal?: string;
  year?: string;
  /** "(본인순위/전체저자수)" 형식 */
  author_order?: string;
  match_status?: "matched" | "meta_only";
  // education / career
  school?: string;
  company?: string;
  title_text?: string;
  degree?: string;
  status?: string;
  /** "2019.03.02 ~ 2021.05.01 (26개월)" */
  period_text?: string;
  major?: string;
  major_field?: string;
  // essay
  essay_index?: number;
  question?: string;
  /** 원문 인용 (LLM 판정 시) */
  quote?: string;
}

export interface ItemResult {
  /** "전문성-4" */
  item_id: string;
  evidence: Evidence[];
  status: "pending" | "evaluated";
  no: number;
  name: string;
  question: string;
  verdict: Verdict;
  judged_by: JudgedBy;
  rule: string;
  x_example: string | null;
  source_fields: SourceField[];
  ladder: string | null;
  flags: ItemFlag[];
  /** N 인 경우 사유 */
  reason: string | null;
}

export interface AxisResult {
  axis: string;
  /** lib/talent-types.ts 의 번호 */
  no: number;
  /** 유효 문항 기준 점수. 전 문항이 N 이면 null (판정 불가) */
  score: number | null;
  o_count: number;
  x_count: number;
  n_count: number;
  /** 10 − n_count */
  effective_total: number;
  /** 유효 문항이 충분한가. 적으면 점수를 그대로 비교하면 안 된다 */
  enough: boolean;
  /** 사양서에 문항표가 있는 인재상인지. false 면 문항 자체가 목업이다 */
  defined: boolean;
  items: ItemResult[];
}

export interface ApplicantEvaluation {
  applicant_id: string;
  catalog_version: string;
  catalog_hash: string;
  reference_date: string | null;
  /** 사양서 계약 필드. 재현성 추적용이며 아직 화면에 쓰지 않는다 */
  evaluated_at: string;
  prompt_version: string;
  axes: AxisResult[];
}


export const TALENT_SCORE_MAX = 10;
export const TALENT_SCORE_DISPLAY_MAX = 100;
export const MIN_EFFECTIVE_ITEMS = 3;
export function formatScore100(score: number | null): string {
  return score === null ? "판정 불가" : (score * 10).toFixed(0);
}
export function evidenceFor(_applicantId: string, item: ItemResult): Evidence[] {
  return item.evidence;
}
export async function getEvaluation(jobId: string, applicantId: string, signal?: AbortSignal): Promise<ApplicantEvaluation> {
  const res = await fetch(`${API_BASE}/analysis-jobs/${encodeURIComponent(jobId)}/applicants/${encodeURIComponent(applicantId)}/talent-evaluation`, { cache: "no-store", signal });
  if (!res.ok) throw new Error("인재상 판정 결과를 불러오지 못했습니다.");
  return res.json();
}
