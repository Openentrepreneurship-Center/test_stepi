export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** AbortSignal.timeout 이 없는 옛 Safari 에서는 시간 제한 없이 보낸다 */
const timeoutSignal = (ms: number) =>
  typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(ms) : undefined;

export interface JobSummary {
  job_id: string;
  request_id: string | null;
  mode: string;
  status: JobStatus;
  progress: JobProgress;
  created_at: string;
  updated_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  estimated_finished_at?: string | null;
  estimated_overdue?: boolean;
  error?: string | null;
  deleted_at?: string | null;
}

export interface JobListResponse {
  items: JobSummary[];
  total: number;
  limit: number;
  offset: number;
}

export type JobStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export interface JobProgress {
  total: number;
  done: number;
  /** 오류 횟수 누적. 같은 지원자가 재시도에서 또 실패하면 여러 번 센다 */
  failed: number;
  /** 실패한 지원자 수 */
  failed_applicants: number;
}

/** "실패 2명" 또는 오류가 더 많으면 "실패 2명, 오류 3번" */
export function failedLabel(p: JobProgress, withAttempts = true): string | null {
  const people = p.failed_applicants > 0 ? p.failed_applicants : p.failed;
  if (people <= 0) return null;
  return withAttempts && p.failed > people ? `실패 ${people}명, 오류 ${p.failed}번` : `실패 ${people}명`;
}

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: JobProgress;
  created_at: string;
  updated_at: string;
  error?: string | null;
}

export interface JobResultResponse {
  job_id: string;
  status: JobStatus;
  results: ApplicantResult[] | null;
  error?: string | null;
}

// ─── 실패 원인 보기 ────────────────────────────────────────────────────────

export type FailureCauseCode =
  | "enqueue_failed"
  | "timeout"
  | "gpu_oom"
  | "gpu_unavailable"
  | "model_output_unreadable"
  | "input_unreadable"
  | "unknown";

export interface FailureCause {
  code: FailureCauseCode;
  title: string;
  description: string;
  guidance: string;
  raw_summary?: string | null;
}

export interface JobFailureCause extends FailureCause {
  unprocessed_count: number;
}

export interface FailureAttempt {
  failed_at: string;
  cause_code: FailureCauseCode;
  title: string;
  raw_summary: string | null;
}

export interface FailedApplicant {
  applicant_id: string;
  job_field: string | null;
  failed_at: string;
  raw_summary: string | null;
  attempt_count: number;
  attempts: FailureAttempt[];
}

export interface FailureGroup extends FailureCause {
  count: number;
  applicants: FailedApplicant[];
}

export interface JobFailuresResponse {
  job_id: string;
  status: JobStatus;
  running: boolean;
  total: number;
  failed_applicants: number;
  /** 오류 횟수 누적 */
  failed_attempts: number;
  legacy: boolean;
  legacy_count: number;
  legacy_message: string | null;
  job_cause: JobFailureCause | null;
  groups: FailureGroup[];
}

