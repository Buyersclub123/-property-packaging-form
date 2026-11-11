'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, MIN_YMD, sydYmd, type ReviewData, type ReviewMeeting } from '@/lib/reviewOutcomes/types';
import { dateTime, dmy, outcomeStyle, periodKey, periodLabel, Stat, type Period } from './ui';
import { bookerKey, isSat } from '@/lib/reviewOutcomes/stats';

type Section = 'noOutcome' | 'repeats' | 'completed';

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

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
  const [open, setOpen] = useState<Record<Section, boolean>>({ noOutcome: true, repeats: false, completed: true });
  const [repeatDays, setRepeatDays] = useState(90);
  const [sameConsultant, setSameConsultant] = useState(true);
  const [openCons, setOpenCons] = useState<string | null>(null);

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
  const noOutcome = useMemo(() => inRange.filter((m) => m.past && !m.outcome && !m.selfBooked), [inRange]);
  const noOutcomeByCons = useMemo(() => {
    const g = new Map<string, ReviewMeeting[]>();
    for (const m of noOutcome) g.set(m.consultant, [...(g.get(m.consultant) || []), m]);
    return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [noOutcome]);
  // Same client booked again within N days (JT 11/11): a sat Presentation 1, then the client's next Presentation 1 with any outcome.
  const repeats = useMemo(() => {
    const by = new Map<string, ReviewMeeting[]>();
    for (const m of inRange) {
      if (m.kind === 'PR') continue;
      const k = (m.contactId || m.contactName.replace(/\*$/, '').trim().toLowerCase()) + (sameConsultant ? `|${m.consultantId}` : '');
      if (k) by.set(k, [...(by.get(k) || []), m]);
    }
    const out: { first: ReviewMeeting; next: ReviewMeeting; days: number }[] = [];
    for (const list of by.values()) {
      const s = [...list].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 0; i + 1 < s.length; i++) {
        if (!isSat(s[i])) continue;
        const days = daysBetween(s[i].ymd, s[i + 1].ymd);
        if (days <= repeatDays) out.push({ first: s[i], next: s[i + 1], days });
      }
    }
    return out.sort((a, b) => b.next.start.localeCompare(a.next.start));
  }, [inRange, repeatDays, sameConsultant]);
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
    for (const m of noOutcome) {
      const k = periodKey(m.ymd, period);
      const row = g.get(k) || {};
      row['No outcome'] = (row['No outcome'] || 0) + 1;
      g.set(k, row);
    }
    return [...g.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [completed, noOutcome, period]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const m of completed) c[m.outcome!] = (c[m.outcome!] || 0) + 1;
    return c;
  }, [completed]);

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

      <Section title={`Outcomes, by ${period}`} count={completed.length + noOutcome.length} open={open.completed} onToggle={() => setOpen({ ...open, completed: !open.completed })}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="p-1">{period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Day'}</th>
                {['No outcome', ...outcomeCols].map((o) => <th key={o} className="p-1 text-right">{o}</th>)}
                <th className="p-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {completedRows.map(([k, row]) => (
                <tr key={k} className="border-t">
                  <td className="p-1">
                    {period === 'day' ? <button onClick={() => onOpenDay(k)} className="text-blue-700 hover:underline">{periodLabel(k, period)}</button> : periodLabel(k, period)}
                  </td>
                  {['No outcome', ...outcomeCols].map((o) => <td key={o} className={`p-1 text-right ${o === 'No outcome' ? 'text-red-700' : ''}`}>{row[o] || ''}</td>)}
                  <td className="p-1 text-right font-semibold">{Object.values(row).reduce((a, b) => a + b, 0)}</td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-1">Total</td>
                {['No outcome', ...outcomeCols].map((o) => <td key={o} className="p-1 text-right">{(o === 'No outcome' ? noOutcome.length : counts[o]) || ''}</td>)}
                <td className="p-1 text-right">{completed.length + noOutcome.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Same client booked again (possible 2nd meetings booked as 1st)" count={repeats.length} open={open.repeats} onToggle={() => setOpen({ ...open, repeats: !open.repeats })}>
        <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <label className="inline-flex items-center gap-1">
            Within <input type="number" min={1} max={730} value={repeatDays} onChange={(e) => setRepeatDays(Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded border px-1 py-0.5" /> days
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={sameConsultant} onChange={(e) => setSameConsultant(e.target.checked)} /> Same consultant only
          </label>
          <span>Presentation Meeting One only. Left = a meeting the client sat; right = their next Presentation 1, any outcome. Amber = the 2nd booking has a different booker.</span>
        </div>
        {repeats.length === 0 ? <div className="text-sm text-gray-500">None.</div> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr><th className="p-1">Client</th><th className="p-1">Earlier meeting (sat, Presentation 1)</th><th className="p-1">Later meeting (Presentation 1, any outcome)</th><th className="p-1 text-right">Days apart</th></tr>
            </thead>
            <tbody>
              {repeats.map(({ first, next, days }) => {
                const differs = bookerKey(first) !== bookerKey(next);
                return (
                <tr key={`${first.id}-${next.id}`} data-testid="repeat-row" data-booker-differs={differs ? '1' : '0'} className={`border-t ${differs ? 'bg-amber-50' : ''}`}
                  title={differs ? `Booked by ${bookerKey(first)} first, then ${bookerKey(next)}` : undefined}>
                  <td className="p-1">{next.contactLink ? <a href={next.contactLink} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{next.contactName}</a> : next.contactName}</td>
                  {[first, next].map((m) => (
                    <td key={m.id} className="p-1">
                      <button onClick={() => onOpenDay(m.ymd)} className="text-blue-700 hover:underline">{dateTime(m.start)}</button>
                      <span className="text-xs text-gray-600"> · {m.consultant} · {m.outcome || (m.ghlStatus === 'Cancelled' ? 'Cancelled' : 'No outcome')}</span>
                      <span className={`text-xs ${differs && m === next ? 'font-semibold text-amber-800' : 'text-gray-600'}`}> · Booker: {bookerKey(m)}</span>
                    </td>
                  ))}
                  <td className="p-1 text-right font-semibold">{days}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="No outcome recorded, by consultant" count={noOutcome.length} open={open.noOutcome} onToggle={() => setOpen({ ...open, noOutcome: !open.noOutcome })}>
        {noOutcomeByCons.length === 0 && <div className="text-sm text-gray-500">None.</div>}
        {noOutcomeByCons.length > 0 && (
          <div className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px_100px_60px] gap-2 pb-1 text-right text-xs text-gray-500">
            <span className="text-left">Consultant</span><span>Up to 7 days</span><span>8-30 days</span><span>Over 30 days</span><span>Oldest</span><span>Total</span>
          </div>
        )}
        {noOutcomeByCons.map(([cons, list]) => (
          <div key={cons} className="border-t first:border-t-0">
            <button onClick={() => setOpenCons(openCons === cons ? null : cons)}
              className="grid w-full grid-cols-[minmax(0,1fr)_80px_80px_80px_100px_60px] gap-2 py-1.5 text-right text-sm">
              <span className="text-left font-medium text-brand-charcoal">{cons}</span>
              <span>{list.filter((m) => daysBetween(m.ymd, today) <= 7).length || ''}</span>
              <span className="text-amber-700">{list.filter((m) => { const d = daysBetween(m.ymd, today); return d > 7 && d <= 30; }).length || ''}</span>
              <span className="font-semibold text-red-700">{list.filter((m) => daysBetween(m.ymd, today) > 30).length || ''}</span>
              <span className="text-gray-600">{dmy(list.reduce((mn, m) => (m.ymd < mn ? m.ymd : mn), list[0].ymd))}</span>
              <span className="text-gray-500">{list.length}</span>
            </button>
            {openCons === cons && <div className="pb-2"><MeetingTable rows={list} onOpenDay={onOpenDay} /></div>}
          </div>
        ))}
      </Section>
      <div className="text-xs text-gray-500">
        Outcome colours: {outcomeCols.map((o) => <span key={o} className={`mr-1 rounded border px-1 ${outcomeStyle(o).on}`}>{o}</span>)}
      </div>
    </div>
  );
}
