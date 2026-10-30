import { getDb } from '@/lib/db';
import { googleErrorMessage, sheetsFor } from '@/lib/inboxMining/google';
import { ensureReviewTables } from './store';
import { phoneKey } from './sync';
import { addDays, MIN_YMD } from './types';

// Read-only copy of the team's CALENDAR SCHEDULE sheet (one tab per week, every meeting type). Used for New Lead /
// Referral meetings: LEAD (col D, from March 2026), Sat? (Sat / Sat DNQ / Not Sat), Outcome, Agent (booker), Location.

export const SCHEDULE_SHEET_ID = '1iC1mDNuvhMbNLpf_w9E1tR66koE19KwXWBGf54FKb8w';
/** Weekly tabs are roughly in date order; the last 170 reach back past 07/2024. */
const TABS_BACK = 170;
const STALE_MS = 60 * 60e3;
const DAY = 864e5;

export interface ScheduleRow {
  id: string; tab: string; ymd: string; consultant: string; agent: string; client: string; lead: string;
  phone: string; sat: string; outcome: string; location: string;
}

const str = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const pad = (n: number) => String(n).padStart(2, '0');

export async function readSchedule(): Promise<ScheduleRow[]> {
  const subject = process.env.INBOX_TRACKER_SUBJECT;
  if (!subject) throw new Error('INBOX_TRACKER_SUBJECT is not set, so the calendar schedule sheet cannot be read.');
  const sheets = sheetsFor(subject);
  const out: ScheduleRow[] = [];
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SCHEDULE_SHEET_ID, fields: 'sheets.properties(title)' });
    const titles = (meta.data.sheets || []).map((s) => String(s.properties?.title || '')).filter((t) => t && !/triage/i.test(t)).slice(-TABS_BACK);
    for (let i = 0; i < titles.length; i += 25) {
      if (i) await new Promise((r) => setTimeout(r, 1200));
      const chunk = titles.slice(i, i + 25);
      const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SCHEDULE_SHEET_ID, ranges: chunk.map((t) => `'${t}'!A1:P700`) });
      (res.data.valueRanges || []).forEach((vr, ti) => {
        const tab = chunk[ti];
        const v = (vr.values || []) as unknown[][];
        const hi = v.findIndex((r) => r.some((c) => /^client$/i.test(str(c))));
        if (hi < 0) return;
        const h = v[hi].map((c) => str(c).toUpperCase());
        const col = (n: string) => h.indexOf(n);
        const [cC, cA, cCl, cL, cN, cD, cLo, cS, cO] = ['CONSULTANT', 'AGENT', 'CLIENT', 'LEAD', 'NUMBER', 'DATE', 'LOCATION', 'SAT?', 'OUTCOME'].map(col);
        if (cCl < 0 || cD < 0) return;
        const parsed = v.slice(hi + 1).map((r, j) => {
          const m = str(r[cD]).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
          return m && str(r[cCl]) ? { r, j, d: Number(m[1]), mo: Number(m[2]), y: Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]) } : null;
        }).filter((x): x is NonNullable<typeof x> => !!x && x.mo >= 1 && x.mo <= 12 && x.d >= 1 && x.d <= 31);
        if (!parsed.length) return;
        // Year typos (0222, 2029): fix each date against the tab's median date.
        const ts = parsed.map((p) => Date.UTC(p.y, p.mo - 1, p.d)).sort((a, b) => a - b);
        const median = ts[Math.floor(ts.length / 2)];
        const my = new Date(median).getUTCFullYear();
        for (const p of parsed) {
          let t = Date.UTC(p.y, p.mo - 1, p.d);
          if (Math.abs(t - median) > 60 * DAY) {
            const best = [my - 1, my, my + 1].map((y) => Date.UTC(y, p.mo - 1, p.d)).sort((a, b) => Math.abs(a - median) - Math.abs(b - median))[0];
            if (Math.abs(best - median) > 60 * DAY) continue;
            t = best;
          }
          const dt = new Date(t);
          const ymd = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
          if (ymd < addDays(MIN_YMD, -7)) continue;
          const get = (c: number) => (c >= 0 ? str(p.r[c]) : '');
          out.push({
            id: `${tab}#${hi + p.j + 2}`, tab, ymd, consultant: get(cC), agent: get(cA), client: get(cCl), lead: get(cL),
            phone: phoneKey(get(cN)), sat: get(cS), outcome: get(cO), location: get(cLo),
          });
        }
      });
    }
  } catch (e) {
    throw new Error(googleErrorMessage(e, 'the calendar schedule sheet'));
  }
  return out;
}

async function status(): Promise<{ at: string } | null> {
  const rows = await getDb()`SELECT value FROM review_settings WHERE key = 'schedule_sync'`;
  return (rows[0]?.value as { at: string } | undefined) ?? null;
}

