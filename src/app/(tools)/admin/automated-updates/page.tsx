'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AutomatedUpdate } from '@/lib/automatedUpdates';

type Row = Record<string, string | boolean | null>;
interface Data {
  register: AutomatedUpdate[];
  stamp: { apply: boolean; runs: Row[]; recent: Row[] };
}

// Admin > Automated updates: every non-human write path into GHL, plus the nightly stamp's switch and log.
export default function AutomatedUpdatesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const res = await fetch('/api/admin/automated-updates', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
    setData(json);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setApply(apply: boolean) {
    if (apply && !confirm('Switch the nightly stamp from dry run to writing dates into GHL?')) return;
    setSaving(true);
    const res = await fetch('/api/admin/automated-updates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apply }) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
    load();
  }

  const fmt = (v: unknown) => (v === null || v === undefined ? '' : String(v));

  return (
    <div className="min-h-screen bg-white p-6 text-sm text-gray-800">
      <h1 className="mb-1 text-xl font-semibold">Automated updates</h1>
      <p className="mb-4 text-gray-500">Every write into GHL that a person doesn&apos;t make directly. Add a row in src/lib/automatedUpdates.ts whenever a new one is built.</p>
      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-2 text-red-700">{error}</div>}
      {!data && !error && <div className="text-gray-500">Loading…</div>}
      {data && (
        <>
          <table className="mb-8 w-full border-collapse rounded border border-gray-200">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>{['What', 'Trigger', 'Fields written', 'Rule', 'Log'].map((h) => <th key={h} className="border border-gray-200 px-2 py-1">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.register.map((r) => (
                <tr key={r.name} className="align-top">
                  <td className="border border-gray-200 px-2 py-1"><div className="font-medium">{r.name}</div><div className="text-gray-500">{r.what}</div></td>
                  <td className="border border-gray-200 px-2 py-1">{r.trigger}</td>
                  <td className="border border-gray-200 px-2 py-1">{r.fieldsWritten}</td>
                  <td className="border border-gray-200 px-2 py-1">{r.rule}</td>
                  <td className="border border-gray-200 px-2 py-1">{r.log}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-2 text-lg font-semibold">Nightly change-date stamp</h2>
          <div className="mb-3 flex items-center gap-3">
            <span className={`rounded px-2 py-0.5 ${data.stamp.apply ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
              {data.stamp.apply ? 'Writing dates to GHL' : 'Dry run (log only)'}
            </span>
            <button disabled={saving} onClick={() => setApply(!data.stamp.apply)} className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-50">
              {data.stamp.apply ? 'Switch to dry run' : 'Switch on writing'}
            </button>
          </div>
          <h3 className="mb-1 font-medium">Last runs</h3>
          <table className="mb-6 w-full border-collapse border border-gray-200">
            <tbody>
              {data.stamp.runs.length === 0 && <tr><td className="px-2 py-1 text-gray-500">No runs yet.</td></tr>}
              {data.stamp.runs.map((r) => (
                <tr key={fmt(r.run_id)}><td className="border border-gray-200 px-2 py-1">{fmt(r.at)}</td><td className="border border-gray-200 px-2 py-1">{r.dry_run ? 'Dry run' : 'Applied'}</td><td className="border border-gray-200 px-2 py-1">{fmt(r.result)}</td></tr>
              ))}
            </tbody>
          </table>
          <h3 className="mb-1 font-medium">Recent changes (last 200)</h3>
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>{['When', 'Object', 'Record', 'Field', 'Old', 'New', 'Date field', 'Date', 'Result'].map((h) => <th key={h} className="border border-gray-200 px-2 py-1">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.stamp.recent.map((r, i) => (
                <tr key={i}>{['at', 'object', 'record_id', 'field', 'old_value', 'new_value', 'date_field', 'date_written', 'result'].map((k) => <td key={k} className="border border-gray-200 px-2 py-1">{fmt(r[k])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
