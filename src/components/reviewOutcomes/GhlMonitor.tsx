'use client';

import { useEffect, useState } from 'react';

type Kind = { total: number; agree: number; grid: Record<string, Record<string, number>> };
type Check = { from: string; to: string; byKind: Record<string, Kind>; moves: { n: number; appts: number; first: string | null } };

const GHL_COLS = ['Showed', 'No show', 'Cancelled', 'Invalid (DNQ)', 'Confirmed / other', '-'];

// Settings: FYI on the hourly GHL refresh and move tracking, plus an ongoing read-only check of whether GHL statuses
// agree with the outcomes recorded in the calendar schedule sheet / this tool.
export default function GhlMonitor({ demo }: { demo: boolean }) {
  const [data, setData] = useState<Check | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (demo) return;
    fetch('/api/review-outcomes/ghl-check')
      .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`))))
      .then(setData, (e: Error) => setErr(e.message));
  }, [demo]);

  return (
    <div className="space-y-3 rounded border border-gray-200 bg-white p-4 text-sm">
      <h3 className="font-semibold text-brand-charcoal">GHL refresh and status check (FYI)</h3>
      <ul className="list-disc space-y-1 pl-5 text-gray-700">
        <li>Every hour (at :15) the tool re-reads GHL appointments and Google invites for the last 7 days to 60 days ahead. It only reads; nothing is written to GHL or Google.</li>
        <li>Moving an appointment in GHL keeps the same appointment, so each refresh compares its time with the last one seen. A changed time is logged as a move (= Rescheduled). Moves before tracking started can&apos;t be recovered.</li>
        <li>&quot;Not sat&quot; counts as No show. GHL has no Rescheduled status.</li>
        <li>* A client name with an asterisk means GHL wouldn&apos;t return that contact (probably deleted or merged), so the name comes from the appointment title and there&apos;s no phone.</li>
      </ul>
      {demo ? <p className="text-gray-500">Not available in demo.</p> : err ? <p className="text-red-700">{err}</p> : !data ? <p className="text-gray-500">Loading…</p> : (
        <>
          <p className="text-gray-700">
            Moves tracked: <b>{data.moves.n}</b> on {data.moves.appts} appointments
            {data.moves.first ? ` since ${new Date(data.moves.first).toLocaleDateString('en-AU')}` : ' (none yet)'}.
          </p>
          <p className="text-gray-700">Is GHL kept up to date? Past meetings {data.from} to {data.to}: the recorded outcome (sheet or tool) against the GHL status.</p>
          {Object.entries(data.byKind).map(([kind, k]) => (
            <div key={kind} className="overflow-x-auto">
              <div className="mb-1 font-medium">{kind}: GHL agrees on {k.agree} of {k.total} ({k.total ? Math.round((k.agree / k.total) * 100) : 0}%)</div>
              <table className="border-collapse text-xs">
                <thead><tr><th className="border px-2 py-1 text-left">Recorded \ GHL</th>{GHL_COLS.map((c) => <th key={c} className="border px-2 py-1">{c}</th>)}</tr></thead>
                <tbody>
                  {Object.entries(k.grid).map(([o, row]) => (
                    <tr key={o}><td className="border px-2 py-1 font-medium">{o}</td>
                      {GHL_COLS.map((c) => <td key={c} className={`border px-2 py-1 text-right ${c === o ? 'bg-green-50 font-semibold' : ''}`}>{row[c] || ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