export async function syncSchedule(): Promise<number> {
  await ensureReviewTables();
  const sql = getDb();
  const rows = await readSchedule();
  const at = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 800) {
    await sql`INSERT INTO review_schedule_rows (id, tab, ymd, consultant, agent, client, lead, phone, sat, outcome, location, synced_at)
      SELECT r.id, r.tab, r.ymd, r.consultant, r.agent, r.client, r.lead, r.phone, r.sat, r.outcome, r.location, ${at}::timestamptz
      FROM jsonb_to_recordset(${JSON.stringify(rows.slice(i, i + 800))}::jsonb) AS r(id text, tab text, ymd text, consultant text, agent text,
        client text, lead text, phone text, sat text, outcome text, location text)
      ON CONFLICT (id) DO UPDATE SET tab = EXCLUDED.tab, ymd = EXCLUDED.ymd, consultant = EXCLUDED.consultant, agent = EXCLUDED.agent,
        client = EXCLUDED.client, lead = EXCLUDED.lead, phone = EXCLUDED.phone, sat = EXCLUDED.sat, outcome = EXCLUDED.outcome,
        location = EXCLUDED.location, synced_at = EXCLUDED.synced_at`;
  }
  await sql`DELETE FROM review_schedule_rows WHERE synced_at < ${at}::timestamptz`;
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('schedule_sync', ${JSON.stringify({ at, rows: rows.length })}::jsonb, 'schedule sync')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  return rows.length;
}

let inFlight: Promise<number> | null = null;

/** Re-reads the sheet when the copy is over an hour old (or forced). Returns a warning instead of throwing. */
export async function ensureSchedule(force = false): Promise<string | null> {
  const s = await status();
  if (!force && s && Date.now() - Date.parse(s.at) < STALE_MS) return null;
  try {
    inFlight = inFlight || syncSchedule().finally(() => { inFlight = null; });
    await inFlight;
    return null;
  } catch (e) {
    return `Calendar schedule sheet not refreshed${s ? ' (showing the last copy)' : ''}: ${(e as Error).message}`;
  }
}

export async function loadScheduleRows(from: string, to: string): Promise<ScheduleRow[]> {
  const rows = await getDb()`SELECT id, tab, ymd, consultant, agent, client, lead, phone, sat, outcome, location
    FROM review_schedule_rows WHERE ymd >= ${from} AND ymd <= ${to}`;
  return rows.map((r) => ({
    id: String(r.id), tab: String(r.tab || ''), ymd: String(r.ymd), consultant: String(r.consultant || ''), agent: String(r.agent || ''),
    client: String(r.client || ''), lead: String(r.lead || ''), phone: String(r.phone || ''), sat: String(r.sat || ''),
    outcome: String(r.outcome || ''), location: String(r.location || ''),
  }));
}

const isPrRow = (r: ScheduleRow) => /^pr$/i.test(r.lead) || /\bPR\b/.test(r.location) || /-\s*PR\s*$/i.test(r.client);
const tokens = (s: string) =>
  s.toLowerCase().replace(/\b(mr|mrs|ms|miss|dr|and|smsf|pers|ip\d*)\b/g, ' ').replace(/[^a-z ]/g, ' ').split(' ').filter((t) => t.length > 2);

/** Pairs NL appointments with sheet rows: phone within +-3 days, or a shared name word on the same day. One row per meeting. */
export function matchSchedule(meetings: { id: string; ymd: string; name: string; phones: string[] }[], rows: ScheduleRow[]): Map<string, ScheduleRow> {
  const byDay = new Map<string, ScheduleRow[]>();
  for (const r of rows) if (!isPrRow(r)) byDay.set(r.ymd, [...(byDay.get(r.ymd) || []), r]);
  const pairs: { id: string; row: ScheduleRow; score: number }[] = [];
  for (const m of meetings) {
    const mt = tokens(m.name);
    for (let d = -3; d <= 3; d++) {
      for (const row of byDay.get(addDays(m.ymd, d)) || []) {
        const phone = !!row.phone && m.phones.includes(row.phone);
        const shared = tokens(row.client).filter((t) => mt.includes(t)).length;
        if (!phone && !(shared && d === 0)) continue;
        pairs.push({ id: m.id, row, score: (phone ? 100 : 0) + shared * 20 - Math.abs(d) * 5 });
      }
    }
  }
  pairs.sort((a, b) => b.score - a.score);
  const out = new Map<string, ScheduleRow>();
  const used = new Set<string>();
  for (const p of pairs) {
    if (out.has(p.id) || used.has(p.row.id)) continue;
    out.set(p.id, p.row);
    used.add(p.row.id);
  }
  return out;
}

/** Sheet Sat? / Outcome -> the tool's outcome. "Not Sat" with no outcome only counts once the meeting is past. */
export function scheduleOutcome(r: ScheduleRow, past: boolean): string | null {
  const s = r.sat.toLowerCase();
  if (s === 'sat dnq') return 'Invalid (DNQ)';
  if (s === 'sat') return 'Showed';
  const o = r.outcome.toLowerCase();
  if (/cancel/.test(o)) return 'Cancelled';
  if (/no ?show/.test(o)) return 'No show';
  if (/resched/.test(o)) return 'Rescheduled';
  if (/invalid|dnq/.test(o)) return 'Invalid (DNQ)';
  if (/showed/.test(o)) return 'Showed';
  return s === 'not sat' && past ? 'Not sat' : null;
}

export const scheduleMode = (location: string): 'Google' | 'F2F' | 'Unknown' => (/google/i.test(location) ? 'Google' : location.trim() ? 'F2F' : 'Unknown');
