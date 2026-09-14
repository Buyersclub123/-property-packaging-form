import { notFound } from 'next/navigation';
import Link from 'next/link';

const CALCULATORS: Record<string, { title: string; embedPath: string }> = {
  retirement: { title: 'Retirement Planner', embedPath: '/calc-embed/retirement/index.html' },
  affordability: { title: 'Affordability Calculator', embedPath: '/calc-embed/affordability/index.html' },
  'mortgage-paydown': { title: 'Mortgage Paydown', embedPath: '/calc-embed/mortgage-paydown/index.html' },
  pay: { title: 'Pay & Tax Calculator', embedPath: '/calc-embed/pay/index.html' },
  performance: { title: 'Performance Calculator', embedPath: '/calc-embed/performance/index.html' },
  sales: { title: 'Sales Calculator', embedPath: '/calc-embed/sales/index.html' },
};

export function generateStaticParams() {
  return Object.keys(CALCULATORS).map((name) => ({ name }));
}

export default function CalculatorPage({ params }: { params: { name: string } }) {
  const calc = CALCULATORS[params.name];
  if (!calc) notFound();

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1180px] px-4 py-6">
        <Link
          href="/team/calculators"
          className="mb-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#7A7575] no-underline hover:text-brand-charcoal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Calculators
        </Link>
        <h1 className="mb-4 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">
          {calc.title}
        </h1>
      </div>
      <iframe
        src={calc.embedPath}
        title={calc.title}
        className="w-full border-0"
        style={{ height: 'calc(100vh - 180px)' }}
      />
    </main>
  );
}
