"use client";

import { useDisplaySettings } from "@/lib/display-settings";

export default function SettingsPage() {
  const { settings, update, hydrated } = useDisplaySettings();

  return (
    <div className="px-8 lg:px-12 py-10 max-w-3xl">
      <h1 className="text-[22px] font-medium text-[var(--ink)]">표시 설정</h1>
      <p className="mt-2 text-[13px] text-[var(--ink-muted)]">
        이 설정은 이 브라우저에만 저장됩니다. 다른 PC나 시크릿 창에는 적용되지 않습니다.
      </p>

      <section className="mt-10 border-t border-[var(--line)] pt-6">
        <h2 className="text-[13px] tracking-wide text-[var(--ink-muted)] uppercase">
          지원자 상세 화면
        </h2>

        <label className="mt-5 flex items-start justify-between gap-6 py-4 border-b border-[var(--line)] cursor-pointer">
          <div>
            <div className="text-[15px] text-[var(--ink)]">추천 면접 질문 표시</div>
            <div className="mt-1 text-[12.5px] text-[var(--ink-muted)] leading-[1.6]">
              꺼두면 지원자 상세 화면의 &quot;06 추천 면접 질문&quot; 섹션이 숨겨집니다.
              서류평가 단계에서 면접 질문이 평가에 영향을 주지 않게 하고 싶을 때 사용하세요.
            </div>
          </div>
          <input
            type="checkbox"
            disabled={!hydrated}
            checked={settings.showInterviewQuestions}
            onChange={(e) => update({ showInterviewQuestions: e.target.checked })}
            className="mt-1 h-5 w-5 accent-[var(--secondary)] shrink-0"
          />
        </label>
      </section>
    </div>
  );
}
