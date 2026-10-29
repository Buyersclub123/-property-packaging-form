'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, DISCREPANCY_MINUTES, MIN_YMD, sydYmd, type ReviewData, type ReviewMeeting, type ReviewSettings } from '@/lib/reviewOutcomes/types';
import { demoData } from '@/lib/reviewOutcomes/demo';
import MorePanel from '@/components/reviewOutcomes/MorePanel';
import ListsView from '@/components/reviewOutcomes/ListsView';
import SettingsView from '@/components/reviewOutcomes/SettingsView';
import { dmy, outcomeStyle, Stat, time, weekday } from '@/components/reviewOutcomes/ui';

type Tab = 'day' | 'lists' | 'settings';

function MeetingRow({ m, settings, canEdit, onRecord, onMore }: {
  m: ReviewMeeting;
  settings: ReviewSettings;
  canEdit: boolean;
  onRecord: (m: ReviewMeeting, outcome: string | null, reason?: string | null) => void;
  onMore: (m: ReviewMeeting) => void;
}) {
  const g = m.gcal;
  const off = g && g.minutesApart !== null && g.minutesApart > DISCREPANCY_MINUTES;
  const isInvalid = !!m.outcome && /^invalid/i.test(m.outcome) && m.outcomeSource !== 'ghl';
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 border-t px-3 py-2 first:border-t-0 md:grid-cols-[72px_minmax(0,1.1fr)_150px_minmax(0,1fr)_auto]">
      <div className="text-sm font-semibold text-brand-charcoal">{time(m.start)}</div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {m.contactLink ? <a href={m.contactLink} target="_blank" rel="noreferrer" className="text-brand-charcoal hover:underline">{m.contactName || '(no name)'}</a> : m.contactName}
          {m.calendar.includes('2nd') && <span className="ml-2 rounded bg-blue-50 px-1 text-[11px] text-blue-700">2nd meeting</span>}
        </div>
        <div className="text-xs text-gray-500">GHL: {m.ghlStatus}</div>
      </div>
      <div className="col-start-2 min-w-0 truncate text-sm text-gray-700 md:col-start-auto" title="GHL assigned consultant">{m.consultant}</div>
      <div className="col-start-2 min-w-0 text-xs md:col-start-auto">
        {g ? (
          <div className={off ? 'text-red-700' : 'text-gray-600'} title={`Matched on ${g.basis}`}>
            Google: {g.event.allDay ? `${dmy(g.event.ymd)} all day` : `${g.event.ymd !== m.ymd ? `${dmy(g.event.ymd)} ` : ''}${time(g.event.start)}`} · {g.event.staff || g.event.calendars.join(', ')}
            {off && ` · ${g.minutesApart! >= 1440 ? `${Math.round(g.minutesApart! / 1440)}d` : `${g.minutesApart} min`} apart`}
            <div className="truncate text-gray-400">{g.event.title}</div>
          </div>
        ) : (
          <div className="text-amber-700">No consultant calendar event</div>
        )}
      </div>
      <div className="col-start-2 mt-1 flex flex-wrap items-center gap-1 md:col-start-auto md:mt-0 md:justify-end">
        {settings.outcomes.map((o) => {
          const on = m.outcome === o;
          return (
            <button key={o} disabled={!canEdit} onClick={() => !on && onRecord(m, o)}
              className={`rounded-full border px-2 py-0.5 text-xs font-medium ${on ? outcomeStyle(o).on : `bg-white ${outcomeStyle(o).off}`} disabled:cursor-default`}>
              {o}
            </button>
          );
        })}
        {m.outcome && !settings.outcomes.includes(m.outcome) && (
          <span className={`rounded-full border px-2 py-0.5 text-xs ${outcomeStyle(m.outcome).on}`}>{m.outcome}</span>
        )}
        {isInvalid && (
          <select value={m.invalidReason || ''} disabled={!canEdit} onChange={(e) => onRecord(m, m.outcome, e.target.value || null)}
            className="rounded border px-1 py-0.5 text-xs" aria-label="Invalid reason">
            <option value="">Reason…</option>
            {settings.invalidReasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {m.outcomeSource === 'sheet' && <span className="text-[11px] text-gray-400" title={m.sourceRef || ''}>from sheet</span>}
        {m.outcomeSource === 'ghl' && <span className="text-[11px] text-gray-400">from GHL</span>}
        {canEdit && (m.outcomeSource === 'tool' || m.outcomeSource === 'sheet') && (
          <button onClick={() => onRecord(m, null)} className="text-[11px] text-gray-400 hover:text-red-600">clear</button>
        )}
        <button onClick={() => onMore(m)} className="ml-1 rounded border px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50">More</button>
      </div>
    </div>
  );
}

export default function ReviewOutcomesPage() {
  const today = sydYmd(Date.now());
  const [tab, setTab] = useState<Tab>('day');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [q, setQ] = useState('');
  const [consultant, setConsultant] = useState('');
  const [live, setLive] = useState<ReviewData | null>(null);
  const [demo, setDemo] = useState(false);
  const [demoAll, setDemoAll] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState<ReviewMeeting | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const data = useMemo<ReviewData | null>(
    () => (demo && demoAll ? { ...demoAll, from, to, meetings: demoAll.meetings.filter((m) => m.ymd >= from && m.ymd <= to) } : live),
    [demo, demoAll, live, from, to],
  );

  const load = useCallback(async (sync: 'auto' | 'none' = 'auto') => {
    if (sync === 'auto') setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/review-outcomes?from=${from}&to=${to}&sync=${sync}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status} (response was not JSON)` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setLive(body as ReviewData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { if (!demo) load(); }, [load, demo]);

  const span = Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1;
  const shift = (dir: 1 | -1) => {
    const f = addDays(from, dir * span);
    if (f < MIN_YMD) return;
    setFrom(f);
    setTo(addDays(to, dir * span));
  };
  const setRange = (f: string, t: string) => {
    setFrom(f);
    setTo(t);
  };
  const weekStart = addDays(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = addDays(`${addDays(monthStart, 32).slice(0, 7)}-01`, -1);
  const allTo = addDays(today, 90);
  const quick: [string, string, string][] = [
    ['Today', today, today],
    ['This week', weekStart, addDays(weekStart, 6)],
    ['This month', monthStart, monthEnd],
    ['All', MIN_YMD, allTo],
  ];
  const isAll = from === MIN_YMD && to === allTo;
  const openDay = (ymd: string) => {
    setFrom(ymd);
    setTo(ymd);
    setTab('day');
  };
  const toggleDemo = () => {
    if (demo) {
      setDemo(false);
      setDemoAll(null);
      openDay(today);
      return;
    }
    const d = demoData();
    setDemoAll(d);
    setDemo(true);
    setFrom(d.from);
    setTo(d.to);
  };

  const record = async (m: ReviewMeeting, outcome: string | null, reason: string | null = null) => {
    setSaveError(null);
    const apply = (d: ReviewData | null) => d && {
      ...d,
      meetings: d.meetings.map((x) => (x.id === m.id ? { ...x, outcome, invalidReason: reason, outcomeSource: outcome ? ('tool' as const) : null } : x)),
    };
    if (demo) {
      setDemoAll(apply);
      return;
    }
    setLive(apply);
    try {
      const res = await fetch('/api/review-outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: m.id, outcome, invalidReason: reason }),
      });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    } catch (e) {
      setSaveError(`${m.contactName}: ${(e as Error).message}`);
    }
    load('none');
  };

  const meetings = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.meetings || []).filter((m) =>
      (!consultant || m.consultant === consultant) && (!s || m.contactName.toLowerCase().includes(s) || m.contactEmail.toLowerCase().includes(s)));
  }, [data, q, consultant]);
  const byDay = useMemo(() => {
    const g = new Map<string, ReviewMeeting[]>();
    for (const m of meetings) g.set(m.ymd, [...(g.get(m.ymd) || []), m]);
    return [...g.entries()];
  }, [meetings]);
  const canEdit = (m: ReviewMeeting) => !!data && (data.viewer.recorder || data.viewer.consultantIds.includes(m.consultantId));

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <h1 className="mb-1 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Review Outcomes</h1>
        <p className="mb-4 text-[13px] text-[#7A7575]">
          Source: GHL Calendar - Portfolio Review Meeting (and 2nd Meeting). Outcomes are saved to our database only.
        </p>

        <div className="mb-4 inline-flex overflow-hidden rounded border border-gray-200 text-sm" role="tablist">
          {([['day', 'Meetings'], ['lists', 'Lists'], ['settings', 'Settings']] as const).map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 font-semibold ${tab === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={toggleDemo} className={`ml-3 rounded border px-2 py-1 text-xs ${demo ? 'border-amber-400 bg-amber-50 text-amber-900' : 'text-gray-600 hover:bg-gray-50'}`}>
          {demo ? 'Exit demo' : 'Demo'}
        </button>
        {demo && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Demo mode: 20 made-up meetings. Taps, notes and settings stay in this browser tab - nothing is saved.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <div className="font-semibold">Could not load meetings</div>
            <div className="mt-1 whitespace-pre-wrap">{error}</div>
            <button onClick={() => load()} className="mt-2 rounded border border-red-300 bg-white px-2 py-1 text-xs">Retry</button>
          </div>
        )}
        {data?.warnings.map((w) => <div key={w} className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">{w}</div>)}

        {tab === 'day' && (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <input type="date" value={from} min={MIN_YMD} aria-label="From"
                onChange={(e) => { const v = e.target.value; if (!v) return; setFrom(v); if (v > to) setTo(v); }} className="rounded border px-1 py-0.5" />
              <span>to</span>
              <input type="date" value={to} min={from} aria-label="To"
                onChange={(e) => e.target.value && setTo(e.target.value)} className="rounded border px-1 py-0.5" />
              <div className="inline-flex overflow-hidden rounded border border-gray-200 text-xs" role="group" aria-label="Quick period">
                {quick.map(([label, f, t]) => (
                  <button key={label} onClick={() => setRange(f, t)}
                    className={`px-2 py-1 font-semibold ${from === f && to === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client" className="w-[200px] rounded border px-2 py-1" />
              {data?.viewer.recorder && (
                <select value={consultant} onChange={(e) => setConsultant(e.target.value)} className="rounded border px-1 py-1" aria-label="Consultant">
                  <option value="">All consultants</option>
                  {data.consultants.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {loading && <span className="text-xs text-gray-500">Refreshing from GHL…</span>}
            </div>

            {data && (
              <div className="mb-3 flex flex-wrap gap-3 text-sm">
                <Stat label="Meetings" value={meetings.length} />
                <Stat label="Outcome recorded" value={meetings.filter((m) => m.outcome).length} />
                <Stat label="No outcome (past)" value={meetings.filter((m) => m.past && !m.outcome).length} tone="text-red-700" />
                <Stat label="No calendar event" value={meetings.filter((m) => !m.gcal).length} />
              </div>
            )}
            {saveError && <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">Not saved - {saveError}</div>}
            {data && !data.viewer.recorder && data.viewer.consultantIds.length === 0 && (
              <div className="mb-2 rounded border bg-gray-50 px-3 py-2 text-sm text-gray-600">Your login email doesn&apos;t match a GHL user, so no meetings are shown.</div>
            )}

            <div className="mb-3 flex items-center justify-between gap-3 rounded border bg-white px-2 py-2">
              <button onClick={() => shift(-1)} disabled={isAll || addDays(from, -span) < MIN_YMD} aria-label="Previous"
                className="h-11 w-[22%] min-w-[80px] rounded border text-2xl font-semibold text-brand-charcoal hover:bg-gray-50 disabled:opacity-30">‹</button>
              <div className="text-center">
                <div className="text-[18px] font-bold text-brand-charcoal">
                  {isAll ? `All meetings since ${dmy(MIN_YMD)}` : from === to ? `${weekday(from)} ${dmy(from)}` : `${dmy(from)} – ${dmy(to)}`}
                </div>
                {!(from === today && to === today) && (
                  <button onClick={() => openDay(today)} className="text-xs text-blue-700 hover:underline">Today</button>
                )}
              </div>
              <button onClick={() => shift(1)} disabled={isAll} aria-label="Next"
                className="h-11 w-[22%] min-w-[80px] rounded border text-2xl font-semibold text-brand-charcoal hover:bg-gray-50 disabled:opacity-30">›</button>
            </div>

            {data && byDay.length === 0 && !loading && <div className="rounded border bg-white p-4 text-sm text-gray-500">No meetings.</div>}
            {data && byDay.map(([ymd, list]) => (
              <div key={ymd} className="mb-3 overflow-hidden rounded border bg-white">
                <div className="bg-gray-50 px-3 py-1.5 text-sm font-semibold text-brand-charcoal">{weekday(ymd)} {dmy(ymd)} <span className="font-normal text-gray-500">· {list.length}</span></div>
                {list.map((m) => <MeetingRow key={m.id} m={m} settings={data.settings} canEdit={canEdit(m)} onRecord={record} onMore={setMore} />)}
              </div>
            ))}
          </>
        )}

        {tab === 'lists' && <ListsView onOpenDay={openDay} demoData={demo ? demoAll : null} />}
        {tab === 'settings' && data && (
          <SettingsView settings={data.settings} recorder={data.viewer.recorder} demo={demo}
            onSaved={(s) => (demo ? setDemoAll((d) => d && { ...d, settings: s }) : setLive((d) => d && { ...d, settings: s }))} />
        )}
      </div>
      {more && <MorePanel meeting={more} demo={demo} onClose={() => setMore(null)} />}
    </main>
  );
}
