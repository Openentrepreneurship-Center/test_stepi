import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-8 lg:px-12 py-9 max-w-3xl mx-auto">
      <div className="mt-10 panel text-center py-16">
        <h2 className="text-[22px] font-bold mb-2">페이지를 찾을 수 없습니다.</h2>
        <p className="text-[14px] text-[var(--ink-muted)] mb-6">주소가 바뀌었거나 없는 페이지입니다.</p>
        <Link href="/" className="btn-primary inline-block">
          처음으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
