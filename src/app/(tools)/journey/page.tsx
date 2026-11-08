'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { JOURNEY_TEMPLATE } from './journeyTemplate';
import { buildJourneyData } from './journeyData';

type Recon = Parameters<typeof buildJourneyData>[1];
type Sales = Parameters<typeof buildJourneyData>[3];
const STALE_MS = 15 * 60 * 1000;

/** JSON plus whether the server's copy is older than 15 minutes (X-Fetched-At header, or asAt / fetchedAt in the body). */
async function getJson<T>(url: string): Promise<{ data: T; stale: boolean; at: number }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const at = Number(res.headers.get('X-Fetched-At')) || Date.parse(data?.asAt || data?.fetchedAt || '') || Date.now();
  return { data, stale: Date.now() - at > STALE_MS, at };
}

// Read-only Pipeline Journey: Claude's Journey Map mock-up rendered on live CTRT data, reconciled to GHL's own stage counts.
// Opens instantly from the last saved copy of each feed (?snapshot=1), then refreshes any copy older than 15 minutes
// in the background and re-renders (same idea as the Deal Sheet / CTRT shared cache).
export default function JourneyPage() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingHtml, setPendingHtml] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const pos = useRef<{ tab: string | null; y: number }>({ tab: null, y: 0 });
  const applyPending = useCallback(() => { if (pendingHtml) { setHtml(pendingHtml); setPendingHtml(''); } }, [pendingHtml]);
  // Tell the page inside the iframe what the refresh button should show (pending newer data / refreshing).
  useEffect(() => { frame.current?.contentWindow?.postMessage({ journey: 'state', pending: !!pendingHtml, refreshing }, '*'); }, [pendingHtml, refreshing, html]);
  useEffect(() => {
    const onShow = () => { if (document.visibilityState === 'visible') applyPending(); };
    const onMsg = (e: MessageEvent) => {
      if (e.data?.journey === 'pos') pos.current = { tab: e.data.tab ?? null, y: Number(e.data.y) || 0 };
      if (e.data?.journey === 'refresh') { if (pendingHtml) applyPending(); else load(true); }
    };
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('message', onMsg);
    return () => { document.removeEventListener('visibilitychange', onShow); window.removeEventListener('message', onMsg); };
  }, [applyPending, pendingHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback((force = false) => {
    setLoading(!force);
    setError('');
    let records: Record<string, string>[] | null = null, recon: Recon | null = null, sales: Sales = null, asAt = 0, salesPending = true;
    let rendered = false;
    const build = () => JOURNEY_TEMPLATE.replace('<script>', `<script>window.JOURNEY=${JSON.stringify({ ...buildJourneyData(records!, recon!, false, sales, salesPending), asAt: new Date(asAt || Date.now()).toISOString(), restore: pos.current }).replace(/</g, '\\u003c')};</script>\n<script>`);
    // Render the iframe once; later (background) data is held in pendingHtml and applied only when the user asks
    // (Refresh button) or comes back to the tab, so the page never jumps back to the first tab mid-use (JT 2/11).
    const render = () => {
      if (!records || !recon) return;
      // First render and manual refresh (force) apply at once; background refreshes are parked until the user asks.
      if ((!rendered && !force) || force) { rendered = true; setHtml(build()); setPendingHtml(''); } else setPendingHtml(build());
    };
    const refresh: Promise<unknown>[] = [];
    // Sales tiles load separately (slow: GHL contacts + meetings); they show "Loading" until they arrive, "not wired" if they fail.
    if (force) setRefreshing(true);
    const salesP = getJson<Sales>(force ? '/api/journey/sales' : '/api/journey/sales?snapshot=1').then((s) => {
      sales = s.data; salesPending = false; render();
      if (s.stale) refresh.push(getJson<Sales>('/api/journey/sales').then((f) => { sales = f.data; render(); }));
    }).catch((e) => { salesPending = false; render(); console.error('Journey sales tiles:', e); });
    Promise.all([getJson<Record<string, string>[]>(force ? '/api/contract-team-reporting' : '/api/contract-team-reporting?snapshot=1'), getJson<Recon>(force ? '/api/journey/reconcile' : '/api/journey/reconcile?snapshot=1')])
      .then(([r, c]) => {
        records = r.data; recon = c.data; asAt = r.at; render();
        if (r.stale) refresh.push(getJson<Record<string, string>[]>('/api/contract-team-reporting').then((f) => { records = f.data; render(); }));
        if (c.stale) refresh.push(getJson<Recon>('/api/journey/reconcile').then((f) => { recon = f.data; render(); }));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => {
        setLoading(false);
        salesP.then(() => {
          if (force) { setRefreshing(false); return; }
          if (!refresh.length) return;
          setRefreshing(true);
          Promise.allSettled(refresh).finally(() => setRefreshing(false));
        });
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="relative flex h-screen flex-col bg-white">
      {(loading || error) && (
        <div className={`absolute right-4 top-2 z-10 rounded px-2 py-1 text-xs ${error ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
          {error || 'Loading live data from GHL…'}
        </div>
      )}
      {/* key: a changed srcDoc otherwise pushes a history entry under /journey and leaves the address bar stuck there after navigating away (Next #8107). Remount instead. */}
      {html && <iframe key={html.length + ":" + html.slice(-64)} ref={frame} title="Pipeline Journey" srcDoc={html} className="block w-full flex-1 border-0" />}
    </div>
  );
}
