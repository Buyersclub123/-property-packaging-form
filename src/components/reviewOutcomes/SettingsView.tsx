'use client';

import { useState } from 'react';
import type { ReviewSettings, StatTarget } from '@/lib/reviewOutcomes/types';
import StatsEmailSettingsCard from './StatsEmailSettings';

function TargetsEditor({ names, targets, onChange, disabled }: {
  names: string[];
  targets: Record<string, StatTarget>;
  onChange: (v: Record<string, StatTarget>) => void;
  disabled: boolean;
}) {
  const all = [...new Set([...names, ...Object.keys(targets)])].sort((a, b) => a.localeCompare(b));
  const set = (n: string, f: keyof StatTarget, v: string) => {
    const t = { ...(targets[n] || { booked: 0, sat: 0 }), [f]: Math.max(0, Math.round(Number(v) || 0)) };
    const next = { ...targets };
    if (t.booked || t.sat) next[n] = t;
    else delete next[n];
    onChange(next);
  };
  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-1 text-sm font-semibold text-brand-charcoal">Monthly targets (Stats tab)</div>
      <div className="mb-2 text-xs text-gray-500">PR Booked and Sat per month, by consultant or booker. Blank = no target. Other periods are scaled (week = 12/52 of a month, quarter = 3, year = 12).</div>
      <div className="max-h-[320px] overflow-y-auto">
        <table className="text-sm">
          <thead><tr><th className="px-2 text-left">Name</th><th className="px-2">Booked</th><th className="px-2">Sat</th></tr></thead>
          <tbody>
            {all.map((n) => (
              <tr key={n}>
                <td className="px-2 py-0.5">{n}</td>
                {(['booked', 'sat'] as const).map((f) => (
                  <td key={f} className="px-2 py-0.5">
                    <input type="number" min={0} value={targets[n]?.[f] || ''} disabled={disabled} onChange={(e) => set(n, f, e.target.value)}
                      className="w-[70px] rounded border px-1 py-0.5 text-center" aria-label={`${n} ${f} target`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListEditor({ title, items, onChange, disabled }: { title: string; items: string[]; onChange: (v: string[]) => void; disabled: boolean }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft('');
  };
  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-2 text-sm font-semibold text-brand-charcoal">{title}</div>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1 rounded-full border bg-gray-50 px-2 py-0.5 text-xs">
            {it}
            {!disabled && (
              <button onClick={() => onChange(items.filter((x) => x !== it))} className="text-gray-400 hover:text-red-600" aria-label={`Remove ${it}`}>×</button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add…" className="w-[240px] rounded border px-2 py-1 text-sm" />
          <button onClick={add} className="rounded border px-2 py-1 text-xs hover:bg-gray-50">Add</button>
        </div>
      )}
    </div>
  );
}

function AliasEditor({ aliases, onChange, disabled }: { aliases: Record<string, string>; onChange: (v: Record<string, string>) => void; disabled: boolean }) {
  const [text, setText] = useState(() => Object.entries(aliases).map(([k, v]) => `${k} = ${v}`).join('\n'));
  const parse = (t: string) => {
    setText(t);
    const out: Record<string, string> = {};
    for (const line of t.split('\n')) {
      const [k, ...rest] = line.split('=');
      const v = rest.join('=').trim();
      if (k.trim() && v) out[k.trim()] = v;
    }
    onChange(out);
  };
  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-1 text-sm font-semibold text-brand-charcoal">Tracking sheet names (Sales / Stats Sold)</div>
      <div className="mb-2 text-xs text-gray-500">
        One per line: <code>name in the sheet = name to show</code>, e.g. <code>Aadi = Adi Manek</code>. Consultant and CC names are otherwise matched
        to GHL users and the Call Centre list automatically (e.g. &quot;Phil Harker&quot; = &quot;Phil H&quot;).
      </div>
      <textarea value={text} onChange={(e) => parse(e.target.value)} disabled={disabled} rows={5} className="w-full rounded border px-2 py-1 font-mono text-xs" />
    </div>
  );
}

import GhlMonitor from './GhlMonitor';

export default function SettingsView({ settings, recorder, demo = false, names = [], onSaved }: {
  settings: ReviewSettings;
  /** Consultants and bookers to offer targets for. */
  names?: string[];
  recorder: boolean;
  demo?: boolean;
  onSaved: (s: ReviewSettings) => void;
}) {
  const [outcomes, setOutcomes] = useState(settings.outcomes);
  const [reasons, setReasons] = useState(settings.invalidReasons);
  const [callCentre, setCallCentre] = useState(settings.callCentre);
  const [targets, setTargets] = useState(settings.targets || {});
  const [salesAliases, setSalesAliases] = useState(settings.salesAliases || {});
  const [writeTarget, setWriteTarget] = useState(settings.writeTarget);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (demo) {
      onSaved({ ...settings, outcomes, invalidReasons: reasons, callCentre, targets, salesAliases, writeTarget });
      setMsg({ ok: true, text: 'Saved (demo only)' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/review-outcomes/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomes, invalidReasons: reasons, callCentre, targets, salesAliases, writeTarget }),
      });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      onSaved(body as ReviewSettings);
      setMsg({ ok: true, text: 'Saved' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid max-w-[760px] gap-3">
      {!recorder && <div className="rounded border bg-gray-50 p-2 text-sm text-gray-600">Only Review recorders can change settings.</div>}
      <ListEditor title="Outcomes" items={outcomes} onChange={setOutcomes} disabled={!recorder} />
      <ListEditor title="Invalid reasons" items={reasons} onChange={setReasons} disabled={!recorder} />
      <ListEditor title="Call Centre (booker emails on the invite)" items={callCentre} onChange={setCallCentre} disabled={!recorder} />
      <TargetsEditor names={names} targets={targets} onChange={setTargets} disabled={!recorder} />
      <AliasEditor aliases={salesAliases} onChange={setSalesAliases} disabled={!recorder} />
      {!demo && <StatsEmailSettingsCard recorder={recorder} />}
      <GhlMonitor demo={demo} />
      <div className="rounded border bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-brand-charcoal">Write outcomes to</div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={writeTarget === 'db'} disabled={!recorder || demo} onChange={() => setWriteTarget('db')} /> DB only
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" checked={writeTarget === 'db+ghl'} disabled={!recorder || demo || !settings.phase2Approved} onChange={() => setWriteTarget('db+ghl')} /> DB + GHL appointment status
          </label>
        </div>
        <div className="mt-1 text-xs text-gray-500">
          With DB + GHL, clicking an outcome also sets the GHL appointment status: Showed = showed, No show / Not sat = noshow,
          Invalid (DNQ) = invalid, Cancelled = cancelled. Rescheduled and clearing leave GHL unchanged; DNQ reasons stay in the DB.
          Values filled from the calendar schedule sheet are never written. Demo never writes. Click Save settings to apply.
        </div>
      </div>
      {recorder && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</span>}
        </div>
      )}
    </div>
  );
}
