import { addDays, MIN_YMD, type ReviewMeeting, type StatsKind } from './types';

// Item 15 stats maths, shared by the Stats tab and the weekly stats email. PR meetings only for now.

export type Kind = StatsKind;
export interface Period { kind: Kind; anchor: string }

export const KINDS: [Kind, string][] = [['day', 'Day'], ['week', 'Week (Fri–Thu)'], ['month', 'Month'], ['quarter', 'Quarter'], ['ytd', 'YTD'], ['year', 'Year'], ['all', 'All']];
export const NO_BOOKER = 'No booker on invite';
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const pad = (n: number) => String(n).padStart(2, '0');
const dmy = (ymd: string) => (ymd ? ymd.split('-').reverse().join('/') : '');
const weekday = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' });

export function addMonths(ymd: string, n: number): string {
  const [y, m] = ymd.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}-01`;
}
const monthEnd = (ymd: string) => addDays(addMonths(ymd, 1), -1);
/** Weeks run Friday to Thursday, as in the STATS sheet. */
export const weekStart = (ymd: string) => addDays(ymd, -((new Date(`${ymd}T00:00:00Z`).getUTCDay() + 2) % 7));
/** The sheet counts DNQ as a kind of Sat, so Sat = Showed + Invalid (DNQ). */
export const isDnq = (m: ReviewMeeting) => !!m.outcome && /^invalid/i.test(m.outcome);
export const isSat = (m: ReviewMeeting) => m.outcome === 'Showed' || isDnq(m);

export function periodRange(p: Period, today: string): { from: string; to: string; label: string } {
  const y = Number(p.anchor.slice(0, 4));
  const m = Number(p.anchor.slice(5, 7));
  switch (p.kind) {
    case 'day':
      return { from: p.anchor, to: p.anchor, label: `${weekday(p.anchor)} ${dmy(p.anchor)}` };
    case 'week': {
      const from = weekStart(p.anchor);
      return { from, to: addDays(from, 6), label: `Week (Fri–Thu) ${dmy(from)} – ${dmy(addDays(from, 6))}` };
    }
    case 'month': {
      const from = `${p.anchor.slice(0, 7)}-01`;
      return { from, to: monthEnd(from), label: `${MONTHS[m - 1]} ${y}` };
    }
    case 'quarter': {
      const q = Math.floor((m - 1) / 3);
      const from = `${y}-${pad(q * 3 + 1)}-01`;
      return { from, to: monthEnd(addMonths(from, 2)), label: `Q${q + 1} ${y} (${MONTHS[q * 3].slice(0, 3)} – ${MONTHS[q * 3 + 2].slice(0, 3)})` };
    }
    case 'ytd': {
      const ty = today.slice(0, 4);
      return { from: `${ty}-01-01`, to: today, label: `YTD ${ty} (01/01 – ${dmy(today)})` };
    }
    case 'year':
      return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
    default:
      return { from: MIN_YMD, to: '9999-12-31', label: `All (since ${dmy(MIN_YMD)})` };
  }
}

export function shift(p: Period, dir: 1 | -1): Period {
  const step: Partial<Record<Kind, (a: string) => string>> = {
    day: (a) => addDays(a, dir),
    week: (a) => addDays(a, 7 * dir),
    month: (a) => addMonths(a, dir),
    quarter: (a) => addMonths(a, 3 * dir),
    year: (a) => `${Number(a.slice(0, 4)) + dir}-01-01`,
  };
  const f = step[p.kind];
  return f ? { ...p, anchor: f(p.anchor) } : p;
}

export const canCompare = (k: Kind) => k !== 'ytd' && k !== 'all';

export type CompareBase = 'prev' | 'lastYear' | 'year';

/** Range to compare against: the previous period, or the same period in last year / a chosen year. */
export function compareRange(p: Period, today: string, base: CompareBase, year: number): { from: string; to: string; label: string } | null {
  if (base === 'prev') return canCompare(p.kind) ? periodRange(shift(p, -1), today) : null;
  if (p.kind === 'all') return null;
  const y = base === 'lastYear' ? Number(p.anchor.slice(0, 4)) - 1 : year;
  const md = (ymd: string) => (ymd.slice(5) === '02-29' ? '02-28' : ymd.slice(5));
  if (p.kind === 'ytd') {
    const to = `${y}-${md(today)}`;
    return { from: `${y}-01-01`, to, label: `YTD ${y} (01/01 – ${dmy(to)})` };
  }
  return periodRange({ kind: p.kind, anchor: `${y}-${md(p.anchor)}` }, today);
}

export interface Row { name: string; booked: number; sat: number; dnq: number; noShow: number }
export interface Tally { rows: Row[]; total: Row }
export const emptyRow = (name: string): Row => ({ name, booked: 0, sat: 0, dnq: 0, noShow: 0 });

export function tally(list: ReviewMeeting[], key: (m: ReviewMeeting) => string, allNames: string[] = []): Tally {
  const by = new Map<string, Row>(allNames.map((n) => [n, emptyRow(n)]));
  const total = emptyRow('TOTAL');
  for (const m of list) {
    const k = key(m);
    const r = by.get(k) || emptyRow(k);
    for (const x of [r, total]) {
      x.booked++;
      if (isSat(m)) x.sat++;
      if (isDnq(m)) x.dnq++;
      if (m.outcome === 'No show') x.noShow++;
    }
    by.set(k, r);
  }
  const rows = [...by.values()].sort((a, b) => (a.name === NO_BOOKER ? 1 : b.name === NO_BOOKER ? -1 : a.name.localeCompare(b.name)));
  return { rows, total };
}

/** TOTAL from the listed rows only (used when hidden names are left out of the totals). */
export function sumRows(rows: Row[]): Row {
  const t = emptyRow('TOTAL');
  for (const r of rows) { t.booked += r.booked; t.sat += r.sat; t.dnq += r.dnq; t.noShow += r.noShow; }
  return t;
}

export const isPR = (m: ReviewMeeting) => m.kind === 'PR';

/** New Lead / Referral / Unknown (lead type not known) counts for the NL meetings of one name. */
export interface TypeRow { name: string; nl: Row; ref: Row; unk: Row }
export type TypeKey = 'nl' | 'ref' | 'unk';
export const emptyTypeRow = (name: string): TypeRow => ({ name, nl: emptyRow('nl'), ref: emptyRow('ref'), unk: emptyRow('unk') });
export const typeKeyOf = (m: ReviewMeeting): TypeKey => (m.leadType === 'New Lead' ? 'nl' : m.leadType === 'Referral' ? 'ref' : 'unk');

function bump(x: Row, m: ReviewMeeting) {
  x.booked++;
  if (isSat(m)) x.sat++;
  if (isDnq(m)) x.dnq++;
  if (m.outcome === 'No show') x.noShow++;
}

export function typeTally(list: ReviewMeeting[], key: (m: ReviewMeeting) => string): { by: Map<string, TypeRow>; total: TypeRow } {
  const by = new Map<string, TypeRow>();
  const total = emptyTypeRow('TOTAL');
  for (const m of list) {
    if (isPR(m)) continue;
    const k = key(m);
    const r = by.get(k) || emptyTypeRow(k);
    bump(r[typeKeyOf(m)], m);
    bump(total[typeKeyOf(m)], m);
    by.set(k, r);
  }
  return { by, total };
}

export function sumTypes(rows: TypeRow[]): TypeRow {
  const t = emptyTypeRow('TOTAL');
  for (const r of rows) {
    for (const k of ['nl', 'ref', 'unk'] as const) {
      t[k].booked += r[k].booked; t[k].sat += r[k].sat; t[k].dnq += r[k].dnq; t[k].noShow += r[k].noShow;
    }
  }
  return t;
}

export const bookerKey = (m: ReviewMeeting) => m.booker || NO_BOOKER;
export const consultantKey = (m: ReviewMeeting) => m.consultant;
export const inRange = (list: ReviewMeeting[], from: string, to: string) => list.filter((m) => m.ymd >= from && m.ymd <= to);
export const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(2)}%` : '0.00%');
