'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, MIN_YMD, sydYmd, type ReviewData, type ReviewMeeting, type StatTarget } from '@/lib/reviewOutcomes/types';
import { dmy, weekday } from './ui';
import type { SheetStats } from '@/lib/reviewOutcomes/statsSheet';
import { bookerKey, canCompare, compareRange, type CompareBase, consultantKey, emptyRow, inRange, isDnq, isSat, KINDS, MONTHS, NO_BOOKER, pct, periodRange, shift, sumRows, tally, weekStart, type Kind, type Period, type Row, type Tally } from '@/lib/reviewOutcomes/stats';

// Item 15: CC Stats (left) and Sales Stats (right) for one shared period, laid out like the team's STATS sheet.
// Only the PR columns are filled from the tool's outcomes; New Lead / Referral / Sold / Revenue / Marketing are blank
// placeholders until their sources are known.


const n0 = (n: number) => (n ? String(n) : '');

const TH = 'border border-gray-300 bg-gray-100 px-1 py-0.5 text-center text-[11px] font-semibold text-gray-700';
const TD = 'border border-gray-200 px-1 py-0.5 text-center text-[12px]';
const TDN = 'border border-gray-200 px-1 py-0.5 text-left text-[12px] whitespace-nowrap';
const SHADE = 'bg-gray-50';

function V({ children }: { children: React.ReactNode }) {
  return <span className="inline-block leading-tight">{children}</span>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-charcoal py-1 text-center text-sm font-bold text-white">{children}</div>;
}

type Field = 'booked' | 'sat' | 'dnq';
type OnPick = (name: string, f: Field) => void;

type PrevOf = (name: string, f: Field) => number | null;

function Delta({ v, pv }: { v: number; pv: number }) {
  const d = v - pv;
  return <span className={`ml-0.5 text-[10px] ${d > 0 ? 'text-green-700' : d < 0 ? 'text-red-700' : 'text-gray-400'}`}>{d > 0 ? '\u25b2' : d < 0 ? '\u25bc' : '='}{d ? Math.abs(d) : ''}</span>;
}

function NumCell({ v, total, onClick, pv = null }: { v: number; total: boolean; onClick: () => void; pv?: number | null }) {
  return (
    <td className={TD}>
      {v || total ? <button onClick={onClick} className="text-blue-700 hover:underline" title="Show these meetings">{v}</button> : ''}
      {pv !== null && (v || pv) ? <Delta v={v} pv={pv} /> : null}
    </td>
  );
}

function CompareBox({ title, rows, total, prev, prevLabel }: { title: string; rows: Row[]; total: Row; prev: Map<string, Row>; prevLabel: string }) {
  const list = rows.filter((r) => r.booked || prev.get(r.name)?.booked);
  const line = (r: Row, bold = false) => {
    const p = prev.get(r.name) || emptyRow(r.name);
    return (
      <tr key={r.name} className={bold ? 'font-semibold' : ''}>
        <td className={TDN}>{r.name}</td>
        <td className={TD}>{r.booked}<Delta v={r.booked} pv={p.booked} /></td>
        <td className={TD}>{r.sat}<Delta v={r.sat} pv={p.sat} /></td>
        <td className={TD}>{pct(r.sat, r.booked)}</td>
      </tr>
    );
  };
  return (
    <div className="rounded border bg-white">
      <Title>{title} vs {prevLabel}</Title>
      <table className="w-full border-collapse">
        <thead><tr><th className={TH}>Name</th><th className={TH}>Booked</th><th className={TH}>Sat</th><th className={TH}>Sat %</th></tr></thead>
        <tbody>{list.map((r) => line(r))}{line(total, true)}</tbody>
      </table>
    </div>
  );
}

