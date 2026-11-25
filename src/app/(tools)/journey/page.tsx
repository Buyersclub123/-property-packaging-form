'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { JOURNEY_TEMPLATE } from './journeyTemplate';
import { buildJourneyData } from './journeyData';
import { STAGE_DEFINITIONS } from '@/lib/stageDefinitions';

type Recon = Parameters<typeof buildJourneyData>[1];
type Sales = Parameters<typeof buildJourneyData>[3];
async function getJson<T>(url: string): Promise<{ data: T; at: number }> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const at = Number(res.headers.get('X-Fetched-At')) || Date.parse(data?.asAt || data?.fetchedAt || '') || Date.now();
  return { data, at };
}

// Read-only Pipeline Journey: Claude's Journey Map mock-up rendered on live CTRT data, reconciled to GHL's own stage counts.
// Each load reads live sources. A failed load clears the previous report.
export default function JourneyPage() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const pendingRequest = useRef<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const pos = useRef<{ tab: string | null; y: number }>({ tab: null, y: 0 });
  useEffect(() => { frame.current?.contentWindow?.postMessage({ journey: 'state', pending: false, refreshing }, '*'); }, [refreshing, html]);

  const load = useCallback(async (force = false) => {
    if (pendingRequest.current === requestId.current) return;
    const id = ++requestId.current;
    pendingRequest.current = id;
    setLoading(!force);
    setRefreshing(force);
    setError('');
    // Sales loaded independently in the original page. Handle its rejection
    // immediately while the property reads run, then surface it below.
    const salesRead = getJson<Sales>('/api/journey/sales').then(
      result => ({ result, error: null }),
      error => ({ result: null, error }),
    );
    try {
      const [r, c] = await Promise.all([
        getJson<Record<string, string>[]>('/api/contract-team-reporting'),
        getJson<Recon>('/api/journey/reconcile'),
      ]);
      if (id !== requestId.current) return;
      const display = (sales: Sales, salesPending: boolean) => {
        const data = buildJourneyData(r.data, c.data, false, sales, salesPending);
        setHtml(JOURNEY_TEMPLATE.replace('<script>', `<script>window.JOURNEY=${JSON.stringify({ ...data, asAt: new Date(r.at).toISOString(), restore: pos.current, stageDefs: STAGE_DEFINITIONS }).replace(/</g, '\\u003c')};</script>\n<script>`));
      };
      display(null, true);
      setLoading(false);
      const sales = await salesRead;
      if (id !== requestId.current) return;
      if (!sales.result) throw sales.error;
      display(sales.result.data, false);
    } catch (e) {
      if (id !== requestId.current) return;
      setHtml('');
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (pendingRequest.current === id) pendingRequest.current = null;
      if (id === requestId.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    void load();
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.journey === 'pos') pos.current = { tab: e.data.tab ?? null, y: Number(e.data.y) || 0 };
      if (e.data?.journey === 'refresh') void load(true);
    };
    window.addEventListener('message', onMsg);
    return () => {
      requestId.current++;
      window.removeEventListener('message', onMsg);
    };
  }, [load]);

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
