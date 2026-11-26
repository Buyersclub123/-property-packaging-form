'use client';

import { useMemo, useState } from 'react';
import type { CcPays, CcWriteResult } from '@/lib/reviewOutcomes/ccPays';
import { ccPeriod, CC_DEFAULT_KIND, CC_PERIODS, lastMonSun, type CcPeriod, type CcPeriodKind } from '@/lib/reviewOutcomes/ccPaysPeriod';
import { dmy } from './ui';

/** CC PAYS AUTOMATED: preview a period and write it as a "<period> AUTOMATED" tab (recorders). */
export default function CcPaysPanel({ today }: { today: string }) {
  const start = lastMonSun(today);
  const [kind, setKind] = useState<CcPeriodKind>(CC_DEFAULT_KIND);
  const [from, setFrom] = useState(start.from);
  const [to, setTo] = useState(start.to);
  const [also, setAlso] = useState<string>('fri-thu');
  const [data, setData] = useState<(CcPays & { tab: string; exists: boolean; also: CcPeriod | null }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const period = useMemo((): CcPeriod | string => {
    try { return ccPeriod(kind, from, kind === 'custom' ? to : undefined); } catch (e) { return (e as Error).message; }
  }, [kind, from, to]);
  const p = typeof period === 'string' ? null : period;
  const reset = () => { setData(null); setMsg(null); };
  const qs = (q: CcPeriod) => `/api/review-outcomes/cc-pays?kind=${q.kind}&from=${q.from}&to=${q.to}&also=${also}`;
  const hl = (ymd: string) => !!data?.also && ymd >= data.also.from && ymd <= data.also.to;
  const preview = async () => {
    if (!p) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`${qs(p)}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const write = async () => {
    if (!data) return;
    const replace = data.exists;
    if (!confirm(replace
      ? `"${data.tab}" already exists. Rewrite that AUTOMATED tab? DAY OFF entries are kept; manual tabs are not touched.`
      : `Write a NEW tab "${data.tab}" to the CC PAYS workbook? Existing tabs are not touched.`)) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/review-outcomes/cc-pays', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: data.kind, from: data.from, to: data.to, replace }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      const r = body as CcWriteResult;
      setMsg({ ok: true, text: `${r.replaced ? 'Rewrote' : 'Wrote'} "${r.tab}": ${r.rows} meetings, read back ${r.readBack}.` });
      setData({ ...data, exists: true });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); } finally { setBusy(false); }
  };
  const rows = data?.blocks.reduce((n, b) => n + b.rows.length, 0) || 0;
  const date = 'rounded border px-1 py-0.5 text-xs';
  return (
    <div className="rounded border bg-white p-3 text-sm" data-testid="cc-pays">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-brand-charcoal">CC PAYS (automated)</span>
        <select value={kind} onChange={(e) => { setKind(e.target.value as CcPeriodKind); reset(); }} className={date} aria-label="CC PAYS period" data-testid="cc-period">
          {CC_PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className="text-xs text-gray-500">{kind === 'custom' ? 'from' : 'containing'}</span>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} className={date} aria-label="CC PAYS from" />
        {kind === 'custom' && <>
          <span className="text-xs text-gray-500">to</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} className={date} aria-label="CC PAYS to" />
        </>}
        {p ? <span className="text-xs text-gray-500" data-testid="cc-range">{dmy(p.from)} - {dmy(p.to)}</span>
          : <span className="text-xs text-red-700">{period as string}</span>}
        <span className="text-xs text-gray-500">highlight meetings also in</span>
        <select value={also} onChange={(e) => { setAlso(e.target.value); reset(); }} className={date} aria-label="Highlight meetings also in" data-testid="cc-also">
          <option value="none">nothing</option>
          {CC_PERIODS.filter(([k]) => k !== 'custom').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button onClick={preview} disabled={busy || !p} className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50">{busy ? 'Working…' : 'Preview'}</button>
        {p && <a href={`${qs(p)}&format=xlsx`} className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50" data-testid="cc-xlsx">Download Excel</a>}
        {data && <button onClick={write} disabled={busy} data-testid="cc-write"
          className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-xs text-green-800 hover:bg-green-100 disabled:opacity-40">{data.exists ? 'Rewrite' : 'Write'} &quot;{data.tab}&quot; tab</button>}
        {data?.exists && <span className="text-xs text-amber-700" data-testid="cc-exists">Tab exists: Rewrite writes it again with today&apos;s outcomes.</span>}
      </div>
      <div className="mb-2 text-xs text-gray-500">Mon–Sun week (Monday 00:00 to Sunday 23:59 Sydney time) is written automatically every Monday 9am Sydney for the week just ended. Every AUTOMATED tab is rewritten each time an outcome or TLC in its period is saved, so it shows actuals; DAY OFF entries are kept. Manual tabs are never changed.</div>
      {msg && <div className={`mb-2 text-xs ${msg.ok ? 'text-green-700' : 'text-red-700'}`}>{msg.text}</div>}
      {data && (
        <>
          <div className="mb-1 text-xs text-gray-600">{rows} Showed meetings{data.also ? ` · ${data.blocks.reduce((n, b) => n + b.rows.filter((r) => hl(r.ymd)).length, 0)} highlighted yellow: also in ${dmy(data.also.from)} - ${dmy(data.also.to)}` : ''} · layout and block order from manual tab &quot;{data.templateTab}&quot;{data.skipped.length ? ` · ${data.skipped.length} left out: ${data.skipped.map((s) => `${s.client} (${s.reason})`).join('; ')}` : ''}</div>
          <div className="max-h-[480px] overflow-y-auto">
            <table className="border-collapse text-[12px]">
              <tbody>
                {data.blocks.filter((b) => b.rows.length).map((b) => [
                  <tr key={b.header} className="bg-gray-300 font-semibold">{[b.header, 'COMMS DUE', 'CRM NOTES', 'TLC', 'CONSULTANT', 'DAY OFF'].map((h) => <td key={h} className="border border-gray-400 px-2 py-0.5">{h}</td>)}</tr>,
                  ...b.rows.map((r) => (
                    <tr key={r.appointmentId} className={hl(r.ymd) ? 'bg-yellow-200' : ''}>{[r.client, r.comms, r.crm, r.tlc, r.consultant, ''].map((v, i) => <td key={i} className="border border-gray-300 px-2 py-0.5">{v}</td>)}</tr>
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
