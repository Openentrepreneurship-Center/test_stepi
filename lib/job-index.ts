import { promises as fs } from "fs";
import path from "path";

export interface JobIndexRecord {
  job_id: string;
  label?: string | null;
  created_at: string;
}

export const JOB_INDEX_FILE = path.join(process.cwd(), ".polaris", "jobs.json");

async function ensureFile() {
  const dir = path.dirname(JOB_INDEX_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(JOB_INDEX_FILE);
  } catch {
    await fs.writeFile(JOB_INDEX_FILE, "[]", "utf8");
  }
}

export async function readJobIndex(): Promise<JobIndexRecord[]> {
  await ensureFile();
  try {
    const raw = await fs.readFile(JOB_INDEX_FILE, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as JobIndexRecord[]) : [];
  } catch {
    return [];
  }
}

export async function appendJobToIndex(rec: JobIndexRecord): Promise<void> {
  const list = await readJobIndex();
  if (!list.find((j) => j.job_id === rec.job_id)) {
    list.unshift(rec);
    await fs.writeFile(JOB_INDEX_FILE, JSON.stringify(list, null, 2), "utf8");
  }
}
