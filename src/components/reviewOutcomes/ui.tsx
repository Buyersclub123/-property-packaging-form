import { addDays } from '@/lib/reviewOutcomes/types';

export const OUTCOME_STYLE: Record<string, { on: string; off: string }> = {
  Showed: { on: 'bg-green-600 text-white border-green-600', off: 'text-green-700 border-green-200 hover:bg-green-50' },
  'No show': { on: 'bg-red-600 text-white border-red-600', off: 'text-red-700 border-red-200 hover:bg-red-50' },
  'Invalid (DNQ)': { on: 'bg-amber-500 text-white border-amber-500', off: 'text-amber-700 border-amber-200 hover:bg-amber-50' },
  Cancelled: { on: 'bg-gray-600 text-white border-gray-600', off: 'text-gray-700 border-gray-200 hover:bg-gray-50' },
  Rescheduled: { on: 'bg-blue-600 text-white border-blue-600', off: 'text-blue-700 border-blue-200 hover:bg-blue-50' },
  'Not sat': { on: 'bg-purple-600 text-white border-purple-600', off: 'text-purple-700 border-purple-200 hover:bg-purple-50' },
};
const FALLBACK = { on: 'bg-slate-700 text-white border-slate-700', off: 'text-slate-700 border-slate-200 hover:bg-slate-50' };
export const outcomeStyle = (o: string) => OUTCOME_STYLE[o] || FALLBACK;

export const dmy = (ymd: string) => (ymd ? ymd.split('-').reverse().join('/') : '');
export const weekday = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'UTC' });
export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', minute: '2-digit' });
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
export const money = (n: number | null) =>
  n === null ? '' : n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });

export type Period = 'day' | 'week' | 'month';

export function periodKey(ymd: string, p: Period): string {
  if (p === 'day') return ymd;
  if (p === 'month') return ymd.slice(0, 7);
  const dow = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(ymd, -dow);
}

export function periodLabel(key: string, p: Period): string {
  if (p === 'day') return `${dmy(key)} ${weekday(key).slice(0, 3)}`;
  if (p === 'week') return `w/c ${dmy(key)}`;
  return new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded border bg-white px-3 py-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`font-semibold ${tone || ''}`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}