function CcTable({ data, pick, prevOf }: { data: { rows: Row[]; total: Row }; pick: OnPick; prevOf: PrevOf }) {
  const line = (r: Row, total = false) => (
    <tr key={r.name} className={total ? 'bg-gray-100 font-bold' : ''}>
      <td className={TDN}>{r.name}</td>
      <td className={TD} /><td className={TD} /><NumCell v={r.booked} total={total} onClick={() => pick(r.name, 'booked')} pv={prevOf(r.name, 'booked')} /><td className={`${TD} ${SHADE}`}>{r.booked}</td>
      <td className={TD} /><td className={TD} /><td className={TD} /><td className={`${TD} ${SHADE}`}>0.00%</td>
      <td className={TD} /><td className={TD} /><td className={TD} />
      <NumCell v={r.sat} total={total} onClick={() => pick(r.name, 'sat')} pv={prevOf(r.name, 'sat')} /><NumCell v={r.dnq} total={total} onClick={() => pick(r.name, 'dnq')} pv={prevOf(r.name, 'dnq')} /><td className={TD} />
      <td className={`${TD} ${SHADE}`}>0</td><td className={`${TD} ${SHADE}`}>0</td>
      <td className={TD}>0</td><td className={TD} />
      <td className={`${TD} ${SHADE}`}>0.00%</td><td className={`${TD} ${SHADE}`}>0.00%</td>
    </tr>
  );
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH} rowSpan={3}>Name</th>
          <th className={TH} colSpan={4}>Booked</th>
          <th className={TH} colSpan={12}>Sat</th>
          <th className={TH} rowSpan={3}>SOLD</th>
          <th className={TH} rowSpan={3}><V>Revenue $</V></th>
          <th className={TH} rowSpan={3}><V>N/L Sat %</V></th>
          <th className={TH} rowSpan={3}><V>Sold %</V></th>
        </tr>
        <tr>
          {['New Lead', 'Referral', 'PR', 'TOTAL'].map((h) => <th key={h} className={TH} rowSpan={2}><V>{h}</V></th>)}
          <th className={TH} colSpan={4}>New Lead</th>
          <th className={TH} colSpan={3}>Referral</th>
          <th className={TH} colSpan={3}>PR</th>
          <th className={TH} colSpan={2}>Total (Excl PR&apos;s)</th>
        </tr>
        <tr>
          {['Sat', 'DNQ', 'Sold', 'Sat %', 'Sat', 'DNQ', 'Sold', 'Sat', 'DNQ', 'Sold', 'BOOKED', 'SAT'].map((h, i) => <th key={i} className={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((r) => line(r))}
        {line(data.total, true)}
      </tbody>
    </table>
  );
}

function SalesTable({ data, pick, prevOf }: { data: { rows: Row[]; total: Row }; pick: OnPick; prevOf: PrevOf }) {
  const line = (r: Row, total = false) => (
    <tr key={r.name} className={total ? 'bg-gray-100 font-bold' : ''}>
      <td className={TDN}>{r.name}</td>
      <td className={TD} /><td className={TD} /><NumCell v={r.booked} total={total} onClick={() => pick(r.name, 'booked')} pv={prevOf(r.name, 'booked')} /><td className={`${TD} ${SHADE}`}>{r.booked}</td>
      <td className={TD} /><td className={TD} /><td className={TD} /><td className={`${TD} ${SHADE}`}>0.00%</td>
      <td className={TD} /><td className={TD} /><td className={TD} /><td className={`${TD} ${SHADE}`}>0.00%</td>
      <NumCell v={r.sat} total={total} onClick={() => pick(r.name, 'sat')} pv={prevOf(r.name, 'sat')} /><NumCell v={r.dnq} total={total} onClick={() => pick(r.name, 'dnq')} pv={prevOf(r.name, 'dnq')} /><td className={TD} /><td className={`${TD} ${SHADE}`}>0.00%</td>
      <td className={TD} /><td className={TD} /><td className={`${TD} ${SHADE}`}>0</td>
      <td className={TD} />
      <td className={`${TD} ${SHADE}`}>{pct(r.sat, r.booked)}</td><td className={`${TD} ${SHADE}`}>0.00%</td>
    </tr>
  );
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH} rowSpan={3}>Name</th>
          <th className={TH} colSpan={4}>BOOKED</th>
          <th className={TH} colSpan={12}>Sat</th>
          <th className={TH} colSpan={3}>Sold</th>
          <th className={TH} rowSpan={3}><V>Revenue $</V></th>
          <th className={TH} rowSpan={3}><V>Overall Sat %</V></th>
          <th className={TH} rowSpan={3}><V>Overall Sold %</V></th>
        </tr>
        <tr>
          {['New Lead', 'Referral', 'PR', 'TOTAL'].map((h) => <th key={h} className={TH} rowSpan={2}><V>{h}</V></th>)}
          <th className={TH} colSpan={4}>New Lead</th>
          <th className={TH} colSpan={4}>Referral</th>
          <th className={TH} colSpan={4}>PR</th>
          {['Self Gen', 'Repeat', 'Total'].map((h) => <th key={h} className={TH} rowSpan={2}><V>{h}</V></th>)}
        </tr>
        <tr>
          {[0, 1, 2].flatMap((g) => ['Sat', 'DNQ', 'Sold', 'Sold %'].map((h) => <th key={`${g}${h}`} className={TH}>{h}</th>))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((r) => line(r))}
        {line(data.total, true)}
      </tbody>
    </table>
  );
}

