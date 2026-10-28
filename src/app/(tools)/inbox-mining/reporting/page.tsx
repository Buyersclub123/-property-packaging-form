'use client';

import { useCallback, useEffect, useState } from 'react';
import TopNavBar from '@/components/portal/TopNavBar';
import { pct, type PrecedentSummary } from '@/lib/inboxMining/precedentShared';

// Management view for the inbox-mining demo (hidden route). Later moves under Admin in the menu.

interface FeedbackCount { day: string; outcome: string; n: number }
interface LagDay {
  day: string; arrived: number; suggested: number; checkable: number; actioned: number; alreadySet: number; open: number;
  changedOther: number; notInGhl: number; medianSuggestHrs: number | null; medianActionHrs: number | null;
}
interface LagOpen { itemId: number; day: string; subject: string; field: string; proposed: string; current: string | null; status: string }
interface LagData {
  days: LagDay[]; open: LagOpen[]; measurementStart: string | null;
  lastCheck: { checked_at: string; checked: number; actioned_now: number; changed_now: number; not_found: number } | null;
}

const OUTCOMES = [
  { key: 'accept', label: 'Accept' },
  { key: 'wrong_field', label: 'Wrong field' },
  { key: 'wrong_value', label: 'Wrong value' },
  { key: 'wrong_opportunity', label: 'Wrong opportunity' },
  { key: 'not_needed', label: 'Not needed' },
];
const hrs = (h: number | null) => (h === null ? '–' : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`);
const sydney = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export default function InboxMiningReportingPage() {
  const [fbCounts, setFbCounts] = useState<FeedbackCount[]>([]);
  const [fbError, setFbError] = useState<string | null>(null);
  const [lag, setLag] = useState<LagData | null>(null);
  const [lagError, setLagError] = useState<string | null>(null);
  const [lagDay, setLagDay] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [startInput, setStartInput] = useState('');
  const [startMsg, setStartMsg] = useState<string | null>(null);
  const [prec, setPrec] = useState<PrecedentSummary | null>(null);
  const [precBuilding, setPrecBuilding] = useState(false);
  const [precError, setPrecError] = useState<string | null>(null);
  const [precType, setPrecType] = useState<string | null>(null);

  const loadPrec = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox-mining/precedent', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPrec(data.summary);
      setPrecBuilding(data.building);
      setPrecError(null);
    } catch (e) {
      setPrecError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadPrec();
  }, [loadPrec]);

  useEffect(() => {
    if (!precBuilding) return;
    const t = setInterval(loadPrec, 10_000);
    return () => clearInterval(t);
  }, [precBuilding, loadPrec]);

  const rebuildPrec = async () => {
    try {
      const res = await fetch('/api/inbox-mining/precedent', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPrecBuilding(true);
    } catch (e) {
      setPrecError(e instanceof Error ? e.message : String(e));
    }
  };

  const loadFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox-mining/feedback?days=14', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setFbCounts(data.counts);
      setFbError(null);
    } catch (e) {
      setFbError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadLag = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox-mining/lag?days=30', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLag(data);
      setStartInput(data.measurementStart ? toLocalInput(data.measurementStart) : '');
      setLagError(null);
    } catch (e) {
      setLagError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    loadLag();
  }, [loadLag]);

  const checkNow = async () => {
    setChecking(true);
    setCheckMsg(null);
    try {
      const res = await fetch('/api/inbox-mining/lag', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setCheckMsg(`Checked ${data.checked} suggestions against GHL: ${data.actionedNow} newly actioned, ${data.alreadySetNow} already in GHL at first check, ${data.changedNow} changed to a different value${data.notFound ? `, ${data.notFound} not found (opportunity or record not loaded)` : ''}.`);
      await loadLag();
    } catch (e) {
      setCheckMsg(`Check failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setChecking(false);
    }
  };

  const saveStart = async (value: string | null) => {
    setStartMsg(null);
    try {
      const res = await fetch('/api/inbox-mining/lag', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurementStart: value ? new Date(value).toISOString() : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStartMsg(value ? 'Measurement start saved.' : 'Measurement start cleared.');
      await loadLag();
    } catch (e) {
      setStartMsg(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const openForDay = lag && lagDay ? lag.open.filter((o) => o.day === lagDay) : [];

  return (
    <>
      <TopNavBar />
      <main className="min-h-screen bg-white text-brand-charcoal">
        <div className="mx-auto max-w-[1600px] px-4 py-6">
          <div className="flex items-baseline justify-between gap-4">
            <h1 className="mb-1 text-[24px] font-bold tracking-[-0.5px] text-brand-charcoal">Inbox Mining — reporting</h1>
            <a href="/inbox-mining" className="text-xs font-semibold text-blue-700 hover:underline">Inbox queue</a>
          </div>
          <div className="mt-2 rounded border border-blue-200 bg-blue-50/40 px-3 py-2 text-xs text-brand-charcoal">
            Management view. Read-only on GHL: no GHL writes, no email sent.
          </div>

          <div className="mt-4 overflow-hidden rounded border bg-white text-sm">
            <div className="flex flex-wrap items-center gap-3 bg-gray-50 px-3 py-2">
              <h2 className="font-semibold text-brand-charcoal">Lag tracker by received day (last 30 days)</h2>
              <span className="text-xs text-gray-500">{lag?.lastCheck ? `GHL last checked ${sydney(lag.lastCheck.checked_at)}` : 'GHL not checked yet'}</span>
              <button onClick={checkNow} disabled={checking} className="ml-auto rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                {checking ? 'Checking GHL…' : 'Check GHL now'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2 text-xs">
              <span className="font-semibold">Measurement start:</span>
              {lag?.measurementStart ? (
                <span>{sydney(lag.measurementStart)} (Sydney); only items received after it are counted.</span>
              ) : (
                <span className="rounded bg-amber-100 px-1 text-amber-800">not set: counts only, not a formal measurement; timing columns appear once it is set</span>
              )}
              <input type="datetime-local" value={startInput} onChange={(e) => setStartInput(e.target.value)}
                className="rounded border px-1 py-0.5" title="Your PC's local time" />
              <button onClick={() => saveStart(startInput || null)} disabled={!startInput}
                className="rounded border border-blue-300 bg-white px-2 py-0.5 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">Set</button>
              {lag?.measurementStart && (
                <button onClick={() => saveStart(null)} className="rounded border px-2 py-0.5 text-gray-600 hover:bg-gray-50">Clear</button>
              )}
              {startMsg && <span className="text-gray-600">{startMsg}</span>}
            </div>
            {checkMsg && <div className="border-t px-3 py-1 text-xs text-gray-600">{checkMsg}</div>}
            {lagError ? (
              <div className="border-t px-3 py-2 text-red-800">{lagError}</div>
            ) : !lag ? (
              <div className="border-t px-3 py-2 text-gray-500">Loading…</div>
            ) : lag.days.length === 0 ? (
              <div className="border-t px-3 py-2 text-gray-500">No items in range.</div>
            ) : (
              <div className="max-h-[32rem] overflow-auto border-t">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-1">Received</th>
                      <th className="p-1 text-right">Arrived</th>
                      <th className="p-1 text-right" title="Items with at least one suggestion">Suggested</th>
                      <th className="p-1 text-right" title="Suggestions whose GHL value now equals the proposed value">Actioned</th>
                      <th className="p-1 text-right" title="Suggestions not yet equal in GHL">Still open</th>
                      {lag.measurementStart && (
                        <>
                          <th className="p-1 text-right" title="Median hours from email received to suggestion made (system speed)">Received → suggested</th>
                          <th className="p-1 text-right" title="Median hours from email received to GHL showing the proposed value (team speed)">Received → actioned</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {lag.days.map((d) => (
                      <tr key={d.day} onClick={() => setLagDay(lagDay === d.day ? null : d.day)}
                        className={`cursor-pointer border-t ${lagDay === d.day ? 'bg-blue-100 shadow-[inset_3px_0_0_#2563eb]' : 'hover:bg-blue-50'}`}>
                        <td className="p-1">{d.day}</td>
                        <td className="p-1 text-right">{d.arrived}</td>
                        <td className="p-1 text-right">{d.suggested}</td>
                        <td className="p-1 text-right">
                          {d.actioned + d.alreadySet}
                          {d.alreadySet > 0 && <span className="text-gray-400" title="Already in GHL at the first check; left out of the median"> ({d.alreadySet} already)</span>}
                        </td>
                        <td className="p-1 text-right">
                          {d.open}
                          {d.changedOther > 0 && <span className="ml-1 rounded bg-amber-100 px-1 text-amber-800" title="GHL changed to a different value">{d.changedOther} differ</span>}
                        </td>
                        {lag.measurementStart && (
                          <>
                            <td className="p-1 text-right">{hrs(d.medianSuggestHrs)}</td>
                            <td className="p-1 text-right">{hrs(d.medianActionHrs)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {lag && lagDay && (
              <div className="border-t">
                <div className="bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-500">Still open from {lagDay} (click to open the item in the queue)</div>
                {openForDay.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-500">Nothing open.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="text-gray-500">
                      <tr><th className="p-1">Subject</th><th className="p-1">Field</th><th className="p-1">Proposed</th><th className="p-1">GHL at last check</th><th className="p-1">Status</th></tr>
                    </thead>
                    <tbody>
                      {openForDay.map((o, n) => (
                        <tr key={n} onClick={() => { window.location.href = `/inbox-mining?item=${o.itemId}`; }} className="cursor-pointer border-t align-top hover:bg-blue-50">
                          <td className="p-1">{o.subject}</td>
                          <td className="p-1">{o.field}</td>
                          <td className="p-1">{o.proposed}</td>
                          <td className="p-1">{o.current === null ? <span className="text-gray-400">not checked</span> : o.current || <span className="text-gray-400">(empty)</span>}</td>
                          <td className="p-1">{o.status === 'changed_other' ? <span className="rounded bg-amber-100 px-1 text-amber-800">different value</span> : o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <div className="border-t px-3 py-1 text-[11px] text-gray-500">
              Actioned and Still open count suggestions for fields that exist in GHL; actioned = GHL value equals the proposed value.
              Replies, notes and tasks are not counted as actioned yet, so Still open is overstated.
              GHL is checked daily at 2 am (Windows scheduled task on JT&apos;s PC) and by Check GHL now.
              Items read before the lag tracker use their last re-read time as the suggested time.
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded border bg-white text-sm">
            <div className="flex flex-wrap items-center gap-3 bg-gray-50 px-3 py-2">
              <h2 className="font-semibold text-brand-charcoal">Precedent: what the team did after each email type (June–Oct)</h2>
              <span className="text-xs text-gray-500">{prec ? `built ${sydney(prec.builtAt)}` : 'not built yet'}</span>
              <button onClick={rebuildPrec} disabled={precBuilding} className="ml-auto rounded border border-blue-300 bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                {precBuilding ? 'Building (a few minutes)…' : 'Rebuild precedent'}
              </button>
            </div>
            {precError && <div className="border-t px-3 py-2 text-red-800">{precError}</div>}
            {prec && (
              <div className="max-h-[32rem] overflow-auto border-t">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="p-1">Activity type</th>
                      <th className="p-1 text-right" title="Inbound emails matched to an opportunity">Emails</th>
                      <th className="p-1 text-right">Opps</th>
                      <th className="p-1 text-right" title={`A GHL event date (not a due/scheduled date) within ${prec.windowDays} days of the email, or a stage move`}>Field changed</th>
                      <th className="p-1 text-right" title={`A reply from the same mailbox thread within ${prec.windowDays} days`}>Reply sent</th>
                      <th className="p-1 text-right" title={`A note or task on the contact within ${prec.windowDays} days`}>Note or task</th>
                      <th className="p-1 text-right">Nothing</th>
                      <th className="p-1">Field most often changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prec.types.map((t) => {
                      const thin = t.emails < prec.minEmails;
                      const top = t.dateFields.find((f) => !f.schedule);
                      return (
                        <tr key={t.type} onClick={() => setPrecType(precType === t.type ? null : t.type)}
                          className={`cursor-pointer border-t align-top ${precType === t.type ? 'bg-blue-100 shadow-[inset_3px_0_0_#2563eb]' : 'hover:bg-blue-50'} ${thin ? 'text-gray-400' : ''}`}>
                          <td className="p-1">{t.type.replace(/_/g, ' ')}{thin && <span className="ml-1 rounded bg-gray-100 px-1">thin</span>}</td>
                          <td className="p-1 text-right">{t.emails}</td>
                          <td className="p-1 text-right">{t.opps}</td>
                          <td className="p-1 text-right">{pct(t.fieldChanged, t.emails)}</td>
                          <td className="p-1 text-right">{pct(t.replied, t.emails)}</td>
                          <td className="p-1 text-right">{pct(t.noteTask, t.emails)}</td>
                          <td className="p-1 text-right">{pct(t.nothing, t.emails)}</td>
                          <td className="p-1">{top ? `${top.name} ${Math.round(top.rate * 100)}%${top.medianDays !== null ? `, median ${top.medianDays} d` : ''}` : '–'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {prec && precType && (() => {
              const t = prec.types.find((x) => x.type === precType);
              if (!t) return null;
              return (
                <div className="grid gap-3 border-t px-3 py-2 text-xs md:grid-cols-2">
                  <div>
                    <div className="mb-1 font-semibold text-gray-500">Date fields dated within the window ({t.type.replace(/_/g, ' ')})</div>
                    {t.dateFields.length === 0 ? <div className="text-gray-500">None</div> : t.dateFields.slice(0, 12).map((f) => (
                      <div key={f.fieldId} className={f.schedule ? 'text-gray-400' : ''}>
                        {f.name}: {f.hits} ({Math.round(f.rate * 100)}%){f.medianDays !== null ? `, median ${f.medianDays} d` : ''}{f.schedule && ' (scheduled date, not counted)'}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-gray-500">Suggested fields today (no timing)</div>
                    {t.current.map((f) => (
                      <div key={f.fieldId}>{f.name}: {f.set}/{f.opps} set{f.top.length ? ` (${f.top.map(([v, n]) => `${v} ${n}`).join(', ')})` : ''}</div>
                    ))}
                    <div className="mt-1 text-gray-500">Stage moved within the window: {pct(t.stageMoved, t.emails)}. Median reply: {t.medianReplyHrs !== null ? `${t.medianReplyHrs} h` : '–'}.</div>
                  </div>
                </div>
              );
            })()}
            {prec && (
              <div className="border-t px-3 py-1 text-[11px] text-gray-500">
                {prec.emails} inbound emails matched to an opportunity by name (a guide, not checked); {prec.contacts} contacts&apos; notes and tasks read
                {prec.contactErrors ? ` (${prec.contactErrors} could not be read)` : ''}. Window {prec.windowDays} days; date fields count from 2 days before the email because they often hold the event date. Due / expiry / ETA / scheduled / settlement dates are listed but never counted as a change. Notes and tasks are frequent on active deals anyway: compare with the noise row as a baseline.
                GHL keeps no change history: a date field only shows its latest date, and Yes/No fields have no timing. Under {prec.minEmails} emails = thin; suggestions on thin types or under {Math.round(prec.minRate * 100)}% are flagged &quot;no precedent&quot;.
              </div>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded border bg-white text-sm">
            <h2 className="bg-gray-50 px-3 py-2 font-semibold text-brand-charcoal">Suggestion feedback by day (last 14 days)</h2>
            {fbError ? (
              <div className="px-3 py-2 text-red-800">{fbError}</div>
            ) : fbCounts.length === 0 ? (
              <div className="px-3 py-2 text-gray-500">No feedback yet.</div>
            ) : (
              <table className="w-full border-t text-left text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr><th className="p-1">Day</th>{OUTCOMES.map((o) => <th key={o.key} className="p-1">{o.label}</th>)}<th className="p-1">Total</th></tr>
                </thead>
                <tbody>
                  {Array.from(new Set(fbCounts.map((c) => c.day))).map((day) => {
                    const rows = fbCounts.filter((c) => c.day === day);
                    return (
                      <tr key={day} className="border-t">
                        <td className="p-1">{day}</td>
                        {OUTCOMES.map((o) => <td key={o.key} className="p-1">{rows.find((c) => c.outcome === o.key)?.n || 0}</td>)}
                        <td className="p-1 font-semibold">{rows.reduce((a, c) => a + c.n, 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