export interface ApplicantResult {
  applicant_id: string;
  job_track: string;
  job_field?: string | null;
  labels?: Record<string, string | null> | null;
  summary?: {
    overall?: string;
    overall_lines?: string[];
    by_question?: Array<{
      question_id: string;
      question: string;
      item_index?: number;
      title: string;
      content: string;
    }>;
  };
  scores?: {
    core_similarity?: Record<string, number>;
    job_fit?: Record<string, { score: number; reason: string }>;
    job_fit_cosine_percentile?: Record<string, number>;
    department_fit?: Array<{ department: string; score: number }>;
  };
  evidence?: Record<string, Array<{ sentence: string; similarity: number }>>;
  interview_questions?: Array<{
    id: number;
    question: string;
    intent?: string;
    topic_tag?: string;
  }>;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

// ─── 논문 첨부 분석 / 직군 적합도 v2 ────────────────────────────────────────

export type PaperStatus =
  | "uploaded"
  | "extracted"
  | "extract_partial"
  | "extract_fail"
  | "analyzed"
  | "analysis_fail"
  | "meta_only";  // PDF 미첨부, xlsx 학술지 게재 메타만

export interface PaperFile {
  file_id: number | null;  // PDF 미첨부 (meta_only) 시 null
  paper_id: number | null;
  original_filename: string | null;
  size_bytes: number | null;
  status: PaperStatus;
  error_message: string | null;
  uploaded_at: string;
  title?: string | null;
  claimed_title?: string | null;
  claimed_journal?: string | null;
  claimed_year?: string | null;
  match_status?: string | null;
  abstract_chars?: number;
  analyzed_at?: string | null;
  paper_problem?: string | null;
  paper_strength?: string | null;
}

export interface PaperEvidenceCoord {
  page: number;
  bbox: [number, number, number, number];
  text: string;
}

export interface PaperDetail extends PaperFile {
  abstract?: string | null;
  doi?: string | null;
  journal?: string | null;
  year?: string | null;
  authors_text?: string | null;
  paper_problem?: string | null;
  paper_solution?: string | null;
  paper_result?: string | null;
  paper_evidence?: { problem?: string; solution?: string; result?: string } | null;
  paper_tech_stack?: string[] | null;
  paper_process?: string[] | null;
  paper_strength?: string | null;
  paper_weakness?: string | null;
  paper_interview_qs?: string[] | null;
  evidence_with_coords?: Record<string, PaperEvidenceCoord> | null;
}

export interface DeptFitItem {
  dept_name: string;
  score: number;
  reason: string | null;
}

export interface DeptFitResponse {
  applicant_id: string;
  job_track: string;
  skipped: boolean;
  skipped_reason: string | null;
  items: DeptFitItem[];
  computed_at: string | null;
  prompt_version: string | null;
}


export interface TuringMetricsResponse {
  generated_at: string;
  window: { jobs: number; limit: number };
  metrics: {
    hallucination_prevention: {
      rate: number | null;
      numeric_consistency_rate: number | null;
      entity_consistency_rate: number | null;
      nli_entailment_rate: number | null;
      nli_status: string;
      samples: number;
    };
    format_compliance: {
      rate: number | null;
      passed: number;
      total: number;
    };
    response_time: {
      avg_seconds: number | null;
      avg_seconds_per_applicant: number | null;
      p50_seconds: number | null;
      p95_seconds: number | null;
    };
  };
  jobs: Array<{
    job_id: string;
    request_id: string | null;
    status: JobStatus;
    applicants_done: number;
    applicants_total: number;
    duration_seconds: number | null;
    avg_seconds_per_applicant: number | null;
    format_compliance_rate: number | null;
    hallucination_prevention_rate: number | null;
    created_at: string;
    updated_at: string;
    format_errors: string[];
  }>;
}

export interface TuringRiskItem {
  risk_type?: "numeric_mismatch" | "nli_contradiction" | "llm_contradiction" | "llm_unsupported";
  job_id: string;
  request_id: string | null;
  applicant_id: string;
  score: number;
  numeric_rate: number;
  entity_rate: number;
  nli_entailment_rate: number | null;
  nli_status: string;
  numeric_misses: string[];
  entity_misses: string[];
  verdict?: "contradiction" | "unsupported" | "faithful" | null;
  reason?: string | null;
  nli_contradictions?: Array<{
    generated: string;
    source: string;
    qid?: string | null;
    max_con: number;
    max_ent: number;
    reason?: string | null;
  }>;
  generated_excerpt: string;
}

export interface TuringRiskResponse {
  generated_at: string;
  window: { jobs: number; limit: number; job_id?: string | null };
  items: TuringRiskItem[];
}

export interface FeedbackEntry {
  job_id: string;
  applicant_id: string;
  component: string;
  item_key: string;
  rating: boolean;
  created_at: string;
  updated_at: string;
}

/** 백엔드가 주고받는 인재상 세트. lib/talent-selection.ts 의 TalentSet 과 같은 모양 */
export interface TalentSetPayload {
  id: string;
  name: string;
  nos: number[];
}

export interface TalentSelectionResponse {
  job_id: string;
  sets: TalentSetPayload[];
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  // 분석별 선정 인재상 세트 (lib/talent-selection.ts 가 쓴다).
  // id 를 인코딩하지 않으면 "../" 가 든 값이 전송 전에 정규화돼 다른 엔드포인트를 때린다.
  getTalentSelection: (id: string) =>
    http<TalentSelectionResponse>(`/analysis-jobs/${encodeURIComponent(id)}/talent-selection`),
  putTalentSelection: (id: string, sets: TalentSetPayload[]) =>
    http<TalentSelectionResponse>(`/analysis-jobs/${encodeURIComponent(id)}/talent-selection`, {
      method: "PUT",
      body: JSON.stringify({ sets }),
    }),
  // 핵심인재(#1) 레이더의 합격자 평균 기준선
  getCorePassedBaseline: () =>
    http<{ core_passed_baseline: Record<string, number>; n_passed_matched: number; scale: string }>(
      `/core-passed-baseline`,
    ),
  getTuringMetrics: (limit = 30) => http<TuringMetricsResponse>(`/turing/metrics?limit=${limit}`),
  getTuringRisks: (limit = 5, maxItems = 12) =>
    http<TuringRiskResponse>(`/turing/hallucination-risks?limit=${limit}&max_items=${maxItems}`),
  listJobs: (params?: { limit?: number; offset?: number; status?: string; trashed?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    if (params?.status) qs.set("status", params.status);
    if (params?.trashed) qs.set("trashed", "true");
    const suffix = qs.toString() ? `?${qs}` : "";
    return http<JobListResponse>(`/analysis-jobs${suffix}`);
  },
  softDeleteJob: (id: string) =>
    http<void>(`/analysis-jobs/${id}`, { method: "DELETE" }),
  restoreJob: (id: string) =>
    http<{ job_id: string; status: string; created_at: string }>(
      `/analysis-jobs/${id}/restore`,
      { method: "POST" },
    ),
  hardDeleteJob: (id: string) =>
    http<void>(`/analysis-jobs/${id}/permanent`, { method: "DELETE" }),
  getStatus: (id: string) => http<JobStatusResponse>(`/analysis-jobs/${id}`),
  getResult: (id: string) => http<JobResultResponse>(`/analysis-jobs/${id}/result`),
  getFailures: (id: string) =>
    http<JobFailuresResponse>(`/analysis-jobs/${encodeURIComponent(id)}/failures`),
  cancelJob: (id: string) =>
    http<{ job_id: string; status: string; created_at: string }>(
      `/analysis-jobs/${id}/cancel`,
      { method: "POST" },
    ),
  resumeJob: (id: string) =>
    http<{ job_id: string; status: string; created_at: string }>(
      `/analysis-jobs/${id}/resume`,
      { method: "POST" },
    ),
  listFeedback: (id: string, applicantId: string) =>
    http<{ items: FeedbackEntry[] }>(`/analysis-jobs/${id}/applicants/${applicantId}/feedback`),
  upsertFeedback: (
    id: string,
    applicantId: string,
    body: { component: string; item_key?: string; rating: boolean },
  ) =>
    http<FeedbackEntry>(`/analysis-jobs/${id}/applicants/${applicantId}/feedback`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  deleteFeedback: (
    id: string,
    applicantId: string,
    component: string,
    itemKey = "",
  ) => {
    const qs = new URLSearchParams({ component, item_key: itemKey });
    return http<void>(`/analysis-jobs/${id}/applicants/${applicantId}/feedback?${qs}`, {
      method: "DELETE",
    });
  },
  getSourceInput: (id: string) =>
    http<{
      job_id: string;
      applicants: Array<{
        applicant_id: string;
        job_track: string;
        job_field: string | null;
        education: Array<{
          kind: string;
          school?: string;
          degree?: string;
          major?: string;
          major_field?: string;
          start_date?: string;
          end_date?: string;
          status?: string;
          gpa?: string;
          gpa_scale?: string;
        }> | null;
        career: Array<{
          company: string;
          department?: string;
          title?: string;
          duties?: string;
          employment_type?: string;
          period?: string;
          start_date?: string;
          end_date?: string;
        }> | null;
      }>;
    }>(`/analysis-jobs/${id}/source-input`),
  applicantsSummary: (id: string) =>
    http<
      {
        applicant_id: string;
        papers_total: number;
        papers_analyzed: number;
        top_dept: { department: string; score: number } | null;
        dept_skipped: boolean;
      }[]
    >(`/analysis-jobs/${id}/applicants/summary`),
  listExcelSheets: async (file: File): Promise<string[]> => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`${API_BASE}/analysis-jobs/excel-sheets`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<string[]>;
  },
  injectInfoXlsx: async (
    jobId: string,
    infoFile: File,
    opts?: { info_sheet_name?: string; replace?: boolean },
  ) => {
    const fd = new FormData();
    fd.append("info_file", infoFile);
    if (opts?.info_sheet_name) fd.append("info_sheet_name", opts.info_sheet_name);
    if (opts?.replace) fd.append("replace", "true");
    const res = await fetch(`${API_BASE}/analysis-jobs/${jobId}/inject-info-xlsx`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<{
      inserted_papers: number;
      matched_applicants: number;
      unmatched_count: number;
      unmatched_applicants: string[];
      replaced: boolean;
    }>;
  },
  uploadExcel: async (
    file: File,
    extra?: {
      request_id?: string;
      mode?: string;
      job_track?: string;
      info_file?: File;
      sheet_name?: string;
      info_sheet_name?: string;
      limit?: number;
    },
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (extra?.info_file) fd.append("info_file", extra.info_file);
    if (extra?.request_id) fd.append("request_id", extra.request_id);
    if (extra?.mode) fd.append("mode", extra.mode);
    if (extra?.job_track) fd.append("job_track", extra.job_track);
    if (extra?.sheet_name) fd.append("sheet_name", extra.sheet_name);
    if (extra?.info_sheet_name) fd.append("info_sheet_name", extra.info_sheet_name);
    if (extra?.limit !== undefined) fd.append("limit", String(extra.limit));
    const res = await fetch(`${API_BASE}/analysis-jobs/from-excel`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<{ job_id: string; status: string; created_at: string }>;
  },
  deleteApplicant: (id: string, applicantId: string) =>
    http<void>(
      `/analysis-jobs/${id}/applicants/${encodeURIComponent(applicantId)}`,
      { method: "DELETE" },
    ),
  bulkUploadPapers: async (id: string, zipFile: File) => {
    const fd = new FormData();
    fd.append("file", zipFile);
    const res = await fetch(`${API_BASE}/analysis-jobs/${id}/papers/bulk-upload`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<{
      total_pdf_entries: number;
      queued: number;
      duplicate_skipped: number;
      unmatched_applicants: string[];
      errors: string[];
      queued_file_ids: number[];
    }>;
  },
  reportPdfUrl: (id: string) => `${API_BASE}/analysis-jobs/${id}/report.pdf`,
  resultCsvUrl: (id: string) => `${API_BASE}/analysis-jobs/${id}/result.csv`,

  // 논문 첨부
  listPapers: (id: string, applicantId: string) =>
    http<PaperFile[]>(`/analysis-jobs/${id}/applicants/${applicantId}/papers`),
  getPaperDetail: (id: string, applicantId: string, fileId: number) =>
    http<PaperDetail>(`/analysis-jobs/${id}/applicants/${applicantId}/papers/${fileId}`),
  uploadPaper: async (id: string, applicantId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(
      `${API_BASE}/analysis-jobs/${id}/applicants/${applicantId}/papers`,
      { method: "POST", body: fd },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json() as Promise<PaperFile>;
  },
  deletePaper: (id: string, applicantId: string, fileId: number) =>
    http<void>(
      `/analysis-jobs/${id}/applicants/${applicantId}/papers/${fileId}`,
      { method: "DELETE" },
    ),
  paperPdfUrl: (id: string, applicantId: string, fileId: number) =>
    `${API_BASE}/analysis-jobs/${id}/applicants/${applicantId}/papers/${fileId}/pdf`,

  // 직군 적합도 v2
  getDeptFit: (id: string, applicantId: string) =>
    http<DeptFitResponse>(`/analysis-jobs/${id}/applicants/${applicantId}/dept-fit`),
  recomputeDeptFit: (id: string, applicantId: string) =>
    http<{ enqueued: boolean; applicant_id: string }>(
      `/analysis-jobs/${id}/applicants/${applicantId}/dept-fit/recompute`,
      { method: "POST" },
    ),
};

export function gradeFromScores(
  jobFit?: Record<string, { score: number }>,
): { grade: "S" | "A" | "B" | "C" | "D"; avg: number } {
  if (!jobFit) return { grade: "C", avg: 0 };
  const vals = Object.values(jobFit).map((v) => v.score);
  if (vals.length === 0) return { grade: "C", avg: 0 };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  let grade: "S" | "A" | "B" | "C" | "D" = "C";
  if (avg >= 8.5) grade = "S";
  else if (avg >= 8.0) grade = "A";
  else if (avg >= 7.5) grade = "B";
  else if (avg >= 7.0) grade = "C";
  else grade = "D";
  return { grade, avg };
}

export interface BlindHit {
  applicant_id: string;
  essay_no: number;
  category: string;
  term: string;
  snippet: string;
  offset: number;
  confidence: number;
}
export interface RecusalHit {
  applicant_id: string;
  rule: string;
  verdict: string;
  matched: Record<string, unknown>;
  /** 백엔드가 규칙별 템플릿으로 만든 제척사유 문장. 옛 결과에는 없을 수 있다 */
  reason?: string;
}
export interface PrelimCounts {
  applicants: number;
  blind_by_category: Record<string, number>;
  blind_total: number;
  recusal_by_rule: Record<string, number>;
  recusal_total: number;
  /** 수험번호가 빈 줄 수 — 대시보드 지원자 번호와 연결되지 않는 줄 */
  no_id_rows?: number;
  /** 읽지 못해 건너뛴 파일·시트 안내 */
  skipped?: string[];
  /** 이번 실행에 쓴 기준 파일 이름. 직접 올렸으면 null */
  base_files?: Record<PrelimBaseKind, string | null>;
}
export type PrelimBaseKind = "raw_xlsm" | "academic_xlsx";
export interface PrelimBaseFile {
  kind: PrelimBaseKind;
  file_name: string;
  uploaded_at: string;
  /** 등록 때 읽어 둔 시트별 건수 (내부직원 수 등) */
  summary: Record<string, number> | null;
}
export interface PrelimBaseResponse {
  items: Record<PrelimBaseKind, PrelimBaseFile | null>;
  labels: Record<PrelimBaseKind, string>;
}
export interface PrelimRunResponse {
  ticket: string;
  label: string | null;
  eval_date: string;
  counts: PrelimCounts;
  blind_hits: BlindHit[];
  recusal_hits: RecusalHit[];
  truncated_blind: boolean;
  truncated_recusal: boolean;
  warnings?: string[];
}
// ---- 사전스크리닝 결과 화면(담당자 HTML v1). 계산은 서버 derive.py 한 곳, 화면은 받은 값을 그리기만 한다 ----
export type PrelimStage = "서류" | "필기" | "면접";
export type PrelimVerdictValue = "confirm" | "dismiss" | "hold";
export interface PrelimEssayItem {
  id: string; no: string; name: string; type: string; category: string;
  q: number; item: string; itemName: string;
  before: string; hit: string; after: string; why: string;
}
export interface PrelimAttachItem {
  id: string; no: string; name: string; cat: string; file: string;
  lang: string; match: string; hits: number[]; total: number; snip: string;
  is_image?: boolean;
  /** 매칭된 쪽의 발췌. 키는 쪽 번호 */
  excerpts?: Record<string, string>;
  /** 쪽 번호 → 검출 위치 상자 [x0, y0, x1, y1] (쪽 크기 대비 0~1 비율). 위치를 못 잡은 쪽은 없다 */
  boxes?: Record<string, number[][]>;
  in_filename?: boolean;
  ocr_limited?: boolean;
  suggested?: { value: PrelimVerdictValue; reason?: string | null } | null;
}
export interface PrelimInternalRow {
  id: string; no: string; name: string; project: string;
  from: string | null; to: string | null; kind: "내부참여" | "외부참여";
  dept?: string | null; dfrom?: string | null; dto?: string | null;
  pi: string | null; s: string | null; e: string | null; ap: string | null;
  flag: "yes" | "no" | null;
}
export interface PrelimWorkRow {
  id: string; no: string; name: string; dept: string;
  from: string | null; to: string | null;
  hd: string | null; up: string | null; within2y: boolean;
}
export interface PrelimDegreeRow {
  id: string; no: string; name: string; deg: string; school: string; major: string;
  prof: string; staff: string; staffDept: string; staffDeg: string;
}
export interface PrelimExternalRow {
  id: string; no: string; name: string; org: string;
  from: string | null; to: string | null;
}
export interface PrelimView {
  version: number; legacy?: boolean; end: string | null; notice: string | null;
  essay: PrelimEssayItem[]; attach: PrelimAttachItem[];
  external: PrelimExternalRow[];
  missing: { count: number; rows: number[] };
  warnings: string[];
}
export interface PrelimStaffRow {
  name: string; title: string; dept: string; reasons: string[]; nos: string[]; cnt: number;
}
export interface PrelimCommittee {
  src: string[]; name: string; org: string; title: string; phone?: string; mail?: string;
  reasons?: string[];
}
export interface PrelimOrgRow { org: string; people: number; count: number; within: number }
export interface PrelimPersonRow {
  no: string; name: string; essay: number; attach: number; internal: number; external: number;
  essay_done: boolean; out: string | null;
}
export interface PrelimDerived {
  end: string | null; win: string | null;
  summary_fixed: {
    people_matrix: PrelimPersonRow[];
    kpi: {
      essay_total: number; essay_people: number; essay_by_type: [string, number][];
      attach_total: number; attach_done: number;
      internal_total: number; external_total: number;
      missing: { count: number; rows: number[] };
    };
    tab_counts: { essay: number; attach: number; inx: number; exx: number };
    attach_confirmed: number;
    progress: { done: number; total: number };
    org_bars: [string, number][];
    internal_staff: PrelimStaffRow[];
    committee_list: PrelimCommittee[];
    dropped_count: number;
  };
  inx: {
    staff_rows: PrelimStaffRow[];
    pending_count: number;
    internal: PrelimInternalRow[]; work: PrelimWorkRow[]; degree: PrelimDegreeRow[];
    degree_uploaded: boolean;
  };
  exx: Record<PrelimStage, {
    org_rows: PrelimOrgRow[]; limited_org_rows: PrelimOrgRow[]; limited_org_count: number;
    restricted_committee: PrelimCommittee[]; gone_orgs: string[];
  }>;
  exx_detail: (PrelimExternalRow & { within2y: boolean; out: string | null; first: boolean; span: number })[];
  external_edu_count: number;
  warnings: string[];
}
export interface PrelimVerdict { value: string; reason: string | null }
export interface PrelimVerdicts {
  essay: Record<string, PrelimVerdict>;
  attach: Record<string, PrelimVerdict>;
  out: Record<string, PrelimVerdict>;
}
export type PrelimUploadKind = "inx" | "work" | "degree" | "com";
export interface PrelimResult extends PrelimRunResponse {
  computed_at: string;
  applicant_count: number;
  notice: string | null;
  deleted_at: string | null;
  files_used: Record<string, string | null> | null;
  attach_status: "none" | "uploading" | "queued" | "scanning" | "done" | "failed";
  attach_done: number | null; attach_total: number | null;
  attach_error?: string | null;
  view: PrelimView;
  verdicts: PrelimVerdicts;
  uploads: Partial<Record<PrelimUploadKind, { file_name: string; uploaded_at: string | null }>>;
  derived: PrelimDerived;
}

async function prelimJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    let detail: unknown;
    try {
      detail = JSON.parse(text).detail;
    } catch {}
    throw new Error(typeof detail === "string" ? detail : `${fallback}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface PrelimSummary {
  ticket: string;
  label: string | null;
  eval_date: string | null;
  counts: PrelimCounts;
  applicant_count: number;
  computed_at: string;
  notice?: string | null;
  deleted_at?: string | null;
  attach_status?: string;
  /** view 를 저장하기 전의 옛 실행은 null */
  view_counts?: { essay: number; attach: number; inx: number; exx: number } | null;
  judged?: number;
}

export const prelim = {
  async run(form: FormData): Promise<PrelimRunResponse> {
    const res = await fetch(`${API_BASE}/prelim/run`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      // 서버가 detail 에 담아 보낸 한글 안내(예: 학력제척 파일 암호)는 그대로 보여 준다
      const text = await res.text();
      let detail: unknown;
      try {
        detail = JSON.parse(text).detail;
      } catch {}
      throw new Error(typeof detail === "string" ? detail : `prelim/run failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<PrelimRunResponse>;
  },
  list: (opts?: { trashed?: boolean; limit?: number }) =>
    http<{ items: PrelimSummary[] }>(
      `/prelim/results?limit=${opts?.limit ?? 20}${opts?.trashed ? "&trashed=true" : ""}`,
    ),
  remove: (ticket: string, hard = false) =>
    http<{ ticket: string }>(`/prelim/results/${encodeURIComponent(ticket)}${hard ? "?hard=1" : ""}`, { method: "DELETE" }),
  restore: (ticket: string) =>
    http<{ ticket: string }>(`/prelim/results/${encodeURIComponent(ticket)}/restore`, { method: "POST" }),
  get: (ticket: string) => http<PrelimRunResponse>(`/prelim/results/${ticket}`),
  /** 기준 파일(내부위원 학력정보, 학력제척). 한 번 올리면 교체 전까지 매 검토에 같이 쓴다 */
  base: {
    get: () => http<PrelimBaseResponse>(`/prelim/base`),
    async put(kind: PrelimBaseKind, file: File): Promise<PrelimBaseFile> {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/prelim/base/${kind}`, { method: "PUT", body: form });
      if (!res.ok) {
        const text = await res.text();
        let detail: unknown;
        try {
          detail = JSON.parse(text).detail;
        } catch {}
        throw new Error(typeof detail === "string" ? detail : `기준 파일 등록 실패: ${res.status}`);
      }
      return res.json() as Promise<PrelimBaseFile>;
    },
  },
  result: (ticket: string) => http<PrelimResult>(`/prelim/results/${encodeURIComponent(ticket)}`),
  verdict: {
    /** value 가 null 이면 판정 취소. 화면은 응답의 verdicts·derived 로만 갱신한다 */
    async put(ticket: string, body: { kind: "essay" | "attach" | "out"; item_id: string; value: string | null; reason?: string | null }) {
      const res = await fetch(`${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/verdicts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // 저장은 한 줄로 차례대로 가므로, 멈춘 요청 하나가 뒤의 저장을 붙잡지 않게 끊는다
        signal: timeoutSignal(30_000),
      });
      return prelimJson<{ verdicts: PrelimVerdicts; derived: PrelimDerived }>(res, "판정 저장 실패");
    },
  },
  upload: {
    async put(ticket: string, kind: PrelimUploadKind, file: File) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/uploads/${kind}`, {
        method: "PUT",
        body: form,
        signal: timeoutSignal(120_000),
      });
      return prelimJson<{ uploads: PrelimResult["uploads"]; derived: PrelimDerived }>(res, "파일 업로드 실패");
    },
  },
  attach: {
    status: () => http<{ enabled: boolean; max_bytes: number }>(`/prelim/attach/status`),
    /** 크기·디스크 검사를 먼저 하고, 통과하면 zip 본문을 그대로 보낸다. 진행률 때문에 XHR 을 쓴다 */
    async send(ticket: string, file: File, onProgress: (ratio: number) => void): Promise<void> {
      const base = `${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/attach`;
      const pre = await fetch(`${base}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ size_bytes: file.size, file_name: file.name }),
      });
      await prelimJson<unknown>(pre, "첨부 실적 업로드 준비 실패");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", base);
        xhr.setRequestHeader("Content-Type", "application/zip");
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) return resolve();
          let detail: unknown;
          try {
            detail = JSON.parse(xhr.responseText).detail;
          } catch {}
          reject(new Error(typeof detail === "string" ? detail : `첨부 실적 업로드 실패: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("첨부 실적 업로드 중 연결이 끊겼습니다."));
        xhr.send(file);
      });
    },
  },
  /** 표별 xlsx. stage 는 exx-com 에만 쓴다 */
  exportKeyUrl: (ticket: string, key: string, stage?: PrelimStage) =>
    `${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/export/${encodeURIComponent(key)}` +
    (stage ? `?stage=${encodeURIComponent(stage)}` : ""),
  /** 제척사유 / 블라인드위배 / 요약 3시트 xlsx. 서버가 attachment 로 내려주므로 링크로 연다 */
  exportUrl: (ticket: string) =>
    `${API_BASE}/prelim/results/${encodeURIComponent(ticket)}/export`,
};

export function feedbackKey(component: string, itemKey = ""): string {
  return `${component}::${itemKey}`;
}
