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
    Promise.all([getJson(`/api/contract-team-reporting${q}`), getJson(`/api/journey/reconcile${q}`)])
      .then(([records, recon]) => {
        const json = JSON.stringify(buildJourneyData(records, recon, hist)).replace(/</g, '\\u003c');
        setHtml(JOURNEY_TEMPLATE.replace('<script>', `<script>window.JOURNEY=${json};</script>\n<script>`));
        setHistorical(hist);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(false); }, [load]);

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="flex items-center gap-3 px-4 h-10 border-b border-gray-200 text-sm text-gray-700 shrink-0">
        <span className="font-medium">{historical ? 'Historical: all opportunities, every status' : 'In-flight opportunities only'}</span>
        <button
          onClick={() => load(!historical)}
          disabled={loading}
          className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {historical ? 'Back to in-flight' : 'Show historical'}
        </button>
        {!historical && <span className="text-xs text-amber-700">Loads settled and closed opps; may take up to 60 seconds.</span>}
        {loading && <span className="text-xs text-gray-500">Loading live data from GHL…{historical ? '' : ' (historical may take up to 60 seconds)'}</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {html && <iframe title="Pipeline Journey" srcDoc={html} className="block w-full flex-1 border-0" />}
    </div>
  );
}
