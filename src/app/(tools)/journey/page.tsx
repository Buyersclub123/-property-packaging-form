'use client';

import { useEffect, useState } from 'react';
import { JOURNEY_TEMPLATE } from './journeyTemplate';
import { buildJourneyData } from './journeyData';

// Read-only Pipeline Journey: Claude's Journey Map mock-up rendered on live CTRT data.
export default function JourneyPage() {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/contract-team-reporting')
      .then(async (res) => {
        if (!res.ok) throw new Error(`CTRT data failed to load (${res.status})`);
        return res.json();
      })
      .then((records) => {
        const json = JSON.stringify(buildJourneyData(records)).replace(/</g, '\\u003c');
        setHtml(JOURNEY_TEMPLATE.replace('<script>', `<script>window.JOURNEY=${json};</script>\n<script>`));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!html) return <div className="p-6 text-gray-500">Loading live pipeline data…</div>;
  return <iframe title="Pipeline Journey" srcDoc={html} className="block w-full h-screen border-0" />;
}
