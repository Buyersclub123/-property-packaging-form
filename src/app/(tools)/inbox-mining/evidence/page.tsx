'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TopNavBar from '@/components/portal/TopNavBar';
import { DecisionPanel } from '../decision';

// Evidence view for the CTRT MINED columns: /inbox-mining/evidence?message=<gmail id>&field=<key>.
// Keep this URL stable: the CTRT links to it. If it ever moves, leave a redirect here.

function Evidence() {
  const params = useSearchParams();
  const message = params.get('message') || '';
  const field = params.get('field') || '';
  const [itemId, setItemId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      setError('Add ?message=<Gmail message id>&field=<field key> to the URL.');
      return;
    }
    fetch(`/api/inbox-mining/evidence?message=${encodeURIComponent(message)}`, { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        setItemId(d.itemId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [message]);

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-5">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Evidence{field ? `: ${field}` : ''}</h1>
        <a href="/inbox-mining" className="text-xs font-semibold text-blue-700 hover:underline">Inbox</a>
      </div>
      <div className="mt-1 text-xs text-gray-500">The email (and attachment page) this value was read from. Read-only.</div>
      {error && <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {itemId && (
        <div className="mt-4 rounded border bg-white p-5 [overflow-wrap:anywhere]">
          <DecisionPanel id={itemId} focusField={field || undefined} evidenceOnly />
        </div>
      )}
    </div>
  );
}

export default function EvidencePage() {
  return (
    <>
      <TopNavBar />
      <main className="min-h-screen bg-white text-brand-charcoal">
        <Suspense fallback={<div className="p-4 text-sm text-gray-500">Loading…</div>}>
          <Evidence />
        </Suspense>
      </main>
    </>
  );
}
