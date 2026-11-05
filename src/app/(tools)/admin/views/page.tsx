'use client';

import { useCallback, useEffect, useState } from 'react';

interface Hidden { view_id: string; view_name: string; hidden_by: string | null; hidden_at: string }

// Admin > Views: built-in CTRT views deleted (hidden for everyone) from the View Builder, with Restore.
export default function HiddenViewsPage() {
  const [hidden, setHidden] = useState<Hidden[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setError('');
    const res = await fetch('/api/contract-team-reporting/hidden-views', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
    setHidden(json.hidden);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function restore(h: Hidden) {
    if (!confirm(`Restore "${h.view_name}" for everyone?`)) return;
    setBusy(h.view_id);
    const res = await fetch('/api/contract-team-reporting/hidden-views', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: h.view_id, hidden: false }),
    });
    const json = await res.json();
    setBusy('');
    if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
    setHidden(json.hidden);
  }

  const when = (v: string) => new Date(v).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-white p-6 text-sm text-gray-800">
      <h1 className="mb-1 text-xl font-semibold">Views</h1>
      <p className="mb-4 text-gray-500">Built-in Contract Team Reporting views that were deleted in the View Builder. They are hidden for everyone; Restore brings them back.</p>
      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-2 text-red-700">{error}</div>}
      {!hidden && !error && <div className="text-gray-500">Loading…</div>}
      {hidden && hidden.length === 0 && <div className="text-gray-500">No built-in views are hidden.</div>}
      {hidden && hidden.length > 0 && (
        <table className="w-full max-w-3xl border-collapse rounded border border-gray-200">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>{['View', 'Hidden by', 'Hidden on', ''].map((h) => <th key={h} className="border border-gray-200 px-2 py-1">{h}</th>)}</tr>
          </thead>
          <tbody>
            {hidden.map((h) => (
              <tr key={h.view_id}>
                <td className="border border-gray-200 px-2 py-1 font-medium">{h.view_name}</td>
                <td className="border border-gray-200 px-2 py-1">{h.hidden_by || ''}</td>
                <td className="border border-gray-200 px-2 py-1">{when(h.hidden_at)}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">
                  <button disabled={busy === h.view_id} onClick={() => restore(h)} className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-50">
                    {busy === h.view_id ? 'Restoring…' : 'Restore'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
