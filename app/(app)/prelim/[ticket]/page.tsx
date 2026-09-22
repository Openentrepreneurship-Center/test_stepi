import { Suspense } from "react";
import ResultView from "./result-view";

export const dynamic = "force-dynamic";

export default async function PrelimResultPage({ params }: { params: Promise<{ ticket: string }> }) {
  const { ticket } = await params;
  return (
    <Suspense fallback={null}>
      <ResultView key={ticket} ticket={ticket} />
    </Suspense>
  );
}
