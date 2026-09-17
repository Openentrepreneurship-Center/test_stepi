import PrelimMonitor from "./prelim-monitor";

export const dynamic = "force-dynamic";

export default async function PrelimPage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string | string[] }>;
}) {
  const raw = (await searchParams).ticket;
  const ticket = Array.isArray(raw) ? raw[0] : raw;
  // 같은 주소로 다시 들어와도 화면이 초기화되도록, 보고 있는 결과가 바뀌면 컴포넌트를 새로 만든다
  return <PrelimMonitor key={ticket ?? "home"} initialTicket={ticket} />;
}
