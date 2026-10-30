'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, sydYmd, type SalesData } from '@/lib/reviewOutcomes/types';
import { KINDS, MONTHS, periodRange, shift, weekStart, type Period } from '@/lib/reviewOutcomes/stats';
import { aud, itemsIn, saleItems, soldBy, type SaleItem, type SoldRow } from '@/lib/reviewOutcomes/salesStats';
import { dmy } from './ui';

// Sales from the Buyers Club Tracking sheet (read-only copy): one row per signed client, sliceable by period, office,
// consultant, CC member, lead source, broker and SMSF. Revenue = paid + balance.

const FIRST = '2018-01-01';
const PREF_KEY = 'review-outcomes-sales-view';
const TH = 'border border-gray-300 bg-gray-100 px-1 py-0.5 text-center text-[11px] font-semibold text-gray-700';
const TD = 'border border-gray-200 px-1 py-0.5 text-center text-[12px]';
const TDN = 'border border-gray-200 px-1 py-0.5 text-left text-[12px] whitespace-nowrap';

type FilterKey = 'office' | 'consultant' | 'cc' | 'source' | 'broker' | 'smsf';
const FILTERS: [FilterKey, string][] = [['office', 'Office'], ['consultant', 'Consultant'], ['cc', 'CC member'], ['source', 'Lead source'], ['broker', 'Broker'], ['smsf', 'SMSF']];
const BLANK = '(blank)';
const val = (it: SaleItem, k: FilterKey) => String(it[k] || '') || BLANK;

function rangeOf(p: Period, today: string) {
  return p.kind === 'all' ? { from: FIRST, to: '9999-12-31', label: `All sales (since ${dmy(FIRST)})` } : periodRange(p, today);
}

type Bucket = 'day' | 'week' | 'month' | 'year';
const bucketOf = (k: Period['kind']): Bucket => (k === 'day' || k === 'week' || k === 'month' ? 'day' : k === 'quarter' ? 'week' : k === 'all' ? 'year' : 'month');
const bucketKey = (ymd: string, b: Bucket) => (b === 'day' ? ymd : b === 'week' ? weekStart(ymd) : b === 'month' ? ymd.slice(0, 7) : ymd.slice(0, 4));
const bucketLabel = (k: string, b: Bucket) =>
  b === 'year' ? k : b === 'month' ? `${MONTHS[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(2, 4)}` : `${k.slice(8, 10)}/${k.slice(5, 7)}`;

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-[130px] rounded border bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-[20px] font-bold text-brand-charcoal">{value}</div>
      {sub && <div className="text-[11px] text-gray-500">{sub}</div>}
    </div>
  );
}

