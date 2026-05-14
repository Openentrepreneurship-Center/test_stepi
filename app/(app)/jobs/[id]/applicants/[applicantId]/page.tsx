import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, feedbackKey } from "@/lib/api";
import RadarCard from "@/components/radar-card";
import FeedbackButtons from "@/components/feedback-buttons";
import RegenerateSummaryButton from "@/components/regenerate-summary-button";
import PapersSection from "@/components/papers-section";
import DeptFitV2Section from "@/components/dept-fit-v2-section";
import DetailTabs from "@/components/detail-tabs";

export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({
  params,
}: {
  params: Promise<{ id: string; applicantId: string }>;
}) {
  const { id, applicantId } = await params;
  const decodedAppId = decodeURIComponent(applicantId);

  const [result, fb, papers] = await Promise.all([
    api.getResult(id).catch(() => null),
    api.listFeedback(id, decodedAppId).catch(() => ({ items: [] as never[] })),
    api.listPapers(id, decodedAppId).catch(() => []),
  ]);

  const applicant = result?.results?.find((r) => r.applicant_id === decodedAppId);

  if (!applicant) {
    return (
      <div className="px-8 lg:px-14 py-12 max-w-3xl mx-auto">
        <Link
          href={`/jobs/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)] mb-8"
        >
          <ArrowLeft size={13} /> 작업으로 돌아가기
        </Link>
        <div className="border-t border-b border-[var(--line-strong)] py-20 text-center">
          <h2 className="serif text-3xl mb-2">지원자를 찾을 수 없습니다.</h2>
          <p className="text-[14px] text-[var(--ink-muted)]">{decodedAppId}</p>
        </div>
      </div>
    );
  }

  const fbMap = new Map<string, boolean>();
  for (const f of fb.items) fbMap.set(feedbackKey(f.component, f.item_key), f.rating);
  const fbOf = (component: string, itemKey = ""): boolean | null => {
    const k = feedbackKey(component, itemKey);
    return fbMap.has(k) ? (fbMap.get(k) as boolean) : null;
  };

  const fitVals = Object.values(applicant.scores?.job_fit ?? {});
  // LLM 채점은 1-10 scale 로 들어오지만 UI 는 /100 로 표시 (직군적합도 v2 와 통일).
  const fitAvg100 =
    fitVals.length > 0
      ? (fitVals.reduce((s, v) => s + v.score, 0) / fitVals.length) * 10
      : 0;
  const coreData = Object.entries(applicant.scores?.core_similarity ?? {}).map(([axis, value]) => ({
    axis,
    value: Number(value),
  }));
  const fitData = Object.entries(applicant.scores?.job_fit ?? {}).map(([axis, v]) => ({
    axis,
    value: v.score * 10,
  }));
  // v2 dept-fit (행정직 skip / PDF 미첨부 시 빈 응답)
  const deptFit = await api
    .getDeptFit(id, decodedAppId)
    .catch(() => null);
  const topDeptV2 = deptFit?.items?.[0];

  // 학술지 게재 요약 (등급 칸 대체) — meta_only(PDF 없음) 도 게재 건수에 포함
  const analyzedPapers = papers.filter((p) => p.status === "analyzed");
  const pendingPapers = papers.filter((p) =>
    ["uploaded", "extracted", "extract_partial"].includes(p.status),
  );
  // 학술지명 chip: claimed_journal (xlsx 자기보고) 위주 — 카드 헤더에 top 3
  const journalChips = Array.from(
    new Set(
      papers
        .map((p) => (p.claimed_journal ?? "").trim())
        .filter((s): s is string => s.length > 0),
    ),
  ).slice(0, 3);
  const topStrength = analyzedPapers.find((p) => p.paper_strength)?.paper_strength ?? null;


  return (
    <div className="px-8 lg:px-14 py-12 max-w-[1280px] mx-auto fade-up">
      <Link
        href={`/jobs/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] mb-8 transition"
      >
        <ArrowLeft size={13} /> 작업으로 돌아가기
      </Link>

      <header className="grid grid-cols-12 gap-8 pb-8 border-b border-[var(--line-strong)]">
        <div className="col-span-12 lg:col-span-8">
          <div className="text-[13px] text-[var(--ink-muted)] mb-3">
            {applicant.job_track}
            {applicant.job_field ? ` · ${applicant.job_field}` : ""}
          </div>
          <h1 className="serif text-[clamp(36px,4.5vw,52px)] leading-[1.1] tracking-[-0.012em] text-[var(--ink)]">
            {applicant.applicant_id}
          </h1>
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col justify-end gap-4">
          <div className="border-b border-[var(--line)] pb-3">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[13px] text-[var(--ink-muted)]">학술지 게재</div>
              <FeedbackButtons
                jobId={id}
                applicantId={decodedAppId}
                component="research_summary"
                initialRating={fbOf("research_summary")}
                size="sm"
              />
            </div>
            {papers.length === 0 ? (
              <p className="text-[14px] text-[var(--ink-muted)] italic">게재 이력 없음</p>
            ) : (
              <>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="serif text-[44px] leading-none tabular-nums text-[var(--ink)]">
                    {papers.length}
                  </span>
                  <span className="text-[13px] text-[var(--ink-muted)]">건</span>
                </div>
                {journalChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {journalChips.map((j) => (
                      <span
                        key={j}
                        className="text-[11px] text-[var(--ink-muted)] bg-[var(--paper)] border border-[var(--line)] rounded-full px-2 py-0.5 truncate max-w-[180px]"
                        title={j}
                      >
                        {j}
                      </span>
                    ))}
                  </div>
                )}
                <div className="text-[12px] text-[var(--ink-soft)]">
                  PDF 분석 {analyzedPapers.length}/{papers.length}
                  {pendingPapers.length > 0 && ` · 처리 중 ${pendingPapers.length}`}
                </div>
                {topStrength && (
                  <p className="mt-2 text-[13px] leading-[1.55] text-[var(--ink-muted)] line-clamp-2">
                    “{topStrength}”
                  </p>
                )}
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <SmallKpi label="직무적합 평균" value={`${fitAvg100.toFixed(0)} / 100`} />
            {topDeptV2 ? (
              <SmallKpi
                label="상위 부서"
                value={topDeptV2.dept_name}
                sub={topDeptV2.score.toFixed(0)}
              />
            ) : (
              <SmallKpi
                label="상위 부서"
                value="—"
                sub={
                  deptFit?.skipped
                    ? "행정직 미산출"
                    : "논문 미첨부"
                }
              />
            )}
          </div>
        </div>
      </header>

      <DetailTabs
        essayContent={
          <>
            {/* 종합 요약 */}
            <Section number="01" title="종합 요약">
        <div className="grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-9">
            {applicant.summary?.overall && (
              <p className="serif text-[22px] leading-[1.55] tracking-[-0.005em] text-[var(--ink)]">
                {applicant.summary.overall}
              </p>
            )}
            {applicant.summary?.overall_lines && (
              <ul className="mt-7 space-y-3">
                {applicant.summary.overall_lines.map((line, i) => (
                  <li key={i} className="grid grid-cols-[auto_1fr] gap-4 items-baseline">
                    <span className="text-[13px] text-[var(--secondary-2)] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[15px] leading-[1.8] text-[var(--ink)]">{line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="col-span-12 lg:col-span-3 flex flex-col justify-start items-end gap-3">
            <RegenerateSummaryButton jobId={id} applicantId={decodedAppId} />
            <FeedbackButtons
              jobId={id}
              applicantId={decodedAppId}
              component="summary_overall"
              initialRating={fbOf("summary_overall")}
              label="요약 평가"
            />
          </div>
        </div>
      </Section>

      {/* 자기소개서 핵심 */}
      {applicant.summary?.by_question && applicant.summary.by_question.length > 0 && (
        <Section number="02" title="자기소개서 핵심">
          <ol className="border-t border-[var(--line)]">
            {(() => {
              const rows = applicant.summary.by_question;
              const qNumByQid = new Map<string, number>();
              rows.forEach((q) => {
                if (!qNumByQid.has(q.question_id)) qNumByQid.set(q.question_id, qNumByQid.size + 1);
              });
              return rows.map((q, i) => {
                const isFirstOfGroup = i === 0 || rows[i - 1].question_id !== q.question_id;
                const qNum = qNumByQid.get(q.question_id) ?? 0;
                const itemIdx = q.item_index ?? 0;
                const itemKey = `${q.question_id}-${itemIdx}`;
                return (
                  <li
                    key={itemKey}
                    className="grid grid-cols-12 gap-6 items-start py-7 border-b border-[var(--line)]"
                  >
                    <div className="col-span-12 lg:col-span-2">
                      {isFirstOfGroup && (
                        <div className="text-[13px] text-[var(--ink-muted)] tabular-nums">
                          Q{String(qNum).padStart(2, "0")}
                        </div>
                      )}
                    </div>
                    <div className="col-span-12 lg:col-span-8">
                      {isFirstOfGroup && (
                        <p className="text-[13px] text-[var(--ink-soft)] mb-3">{q.question}</p>
                      )}
                      <h3 className="serif text-[20px] leading-[1.35] mb-1.5">
                        {q.title || q.question_id}
                      </h3>
                      <p className="text-[15px] leading-[1.8] text-[var(--ink)]">{q.content}</p>
                    </div>
                    <div className="col-span-12 lg:col-span-2 flex lg:justify-end">
                      <FeedbackButtons
                        jobId={id}
                        applicantId={decodedAppId}
                        component="summary_by_question"
                        itemKey={itemKey}
                        initialRating={fbOf("summary_by_question", itemKey)}
                        size="sm"
                      />
                    </div>
                  </li>
                );
              });
            })()}
          </ol>
        </Section>
      )}

      {/* 역량 진단 */}
      <Section number="03" title="역량 진단">
        <div className="grid grid-cols-12 gap-12">
          {coreData.length > 0 && (
            <div className="col-span-12 lg:col-span-6">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[15px] font-medium">핵심인재 유사도</div>
                  <p className="mt-1 text-[12.5px] text-[var(--ink-muted)] max-w-[36ch] leading-[1.6]">
                    합격자 자소서와의 코사인 유사도 — 직군별 핵심인재 패턴과의 거리.
                  </p>
                </div>
                <FeedbackButtons
                  jobId={id}
                  applicantId={decodedAppId}
                  component="core_similarity"
                  initialRating={fbOf("core_similarity")}
                  size="sm"
                />
              </div>
              <RadarCard data={coreData} color="#33307A" />
            </div>
          )}

          {fitData.length > 0 && (
            <div className="col-span-12 lg:col-span-6">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[15px] font-medium">직무 적합도</div>
                  <p className="mt-1 text-[12.5px] text-[var(--ink-muted)] max-w-[36ch] leading-[1.6]">
                    직무정의(JD) 기준 5축 평가 — LLM이 0-100 점수로 채점.
                  </p>
                </div>
                <FeedbackButtons
                  jobId={id}
                  applicantId={decodedAppId}
                  component="job_fit"
                  initialRating={fbOf("job_fit")}
                  size="sm"
                />
              </div>
              <RadarCard data={fitData} color="#F39200" max={100} />
            </div>
          )}
        </div>

        {fitData.length > 0 && (
          <div className="mt-10 border-t border-[var(--line)]">
            {Object.entries(applicant.scores?.job_fit ?? {}).map(([axis, v]) => (
              <div
                key={axis}
                className="grid grid-cols-12 gap-6 py-5 border-b border-[var(--line)] items-baseline"
              >
                <div className="col-span-12 lg:col-span-2 serif text-[17px]">{axis}</div>
                <div className="col-span-3 lg:col-span-1 serif text-[20px] text-[var(--secondary-2)] tabular-nums">
                  {(v.score * 10).toFixed(0)}
                </div>
                <p className="col-span-9 lg:col-span-8 text-[14px] leading-[1.75] text-[var(--ink-muted)]">
                  {v.reason}
                </p>
                <div className="col-span-12 lg:col-span-1 flex lg:justify-end">
                  <FeedbackButtons
                    jobId={id}
                    applicantId={decodedAppId}
                    component="job_fit"
                    itemKey={axis}
                    initialRating={fbOf("job_fit", axis)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 직군 적합도 v2 — 자소서 + 논문 → 7부서 0-100 (행정직은 skip) */}
      <Section number="04" title="직군 적합도">
        <div className="grid grid-cols-12 gap-12">
          <div className="col-span-12 lg:col-span-9">
            <DeptFitV2Section jobId={id} applicantId={decodedAppId} />
          </div>
          <div className="col-span-12 lg:col-span-3 flex lg:justify-end">
            <FeedbackButtons
              jobId={id}
              applicantId={decodedAppId}
              component="department_fit"
              initialRating={fbOf("department_fit")}
              label="매칭 평가"
            />
          </div>
        </div>
      </Section>

      {/* 추천 면접 질문 — 자소서 RAG (논문 기반 질문은 연구실적 탭의 각 논문 카드에서 별도 노출) */}
      {applicant.interview_questions && applicant.interview_questions.length > 0 && (
        <Section number="06" title="추천 면접 질문">
          <div className="grid grid-cols-12 gap-x-8 border-t border-[var(--line)]">
            {applicant.interview_questions.map((q, idx) => (
              <article
                key={q.id}
                className="col-span-12 md:col-span-6 grid grid-cols-[auto_1fr] gap-5 py-7 border-b border-[var(--line)]"
              >
                <div className="serif text-[28px] leading-none text-[var(--ink-muted)] tabular-nums">
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div>
                  <p className="text-[16px] leading-[1.6] text-[var(--ink)]">
                    {q.question}
                  </p>
                  {(q.intent || q.topic_tag) && (
                    <div className="mt-3 text-[12.5px] text-[var(--ink-muted)] leading-[1.6] flex flex-wrap items-center gap-2">
                      {q.topic_tag && (
                        <span className="inline-block px-2 py-0.5 rounded-[2px] border border-[var(--line-strong)] text-[11px]">
                          {q.topic_tag}
                        </span>
                      )}
                      {q.intent && <span>{q.intent}</span>}
                    </div>
                  )}
                  <div className="mt-4">
                    <FeedbackButtons
                      jobId={id}
                      applicantId={decodedAppId}
                      component="interview_question"
                      itemKey={String(q.id)}
                      initialRating={fbOf("interview_question", String(q.id))}
                      size="sm"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}
          </>
        }
        paperContent={
          <Section number="05" title="학술지 게재 이력">
            <PapersSection jobId={id} applicantId={decodedAppId} />
          </Section>
        }
      />
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <header className="flex items-baseline gap-5 mb-8 pb-4 border-b border-[var(--ink)]">
        <span className="text-[13px] text-[var(--ink-muted)] tabular-nums">{number}</span>
        <h2 className="serif text-[26px]">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function SmallKpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[12px] text-[var(--ink-muted)] mb-1">{label}</div>
      <div className="text-[15px] text-[var(--ink)] tabular-nums">
        {value}
        {sub && <span className="ml-2 text-[12px] text-[var(--ink-muted)]">· {sub}</span>}
      </div>
    </div>
  );
}
