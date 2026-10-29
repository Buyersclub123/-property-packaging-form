'use client';

import { useEffect, useState } from 'react';
import type { ClientPanel, ReviewMeeting } from '@/lib/reviewOutcomes/types';
import { demoPanel, saveDemoPanel } from '@/lib/reviewOutcomes/demo';
import { dateTime, money } from './ui';

interface Row { key: string; address: string; stillOwned: boolean | null; currentValue: string; currentRentPw: string }

// Client's properties for one meeting: still owned / current value / current rent ticks and fields, one note. App DB only.
export default function MorePanel({ meeting, demo = false, onClose }: { meeting: ReviewMeeting; demo?: boolean; onClose: () => void }) {
  const [panel, setPanel] = useState<ClientPanel | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    const apply = (p: ClientPanel) => {
        setPanel(p);
        setNote(p.note || '');
        setRows(p.properties.map((x) => ({
          key: x.key,
          address: x.address,
          stillOwned: x.check?.stillOwned ?? null,
          currentValue: x.check?.currentValue != null ? String(x.check.currentValue) : '',
          currentRentPw: x.check?.currentRentPw != null ? String(x.check.currentRentPw) : '',
        })));
    };
    if (demo) {
      apply(demoPanel(meeting));
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/review-outcomes/client?appointmentId=${encodeURIComponent(meeting.id)}`, { cache: 'no-store' });
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        if (live) apply(body as ClientPanel);
      } catch (e) {
        if (live) setError((e as Error).message);
      }
    })();
    return () => { live = false; };
  }, [meeting, demo]);

  const set = (key: string, patch: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    if (demo && panel) {
      const n = (s: string) => (s.trim() ? Number(s.replace(/[$,\s]/g, '')) : null);
      saveDemoPanel({
        ...panel,
        note: note.trim() || null,
        properties: panel.properties.map((p) => {
          const r = rows.find((x) => x.key === p.key)!;
          return { ...p, check: { stillOwned: r.stillOwned, currentValue: n(r.currentValue), currentRentPw: n(r.currentRentPw) } };
        }),
      });
      setSaved(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/review-outcomes/client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: meeting.id, note: note.trim() || null, checks: rows }),
      });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-[720px] overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[18px] font-bold text-brand-charcoal">{meeting.contactName || '(no name)'}</div>
            <div className="text-xs text-[#7A7575]">{dateTime(meeting.start)} · {meeting.consultant}</div>
          </div>
          <button onClick={onClose} className="rounded border px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Close</button>
        </div>

        {!panel && !error && <div className="text-sm text-gray-500">Loading properties…</div>}
        {error && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">{error}</div>}

        {panel && (
          <>
            {!panel.available && (
              <div className="mb-3 rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-900">{panel.unavailableReason}</div>
            )}
            {panel.available && rows.length === 0 && (
              <div className="mb-3 rounded border bg-gray-50 p-2 text-sm text-gray-600">No properties found for this client in Portfolio View.</div>
            )}
            {rows.length > 0 && (
              <table className="mb-4 w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="p-2 text-center">Still owned</th>
                    <th className="p-2">Property</th>
                    <th className="p-2">Current value</th>
                    <th className="p-2">Rent $/wk</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const p = panel.properties.find((x) => x.key === r.key)!;
                    return (
                      <tr key={r.key} className="border-t align-top">
                        <td className="p-2 text-center">
                          <input type="checkbox" className="h-4 w-4" checked={r.stillOwned === true}
                            onChange={(e) => set(r.key, { stillOwned: e.target.checked })} aria-label={`Still owned: ${r.address}`} />
                        </td>
                        <td className="p-2">
                          <div className="font-medium text-brand-charcoal">{r.address || '(no address)'}</div>
                          <div className="text-xs text-gray-500">
                            {[p.purchaseDate, money(p.purchasePrice), p.valuation !== null && `val ${money(p.valuation)}`, p.inFlight && 'in flight'].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="p-2">
                          <input inputMode="numeric" value={r.currentValue} onChange={(e) => set(r.key, { currentValue: e.target.value })}
                            placeholder={p.valuation !== null ? String(p.valuation) : ''} className="w-[120px] rounded border px-2 py-1" />
                        </td>
                        <td className="p-2">
                          <input inputMode="numeric" value={r.currentRentPw} onChange={(e) => set(r.key, { currentRentPw: e.target.value })}
                            className="w-[90px] rounded border px-2 py-1" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="ro-note">Note</label>
            <textarea id="ro-note" value={note} onChange={(e) => { setNote(e.target.value); setSaved(false); }} rows={3}
              className="mb-3 w-full rounded border px-2 py-1 text-sm" />
            <div className="flex items-center gap-3">
              <button onClick={save} disabled={saving} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saved && <span className="text-sm text-green-700">{demo ? 'Saved (demo only)' : 'Saved'}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
