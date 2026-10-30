import { googleErrorMessage, sheetsFor } from '@/lib/inboxMining/google';
import { MIN_YMD } from './types';

// Read-only: the team's STATS sheet, one entry per weekly block (TOTAL row of the CC Stats block, PR columns only),
// used to check the Stats tab against what the team records by hand.

export const STATS_SHEET_ID = '1uwxM0QTqmSWlTGET46GRai5LFKzb5NLQgacYb6so-Vc';
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const CC_PR_SAT = 12; // column M
const CC_PR_DNQ = 13; // column N

export interface SheetBlock { tab: string; label: string; from: string; to: string; booked: number; sat: number; dnq: number }
export interface SheetStats { blocks: SheetBlock[]; skipped: string[]; readAt: string }

const pad = (n: number) => String(n).padStart(2, '0');
const monthOf = (s: string) => {
  const i = MON.indexOf(s.slice(0, 3).toLowerCase());
  return i >= 0 ? i + 1 : 0;
};
const num = (v: unknown) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;

function tabMonth(title: string): { y: number; m: number } | null {
  const t = title.trim().match(/^([A-Za-z]{3,9})\s+(\d{2}|\d{4})$/);
  if (!t || !monthOf(t[1])) return null;
  const y = t[2].length === 2 ? 2000 + Number(t[2]) : Number(t[2]);
  return { y, m: monthOf(t[1]) };
}

/** "5th - 11th June", "26th Jun - 2nd Jul", "31st July 2026 - 6th August 2026", "1st October 2026". */
export function parseBlockLabel(label: string, tab: { y: number; m: number }): { from: string; to: string } | null {
  if (!label || /total/i.test(label)) return null;
  const sides = label.split(/\s*[-–]\s*|\s+to\s+/i).filter(Boolean);
  const parsed = sides.map((s) => ({
    d: Number(s.match(/(\d{1,2})(?:st|nd|rd|th)?\b/i)?.[1] || 0),
    m: monthOf(s.match(/[A-Za-z]{3,}/)?.[0] || ''),
    y: Number(s.match(/\b(20\d{2})\b/)?.[1] || 0),
  }));
  if (!parsed.length || parsed.some((p) => !p.d) || parsed.length > 2) return null;
  const end = parsed[parsed.length - 1];
  const start = parsed[0];
  const em = end.m || tab.m;
  const ey = end.y || (em === 1 && tab.m === 12 ? tab.y + 1 : tab.y);
  const sm = start.m || (parsed.length > 1 && start.d > end.d ? (em === 1 ? 12 : em - 1) : em);
  const sy = start.y || (sm > em ? ey - 1 : ey);
  const from = `${sy}-${pad(sm)}-${pad(start.d)}`;
  const to = `${ey}-${pad(em)}-${pad(end.d)}`;
  // A label copied from another month (e.g. a March week left in the MAY tab) is not trusted.
  const tabFrom = `${tab.y}-${pad(tab.m)}-01`;
  const tabTo = `${tab.m === 12 ? tab.y + 1 : tab.y}-${pad((tab.m % 12) + 1)}-01`;
  const day = 864e5;
  const ok = Date.parse(from) >= Date.parse(tabFrom) - 7 * day && Date.parse(to) <= Date.parse(tabTo) + 7 * day;
  return from <= to && ok ? { from, to } : null;
}

let cache: { at: number; data: SheetStats } | null = null;

export async function readStatsSheet(): Promise<SheetStats> {
  if (cache && Date.now() - cache.at < 10 * 60e3) return cache.data;
  const subject = process.env.INBOX_TRACKER_SUBJECT;
  if (!subject) throw new Error('INBOX_TRACKER_SUBJECT is not set, so the STATS sheet cannot be read.');
  const sheets = sheetsFor(subject);
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: STATS_SHEET_ID, fields: 'sheets.properties.title' });
    const tabs = (meta.data.sheets || [])
      .map((s) => String(s.properties?.title || ''))
      .map((title) => ({ title, tm: tabMonth(title) }))
      .filter((t): t is { title: string; tm: { y: number; m: number } } => !!t.tm && `${t.tm.y}-${pad(t.tm.m)}-31` >= MIN_YMD);
    const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: STATS_SHEET_ID, ranges: tabs.map((t) => `'${t.title}'!A1:BU400`) });
    const blocks: SheetBlock[] = [];
    const skipped: string[] = [];
    (res.data.valueRanges || []).forEach((vr, i) => {
      const { title, tm } = tabs[i];
      const rows = (vr.values || []) as unknown[][];
      let label = '';
      let hdr: string[] | null = null;
      rows.forEach((row, ri) => {
        const a = String(row[0] ?? '').trim();
        if (/stats/i.test(a) && ri > 0) label = String(rows[ri - 1]?.[0] ?? '').trim();
        if (/^name$/i.test(a)) hdr = row.map((c) => String(c ?? '').trim().toLowerCase());
        if (/^total$/i.test(a) && hdr) {
          const range = parseBlockLabel(label, tm);
          if (hdr[3] !== 'pr') {
            if (!skipped.includes(title)) skipped.push(title);
          } else if (range) {
            blocks.push({ tab: title, label, ...range, booked: num(row[3]), sat: num(row[CC_PR_SAT]), dnq: num(row[CC_PR_DNQ]) });
          }
          hdr = null;
        }
      });
    });
    const data: SheetStats = { blocks: blocks.sort((a, b) => a.from.localeCompare(b.from)), skipped, readAt: new Date().toISOString() };
    cache = { at: Date.now(), data };
    return data;
  } catch (e) {
    throw new Error(googleErrorMessage(e, 'STATS sheet'));
  }
}
