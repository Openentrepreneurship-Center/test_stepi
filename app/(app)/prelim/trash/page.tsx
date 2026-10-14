import TrashTabs from "./trash-tabs";

export const dynamic = "force-dynamic";

export default async function PrelimTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { tab } = await searchParams;
  return <TrashTabs initial={tab === "retention" ? "retention" : "reviews"} />;
}
