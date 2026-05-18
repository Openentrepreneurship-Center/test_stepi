"use client";

import { useDisplaySettings } from "@/lib/display-settings";

export default function InterviewQuestionsToggle({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, hydrated } = useDisplaySettings();
  if (!hydrated) return null;
  if (!settings.showInterviewQuestions) return null;
  return <>{children}</>;
}