function BookingsTable({ data }: { data: { rows: Row[]; total: Row } }) {
  return (
    <table className="border-collapse">
      <thead>
        <tr>{['Bookings', 'Qty', '%', 'Sat', 'QSat', 'Sold', '% to Q Sold'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {[...data.rows, data.total].map((x) => (
          <tr key={x.name} className={x.name === 'TOTAL' ? 'bg-gray-100 font-bold' : ''}>
            <td className={TDN}>{x.name}</td>
            <td className={TD}>{x.booked}</td>
            <td className={TD}>{x.name === 'TOTAL' ? '' : pct(x.booked, data.total.booked)}</td>
            <td className={TD}>{n0(x.sat)}</td>
            <td className={TD} /><td className={TD} /><td className={TD} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MarketingTable() {
  const rows: [string, string][] = [['CPL', '$250.00'], ['Cost per meeting Sat Qual', ''], ['CPA', '$1,500.00'], ['Marketing Spend', '']];
  return (
    <table className="border-collapse">
      <thead>
        <tr>{['Marketing', 'Target', 'Actual'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(([k, t]) => (
          <tr key={k}><td className={TDN}>{k}</td><td className={TD}>{t}</td><td className={TD} /></tr>
        ))}
      </tbody>
    </table>
  );
}

const ratio = (n: number, d: number) => (d ? n / d : 0);

/** Download the period in the STATS sheet's column order; only the PR columns are filled for now. */
async function exportXlsx(label: string, cc: Tally, sales: Tally, modes: Tally) {
  const XLSX = await import('xlsx');
  const ccHead = ['Name', 'Booked New Lead', 'Booked Referral', 'Booked PR', 'Booked TOTAL', 'NL Sat', 'NL DNQ', 'NL Sold', 'NL Sat %',
    'Ref Sat', 'Ref DNQ', 'Ref Sold', 'PR Sat', 'PR DNQ', 'PR Sold', 'Total (Excl PR) Booked', 'Total (Excl PR) Sat', 'SOLD', 'Revenue $', 'N/L Sat %', 'Sold %'];
  const ccRow = (r: Row) => [r.name, null, null, r.booked, r.booked, null, null, null, 0, null, null, null, r.sat, r.dnq, null, 0, 0, 0, null, 0, 0];
  const salesHead = ['Name', 'Booked New Lead', 'Booked Referral', 'Booked PR', 'Booked TOTAL', 'NL Sat', 'NL DNQ', 'NL Sold', 'NL Sold %',
    'Ref Sat', 'Ref DNQ', 'Ref Sold', 'Ref Sold %', 'PR Sat', 'PR DNQ', 'PR Sold', 'PR Sold %', 'Self Gen', 'Repeat', 'Sold Total', 'Revenue $', 'Overall Sat %', 'Overall Sold %'];
  const salesRow = (r: Row) => [r.name, null, null, r.booked, r.booked, null, null, null, 0, null, null, null, 0, r.sat, r.dnq, null, 0, null, null, 0, null, ratio(r.sat, r.booked), 0];
  const aoa: unknown[][] = [
    [`Review Outcomes stats - ${label}`],
    ['PR meetings only. Referral attribution and New Lead / Referral meetings not yet included.'],
    [],
    ['CC Stats'], ccHead, ...cc.rows.map(ccRow), ccRow(cc.total),
    [],
    ['Sales Stats'], salesHead, ...sales.rows.map(salesRow), salesRow(sales.total),
    [],
    ['Bookings', 'Qty', '%', 'Sat', 'QSat', 'Sold', '% to Q Sold'],
    ...[...modes.rows, modes.total].map((x) => [x.name, x.booked, x.name === 'TOTAL' ? null : ratio(x.booked, modes.total.booked), x.sat, null, null, null]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 24 }, ...Array.from({ length: 22 }, () => ({ wch: 10 }))];
  for (const [addr, cell] of Object.entries(ws)) {
    if (addr.startsWith('!') || typeof (cell as { v?: unknown }).v !== 'number') continue;
    const v = (cell as { v: number }).v;
    const col = addr.replace(/\d+/g, '');
    const rowN = Number(addr.replace(/\D+/g, ''));
    const head = (aoa.slice(0, rowN).reverse().find((r) => r[0] === 'Name' || r[0] === 'Bookings') || []) as string[];
    const h = head[XLSX.utils.decode_col(col)] || '';
    if (/%/.test(h)) (cell as { z?: string }).z = '0.00%';
    else if (!Number.isInteger(v)) (cell as { z?: string }).z = '0.00';
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stats');
  XLSX.writeFile(wb, `Review stats - ${label.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`);
}

/** Monthly targets scaled to the period; null where a target makes no sense (Day, All). */
function targetFactor(p: Period, today: string): number | null {
  switch (p.kind) {
    case 'week': return 12 / 52;
    case 'month': return 1;
    case 'quarter': return 3;
    case 'year': return 12;
    case 'ytd': return p.anchor.slice(0, 4) === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12;
    default: return null;
  }
}

function TargetsTable({ targets, factor, rows }: { targets: Record<string, StatTarget>; factor: number | null; rows: Row[] }) {
  const names = Object.keys(targets).sort((a, b) => a.localeCompare(b));
  if (!names.length || factor === null) return null;
  const cell = (got: number, t: number) => {
    if (!t) return <td className={TD}></td>;
    const goal = Math.round(t * factor * 10) / 10;
    const pc = Math.round((got / goal) * 100);
    return <td className={TD}>{got} / {goal} <span className={pc >= 100 ? 'text-green-700' : pc >= 75 ? 'text-amber-700' : 'text-red-700'}>({pc}%)</span></td>;
  };
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <Title>Targets (PR, monthly target scaled to the period)</Title>
      <table className="w-full border-collapse">
        <thead><tr><th className={TH}>Name</th><th className={TH}>Booked vs target</th><th className={TH}>Sat vs target</th></tr></thead>
        <tbody>
          {names.map((n) => {
            const r = rows.find((x) => x.name === n) || emptyRow(n);
            return <tr key={n}><td className={TDN}>{n}</td>{cell(r.booked, targets[n].booked)}{cell(r.sat, targets[n].sat)}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

interface ViewPrefs { includeHidden: boolean; compare: 'off' | 'box' | 'cells'; base: CompareBase; baseYear: number }
const VIEW_KEY = 'review-outcomes-stats-view';

/** Drop hidden names; the TOTAL keeps them unless includeHidden is off. */
function visible(t: Tally, hidden: string[], includeHidden: boolean): Tally {
  const rows = t.rows.filter((r) => !hidden.includes(r.name));
  return { rows, total: includeHidden ? t.total : sumRows(rows) };
}

type NameMode = 'all' | 'year' | 'active' | 'custom';
interface NameConfig { mode: NameMode; hiddenCc: string[]; hiddenSales: string[] }
const NAMES_KEY = 'review-outcomes-stats-names';
const NAME_MODES: [NameMode, string][] = [['all', 'All names'], ['year', 'All names with stats this year'], ['active', 'Only names with stats this period'], ['custom', 'Custom']];

type Bucket = 'day' | 'week' | 'month';
const bucketOf = (kind: Kind): Bucket => (kind === 'day' || kind === 'week' || kind === 'month' ? 'day' : kind === 'quarter' ? 'week' : 'month');
const bucketKey = (ymd: string, b: Bucket) =>
  b === 'day' ? ymd : b === 'month' ? ymd.slice(0, 7) : weekStart(ymd);
const bucketLabel = (k: string, b: Bucket) =>
  b === 'month' ? `${MONTHS[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(2, 4)}` : `${k.slice(8, 10)}/${k.slice(5, 7)}`;

const SERIES = [
  { key: 'booked', name: 'Booked', color: '#2563eb' },
  { key: 'sat', name: 'Sat', color: '#16a34a' },
  { key: 'dnq', name: 'DNQ', color: '#f59e0b' },
] as const;

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-brand-charcoal">{title}</span>
        {SERIES.filter((s) => s.key !== 'dnq' || title.startsWith('Trend')).map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1 text-xs text-gray-600">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: s.color }} />{s.name}
          </span>
        ))}
      </div>
      {children}
    </div>
  );
}

function TrendChart({ points }: { points: { label: string; booked: number; sat: number; dnq: number }[] }) {
  if (points.length < 2) return <div className="text-sm text-gray-500">Pick a longer period to see a trend.</div>;
  const W = 900, H = 220, L = 36, R = 10, T = 10, B = 28;
  const max = Math.max(1, ...points.map((p) => p.booked));
  const x = (i: number) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const every = Math.ceil(points.length / 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Booked, Sat and DNQ over time">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#e5e7eb" />
          <text x={L - 4} y={y(max * f) + 4} fontSize="11" textAnchor="end" fill="#6b7280">{Math.round(max * f)}</text>
        </g>
      ))}
      {points.map((p, i) => (i % every === 0 ? <text key={i} x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill="#6b7280">{p.label}</text> : null))}
      {SERIES.map((s) => (
        <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2"
          points={points.map((p, i) => `${x(i)},${y(p[s.key])}`).join(' ')} />
      ))}
    </svg>
  );
}

function BarChart({ rows }: { rows: Row[] }) {
  const list = rows.filter((r) => r.name !== 'TOTAL' && r.booked > 0).sort((a, b) => b.booked - a.booked);
  const max = Math.max(1, ...list.map((r) => r.booked));
  if (!list.length) return <div className="text-sm text-gray-500">No meetings in this period.</div>;
  return (
    <div className="grid gap-1">
      {list.map((r) => (
        <div key={r.name} className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-2 text-xs">
          <span className="truncate text-gray-700" title={r.name}>{r.name}</span>
          <div className="grid gap-0.5">
            <div className="flex items-center gap-1"><div className="h-2.5 rounded-sm bg-blue-600" style={{ width: `${(r.booked / max) * 100}%` }} /><span>{r.booked}</span></div>
            <div className="flex items-center gap-1"><div className="h-2.5 rounded-sm bg-green-600" style={{ width: `${(r.sat / max) * 100}%` }} /><span>{r.sat || ''}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StatsView({ demoData = null }: { demoData?: ReviewData | null }) {
  const today = sydYmd(Date.now());
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [p, setP] = useState<Period>({ kind: 'month', anchor: today });
  const [names, setNames] = useState<NameConfig>({ mode: 'all', hiddenCc: [], hiddenSales: [] });
  const [namesOpen, setNamesOpen] = useState(false);
  const [drill, setDrill] = useState<{ title: string; meetings: ReviewMeeting[] } | null>(null);
  const [view, setView] = useState<ViewPrefs>({ includeHidden: true, compare: 'off', base: 'prev', baseYear: Number(today.slice(0, 4)) - 1 });
  const [mailMsg, setMailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(VIEW_KEY) || 'null') as ViewPrefs | null;
      if (v) setView({ includeHidden: v.includeHidden !== false, compare: v.compare || 'off', base: v.base || 'prev', baseYear: v.baseYear || Number(today.slice(0, 4)) - 1 });
    } catch { /* ignore a bad saved value */ }
  }, [today]);
  const saveView = (v: ViewPrefs) => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ }
  };
  const [sheet, setSheet] = useState<SheetStats | null>(null);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  useEffect(() => {
    if (demoData) return;
    fetch('/api/review-outcomes/sheet-stats', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
        setSheet(body as SheetStats);
      })
      .catch((e) => setSheetErr((e as Error).message));
  }, [demoData]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(NAMES_KEY) || 'null') as NameConfig | null;
      if (saved?.mode) setNames({ mode: saved.mode, hiddenCc: saved.hiddenCc || [], hiddenSales: saved.hiddenSales || [] });
    } catch { /* ignore a bad saved value */ }
  }, []);
  const saveNames = (n: NameConfig) => {
    setNames(n);
    try { localStorage.setItem(NAMES_KEY, JSON.stringify(n)); } catch { /* storage unavailable */ }
  };
  const toggleHidden = (field: 'hiddenCc' | 'hiddenSales', name: string) => {
    const cur = names[field];
    saveNames({ ...names, [field]: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name] });
  };

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

  const r = periodRange(p, today);
  const list = useMemo(() => (data?.meetings || []).filter((m) => m.ymd >= r.from && m.ymd <= r.to), [data, r.from, r.to]);
  const pool = useMemo(
    () => (names.mode === 'year' ? (data?.meetings || []).filter((m) => m.ymd.startsWith(today.slice(0, 4))) : data?.meetings || []),
    [data, names.mode, today],
  );
  const allBookers = useMemo(() => [...new Set(pool.map((m) => m.booker || NO_BOOKER))], [pool]);
  const allConsultants = useMemo(() => [...new Set(pool.map((m) => m.consultant))], [pool]);
  const cc = useMemo(() => {
    const t = tally(list, bookerKey, names.mode === 'active' ? [] : allBookers);
    return names.mode === 'custom' ? visible(t, names.hiddenCc, view.includeHidden) : t;
  }, [list, names, allBookers, view.includeHidden]);
  const sales = useMemo(() => {
    const t = tally(list, consultantKey, names.mode === 'active' ? [] : allConsultants);
    return names.mode === 'custom' ? visible(t, names.hiddenSales, view.includeHidden) : t;
  }, [list, names, allConsultants, view.includeHidden]);
  const prevMaps = useMemo(() => {
    const pr = compareRange(p, today, view.base, view.baseYear);
    if (!pr) return null;
    const pl = inRange(data?.meetings || [], pr.from, pr.to);
    const toMap = (t: Tally, hidden: string[]) => {
      const v = names.mode === 'custom' ? visible(t, hidden, view.includeHidden) : t;
      return new Map([...v.rows, v.total].map((x) => [x.name, x]));
    };
    return { label: pr.label, cc: toMap(tally(pl, bookerKey), names.hiddenCc), sales: toMap(tally(pl, consultantKey), names.hiddenSales) };
  }, [p, today, data, names, view.includeHidden, view.base, view.baseYear]);
  const prevOf = (side: 'cc' | 'sales'): PrevOf => (n, f) =>
    view.compare === 'cells' && prevMaps ? prevMaps[side].get(n)?.[f] ?? 0 : null;
  const emailView = async () => {
    if (!confirm(`Email "${r.label}" to the recipients saved in Settings > Stats email?`)) return;
    setMailMsg(null);
    try {
      const res = await fetch('/api/review-outcomes/stats-email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ periods: [p] }) });
      const out = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      setMailMsg({ ok: true, text: `Sent to ${out.to.length}` });
    } catch (e) {
      setMailMsg({ ok: false, text: (e as Error).message });
    }
  };
  const modes = useMemo(() => {
    const t = tally(list, (m) => m.mode);
    return { ...t, rows: ['Google', 'F2F', 'Unknown'].map((k) => t.rows.find((x) => x.name === k) || emptyRow(k)) };
  }, [list]);
  const trend = useMemo(() => {
    const b = bucketOf(p.kind);
    const lastYmd = (data?.meetings || []).reduce((mx, m) => (m.ymd > mx ? m.ymd : mx), MIN_YMD);
    const end = r.to < lastYmd ? r.to : lastYmd;
    const by = new Map<string, { label: string; booked: number; sat: number; dnq: number }>();
    for (let d = r.from; d <= end; d = addDays(d, 1)) {
      const k = bucketKey(d, b);
      if (!by.has(k)) by.set(k, { label: bucketLabel(k, b), booked: 0, sat: 0, dnq: 0 });
    }
    for (const m of list) {
      const pt = by.get(bucketKey(m.ymd, b));
      if (!pt) continue;
      pt.booked++;
      if (isSat(m)) pt.sat++;
      if (isDnq(m)) pt.dnq++;
    }
    return [...by.values()];
  }, [data, list, p.kind, r.from, r.to]);
  const canShift = p.kind !== 'ytd' && p.kind !== 'all';
  const prevOk = canShift && periodRange(shift(p, -1), today).to >= MIN_YMD;
  const noOutcome = useMemo(() => list.filter((m) => m.past && !m.outcome).length, [list]);
  const check = useMemo(() => {
    if (!sheet) return null;
    const inside = sheet.blocks.filter((b) => b.from >= r.from && b.to <= r.to && b.booked + b.sat + b.dnq > 0);
    const chosen: typeof inside = [];
    const len = (b: { from: string; to: string }) => Date.parse(b.to) - Date.parse(b.from);
    // Month tabs repeat boundary days (e.g. "1st October" after "25th Sep - 1st Oct"); keep the longest non-overlapping weeks.
    for (const b of [...inside].sort((a, c) => len(c) - len(a))) {
      if (!chosen.some((c) => b.from <= c.to && b.to >= c.from)) chosen.push(b);
    }
    if (!chosen.length) return { weeks: 0, from: '', to: '', s: emptyRow('s'), t: emptyRow('t') };
    chosen.sort((a, c) => a.from.localeCompare(c.from));
    const s = emptyRow('Sheet');
    for (const b of chosen) { s.booked += b.booked; s.sat += b.sat; s.dnq += b.dnq; }
    const covered = (data?.meetings || []).filter((m) => chosen.some((b) => m.ymd >= b.from && m.ymd <= b.to));
    return { weeks: chosen.length, from: chosen[0].from, to: chosen[chosen.length - 1].to, s, t: tally(covered, () => 'x').total };
  }, [sheet, data, r.from, r.to]);
  const years = Array.from({ length: Number(today.slice(0, 4)) - 2023 }, (_, i) => 2024 + i);
  const pickFrom = (side: 'cc' | 'sales', name: string, f: Field) => {
    const key = side === 'cc' ? (m: ReviewMeeting) => m.booker || NO_BOOKER : (m: ReviewMeeting) => m.consultant;
    const meetings = list
      .filter((m) => name === 'TOTAL' || key(m) === name)
      .filter((m) => (f === 'sat' ? isSat(m) : f === 'dnq' ? isDnq(m) : true))
      .sort((a, b) => a.start.localeCompare(b.start));
    setDrill({ title: `${name === 'TOTAL' ? (side === 'cc' ? 'Call Centre total' : 'Sales total') : name} - ${f === 'booked' ? 'Booked' : f === 'sat' ? 'Sat' : 'DNQ'} - ${r.label}`, meetings });
  };

  if (error) return <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (!data) return <div className="rounded border bg-white p-4 text-sm text-gray-600">Loading stats…</div>;

  return (
    <div>
      <div className="mb-3 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-brand-charcoal">
        PR meetings only. Referral attribution and New Lead / Referral meetings not yet included.
      </div>
      {noOutcome > 0 && (
        <div className="mb-3 rounded border border-l-4 border-gray-200 border-l-orange-500 bg-white px-3 py-2 text-sm text-gray-800">
          {noOutcome} past meeting{noOutcome === 1 ? '' : 's'} in this period {noOutcome === 1 ? 'has' : 'have'} no outcome yet, so Sat and DNQ may be understated.
        </div>
      )}

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
        <div className="relative ml-2">
          <button onClick={() => setNamesOpen(!namesOpen)} aria-expanded={namesOpen} className="rounded border bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50">
            Names: {NAME_MODES.find(([k]) => k === names.mode)?.[1]} ▾
          </button>
          {namesOpen && (
            <div className="absolute left-0 z-20 mt-1 w-[520px] max-w-[90vw] rounded border bg-white p-3 text-sm shadow-lg">
              <div className="mb-2 grid gap-1">
                {NAME_MODES.map(([k, label]) => (
                  <label key={k} className="inline-flex items-center gap-2">
                    <input type="radio" name="ro-names" checked={names.mode === k} onChange={() => saveNames({ ...names, mode: k })} /> {label}
                  </label>
                ))}
              </div>
              {names.mode === 'custom' && (
                <div className="grid grid-cols-2 gap-3 border-t pt-2">
                  {([['Call Centre', 'hiddenCc', allBookers], ['Consultants', 'hiddenSales', allConsultants]] as const).map(([title, field, all]) => (
                    <div key={field}>
                      <div className="mb-1 text-xs font-semibold text-gray-600">{title}</div>
                      <div className="max-h-[260px] overflow-y-auto">
                        {[...all].sort((a, b) => (a === NO_BOOKER ? 1 : b === NO_BOOKER ? -1 : a.localeCompare(b))).map((n) => (
                          <label key={n} className="flex items-center gap-2 text-xs">
                            <input type="checkbox" checked={!names[field].includes(n)} onChange={() => toggleHidden(field, n)} /> {n}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 text-right">
                <button onClick={() => setNamesOpen(false)} className="rounded border px-2 py-0.5 text-xs hover:bg-gray-50">Done</button>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => exportXlsx(r.label, cc, sales, modes)} className="ml-2 rounded border bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50">
          Export xlsx
        </button>
        {!demoData && data.viewer.recorder && (
          <button onClick={emailView} className="rounded border bg-white px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50">Email this view</button>
        )}
        {mailMsg && <span className={mailMsg.ok ? 'text-green-700' : 'text-red-700'}>{mailMsg.text}</span>}
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
        {names.mode === 'custom' && (
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={view.includeHidden} onChange={() => saveView({ ...view, includeHidden: !view.includeHidden })} /> Totals include hidden names
          </label>
        )}
        {p.kind !== 'all' && (
          <div className="inline-flex items-center gap-1">
            <span className="text-gray-600">Compare with:</span>
            <select value={view.base} onChange={(e) => saveView({ ...view, base: e.target.value as CompareBase })} className="rounded border px-1 py-1" aria-label="Compare with">
              <option value="prev" disabled={!canCompare(p.kind)}>Previous period</option>
              <option value="lastYear">Same period last year</option>
              <option value="year">Same period in year…</option>
            </select>
            {view.base === 'year' && (
              <select value={view.baseYear} onChange={(e) => saveView({ ...view, baseYear: Number(e.target.value) })} className="rounded border px-1 py-1" aria-label="Comparison year">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        )}
        {prevMaps && (
          <div className="inline-flex items-center gap-1">
            <span className="text-gray-600">▲▼ vs {prevMaps.label}:</span>
            <div className="inline-flex overflow-hidden rounded border border-gray-200" role="group" aria-label="Compare with previous period">
              {([['off', 'Off'], ['box', 'Box on the right'], ['cells', 'In each cell']] as const).map(([k, label]) => (
                <button key={k} onClick={() => saveView({ ...view, compare: k })}
                  className={`px-2 py-1 font-semibold ${view.compare === k ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mb-3 flex items-center justify-between gap-3 rounded border bg-white px-2 py-2">
        <button onClick={() => setP(shift(p, -1))} disabled={!prevOk} aria-label="Previous period"
          className="h-11 w-[22%] min-w-[80px] rounded border text-2xl font-semibold text-brand-charcoal hover:bg-gray-50 disabled:opacity-30">‹</button>
        <div className="text-center text-[18px] font-bold text-brand-charcoal">{r.label}</div>
        <button onClick={() => setP(shift(p, 1))} disabled={!canShift} aria-label="Next period"
          className="h-11 w-[22%] min-w-[80px] rounded border text-2xl font-semibold text-brand-charcoal hover:bg-gray-50 disabled:opacity-30">›</button>
      </div>

      {drill && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/30 p-6" onClick={() => setDrill(null)}>
          <div className="w-full max-w-4xl rounded bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <div className="font-semibold text-brand-charcoal">{drill.title} ({drill.meetings.length})</div>
              <button onClick={() => setDrill(null)} className="rounded border px-2 py-0.5 text-sm hover:bg-gray-50">Close</button>
            </div>
            <table className="w-full border-collapse text-sm">
              <thead><tr>{['Date', 'Client', 'Consultant', 'Booker', 'Booked as', 'GHL', 'Outcome'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {drill.meetings.map((m) => (
                  <tr key={m.id}>
                    <td className={TDN}>{weekday(m.ymd)} {dmy(m.ymd)}</td>
                    <td className={TDN}>{m.contactLink ? <a href={m.contactLink} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{m.contactName}</a> : m.contactName}</td>
                    <td className={TDN}>{m.consultant}</td>
                    <td className={TDN}>{m.booker || ''}</td>
                    <td className={TDN}>{m.mode}</td>
                    <td className={TDN}>{m.ghlStatus}</td>
                    <td className={TDN}>{m.outcome || 'No outcome'}{m.invalidReason ? ` - ${m.invalidReason}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {!demoData && data.viewer.recorder && (
        <div className="mb-3 rounded border bg-white px-3 py-2 text-sm">
          <span className="font-semibold text-brand-charcoal">Sheet check (PR): </span>
          {sheetErr ? <span className="text-red-700">{sheetErr}</span>
            : !check ? <span className="text-gray-500">Reading the STATS sheet…</span>
            : !check.weeks ? <span className="text-gray-500">No complete STATS-sheet week falls inside this period (the sheet has PR figures from May 2026).</span>
            : (
              <span>
                {check.weeks} sheet week{check.weeks === 1 ? '' : 's'}, {dmy(check.from)} – {dmy(check.to)}:{' '}
                {([['Booked', 'booked'], ['Sat', 'sat'], ['DNQ', 'dnq']] as const).map(([k, f]) => {
                  const d = check.t[f] - check.s[f];
                  return (
                    <span key={f} className="mr-3 whitespace-nowrap">
                      {k} sheet {check.s[f]} / tool {check.t[f]}{' '}
                      <span className={d === 0 ? 'text-green-700' : Math.abs(d) <= Math.max(2, check.s[f] * 0.05) ? 'text-amber-700' : 'text-red-700'}>({d > 0 ? '+' : ''}{d})</span>
                    </span>
                  );
                })}
              </span>
            )}
        </div>
      )}
      <div className="grid gap-4">
        <div className="min-w-0">
          <div className={view.compare === 'box' && prevMaps ? 'grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px]' : ''}>
            <div className="min-w-0 overflow-x-auto rounded border bg-white">
              <Title>CC Stats</Title>
              <CcTable data={cc} pick={(n, f) => pickFrom('cc', n, f)} prevOf={prevOf('cc')} />
            </div>
            {view.compare === 'box' && prevMaps && <CompareBox title="CC" rows={cc.rows} total={cc.total} prev={prevMaps.cc} prevLabel={prevMaps.label} />}
          </div>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            <BookingsTable data={modes} />
            <MarketingTable />
          </div>
        </div>
        <div className={view.compare === 'box' && prevMaps ? 'grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_300px]' : ''}>
          <div className="min-w-0 overflow-x-auto rounded border bg-white">
            <Title>Sales Stats</Title>
            <SalesTable data={sales} pick={(n, f) => pickFrom('sales', n, f)} prevOf={prevOf('sales')} />
          </div>
          {view.compare === 'box' && prevMaps && <CompareBox title="Sales" rows={sales.rows} total={sales.total} prev={prevMaps.sales} prevLabel={prevMaps.label} />}
        </div>
        <TargetsTable targets={data.settings.targets || {}} factor={targetFactor(p, today)} rows={[...cc.rows, ...sales.rows]} />
        <ChartCard title={`Trend - ${r.label}`}><TrendChart points={trend} /></ChartCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Consultants - Booked vs Sat"><BarChart rows={sales.rows} /></ChartCard>
          <ChartCard title="Call Centre - Booked vs Sat"><BarChart rows={cc.rows} /></ChartCard>
        </div>
      </div>
    </div>
  );
}