function Breakdown({ title, rows, total }: { title: string; rows: SoldRow[]; total: SoldRow }) {
  return (
    <div className="min-w-0 overflow-x-auto rounded border bg-white">
      <div className="bg-brand-charcoal py-1 text-center text-sm font-bold text-white">{title}</div>
      <table className="w-full border-collapse">
        <thead>
          <tr>{['Name', 'Sold', 'New Lead', 'Referral', 'PR', 'Self Gen', 'Repeat', 'Other / Unknown', 'Cancelled', 'Revenue $'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {[...rows, total].map((r) => (
            <tr key={r.name} className={r.name === 'TOTAL' ? 'bg-gray-100 font-bold' : ''}>
              <td className={TDN}>{r.name}</td>
              <td className={TD}>{r.total || ''}</td>
              <td className={TD}>{r.nl || ''}</td>
              <td className={TD}>{r.ref || ''}</td>
              <td className={TD}>{r.pr || ''}</td>
              <td className={TD}>{r.selfGen || ''}</td>
              <td className={TD}>{r.repeat || ''}</td>
              <td className={TD}>{r.other || ''}</td>
              <td className={`${TD} text-red-700`}>{r.cancelled || ''}</td>
              <td className={TD}>{aud(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SalePoint = { label: string; sold: number; revenue: number };
const minusYear = (ymd: string) => {
  const y = `${Number(ymd.slice(0, 4)) - 1}${ymd.slice(4)}`;
  return y.endsWith('-02-29') ? `${y.slice(0, 8)}28` : y;
};

function TrendBars({ points, ly = [] }: { points: SalePoint[]; ly?: SalePoint[] }) {
  if (points.length < 2) return <div className="text-sm text-gray-500">Pick a longer period to see a trend.</div>;
  const W = 900, H = 200, L = 36, R = 10, T = 10, B = 28;
  const lyPts = ly.slice(0, points.length);
  const max = Math.max(1, ...points.map((p) => p.sold), ...lyPts.map((p) => p.sold));
  const bw = (W - L - R) / points.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const every = Math.ceil(points.length / 14);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sales over time">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#e5e7eb" />
          <text x={L - 4} y={y(max * f) + 4} fontSize="11" textAnchor="end" fill="#6b7280">{Math.round(max * f)}</text>
        </g>
      ))}
      {points.map((p, i) => (
        <g key={i}>
          {lyPts[i] && (
            <rect x={L + i * bw + bw * 0.05} y={y(lyPts[i].sold)} width={bw * 0.45} height={H - B - y(lyPts[i].sold)} fill="#cbd5e1">
              <title>{`Last year ${lyPts[i].label}: ${lyPts[i].sold} sold, ${aud(lyPts[i].revenue) || '$0'}`}</title>
            </rect>
          )}
          <rect x={L + i * bw + (lyPts.length ? bw * 0.5 : bw * 0.15)} y={y(p.sold)} width={lyPts.length ? bw * 0.45 : bw * 0.7} height={H - B - y(p.sold)} fill="#2563eb">
            <title>{`${p.label}: ${p.sold} sold, ${aud(p.revenue) || '$0'}`}</title>
          </rect>
          {i % every === 0 && <text x={L + i * bw + bw / 2} y={H - 8} fontSize="11" textAnchor="middle" fill="#6b7280">{p.label}</text>}
        </g>
      ))}
      {lyPts.length > 0 && <text x={W - R} y={T + 10} fontSize="11" textAnchor="end" fill="#6b7280">Grey: same period last year</text>}
    </svg>
  );
}

async function exportXlsx(label: string, list: SaleItem[]) {
  const XLSX = await import('xlsx');
  const aoa: unknown[][] = [
    [`Sales - ${label}`],
    ['Source: Buyers Club Tracking sheet (read-only). Revenue = paid + balance.'],
    [],
    ['Signed', 'Client', 'Office', 'Consultant', 'CC member', 'Lead source', 'Broker', 'SMSF', 'Revenue $', 'Paid $', 'Status', 'Cancel reason'],
    ...list.map((it) => [dmy(it.signed), it.client, it.office, it.consultant, it.cc, it.source, it.broker, it.smsf, it.removed ? null : it.fee, it.removed ? null : it.paid,
      it.removed ? 'Cancelled (not in sales tab)' : it.cancelled ? 'Cancelled' : 'Active', it.cancel?.reason || '']),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [12, 36, 14, 18, 16, 12, 16, 14, 12, 12, 24, 40].map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');
  XLSX.writeFile(wb, `Sales - ${label.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`);
}

export default function SalesView({ demo = false }: { demo?: boolean }) {
  const today = sydYmd(Date.now());
  const [data, setData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [p, setP] = useState<Period>({ kind: 'month', anchor: today });
  const [filters, setFilters] = useState<Record<FilterKey, string>>({ office: '', consultant: '', cc: '', source: '', broker: '', smsf: '' });
  const [net, setNet] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(PREF_KEY) || 'null') as { net?: boolean } | null;
      if (v && typeof v.net === 'boolean') setNet(v.net);
    } catch { /* ignore a bad saved value */ }
  }, []);
  const saveNet = (v: boolean) => {
    setNet(v);
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ net: v })); } catch { /* storage unavailable */ }
  };

  const load = useCallback(async (refresh = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/review-outcomes/sales${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setData(body as SalesData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { if (!demo) load(); }, [demo, load]);

  const items = useMemo(() => (data ? saleItems(data) : []), [data]);
  const r = rangeOf(p, today);
  const options = useMemo(() => {
    const o = {} as Record<FilterKey, string[]>;
    for (const [k] of FILTERS) o[k] = [...new Set(items.map((it) => val(it, k)))].sort((a, b) => (a === BLANK ? 1 : b === BLANK ? -1 : a.localeCompare(b)));
    return o;
  }, [items]);
  const inPeriod = useMemo(
    () => itemsIn(items, r.from, r.to).filter((it) => FILTERS.every(([k]) => !filters[k] || val(it, k) === filters[k])),
    [items, r.from, r.to, filters],
  );
  const total = useMemo(() => soldBy(inPeriod, () => 'x', net).total, [inPeriod, net]);
  const counted = useMemo(() => inPeriod.filter((it) => !it.removed && !(net && it.cancelled)), [inPeriod, net]);
  const paid = counted.reduce((a, it) => a + it.paid, 0);
  const breakdown = (k: FilterKey) => {
    const s = soldBy(inPeriod, (it) => val(it, k), net);
    return { rows: [...s.by.values()].sort((a, b) => b.total - a.total || b.cancelled - a.cancelled), total: s.total };
  };
  const trend = useMemo(() => {
    const b = bucketOf(p.kind);
    const lastYmd = items.reduce((mx, it) => (it.signed > mx ? it.signed : mx), FIRST);
    const end = r.to < lastYmd ? r.to : lastYmd;
    const step = b === 'year' ? 365 : 1;
    const build = (from: string, to: string, list: SaleItem[]) => {
      const by = new Map<string, SalePoint>();
      for (let d = from; d <= to; d = addDays(d, step)) {
        const k = bucketKey(d, b);
        if (!by.has(k)) by.set(k, { label: bucketLabel(k, b), sold: 0, revenue: 0 });
      }
      for (const it of list) {
        if (net && it.cancelled) continue;
        const pt = by.get(bucketKey(it.signed, b));
        if (!pt) continue;
        pt.sold++;
        pt.revenue += it.removed ? 0 : it.fee;
      }
      return [...by.values()];
    };
    const lyFrom = minusYear(r.from), lyTo = minusYear(end);
    const lyItems = b === 'year' ? [] : itemsIn(items, lyFrom, lyTo).filter((it) => FILTERS.every(([k]) => !filters[k] || val(it, k) === filters[k]));
    return { cur: build(r.from, end, inPeriod), ly: lyItems.length ? build(lyFrom, lyTo, lyItems) : [] };
  }, [items, inPeriod, net, p.kind, r.from, r.to, filters]);

  if (demo) return <div className="rounded border bg-white p-4 text-sm text-gray-600">Sales come from the live Tracking sheet, so they aren&apos;t shown in demo mode.</div>;
  if (error && !data) return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!data) return <div className="rounded border bg-white p-4 text-sm text-gray-600">Reading the Tracking sheet…</div>;

  const years = Array.from({ length: Number(today.slice(0, 4)) - 2017 }, (_, i) => 2018 + i);
  const canShift = p.kind !== 'ytd' && p.kind !== 'all';
  const prevOk = canShift && rangeOf(shift(p, -1), today).to >= FIRST;
  const list = [...inPeriod].reverse();
  const shown = showAll ? list : list.slice(0, 200);
  const anyFilter = FILTERS.some(([k]) => filters[k]);

  return (
    <div>
      <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-brand-charcoal">
        Source: Buyers Club Tracking sheet (office sales tabs and CANCELLATIONS), read-only. Revenue = paid + balance.
        Lead source is only recorded on some sales (mostly 2026), so many show as Unknown.
        {data.syncedAt && <span className="text-gray-600"> Copied {new Date(data.syncedAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}.</span>}
        <button onClick={() => load(true)} disabled={busy} className="ml-2 rounded border bg-white px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-50">
          {busy ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>
      {[...data.warnings, ...(error ? [error] : [])].map((w) => <div key={w} className="mb-2 rounded border border-l-4 border-gray-200 border-l-orange-500 bg-white px-3 py-2 text-xs text-gray-800">{w}</div>)}

      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <div className="inline-flex overflow-hidden rounded border border-gray-200" role="group" aria-label="Period">
          {KINDS.map(([k, label]) => (
            <button key={k} onClick={() => setP({ kind: k, anchor: k === 'year' ? `${today.slice(0, 4)}-01-01` : today })}
              className={`px-2 py-1 font-semibold ${p.kind === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {p.kind === 'year' && (
          <select value={p.anchor.slice(0, 4)} onChange={(e) => setP({ kind: 'year', anchor: `${e.target.value}-01-01` })} className="rounded border px-1 py-1" aria-label="Year">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        <label className="ml-2 inline-flex items-center gap-1">
          <input type="checkbox" checked={net} onChange={() => saveNet(!net)} /> Net of cancellations
        </label>
        <button onClick={() => exportXlsx(r.label, list)} className="ml-2 rounded border bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50">Export xlsx</button>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {FILTERS.map(([k, label]) => (
          <select key={k} value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })} aria-label={label}
            className={`max-w-[180px] rounded border px-1 py-1 ${filters[k] ? 'border-blue-500 bg-blue-50' : ''}`}>
            <option value="">All {label === 'SMSF' ? 'SMSF' : `${label.toLowerCase()}s`}</option>
            {options[k].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        {anyFilter && (
          <button onClick={() => setFilters({ office: '', consultant: '', cc: '', source: '', broker: '', smsf: '' })} className="text-blue-700 hover:underline">Clear filters</button>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3 rounded border bg-white px-2 py-2">
        <button onClick={() => setP(shift(p, -1))} disabled={!prevOk} aria-label="Previous period"
          className="h-11 w-[22%] min-w-[80px] rounded border text-2xl font-semibold text-brand-charcoal hover:bg-gray-50 disabled:opacity-30">‹</button>
        <div className="text-center text-[18px] font-bold text-brand-charcoal">{r.label}</div>
        <button onClick={() => setP(shift(p, 1))} disabled={!canShift} aria-label="Next period"
          className="h-11 w-[22%] min-w-[80px] rounded border text-2xl font-semibold text-brand-charcoal hover:bg-gray-50 disabled:opacity-30">›</button>
      </div>

      <div className="mb-3 flex flex-wrap gap-3">
        <Card label={net ? 'Sold (net)' : 'Sold (gross)'} value={total.total} />
        <Card label="Cancelled" value={total.cancelled} sub={total.cancelledRevenue ? `${aud(total.cancelledRevenue)} known fees` : undefined} />
        <Card label="Revenue" value={aud(total.revenue) || '$0'} sub={net ? 'net of cancellations' : 'gross'} />
        <Card label="Paid to date" value={aud(paid) || '$0'} />
        <Card label="Average fee" value={aud(counted.length ? counted.reduce((a, it) => a + it.fee, 0) / counted.length : 0) || '-'} />
      </div>

      <div className="mb-3 rounded border bg-white p-3">
        <div className="mb-2 text-sm font-semibold text-brand-charcoal">Sold over time{net ? ' (net)' : ''}</div>
        <TrendBars points={trend.cur} ly={trend.ly} />
      </div>

      <div className="mb-3 grid gap-3 xl:grid-cols-2">
        <Breakdown title="By office" {...breakdown('office')} />
        <Breakdown title="By lead source" {...breakdown('source')} />
        <Breakdown title="By consultant" {...breakdown('consultant')} />
        <Breakdown title="By CC member" {...breakdown('cc')} />
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <div className="bg-brand-charcoal py-1 text-center text-sm font-bold text-white">Sales ({list.length})</div>
        <table className="w-full border-collapse">
          <thead>
            <tr>{['Signed', 'Client', 'Office', 'Consultant', 'CC member', 'Lead source', 'Broker', 'SMSF', 'Revenue $', 'Paid $', 'Status'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((it) => (
              <tr key={it.id} className={it.cancelled ? 'text-gray-400' : ''}>
                <td className={TDN}>{dmy(it.signed)}</td>
                <td className={TDN}>{it.client}</td>
                <td className={TDN}>{it.office}</td>
                <td className={TDN} title={it.sale?.consultantRaw}>{it.consultant}</td>
                <td className={TDN} title={it.sale?.ccRaw}>{it.cc}</td>
                <td className={TDN} title={it.sale?.sourceRaw}>{it.source}</td>
                <td className={TDN}>{it.broker}</td>
                <td className={TDN}>{it.smsf}</td>
                <td className={TD}>{it.removed ? '' : aud(it.fee)}</td>
                <td className={TD}>{it.removed ? '' : aud(it.paid)}</td>
                <td className={TDN} title={it.cancel?.reason || ''}>
                  {it.removed ? <span className="text-red-700">Cancelled (not in sales tab)</span> : it.cancelled ? <span className="text-red-700">Cancelled</span> : 'Active'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length > shown.length && (
          <div className="p-2 text-center text-xs">
            Showing the latest {shown.length} of {list.length}. <button onClick={() => setShowAll(true)} className="text-blue-700 hover:underline">Show all</button>
          </div>
        )}
      </div>
    </div>
  );
}
