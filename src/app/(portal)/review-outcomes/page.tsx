'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, DISCREPANCY_MINUTES, MIN_YMD, NOTE_NEXT_ACTIONS, sydYmd, type ReviewData, type ReviewMeeting, type ReviewSettings } from '@/lib/reviewOutcomes/types';
import { demoData } from '@/lib/reviewOutcomes/demo';
import { meetingSourceTitle } from '@/lib/reviewOutcomes/meetingSource';
import MorePanel from '@/components/reviewOutcomes/MorePanel';
import ListsView from '@/components/reviewOutcomes/ListsView';
import SettingsView from '@/components/reviewOutcomes/SettingsView';
import StatsView from '@/components/reviewOutcomes/StatsView';
import SalesView from '@/components/reviewOutcomes/SalesView';
import { dmy, outcomeStyle, Stat, time, weekday } from '@/components/reviewOutcomes/ui';
import BackLink from '@/components/BackLink';
import AsAtRefresh, { asAtLabel } from '@/components/AsAtRefresh';
import { useLiveRefresh } from '@/lib/useLiveRefresh';

import { weekStart as statsWeekStart } from '@/lib/reviewOutcomes/stats';

type Tab = 'day' | 'lists' | 'stats' | 'sales' | 'settings';

const GHL_NOTE_LABEL = "Posted to the client's contact notes (shows under the linked opportunity)";
const CONFIRM_TOAST = 'Demo: would set GHL status = confirmed and prefix the invite title with CONFIRMED (not written in demo)';
const who = (email: string | null) => (email ? email.split('@')[0].replace(/[._]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '');
const longDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const needsNextAction = (outcome: string | null) => /^(cancelled|rescheduled)$/i.test(outcome || '');

function NoteBox({ m, onSave, onClose }: { m: ReviewMeeting; onSave: (note: string | null, next: string | null) => void; onClose: () => void }) {
  const [next, setNext] = useState(m.noteNextAction || '');
  const [text, setText] = useState(m.note || '');
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ta.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [text]);
  const showNext = needsNextAction(m.outcome);
  const save = () => onSave(text.trim() || null, showNext ? next || null : null);
  return (
    <div className="flex flex-wrap items-start gap-1 rounded border border-blue-200 bg-blue-50/50 px-2 py-1">
      {showNext && (
        <select value={next} onChange={(e) => setNext(e.target.value)} className="rounded border bg-white px-1 py-0.5 text-xs" aria-label="Next action">
          <option value="">Next action…</option>
          {NOTE_NEXT_ACTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      )}
      <textarea ref={ta} rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Note" autoFocus aria-label="Note"
        onKeyDown={(e) => e.key === 'Enter' && (e.ctrlKey || e.metaKey) && save()} title="Ctrl+Enter to save"
        className="min-w-[220px] flex-1 resize-none overflow-hidden rounded border bg-white px-1.5 py-0.5 text-xs leading-snug" />
      <button onClick={save} className="rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-blue-700">Save</button>
      <button onClick={onClose} className="px-1 text-xs text-gray-500 hover:text-gray-800">Cancel</button>
      <span className="text-[11px] text-gray-400">{GHL_NOTE_LABEL}</span>
    </div>
  );
}

function MeetingRow({ m, settings, canEdit, onRecord, onMore, onConfirm, onTlc, onNote }: {
  m: ReviewMeeting;
  settings: ReviewSettings;
  canEdit: boolean;
  onRecord: (m: ReviewMeeting, outcome: string | null, reason?: string | null) => void;
  onMore?: (m: ReviewMeeting) => void;
  onConfirm: (m: ReviewMeeting, on: boolean) => void;
  onTlc: (m: ReviewMeeting, on: boolean) => void;
  onNote: (m: ReviewMeeting, note: string | null, next: string | null) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const hasNote = !!(m.note || m.noteReason || m.noteNextAction);
  const g = m.gcal;
  const off = g && g.minutesApart !== null && g.minutesApart > DISCREPANCY_MINUTES;
  const isInvalid = !!m.outcome && /^invalid/i.test(m.outcome) && m.outcomeSource !== 'ghl';
  const responded = !!m.outcome;
  const srcLabel = m.outcomeSource === 'tool' ? 'recorded in this tool' : m.outcomeSource === 'schedule' ? 'from calendar sheet' : m.outcomeSource === 'ghl' ? 'from GHL' : 'from sheet';
  return (
    <div className={`grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 border-t px-3 py-2 first:border-t-0 md:grid-cols-[72px_minmax(0,1.1fr)_150px_minmax(0,0.9fr)_minmax(0,1fr)_680px] ${responded ? 'bg-green-50' : ''}`}>
      <div className="text-sm font-semibold text-brand-charcoal">
        {time(m.start)}
        {responded && <div className="text-2xl leading-none text-green-600" title={`Outcome ${srcLabel}`}>✔</div>}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {m.contactLink ? <a href={m.contactLink} target="_blank" rel="noreferrer" className="text-brand-charcoal hover:underline">{m.contactName || '(no name)'}</a> : m.contactName}
        </div>
        <div className="text-xs text-gray-500">
          GHL: {m.ghlStatus}
          {m.confirmed && <span className="ml-2 rounded bg-green-600 px-1 text-[10px] font-bold tracking-wide text-white" title={`Confirmed in this tool${m.confirmedBy ? ` by ${who(m.confirmedBy)}` : ''}`}>CONFIRMED</span>}
          {m.kind === 'NL' && <span className="ml-2 rounded bg-purple-50 px-1 text-[11px] text-purple-700">Presentation 1 · {m.leadType}</span>}
          {m.selfBooked && <span className="ml-2 rounded bg-gray-100 px-1 text-[11px] text-gray-600" title="Created in GHL by the consultant">Self-booked – no outcome needed</span>}
        </div>
      </div>
      <div className="col-start-2 min-w-0 text-sm text-gray-700 md:col-start-auto">
        <div className="truncate" title="GHL assigned consultant">{m.consultant}</div>
        <div className="truncate text-[11px] text-gray-500" title="Booked by = who created the appointment in GHL" data-testid="booked-by">
          Booked by <span className="text-gray-600">{m.booker || '-'}</span>
        </div>
      </div>
      <div className="col-start-2 min-w-0 text-xs md:col-start-auto" title={meetingSourceTitle(m.meetingSourceLevel, m.meetingSourceDetail)}>
        <div className="text-[11px] text-gray-400">Meeting source{m.meetingSourceLevel && m.meetingSourceLevel !== 'last' ? ` (${m.meetingSourceLevel === 'first' ? 'first touch' : 'Lead Source'})` : ''}</div>
        <div className={`line-clamp-2 break-words ${m.meetingSource ? 'text-gray-700' : 'text-gray-400'}`}>{m.meetingSource || 'Not recorded'}</div>
      </div>
      <div className="col-start-2 min-w-0 text-xs md:col-start-auto">
        {g ? (
          <div className={off ? 'text-red-700' : 'text-gray-600'} title={`Matched on ${g.basis}${g.event.cancelled ? ' · cancelled in Google' : ''}`}>
            {g.event.cancelled && <div className="text-amber-700">Calendar event cancelled</div>}
            Google: {g.event.allDay ? `${dmy(g.event.ymd)} all day` : `${g.event.ymd !== m.ymd ? `${dmy(g.event.ymd)} ` : ''}${time(g.event.start)}`} · {g.event.staff || g.event.calendars.join(', ')}
            {off && ` · ${g.minutesApart! >= 1440 ? `${Math.round(g.minutesApart! / 1440)}d` : `${g.minutesApart} min`} apart`}
            <div className="truncate text-gray-400">{g.event.title}</div>
          </div>
        ) : (
          m.kind === 'NL' ? (
            <div className="text-gray-600" title={m.schedule ? `Calendar schedule sheet, tab "${m.schedule.tab}"` : ''}>
              {m.schedule
                ? `Sheet: ${m.schedule.sat || '-'}${m.schedule.outcome ? ` / ${m.schedule.outcome}` : ''} · Agent ${m.booker || m.schedule.agent || '-'} · ${m.schedule.location || '-'}`
                : 'Not found in the calendar schedule sheet'}
            </div>
          ) : (
            <div className="text-amber-700">No consultant calendar event</div>
          )
        )}
      </div>
      <div className="col-start-2 mt-1 md:col-start-auto md:mt-0">
       <div className="flex flex-wrap items-center gap-1 md:flex-nowrap md:justify-end">
        <label title={m.confirmed ? `Confirmed${m.confirmedBy ? ` by ${who(m.confirmedBy)}` : ''} - untick to put the GHL status back and remove CONFIRMED from the title` : 'Tick to set the GHL status to confirmed and put CONFIRMED in front of the invite title'}
          className={`mr-1 inline-flex items-center gap-1 text-[11px] font-medium ${m.confirmed ? 'text-green-700' : 'text-gray-500'}`}>
          <input type="checkbox" checked={m.confirmed} disabled={!canEdit} onChange={(e) => onConfirm(m, e.target.checked)} className="h-3.5 w-3.5 accent-green-600" aria-label="Confirmed" />
          Confirmed
        </label>
        {(() => {
          const locked = false; // TLC lock deferred (JT 12/11): tick/untick allowed at any time
          return (
            <label title={locked ? 'TLC locked: less than 8 working hours (Mon-Fri 9-5) before the meeting start' : m.tlc ? `TLC done${m.tlcBy ? ` by ${who(m.tlcBy)}` : ''} - untick to undo (tool only)` : 'Tick when TLC is done (saved in this tool only, not GHL)'}
              className={`mr-1 inline-flex items-center gap-1 text-[11px] font-medium ${locked ? 'cursor-not-allowed text-gray-300' : m.tlc ? 'text-purple-700' : 'text-gray-500'}`}>
              <input type="checkbox" checked={m.tlc} disabled={!canEdit || locked} onChange={(e) => onTlc(m, e.target.checked)} className="h-3.5 w-3.5 accent-purple-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="TLC" />
              TLC
            </label>
          );
        })()}
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
        <button disabled={!canEdit} onClick={() => setNoteOpen((o) => !o)} title="Reason, next action and note"
          className={`rounded border px-1.5 py-0.5 text-[11px] disabled:cursor-default ${noteOpen || hasNote ? 'border-blue-400 bg-blue-50 text-blue-700' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
          Note
        </button>
        {onMore && <button onClick={() => onMore(m)} className="rounded border px-1.5 py-0.5 text-[11px] text-gray-500 hover:bg-gray-50">More</button>}
       </div>
       <div className="mt-1 flex flex-wrap items-center gap-2 empty:hidden md:justify-end">
        {isInvalid && (
          <select value={m.invalidReason || ''} disabled={!canEdit} onChange={(e) => onRecord(m, m.outcome, e.target.value || null)}
            className="rounded border px-1 py-0.5 text-xs" aria-label="Invalid reason">
            <option value="">Reason…</option>
            {settings.invalidReasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        {responded && m.outcomeSource !== 'tool' && <span className="text-[11px] text-gray-400" title={m.sourceRef || ''}>{srcLabel}</span>}
        {canEdit && (m.outcomeSource === 'tool' || m.outcomeSource === 'sheet') && (
          <button onClick={() => onRecord(m, null)} className="text-[11px] text-gray-400 hover:text-red-600">clear</button>
        )}
       </div>
      </div>
      {(noteOpen || hasNote) && (
        <div className="col-span-full mt-1 text-xs">
          {noteOpen ? (
            <NoteBox m={m} onClose={() => setNoteOpen(false)} onSave={(note, next) => { onNote(m, note, next); setNoteOpen(false); }} />
          ) : (
            (() => {
              const prefix = `[${m.calendar} ${longDate(m.ymd)} - ${m.outcome || 'No outcome'}${m.noteBy || m.recordedBy ? ` - ${who(m.noteBy || m.recordedBy)}` : ''}]`;
              const body = [m.noteNextAction && `Next action: ${m.noteNextAction}`, m.note].filter(Boolean).join(' · ');
              return (
                <div className="group relative flex items-start gap-2 text-gray-700" data-testid="saved-note">
                  <div className={`min-w-0 flex-1 ${noteExpanded ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                    <span className="font-semibold text-gray-500">{prefix}</span> {body}
                  </div>
                  <button onClick={() => setNoteExpanded((x) => !x)} className="shrink-0 text-[11px] text-blue-700 hover:underline">{noteExpanded ? 'Collapse' : 'Open'}</button>
                  {m.noteGhlError ? (
                    <span className="shrink-0 text-[11px] font-medium text-red-600" title={m.noteGhlError}>Not posted to GHL ({m.noteGhlError})</span>
                  ) : (
                    <span className={`shrink-0 text-[11px] ${m.noteGhlId ? 'text-green-700' : 'text-gray-400'}`}>{m.noteGhlId ? '✔ ' : ''}{GHL_NOTE_LABEL}</span>
                  )}
                  {!noteExpanded && (
                    <div role="tooltip" className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden max-w-[640px] whitespace-pre-wrap break-words rounded border bg-white px-2 py-1.5 text-xs text-gray-800 shadow-lg group-hover:block">
                      <span className="font-semibold text-gray-500">{prefix}</span> {body}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}

let loadSeq = 0;
/** JT: More (property checks) is demo-only until the historical data is loaded; set true to show it on live meetings. */
const SHOW_MORE_LIVE = false;

export default function ReviewOutcomesPage() {
  const today = sydYmd(Date.now());
  const [tab, setTab] = useState<Tab>('day');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [q, setQ] = useState('');
  const [consultant, setConsultant] = useState('');
  const [booker, setBooker] = useState('');
  const [kinds, setKinds] = useState<'PR' | 'NL' | 'both'>('both');
  useEffect(() => {
    const k = localStorage.getItem('review-outcomes-kinds');
    if (k === 'PR' || k === 'NL' || k === 'both') setKinds(k);
  }, []);
  const pickKinds = (k: 'PR' | 'NL' | 'both') => {
    setKinds(k);
    try { localStorage.setItem('review-outcomes-kinds', k); } catch { /* storage unavailable */ }
  };
  const [live, setLive] = useState<ReviewData | null>(null);
  const [demo, setDemo] = useState(false);
  const [demoAll, setDemoAll] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState<ReviewMeeting | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const data = useMemo<ReviewData | null>(
    () => (demo && demoAll ? { ...demoAll, from, to, meetings: demoAll.meetings.filter((m) => m.ymd >= from && m.ymd <= to) } : live),
    [demo, demoAll, live, from, to],
  );

  // ⟳ = re-read GHL now; every 15 min in the background. Both apply in place (quiet: no spinner, no cleared list).
  const lr = useLiveRefresh((manual) => (demo ? Promise.resolve(false) : load(manual ? 'force' : 'auto', true)));
  const { stamp } = lr;

  const load = useCallback(async (sync: 'auto' | 'none' | 'force' = 'auto', quiet = false) => {
    const seq = ++loadSeq;
    if (sync !== 'none' && !quiet) setLoading(true);
    if (!quiet) setError(null);
    const get = async (s: string) => {
      const res = await fetch(`/api/review-outcomes?from=${from}&to=${to}&sync=${s}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status} (response was not JSON)` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body as ReviewData;
    };
    try {
      // Show the saved copy straight away; the GHL / Google re-read follows and replaces it.
      if (sync === 'auto' && !quiet) {
        const quick = await get('none');
        if (seq === loadSeq) setLive(quick);
      }
      const body = await get(sync);
      if (seq === loadSeq) { setLive(body); setError(null); stamp(); }
      return true;
    } catch (e) {
      if (seq === loadSeq) setError((e as Error).message);
      return false;
    } finally {
      if (seq === loadSeq) setLoading(false);
    }
  }, [from, to, stamp]);

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
  const weekStart = statsWeekStart(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = addDays(`${addDays(monthStart, 32).slice(0, 7)}-01`, -1);
  const allTo = addDays(today, 90);
  const quick: [string, string, string][] = [
    ['Today', today, today],
    ['This week (Fri-Thu)', weekStart, addDays(weekStart, 6)],
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
      if (body.ghlError) setSaveError(`${m.contactName}: ${body.ghlError}`);
    } catch (e) {
      setSaveError(`${m.contactName}: ${(e as Error).message}`);
    }
    // Update only this meeting's row from the saved copy; the list itself is not reloaded.
    try {
      const res = await fetch(`/api/review-outcomes?from=${m.ymd}&to=${m.ymd}&sync=none`, { cache: 'no-store' });
      const row = res.ok ? ((await res.json()) as ReviewData).meetings.find((x) => x.id === m.id) : undefined;
      if (row) setLive((d) => d && { ...d, meetings: d.meetings.map((x) => (x.id === m.id ? row : x)) });
    } catch { /* keep the row as tapped */ }
  };

  // Confirm toggle / row Note: tool DB only (demo: this browser tab only). GHL is never written here.
  const patchRow = (id: string, patch: Partial<ReviewMeeting>) => {
    const f = (d: ReviewData | null) => d && { ...d, meetings: d.meetings.map((x) => (x.id === id ? { ...x, ...patch } : x)) };
    if (demo) setDemoAll(f); else setLive(f);
  };
  const postRow = async (m: ReviewMeeting, body: Record<string, unknown>) => {
    if (demo) return null;
    try {
      const res = await fetch('/api/review-outcomes/row', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: m.id, ...body }) });
      const b = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(b.error || `HTTP ${res.status}`);
      return b as { ghlNote?: { posted: boolean; noteId: string | null; error: string | null } | null; confirm?: { dryRun: boolean; steps: { field: string; before: string; after: string; readBack: string; result: string }[] } };
    } catch (e) {
      setSaveError(`${m.contactName}: ${(e as Error).message}`);
      return null;
    }
  };
  const tlcRow = (m: ReviewMeeting, on: boolean) => {
    setSaveError(null);
    patchRow(m.id, { tlc: on, tlcBy: on ? data?.viewer.email || null : null });
    void postRow(m, { tlc: on });
  };
  const confirmRow = (m: ReviewMeeting, on: boolean) => {
    setSaveError(null);
    patchRow(m.id, { confirmed: on, confirmedBy: on ? data?.viewer.email || null : null });
    if (demo) {
      if (on) setToast(CONFIRM_TOAST);
      return;
    }
    void postRow(m, { confirmed: on }).then((b) => {
      const c = b?.confirm;
      if (!c) return;
      const st = c.steps.find((s) => s.field === 'appointmentStatus');
      const ti = c.steps.find((s) => s.field === 'title');
      const failed = c.steps.find((s) => s.result.startsWith('failed') || s.result.startsWith('read back'));
      if (failed) setSaveError(`${m.contactName}: GHL not updated - ${failed.result}`);
      else if (c.dryRun) setToast(`Dry run (not written): would set GHL status ${st?.before || '?'} -> ${st?.after || '?'} and title "${ti?.after || ''}". Switch on in Admin > Automated updates.`);
      else {
        setToast(`GHL status ${st?.readBack || ''}, title "${ti?.readBack || ''}" (Google follows in about 30s)`);
        const label = st?.readBack === 'noshow' ? 'No show' : st?.readBack ? st.readBack.charAt(0).toUpperCase() + st.readBack.slice(1) : m.ghlStatus;
        patchRow(m.id, { ghlStatus: label, title: ti?.readBack || m.title });
      }
    });
  };
  const noteRow = async (m: ReviewMeeting, note: string | null, next: string | null) => {
    setSaveError(null);
    const any = !!(note || next);
    patchRow(m.id, { note, noteReason: null, noteNextAction: next, noteBy: any ? data?.viewer.email || null : null, noteAt: any ? new Date().toISOString() : null });
    const r = await postRow(m, { note, noteNextAction: next, outcome: m.outcome });
    const g = r?.ghlNote;
    if (!g) return;
    patchRow(m.id, { noteGhlId: g.posted ? g.noteId : m.noteGhlId, noteGhlError: g.error });
    if (g.error) setSaveError(`${m.contactName}: note saved in the tool but not posted to GHL (${g.error})`);
  };

  const meetings = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.meetings || []).filter((m) =>
      (kinds === 'both' || m.kind === kinds) && (!consultant || m.consultant === consultant) && (!booker || m.booker === booker) && (!s || m.contactName.toLowerCase().includes(s) || m.contactEmail.toLowerCase().includes(s)));
  }, [data, q, consultant, booker, kinds]);
  const byDay = useMemo(() => {
    const g = new Map<string, ReviewMeeting[]>();
    for (const m of meetings) g.set(m.ymd, [...(g.get(m.ymd) || []), m]);
    return [...g.entries()];
  }, [meetings]);
  const canEdit = (m: ReviewMeeting) => !!data && !!m.id;
  const userNames = data?.ghlUsers?.length ? [...new Set(data.ghlUsers.map((u) => u.name))] : data?.consultants || [];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-1 flex items-baseline gap-4">
          <BackLink fallback="/team/resources/new-initiatives" />
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Sales Meeting Outcomes</h1>
          {!demo && <div className="ml-auto"><AsAtRefresh asAt={lr.asAt} refreshing={lr.refreshing} onRefresh={lr.refreshNow} /></div>}
        </div>
        <p className="mb-4 text-[13px] text-[#7A7575]">
          Source: GHL Calendars - Portfolio Review Meeting (2nd meetings aren't recorded) and Presentation Meeting One (New Lead / Referral, with the calendar schedule sheet). Outcomes are saved to our database{data?.settings.writeTarget === 'db+ghl' ? ' and the GHL appointment status' : ' only'}.
        </p>

        <div className="mb-4 inline-flex overflow-hidden rounded border border-gray-200 text-sm" role="tablist">
          {([['day', 'Meetings'], ['lists', 'Lists'], ['stats', 'Stats'], ['sales', 'Sales (Work in Progress)'], ['settings', 'Settings']] as const)
            .filter(([k]) => k !== 'settings' || demo || data?.viewer.recorder)
            .map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`px-3 py-1.5 font-semibold ${tab === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={toggleDemo} className={`ml-3 rounded border px-2 py-1 text-xs ${demo ? 'border-amber-400 bg-amber-50 text-amber-900' : 'text-gray-600 hover:bg-gray-50'}`}>
          {demo ? 'Exit demo' : 'Demo'}
        </button>
        {tab === 'day' && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client" className="ml-2 w-[200px] rounded border px-2 py-1 text-sm" />
        )}
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
              <div className="inline-flex overflow-hidden rounded border border-gray-200 text-xs" role="group" aria-label="Meeting type">
                {([['PR', 'Portfolio Review'], ['NL', 'Presentation Meeting 1'], ['both', 'Both']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => pickKinds(k)}
                    className={`px-2 py-1 font-semibold ${kinds === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {data && (
                <div className="inline-flex items-center gap-2">
                  <select value={consultant} onChange={(e) => setConsultant(e.target.value)} className="rounded border px-1 py-1" aria-label="Consultant">
                    <option value="">All consultants</option>
                    {userNames.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={booker} onChange={(e) => setBooker(e.target.value)} className="rounded border px-1 py-1" aria-label="Booker" title="Booker = who created the appointment in GHL">
                    <option value="">All call centre</option>
                    {userNames.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {loading && <span className="text-xs text-gray-500">Refreshing from GHL…</span>}
            </div>

            {data && (
              <div className="mb-3 flex flex-wrap gap-3 text-sm">
                <Stat label="Meetings" value={meetings.length} />
                <Stat label="Confirmed" value={meetings.filter((m) => m.ghlStatus === 'Confirmed').length} tone="text-green-700" />
                <Stat label="Outcome recorded" value={meetings.filter((m) => m.outcome).length} />
                <Stat label="Updated here ✔" value={meetings.filter((m) => m.outcomeSource === 'tool').length} tone="text-green-700" />
                <Stat label="No outcome (past)" value={meetings.filter((m) => m.past && !m.outcome && !m.selfBooked).length} tone="text-red-700" />
                <Stat label="No calendar event (PR)" value={meetings.filter((m) => m.kind === 'PR' && !m.gcal).length} />
                {!demo && (
                  <>
                    <span className="ml-auto self-center whitespace-nowrap text-xs text-gray-500">{lr.asAt ? asAtLabel(lr.asAt) : 'Loading…'}</span>
                    <button onClick={() => load('force')} disabled={loading} title="Re-read GHL appointments and Google invites for the dates shown, plus the calendar schedule sheet, now"
                      className="rounded border bg-white px-3 py-2 text-left hover:bg-gray-50 disabled:opacity-50">
                      <div className="text-xs text-gray-500">GHL + calendar sheet</div>
                      <div className="font-semibold text-blue-700">{loading ? 'Refreshing…' : 'Refresh from GHL'}</div>
                    </button>
                    {data.gcalCalendars.length > 0 && (() => {
                      const bad = data.gcalCalendars.filter((c) => c.status !== 'ok');
                      return (
                        !bad.length ? (
                          <span data-testid="gcal-panel" className="self-center rounded border bg-white px-2 py-1 text-xs text-gray-600" title={`${data.gcalCalendars.length} Google calendars read (suspended GHL users skipped)`}>
                            Google calendars read: all readable
                          </span>
                        ) : (
                        <details data-testid="gcal-panel" className="relative self-center rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                          <summary className="cursor-pointer whitespace-nowrap">
                            Google calendars read: {bad.length} not readable
                          </summary>
                          <ul className="absolute right-0 z-20 mt-1 max-h-72 w-[460px] overflow-auto rounded border bg-white p-2 text-gray-700 shadow">
                            {bad.map((c) => (
                              <li key={c.id} title={c.error || ''} className="font-semibold text-amber-800">
                                ✖ {c.status} {c.name} <span className="text-gray-400">({c.id}) · {c.via}{c.status === '403' || c.status === '404' ? ' - not shared with info@' : ' - read failed'}</span>
                              </li>
                            ))}
                            <li className="mt-1 text-gray-400">Readable calendars are not listed; suspended GHL users are skipped.</li>
                          </ul>
                        </details>
                        )
                      );
                    })()}
                  </>
                )}
              </div>
            )}
            {saveError && <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">Not saved - {saveError}</div>}

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
                {list.map((m) => <MeetingRow key={m.id} m={m} settings={data.settings} canEdit={canEdit(m)} onRecord={record} onMore={demo || SHOW_MORE_LIVE ? setMore : undefined} onConfirm={confirmRow} onTlc={tlcRow} onNote={noteRow} />)}
              </div>
            ))}
          </>
        )}

        {tab === 'lists' && <ListsView onOpenDay={openDay} demoData={demo ? demoAll : null} />}
        {tab === 'stats' && <StatsView demoData={demo ? demoAll : null} />}
        {tab === 'sales' && <SalesView demo={demo} />}
        {tab === 'settings' && data && (demo || data.viewer.recorder) && (
          <SettingsView settings={data.settings} recorder={data.viewer.recorder} demo={demo}
            names={[...new Set([...data.consultants, ...data.meetings.flatMap((m) => [m.consultant, m.booker || ''])].filter(Boolean))]}
            onSaved={(s) => (demo ? setDemoAll((d) => d && { ...d, settings: s }) : setLive((d) => d && { ...d, settings: s }))} />
        )}
      </div>
      {more && <MorePanel meeting={more} demo={demo} onClose={() => setMore(null)} />}
      {toast && (
        <div role="status" className="fixed bottom-4 right-4 z-50 max-w-[420px] rounded border border-green-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-lg">
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 text-xs text-gray-400 hover:text-gray-700" aria-label="Dismiss">✕</button>
        </div>
      )}
    </main>
  );
}
