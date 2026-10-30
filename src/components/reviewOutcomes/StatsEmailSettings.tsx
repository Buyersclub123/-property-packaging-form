'use client';

import { useEffect, useMemo, useState } from 'react';
import { KINDS } from '@/lib/reviewOutcomes/stats';
import type { StatsEmailSettings, StatsKind } from '@/lib/reviewOutcomes/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hourLabel = (h: number) => `${h % 12 || 12}:00 ${h < 12 ? 'am' : 'pm'}`;

/** Settings card for the scheduled stats email: recipients from the Workspace directory, schedule, periods, Send now. */
export default function StatsEmailSettingsCard({ recorder }: { recorder: boolean }) {
  const [s, setS] = useState<StatsEmailSettings | null>(null);
  const [users, setUsers] = useState<{ email: string; name: string }[]>([]);
  const [dirErr, setDirErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/review-outcomes/stats-email', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        setS(body.settings);
        setUsers(body.users || []);
        setDirErr(body.directoryError);
      })
      .catch((e) => setMsg({ ok: false, text: (e as Error).message }));
  }, []);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t || !s) return [];
    return users.filter((u) => !s.recipients.includes(u.email) && (u.email.includes(t) || u.name.toLowerCase().includes(t))).slice(0, 8);
  }, [q, users, s]);

  if (!s) return <div className="rounded border bg-white p-3 text-sm text-gray-500">{msg?.text || 'Loading stats email…'}</div>;
  const nameOf = (e: string) => users.find((u) => u.email === e)?.name || e;
  const set = (patch: Partial<StatsEmailSettings>) => setS({ ...s, ...patch });

  const call = async (url: string, body: unknown, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      if (out.settings) setS(out.settings);
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded border bg-white p-3 text-sm">
      <div className="mb-1 font-semibold text-brand-charcoal">Stats email</div>
      <div className="mb-2 text-xs text-gray-500">PR Booked / Sat / DNQ by booker and consultant, with ▲▼ against the previous period. Weekly sends cover the Fri–Thu week just finished.</div>

      <div className="mb-1 text-xs font-semibold text-gray-600">Send to</div>
      <div className="mb-2 flex flex-wrap gap-2">
        {s.recipients.map((e) => (
          <span key={e} className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2 py-0.5 text-xs" title={e}>
            {nameOf(e)}
            {recorder && <button onClick={() => set({ recipients: s.recipients.filter((x) => x !== e) })} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${e}`}>×</button>}
          </span>
        ))}
        {!s.recipients.length && <span className="text-xs text-gray-400">Nobody yet</span>}
      </div>
      {recorder && (
        <div className="relative mb-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a person (company directory)…" className="w-[320px] rounded border px-2 py-1" />
          {dirErr && <div className="mt-1 text-xs text-red-700">Company directory unavailable: {dirErr}</div>}
          {matches.length > 0 && (
            <div className="absolute z-20 mt-1 w-[320px] rounded border bg-white shadow">
              {matches.map((u) => (
                <button key={u.email} onClick={() => { set({ recipients: [...s.recipients, u.email] }); setQ(''); }} className="block w-full px-2 py-1 text-left text-xs hover:bg-gray-50">
                  {u.name} <span className="text-gray-500">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-1 text-xs font-semibold text-gray-600">Periods in the email</div>
      <div className="mb-3 flex flex-wrap gap-3">
        {KINDS.map(([k, label]) => (
          <label key={k} className="inline-flex items-center gap-1 text-xs">
            <input type="checkbox" disabled={!recorder} checked={s.periods.includes(k)}
              onChange={() => set({ periods: s.periods.includes(k) ? s.periods.filter((x) => x !== k) : [...s.periods, k as StatsKind] })} /> {label}
          </label>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <label className="inline-flex items-center gap-1 font-semibold">
          <input type="checkbox" disabled={!recorder} checked={s.enabled} onChange={() => set({ enabled: !s.enabled })} /> Send automatically every
        </label>
        <select disabled={!recorder} value={s.day} onChange={(e) => set({ day: Number(e.target.value) })} className="rounded border px-1 py-0.5">
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
        at
        <select disabled={!recorder} value={s.hour} onChange={(e) => set({ hour: Number(e.target.value) })} className="rounded border px-1 py-0.5">
          {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
        </select>
        (Sydney time), from
        <input disabled={!recorder} value={s.sender} onChange={(e) => set({ sender: e.target.value })} className="w-[220px] rounded border px-1 py-0.5" aria-label="Send from" />
      </div>
      {s.lastSent && <div className="mb-2 text-xs text-gray-500">Last scheduled send: {new Date(s.lastSent).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</div>}

      {recorder && (
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy} onClick={() => call('/api/review-outcomes/stats-email', s, 'Stats email settings saved')}
            className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">Save email settings</button>
          <button disabled={busy || !s.recipients.length} onClick={() => confirm(`Send the stats email now to ${s.recipients.length} recipient(s)? Uses the saved recipients and sender.`) && call('/api/review-outcomes/stats-email/send', {}, 'Sent')}
            className="rounded border px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50">Send now (saved periods)</button>
          {msg && <span className={`text-xs ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}
