'use client';

import { useCallback, useEffect, useState } from 'react';
import { JOURNEY_TEMPLATE } from './journeyTemplate';
import { buildJourneyData } from './journeyData';

type Recon = Parameters<typeof buildJourneyData>[1];
type Sales = Parameters<typeof buildJourneyData>[3];
const STALE_MS = 15 * 60 * 1000;

/** JSON plus whether the server's copy is older than 15 minutes (X-Fetched-At header, or asAt / fetchedAt in the body). */
async function getJson<T>(url: string): Promise<{ data: T; stale: boolean }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const at = Number(res.headers.get('X-Fetched-At')) || Date.parse(data?.asAt || data?.fetchedAt || '') || Date.now();
  return { data, stale: Date.now() - at > STALE_MS };
}

// Read-only Pipeline Journey: Claude's Journey Map mock-up rendered on live CTRT data, reconciled to GHL's own stage counts.
// Opens instantly from the last saved copy of each feed (?snapshot=1), then refreshes any copy older than 15 minutes
// in the background and re-renders (same idea as the Deal Sheet / CTRT shared cache).
export default function JourneyPage() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    let records: Record<string, string>[] | null = null, recon: Recon | null = null, sales: Sales = null;
    const render = () => {
      if (!records || !recon) return;
      const json = JSON.stringify(buildJourneyData(records, recon, false, sales)).replace(/</g, '\\u003c');
      setHtml(JOURNEY_TEMPLATE.replace('<script>', `<script>window.JOURNEY=${json};</script>\n<script>`));
    };
    const refresh: Promise<unknown>[] = [];
    // Sales tiles load separately (slow: GHL contacts + meetings); they show "not wired" until they arrive or if they fail.
    const salesP = getJson<Sales>('/api/journey/sales?snapshot=1').then((s) => {
      sales = s.data; render();
      if (s.stale) refresh.push(getJson<Sales>('/api/journey/sales').then((f) => { sales = f.data; render(); }));
    }).catch((e) => console.error('Journey sales tiles:', e));
    Promise.all([getJson<Record<string, string>[]>('/api/contract-team-reporting?snapshot=1'), getJson<Recon>('/api/journey/reconcile?snapshot=1')])
      .then(([r, c]) => {
        records = r.data; recon = c.data; render();
        if (r.stale) refresh.push(getJson<Record<string, string>[]>('/api/contract-team-reporting').then((f) => { records = f.data; render(); }));
        if (c.stale) refresh.push(getJson<Recon>('/api/journey/reconcile').then((f) => { recon = f.data; render(); }));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setLoading(false);
        salesP.then(() => {
          if (!refresh.length) return;
          setRefreshing(true);
          Promise.allSettled(refresh).finally(() => setRefreshing(false));
        });
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-3 px-4 h-10 border-b border-gray-200 text-sm text-gray-700 shrink-0">
        <span className="font-medium">Quick snapshot: in-flight opportunities</span>
        {loading && <span className="text-xs text-gray-500">Loading live data from GHL…</span>}
        {!loading && refreshing && <span className="text-xs text-gray-500">Showing last saved copy · refreshing from GHL…</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {html && <iframe title="Pipeline Journey" srcDoc={html} className="block w-full flex-1 border-0" />}
    </div>
  );
}
