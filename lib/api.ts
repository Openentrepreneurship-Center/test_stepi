export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type JobStatus = "pending" | "running" | "done" | "failed";

export interface JobProgress {
  total: number;
  done: number;
  failed: number;
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

export interface FeedbackEntry {
  job_id: string;
  applicant_id: string;
  component: string;
  item_key: string;
  rating: boolean;
  created_at: string;
  updated_at: string;
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
  getStatus: (id: string) => http<JobStatusResponse>(`/analysis-jobs/${id}`),
  getResult: (id: string) => http<JobResultResponse>(`/analysis-jobs/${id}/result`),
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
  uploadExcel: async (
    file: File,
    extra?: { request_id?: string; mode?: string; job_track?: string },
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (extra?.request_id) fd.append("request_id", extra.request_id);
    if (extra?.mode) fd.append("mode", extra.mode);
    if (extra?.job_track) fd.append("job_track", extra.job_track);
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
  reportPdfUrl: (id: string) => `${API_BASE}/analysis-jobs/${id}/report.pdf`,
  resultCsvUrl: (id: string) => `${API_BASE}/analysis-jobs/${id}/result.csv`,
};

export function gradeFromScores(
  jobFit?: Record<string, { score: number }>,
): { grade: "S" | "A" | "B" | "C" | "D"; avg: number } {
  if (!jobFit) return { grade: "C", avg: 0 };
  const vals = Object.values(jobFit).map((v) => v.score);
  if (vals.length === 0) return { grade: "C", avg: 0 };
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  let grade: "S" | "A" | "B" | "C" | "D" = "C";
  if (avg >= 9) grade = "S";
  else if (avg >= 8) grade = "A";
  else if (avg >= 7) grade = "B";
  else if (avg >= 5) grade = "C";
  else grade = "D";
  return { grade, avg };
}

export function feedbackKey(component: string, itemKey = ""): string {
  return `${component}::${itemKey}`;
}
