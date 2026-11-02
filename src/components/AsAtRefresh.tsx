'use client';

/** "As at Mon, 2 Nov 2026, 5:07 am" (Sydney time). */
export function asAtLabel(t: number) {
  const d = new Date(t);
  const part = (o: Intl.DateTimeFormatOptions) => d.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', ...o });
  return `As at ${part({ weekday: 'short' })}, ${part({ day: 'numeric', month: 'short', year: 'numeric' })}, ${part({ hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`;
}

/** Page-header "As at …" stamp with a small ⟳ button that re-reads now and applies in place (see useLiveRefresh). */
export default function AsAtRefresh({ asAt, refreshing, onRefresh }: { asAt: number | null; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap text-xs text-gray-500">
      <span>{asAt ? asAtLabel(asAt) : 'Loading…'}</span>
      <button type="button" onClick={onRefresh} disabled={refreshing} title={refreshing ? 'Refreshing…' : 'Refresh now'} aria-label="Refresh now"
        className="rounded border border-gray-300 bg-white px-1.5 text-sm leading-5 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
        <span className={`inline-block ${refreshing ? 'animate-spin' : ''}`}>⟳</span>
      </button>
    </div>
  );
}
