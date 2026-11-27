'use client';

import { useState } from 'react';
import { addDays, NO_MEETING_SALE } from '@/lib/reviewOutcomes/types';
import { BOOKED_ONLINE, NO_BOOKER, SELF_BOOKED } from '@/lib/reviewOutcomes/stats';
import { NO_MEETING_SOURCE } from '@/lib/reviewOutcomes/meetingSource';

export const OUTCOME_STYLE: Record<string, { on: string; off: string }> = {
  Showed: { on: 'bg-green-600 text-white border-green-600', off: 'text-green-700 border-green-200 hover:bg-green-50' },
  'No show': { on: 'bg-red-600 text-white border-red-600', off: 'text-red-700 border-red-200 hover:bg-red-50' },
  'Invalid (DNQ)': { on: 'bg-amber-500 text-white border-amber-500', off: 'text-amber-700 border-amber-200 hover:bg-amber-50' },
  Cancelled: { on: 'bg-gray-600 text-white border-gray-600', off: 'text-gray-700 border-gray-200 hover:bg-gray-50' },
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

export function HelpDot({ text }: { text: string }) {
  // Own tooltip (JT 27/11): the browser title tooltip is slow or missing. Fixed so table scroll boxes don't clip it; title="" hides the cell's tooltip.
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const show = (e: React.MouseEvent<HTMLSpanElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setAt({ x: Math.max(4, Math.min(r.left, window.innerWidth - 300)), y: r.bottom + 4 });
  };
  return (
    <span title="" aria-label={text} data-testid="help-dot" onMouseEnter={show} onMouseLeave={() => setAt(null)}
      onClick={(e) => { e.stopPropagation(); if (at) setAt(null); else show(e); }}
      className="ml-0.5 inline-flex h-3.5 w-3.5 shrink-0 cursor-help items-center justify-center rounded-full border border-gray-300 text-[9px] font-bold leading-none text-gray-500">
      ?
      {at && (
        <span role="tooltip" style={{ position: 'fixed', left: at.x, top: at.y }}
          className="z-50 w-72 whitespace-normal rounded border border-gray-300 bg-white px-2 py-1.5 text-left text-[12px] font-normal normal-case leading-snug text-gray-800 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

/** Definitions of the non-person names in the Stats and Sales tables (JT 27/11): each shows with a "?". */
export const LABEL_HELP: Record<string, string> = {
  [SELF_BOOKED]: 'The consultant created this appointment in GHL themselves. CC credit only if they have their own CC PAYS block.',
  [BOOKED_ONLINE]: 'The client booked through a GHL booking link. No CC credit.',
  [NO_BOOKER]: "No staff member created the appointment in GHL, no CC was on the Google invite, no booker was in the old schedule sheet, and it wasn't booked online. No CC credit.",
  [NO_MEETING_SALE]: 'A sale where the client had no Presentation 1, PR or Cashflow Club meeting on or before signing, so there is no meeting or CC to credit.',
  '(unassigned)': "The GHL appointment has no assigned user, or the user isn't in GHL's user list. For a No meeting Sale: the opportunity has no owner.",
  Unassigned: 'The GHL opportunity has no owner.',
  Unknown: 'The appointment location is neither a Google Meet link nor an address.',
  'Not recorded in GHL': 'The GHL contact has no attribution and no Lead Source.',
  [NO_MEETING_SOURCE]: 'A sale where the client had no meeting on or before signing, so there is no meeting source.',
  '(blank)': 'No value in GHL.',
};

export function Label({ name }: { name: string }) {
  const help = LABEL_HELP[name];
  return help ? <span className="inline-flex items-center">{name}<HelpDot text={help} /></span> : <>{name}</>;
}
