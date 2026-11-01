'use client';

import { useCallback, useEffect, useState } from 'react';
import { JOURNEY_TEMPLATE } from './journeyTemplate';
import { buildJourneyData } from './journeyData';

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// Read-only Pipeline Journey: Claude's Journey Map mock-up rendered on live CTRT data, reconciled to GHL's own stage counts.
export default function JourneyPage() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const [historical, setHistorical] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback((hist: boolean) => {
    setLoading(true);
    setError('');
    const q = hist ? '?historical=1' : '';
    // Sales tiles load separately (slow: GHL contacts + sales opps); the journey renders first with them "not wired",
    // then re-renders once they arrive. If they fail they stay "not wired".
    const sales = getJson('/api/journey/sales').catch((e) => { console.error('Journey sales tiles:', e); return null; });
    const render = (records: Record<string, string>[], recon: Parameters<typeof buildJourneyData>[1], salesData: Parameters<typeof buildJourneyData>[3]) => {
      const json = JSON.stringify(buildJourneyData(records, recon, hist, salesData)).replace(/</g, '\\u003c');
      setHtml(JOURNEY_TEMPLATE.replace('<script>', `<script>window.JOURNEY=${json};</script>\n<script>`));
    };
    Promise.all([getJson(hist ? `/api/contract-team-reporting${q}` : '/api/contract-team-reporting?snapshot=1'), getJson(`/api/journey/reconcile${q}`)])
      .then(([records, recon]) => {
        render(records, recon, null);
        setHistorical(hist);
        sales.then((salesData) => { if (salesData) render(records, recon, salesData); });
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(false); }, [load]);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-3 px-4 h-10 border-b border-gray-200 text-sm text-gray-700 shrink-0">
        <span className="font-medium">Quick snapshot: in-flight opportunities</span>
        {loading && <span className="text-xs text-gray-500">Loading live data from GHL…</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {html && <iframe title="Pipeline Journey" srcDoc={html} className="block w-full flex-1 border-0" />}
    </div>
  );
}
