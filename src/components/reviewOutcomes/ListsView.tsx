'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, DISCREPANCY_MINUTES, MIN_YMD, sydYmd, type ReviewData, type ReviewMeeting } from '@/lib/reviewOutcomes/types';
import { dateTime, dmy, outcomeStyle, periodKey, periodLabel, Stat, type Period } from './ui';

type Section = 'noOutcome' | 'completed' | 'discrepancies';

function Section({ title, count, children, open, onToggle }: { title: string; count: number; children: React.ReactNode; open: boolean; onToggle: () => void }) {
  return (
    <div className="mb-3 overflow-hidden rounded border bg-white">
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center justify-between bg-gray-50 px-3 py-2 text-left">
        <span className="text-sm font-semibold text-brand-charcoal">{title}</span>
        <span className="text-xs text-gray-500">{count.toLocaleString()} {open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

function MeetingTable({ rows, onOpenDay, extra }: { rows: ReviewMeeting[]; onOpenDay: (ymd: string) => void; extra?: (m: ReviewMeeting) => React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-gray-500">
        <tr><th className="p-1">Date</th><th className="p-1">Client</th><th className="p-1">Consultant</th><th className="p-1">GHL status</th>{extra && <th className="p-1" />}</tr>
      </thead>
      <tbody>
        {rows.map((m) => (
          <tr key={m.id} className="border-t">
            <td className="p-1"><button onClick={() => onOpenDay(m.ymd)} className="text-blue-700 hover:underline">{dateTime(m.start)}</button></td>
            <td className="p-1">{m.contactName}</td>
            <td className="p-1">{m.consultant}</td>
            <td className="p-1 text-gray-600">{m.ghlStatus}</td>
            {extra && <td className="p-1 text-xs text-gray-600">{extra(m)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ListsView({ onOpenDay, demoData = null }: { onOpenDay: (ymd: string) => void; demoData?: ReviewData | null }) {
  const today = sydYmd(Date.now());
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [from, setFrom] = useState(MIN_YMD);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState<Period>('month');
  const [open, setOpen] = useState<Record<Section, boolean>>({ noOutcome: true, completed: true, discrepancies: false });
  const [openCons, setOpenCons] = useState<string | null>(null);
  const [hideCancelled, setHideCancelled] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    if (demoData) {
      setData(demoData);
      return;
    }
    try {
      const res = await fetch(`/api/review-outcomes?from=${MIN_YMD}&to=${addDays(today, 90)}&sync=none`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body as ReviewData);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [today, demoData]);

  useEffect(() => { load(); }, [load]);

  const syncAll = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/review-outcomes/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSyncMsg(body.warnings?.length ? body.warnings.join(' | ') : 'Synced');
      await load();
    } catch (e) {
      setSyncMsg((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const inRange = useMemo(() => (data?.meetings || []).filter((m) => m.ymd >= from && m.ymd <= to), [data, from, to]);
  const noOutcome = useMemo(() => inRange.filter((m) => m.past && !m.outcome), [inRange]);
  const noOutcomeByCons = useMemo(() => {
    const g = new Map<string, ReviewMeeting[]>();
    for (const m of noOutcome) g.set(m.consultant, [...(g.get(m.consultant) || []), m]);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [noOutcome]);
  const completed = useMemo(() => inRange.filter((m) => m.outcome), [inRange]);
  const outcomeCols = useMemo(() => {
    const extra = [...new Set(completed.map((m) => m.outcome!))].filter((o) => !data?.settings.outcomes.includes(o));
    return [...(data?.settings.outcomes || []), ...extra];
  }, [completed, data]);
  const completedRows = useMemo(() => {
    const g = new Map<string, Record<string, number>>();
    for (const m of completed) {
      const k = periodKey(m.ymd, period);
      const row = g.get(k) || {};
      row[m.outcome!] = (row[m.outcome!] || 0) + 1;
      g.set(k, row);
    }
    return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [completed, period]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of completed) c[m.outcome!] = (c[m.outcome!] || 0) + 1;
    return c;
  }, [completed]);

  const pastInRange = useMemo(() => inRange.filter((m) => m.ymd <= today), [inRange, today]);
  const ghlNoGcal = useMemo(
    () => pastInRange.filter((m) => !m.gcal && !(hideCancelled && (m.ghlStatus === 'Cancelled' || m.outcome === 'Cancelled'))),
    [pastInRange, hideCancelled],
  );
  const gcalNoGhl = useMemo(() => (data?.gcalUnmatched || []).filter((e) => e.ymd >= from && e.ymd <= to && e.ymd <= today), [data, from, to, today]);
  const timeDiff = useMemo(
    () => inRange.filter((m) => m.gcal && m.gcal.minutesApart !== null && m.gcal.minutesApart > DISCREPANCY_MINUTES),
    [inRange],
  );

  if (error) return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!data) return <div className="rounded border bg-white p-4 text-sm text-gray-600">Loading lists…</div>;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-600">Period</span>
        <input type="date" value={from} min={MIN_YMD} onChange={(e) => e.target.value && setFrom(e.target.value)} className="rounded border px-1 py-0.5" />
        <span>to</span>
        <input type="date" value={to} min={MIN_YMD} onChange={(e) => e.target.value && setTo(e.target.value)} className="rounded border px-1 py-0.5" />
        <div className="inline-flex overflow-hidden rounded border border-gray-200 text-xs">
          {(['day', 'week', 'month'] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-2 py-1 font-semibold ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              By {p}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-500">
          {data.lastSync ? `Last full sync ${dateTime(data.lastSync.at)}` : 'Not fully synced yet'}
        </span>
        {data.viewer.recorder && !demoData && (
          <button onClick={syncAll} disabled={syncing} className="rounded border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50">
            {syncing ? 'Syncing… (can take a few minutes)' : 'Sync all from GHL + Google'}
          </button>
        )}
      </div>
      {syncMsg && <div className="mb-3 rounded border bg-gray-50 px-3 py-2 text-xs text-gray-700">{syncMsg}</div>}

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Stat label="Meetings" value={inRange.length} />
        <Stat label="No outcome (past)" value={noOutcome.length} tone={noOutcome.length ? 'text-red-700' : ''} />
        {outcomeCols.map((o) => <Stat key={o} label={o} value={counts[o] || 0} />)}
      </div>

      <Section title="No outcome recorded, by consultant" count={noOutcome.length} open={open.noOutcome} onToggle={() => setOpen({ ...open, noOutcome: !open.noOutcome })}>
        {noOutcomeByCons.length === 0 && <div className="text-sm text-gray-500">None.</div>}
        {noOutcomeByCons.map(([cons, list]) => (
          <div key={cons} className="border-t first:border-t-0">
            <button onClick={() => setOpenCons(openCons === cons ? null : cons)} className="flex w-full justify-between py-1.5 text-left text-sm">
              <span className="font-medium text-brand-charcoal">{cons}</span>
              <span className="text-gray-500">{list.length}</span>
            </button>
            {openCons === cons && <div className="pb-2"><MeetingTable rows={list} onOpenDay={onOpenDay} /></div>}
          </div>
        ))}
      </Section>

      <Section title={`Completed, by ${period}`} count={completed.length} open={open.completed} onToggle={() => setOpen({ ...open, completed: !open.completed })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="p-1">{period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Day'}</th>
                {outcomeCols.map((o) => <th key={o} className="p-1 text-right">{o}</th>)}
                <th className="p-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {completedRows.map(([k, row]) => (
                <tr key={k} className="border-t">
                  <td className="p-1">
                    {period === 'day' ? <button onClick={() => onOpenDay(k)} className="text-blue-700 hover:underline">{periodLabel(k, period)}</button> : periodLabel(k, period)}
                  </td>
                  {outcomeCols.map((o) => <td key={o} className="p-1 text-right">{row[o] || ''}</td>)}
                  <td className="p-1 text-right font-semibold">{Object.values(row).reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-1">Total</td>
                {outcomeCols.map((o) => <td key={o} className="p-1 text-right">{counts[o] || ''}</td>)}
                <td className="p-1 text-right">{completed.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Discrepancies (GHL vs consultant calendars)" count={ghlNoGcal.length + gcalNoGhl.length + timeDiff.length}
        open={open.discrepancies} onToggle={() => setOpen({ ...open, discrepancies: !open.discrepancies })}>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-brand-charcoal">GHL appointments with no consultant calendar event ({ghlNoGcal.length})</div>
          <label className="inline-flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={hideCancelled} onChange={(e) => setHideCancelled(e.target.checked)} /> Hide cancelled
          </label>
        </div>
        <div className="mb-4"><MeetingTable rows={ghlNoGcal} onOpenDay={onOpenDay} /></div>

        <div className="mb-2 text-sm font-semibold text-brand-charcoal">Consultant calendar events with no GHL appointment ({gcalNoGhl.length})</div>
        <table className="mb-4 w-full text-sm">
          <thead className="text-left text-xs text-gray-500"><tr><th className="p-1">Date</th><th className="p-1">Event</th><th className="p-1">Consultant</th></tr></thead>
          <tbody>
            {gcalNoGhl.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-1"><button onClick={() => onOpenDay(e.ymd)} className="text-blue-700 hover:underline">{e.allDay ? `${dmy(e.ymd)} (all day)` : dateTime(e.start)}</button></td>
                <td className="p-1">{e.title}</td>
                <td className="p-1">{e.staff || e.calendars.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mb-2 text-sm font-semibold text-brand-charcoal">Matched, but times differ by more than {DISCREPANCY_MINUTES} minutes ({timeDiff.length})</div>
        <MeetingTable rows={timeDiff} onOpenDay={onOpenDay}
          extra={(m) => `Google ${dateTime(m.gcal!.event.start)} · ${m.gcal!.minutesApart! >= 1440 ? `${Math.round(m.gcal!.minutesApart! / 1440)} day(s)` : `${m.gcal!.minutesApart} min`} apart`} />
      </Section>
      <div className="text-xs text-gray-500">
        Outcome colours: {outcomeCols.map((o) => <span key={o} className={`mr-1 rounded border px-1 ${outcomeStyle(o).on}`}>{o}</span>)}
      </div>
    </div>
  );
}
