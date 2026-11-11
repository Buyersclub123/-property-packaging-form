'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AutomatedUpdate } from '@/lib/automatedUpdates';

type Row = Record<string, string | boolean | null>;
interface Data {
  register: AutomatedUpdate[];
  stamp: { apply: boolean; runs: Row[]; recent: Row[] };
  settled: { apply: boolean; switchedBy: string | null; switchedAt: string | null; recent: Row[] };
  confirm: { apply: boolean; switchedBy: string | null; switchedAt: string | null; recent: Row[] };
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

  async function setSettledApply(on: boolean) {
    if (on && !confirm('Switch Settlement confirmed -> Settled from dry run to moving the opportunity and writing the Property Record status in GHL?')) return;
    setSaving(true);
    const res = await fetch('/api/admin/automated-updates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ settledApply: on }) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
    load();
  }

  async function setConfirmApply(on: boolean) {
    if (on && !confirm('Switch Sales Meeting Outcomes Confirmed tick from dry run to writing the GHL appointment status and CONFIRMED title?')) return;
    setSaving(true);
    const res = await fetch('/api/admin/automated-updates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmApply: on }) });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error || `HTTP ${res.status}`); return; }
    load();
  }

  // Timestamps are stored in UTC; show them in Brisbane time.
  const fmt = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)
      ? new Date(s).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })
      : s;
  };

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

          <h2 className="mb-2 mt-8 text-lg font-semibold">Settlement confirmed -&gt; Settled</h2>
          <div className="mb-3 flex items-center gap-3">
            <span className={`rounded px-2 py-0.5 ${data.settled.apply ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
              {data.settled.apply ? 'Moving stage + writing Property Record status' : 'Dry run (log only): only the checkbox is written'}
            </span>
            <button disabled={saving} onClick={() => setSettledApply(!data.settled.apply)} className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-50">
              {data.settled.apply ? 'Switch to dry run' : 'Switch on writing'}
            </button>
            {data.settled.switchedBy && <span className="text-gray-500">Last switched by {data.settled.switchedBy}, {fmt(data.settled.switchedAt)} (Brisbane)</span>}
          </div>
          <h3 className="mb-1 font-medium">Recent runs (last 200 steps)</h3>
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>{['When', 'User', 'Opportunity', 'Property Record', 'Step', 'Before', 'After', 'Read back', 'Mode', 'Result'].map((h) => <th key={h} className="border border-gray-200 px-2 py-1">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.settled.recent.length === 0 && <tr><td colSpan={10} className="px-2 py-1 text-gray-500">No runs yet.</td></tr>}
              {data.settled.recent.map((r, i) => (
                <tr key={i}>
                  {['at', 'user_email'].map((k) => <td key={k} className="border border-gray-200 px-2 py-1">{fmt(r[k])}</td>)}
                  <td className="border border-gray-200 px-2 py-1" title={`Opportunity ID ${fmt(r.opportunity_id)}`}>{fmt(r.opportunity_name || r.opportunity_id)}</td>
                  {['record_id', 'step', 'old_value', 'new_value', 'read_back'].map((k) => <td key={k} className="border border-gray-200 px-2 py-1">{fmt(r[k])}</td>)}
                  <td className="border border-gray-200 px-2 py-1">{r.dry_run ? 'Dry run' : 'Applied'}</td>
                  <td className="border border-gray-200 px-2 py-1">{fmt(r.result)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="mb-2 mt-8 text-lg font-semibold">Sales Meeting Outcomes Confirmed tick</h2>
          <div className="mb-3 flex items-center gap-3">
            <span className={`rounded px-2 py-0.5 ${data.confirm.apply ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
              {data.confirm.apply ? 'Writing GHL status + CONFIRMED title' : 'Dry run (log only): only the tool tick is saved'}
            </span>
            <button disabled={saving} onClick={() => setConfirmApply(!data.confirm.apply)} className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-500 disabled:opacity-50">
              {data.confirm.apply ? 'Switch to dry run' : 'Switch on writing'}
            </button>
            {data.confirm.switchedBy && <span className="text-gray-500">Last switched by {data.confirm.switchedBy}, {fmt(data.confirm.switchedAt)} (Brisbane)</span>}
          </div>
          <h3 className="mb-1 font-medium">Recent runs</h3>
          <table className="w-full border-collapse border border-gray-200">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>{['When', 'User', 'Client', 'Tick', 'Field', 'Before', 'After', 'Read back', 'Mode', 'Result'].map((h) => <th key={h} className="border border-gray-200 px-2 py-1">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.confirm.recent.length === 0 && <tr><td colSpan={10} className="px-2 py-1 text-gray-500">No runs yet.</td></tr>}
              {data.confirm.recent.map((r, i) => (
                <tr key={i}>
                  {['at', 'user_email'].map((k) => <td key={k} className="border border-gray-200 px-2 py-1">{fmt(r[k])}</td>)}
                  <td className="border border-gray-200 px-2 py-1" title={`Appointment ID ${fmt(r.appointment_id)}`}>{fmt(r.name || r.appointment_id)}</td>
                  {['action', 'field', 'old_value', 'new_value', 'read_back'].map((k) => <td key={k} className="border border-gray-200 px-2 py-1">{fmt(r[k])}</td>)}
                  <td className="border border-gray-200 px-2 py-1">{r.dry_run ? 'Dry run' : 'Applied'}</td>
                  <td className="border border-gray-200 px-2 py-1">{fmt(r.result)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
