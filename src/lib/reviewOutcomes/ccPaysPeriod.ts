// CC PAYS reporting periods (JT 26/11): Mon-Sun week (default and the automatic Monday 9am run), Fri-Thu week,
// calendar month, or a custom from-to. Dates are Sydney dates (YYYY-MM-DD).
import { addDays } from './types';

export type CcPeriodKind = 'mon-sun' | 'fri-thu' | 'month' | 'custom';
export interface CcPeriod { kind: CcPeriodKind; from: string; to: string }

export const CC_PERIODS: [CcPeriodKind, string][] = [
  ['mon-sun', 'Mon–Sun week'],
  ['fri-thu', 'Fri–Thu week'],
  ['month', 'Calendar month'],
  ['custom', 'Custom from–to'],
];
export const CC_DEFAULT_KIND: CcPeriodKind = 'mon-sun';
export const CC_MAX_DAYS = 62;
export const isCcKind = (k: unknown): k is CcPeriodKind => CC_PERIODS.some(([x]) => x === k);

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
const dow = (ymd: string) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
export const monStart = (ymd: string) => addDays(ymd, -((dow(ymd) + 6) % 7));
export const friStart = (ymd: string) => addDays(ymd, -((dow(ymd) + 2) % 7));
const monthEnd = (ymd: string) => {
  const [y, m] = ymd.split('-').map(Number);
  return addDays(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`, -1);
};
export const periodDays = (p: CcPeriod) => Math.round((Date.parse(p.to) - Date.parse(p.from)) / 864e5) + 1;

/** The period of `kind` containing `from` (custom: from..to as given). Throws on a bad custom range. */
export function ccPeriod(kind: CcPeriodKind, from: string, to?: string): CcPeriod {
  if (kind === 'mon-sun') { const f = monStart(from); return { kind, from: f, to: addDays(f, 6) }; }
  if (kind === 'fri-thu') { const f = friStart(from); return { kind, from: f, to: addDays(f, 6) }; }
  if (kind === 'month') { const f = `${from.slice(0, 8)}01`; return { kind, from: f, to: monthEnd(f) }; }
  const p = { kind, from, to: to || from };
  if (p.from > p.to) throw new Error('From is after To.');
  if (periodDays(p) > CC_MAX_DAYS) throw new Error(`A custom period can be at most ${CC_MAX_DAYS} days.`);
  return p;
}

/** The Mon-Sun week the Monday 9am run writes: the one that ended the Sunday before `today`. */
export const lastMonSun = (today: string) => ccPeriod('mon-sun', addDays(monStart(today), -7));

const ord = (d: number) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`;
/** Manual tab style: "6th - 12th NOV26", "30th OCT - 5th NOV26", a whole month "NOV26". */
export function ccLabel(p: { from: string; to: string }): string {
  const [y1, m1, d1] = p.from.split('-').map(Number);
  const [y2, m2, d2] = p.to.split('-').map(Number);
  const yy = (y: number) => String(y).slice(2);
  if (d1 === 1 && p.to === monthEnd(p.from)) return `${MON[m1 - 1]}${yy(y1)}`;
  if (p.from === p.to) return `${ord(d1)} ${MON[m1 - 1]}${yy(y1)}`;
  const first = y1 !== y2 ? ` ${MON[m1 - 1]}${yy(y1)}` : m1 !== m2 ? ` ${MON[m1 - 1]}` : '';
  return `${ord(d1)}${first} - ${ord(d2)} ${MON[m2 - 1]}${yy(y2)}`;
}
