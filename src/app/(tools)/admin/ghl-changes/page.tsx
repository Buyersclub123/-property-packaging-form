'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAuthEmail } from '@/lib/userAuth';

interface Change {
  id: number;
  detectedAt: string;
  entityType: string;
  changeType: string;
  scope: string;
  entityId: string;
  entityName: string;
  before: unknown;
  after: unknown;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

const CHANGE_LABEL: Record<string, string> = {
  added: 'Added',
  removed: 'Removed',
  renamed: 'Renamed',
  type_changed: 'Type changed',
  options_changed: 'Options changed',
  reordered: 'Reordered',
  missing_configured: 'Missing — tools depend on this',
};

function sydney(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' });
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string' || typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('name' in o && 'stages' in o) return `${o.name} (${(o.stages as string[]).length} stages)`;
    if ('name' in o && 'dataType' in o) return `${o.name} [${o.dataType}]${o.options ? ` · ${(o.options as string[]).join(', ')}` : ''}`;
  }
  return JSON.stringify(v);
}

function what(c: Change): string {
  if (c.entityType === 'stage') return `Stage in ${c.scope}`;
  if (c.entityType === 'field') return `${c.scope} field`;
  if (c.entityType === 'object') return 'Custom object';
  return 'Pipeline';
}

function rowClass(c: Change): string {
  if (c.changeType === 'removed' || c.changeType === 'missing_configured') return 'text-red-700 font-medium';
  if (c.changeType === 'reordered') return 'text-gray-400';
  return '';
}

export default function GhlChangesPage() {
  const [unacked, setUnacked] = useState<Change[]>([]);
  const [acked, setAcked] = useState<Change[]>([]);
  const [lastCheckAt, setLastCheckAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAcked, setShowAcked] = useState(false);
  const [runResult, setRunResult] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ghl-monitor/changes', { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      const data = await res.json();
      setUnacked(data.unacknowledged || []);
      setAcked(data.acknowledged || []);
      setLastCheckAt(data.lastCheckAt || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function ack(ids: number[] | 'all') {
    setBusy(true); setError('');
    try {
      const email = await getAuthEmail();
      const res = await fetch('/api/ghl-monitor/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids === 'all' ? { all: true, email } : { ids, email }),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to acknowledge');
    } finally {
      setBusy(false);
    }
  }

  async function runCheckNow() {
    setBusy(true); setRunResult(''); setError('');
    try {
      const res = await fetch('/api/ghl-monitor/check', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${res.status}`);
      setRunResult(data.baseline ? 'Baseline snapshot stored.' : `Check complete — ${data.changes} change${data.changes === 1 ? '' : 's'} found.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setBusy(false);
    }
  }

  const table = (rows: Change[], withAck: boolean) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-100 text-left">
          <th className="border p-2">Detected</th>
          <th className="border p-2">Change</th>
          <th className="border p-2">What</th>
          <th className="border p-2">Name</th>
          <th className="border p-2">Before</th>
          <th className="border p-2">After</th>
          <th className="border p-2">{withAck ? '' : 'Acknowledged'}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id} className={rowClass(c)}>
            <td className="border p-2 whitespace-nowrap">{sydney(c.detectedAt)}</td>
            <td className="border p-2 whitespace-nowrap">{CHANGE_LABEL[c.changeType] || c.changeType}</td>
            <td className="border p-2">{what(c)}</td>
            <td className="border p-2">
              {c.entityName}
              <div className="text-[10px] text-gray-400 font-mono">{c.entityId}</div>
            </td>
            <td className="border p-2 max-w-xs break-words">{fmt(c.before)}</td>
            <td className="border p-2 max-w-xs break-words">{fmt(c.after)}</td>
            <td className="border p-2 whitespace-nowrap">
              {withAck ? (
                <button onClick={() => ack([c.id])} disabled={busy} className="rounded bg-blue-600 px-3 py-1 text-white text-xs hover:bg-blue-700 disabled:opacity-50">
                  Acknowledge
                </button>
              ) : (
                <span className="text-xs text-gray-500">{sydney(c.acknowledgedAt)}<br />{c.acknowledgedBy}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-1 text-2xl font-bold">GHL Configuration Changes</h1>
        <p className="mb-4 text-sm text-gray-600">
          Pipelines, stages and custom fields are checked against GHL every hour. Changes are emailed immediately and
          repeated in the daily roll-up until acknowledged here. Last successful check: <strong>{sydney(lastCheckAt)}</strong>.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button onClick={runCheckNow} disabled={busy} className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-900 disabled:opacity-50">
            {busy ? 'Working…' : 'Run check now'}
          </button>
          {unacked.length > 0 && (
            <button onClick={() => ack('all')} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              Acknowledge all ({unacked.length})
            </button>
          )}
          {runResult && <span className="text-sm text-green-700">{runResult}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>

        <h2 className="mb-2 text-lg font-semibold">Awaiting acknowledgement ({unacked.length})</h2>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : unacked.length === 0 ? (
          <p className="mb-6 rounded bg-green-50 p-3 text-sm text-green-800">No unacknowledged changes.</p>
        ) : (
          <div className="mb-6 overflow-x-auto">{table(unacked, true)}</div>
        )}

        <button onClick={() => setShowAcked((v) => !v)} className="mb-2 text-sm text-blue-700 underline">
          {showAcked ? 'Hide' : 'Show'} recently acknowledged ({acked.length})
        </button>
        {showAcked && acked.length > 0 && <div className="overflow-x-auto">{table(acked, false)}</div>}
      </div>
    </div>
  );
}
