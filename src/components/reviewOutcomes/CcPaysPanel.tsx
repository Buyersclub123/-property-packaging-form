'use client';

import { useState } from 'react';
import type { CcPays, CcWriteResult } from '@/lib/reviewOutcomes/ccPays';
import { addDays } from '@/lib/reviewOutcomes/types';
import { WEEK_RULE, weekStart } from '@/lib/reviewOutcomes/stats';
import { dmy } from './ui';

/** CC PAYS AUTOMATED: preview a Fri-Thu week and write it as a NEW "(test)" / "(tool)" tab (recorders). */
export default function CcPaysPanel({ today }: { today: string }) {
  const [week, setWeek] = useState(addDays(weekStart(today), -7));
  const [data, setData] = useState<(CcPays & { apply: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const preview = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/review-outcomes/cc-pays?week=${week}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const write = async (target: 'test' | 'tool') => {
    if (!confirm(`Write a NEW tab "${data?.label} (${target})" to the CC PAYS workbook? Existing tabs are not touched.`)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/review-outcomes/cc-pays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ week, target }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      const r = body as CcWriteResult;
      setMsg({ ok: true, text: `Wrote "${r.tab}": ${r.rows} meetings, read back ${r.readBack}.` });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const rows = data?.blocks.reduce((n, b) => n + b.rows.length, 0) || 0;
  return (
    <div className="rounded border bg-white p-3 text-sm" data-testid="cc-pays">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-brand-charcoal">CC PAYS (automated)</span>
        <span className="text-xs text-gray-500" data-testid="week-rule">{WEEK_RULE} · week starting</span>
        <input type="date" value={week} onChange={(e) => { setWeek(weekStart(e.target.value)); setData(null); }} className="rounded border px-1 py-0.5 text-xs" aria-label="CC PAYS week" />
        <span className="text-xs text-gray-500">{dmy(week)} - {dmy(addDays(week, 6))}</span>
        <button onClick={preview} disabled={busy} className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50">{busy ? 'Working…' : 'Preview'}</button>
        {data && <button onClick={() => write('test')} disabled={busy} className="rounded border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs text-blue-800 hover:bg-blue-100 disabled:opacity-50">Write &quot;{data.label} (test)&quot; tab</button>}
        {data && <button onClick={() => write('tool')} disabled={busy || !data.apply} title={data.apply ? '' : 'Dry run: only (test) tabs until the switch is on'}
          className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-800 hover:bg-green-100 disabled:opacity-40">Write &quot;{data.label} (tool)&quot; tab</button>}
      </div>
      {msg && <div className={`mb-2 text-xs ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</div>}
      {data && (
        <>
          <div className="mb-1 text-xs text-gray-600">{rows} Showed meetings · layout and block order from manual tab &quot;{data.templateTab}&quot;{data.skipped.length ? ` · ${data.skipped.length} left out: ${data.skipped.map((s) => `${s.client} (${s.reason})`).join('; ')}` : ''}</div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="border-collapse text-[12px]">
              <tbody>
                {data.blocks.filter((b) => b.rows.length).map((b) => [
                  <tr key={b.header} className="bg-gray-300 font-semibold">{[b.header, 'COMMS DUE', 'CRM NOTES', 'TLC', 'CONSULTANT', 'DAY OFF'].map((h) => <td key={h} className="border border-gray-400 px-2 py-0.5">{h}</td>)}</tr>,
                  ...b.rows.map((r) => (
                    <tr key={r.appointmentId}>{[r.client, r.comms, r.crm, r.tlc, r.consultant, ''].map((v, i) => <td key={i} className="border border-gray-300 px-2 py-0.5">{v}</td>)}</tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
