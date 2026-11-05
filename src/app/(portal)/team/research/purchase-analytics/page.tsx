import BackLink from '@/components/BackLink';

export const metadata = { title: 'Purchase Analytics' };

// The embedded report carries its own title bar, so the wrapper is one slim line: back link + name (JT 2/11: no double header).
export default function PurchaseAnalyticsPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto flex max-w-[1280px] items-baseline gap-4 px-4 pt-3 pb-1">
        <BackLink fallback="/team/resources/new-initiatives" />
        <span className="text-[13px] font-semibold text-brand-charcoal">Purchase Analytics</span>
      </div>
      <iframe
        src="/research/purchase-analytics/index.html"
        title="Purchase Analytics"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 100px)' }}
      />
    </main>
  );
}
