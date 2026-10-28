import Link from 'next/link';
import { newInitiatives } from '@/lib/portalConfig';
import { teamVisible, viewerAccess, visibleTools } from '@/lib/tileAccess';

export const metadata = { title: 'New Initiatives' };
export const dynamic = 'force-dynamic';

export default async function NewInitiativesPage() {
  const v = await viewerAccess();
  if (!v.ok) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-[1080px] px-4 py-10">
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Tile access could not be read, so nothing is shown: {v.error}
          </div>
        </div>
      </main>
    );
  }
  if (!teamVisible(newInitiatives, v)) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-[1080px] px-4 py-10 text-sm text-gray-600">Not available.</div>
      </main>
    );
  }
  const demos = visibleTools(newInitiatives, v);
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1080px] px-4 py-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-gray-500 no-underline hover:text-brand-charcoal"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
        <h1 className="mb-1 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">New Initiatives</h1>
        <p className="mb-5 text-[13px] text-gray-500">Sandpit for work in progress. Demos are read-only: nothing here writes to GHL.</p>
        <ul className="grid list-none grid-cols-1 gap-[18px] p-0 sm:grid-cols-2 lg:grid-cols-3">
          {demos.map((d) => (
            <li key={d.name}>
              <Link
                href={d.href ?? '#'}
                className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-5 no-underline transition-[border-color,box-shadow] hover:border-blue-600 hover:shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="m-0 text-[16px] font-bold text-brand-charcoal">{d.name}</h3>
                  <span className="whitespace-nowrap rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800">
                    Demo – read-only
                  </span>
                </div>
                <p className="m-0 flex-1 text-[13px] leading-relaxed text-gray-500">{d.description}</p>
                <div className="mt-4 border-t border-gray-200 pt-3 text-[11.5px] font-semibold text-blue-600">Open {d.href} →</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
