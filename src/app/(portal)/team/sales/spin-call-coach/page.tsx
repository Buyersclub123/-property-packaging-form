import Link from 'next/link';

export default function SpinCallCoachPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1180px] px-4 py-6">
        <Link
          href="/team/sales"
          className="mb-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#7A7575] no-underline hover:text-brand-charcoal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Sales Team
        </Link>
        <h1 className="mb-4 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">
          SPIN Call Coach
        </h1>
      </div>
      <iframe
        src="/sales/spin-call-coach/index.html"
        title="SPIN Call Coach"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 180px)' }}
      />
    </main>
  );
}
