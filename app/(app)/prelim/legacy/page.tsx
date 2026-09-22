import PrelimMonitor from "./prelim-monitor";

export const dynamic = "force-dynamic";

// 새 결과 화면이 나오기 전까지 쓰는 기존 결과 화면
export default async function PrelimLegacyPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string | string[] }>;
}) {
  const raw = (await searchParams).ticket;
  const ticket = Array.isArray(raw) ? raw[0] : raw;
  return <PrelimMonitor key={ticket ?? "home"} initialTicket={ticket} />;
}
