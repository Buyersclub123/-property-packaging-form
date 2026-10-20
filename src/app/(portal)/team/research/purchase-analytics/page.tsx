import Link from 'next/link';

export const metadata = { title: 'Purchase Analytics' };

export default function PurchaseAnalyticsPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1280px] px-4 py-6">
        <Link
          href="/team/research"
          className="mb-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#7A7575] no-underline hover:text-brand-charcoal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Research &amp; Data
        </Link>
        <h1 className="mb-4 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">
          Purchase Analytics
        </h1>
      </div>
      <iframe
        src="/research/purchase-analytics/index.html"
        title="Purchase Analytics"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 180px)' }}
      />
    </main>
  );
}
