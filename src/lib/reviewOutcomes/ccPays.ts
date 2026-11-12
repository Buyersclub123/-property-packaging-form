// CC PAYS AUTOMATED (JT 11/11). One NEW tab per Fri-Thu week in the CC PAYS workbook, same layout as the manual tabs:
// a block per booker (header "<NAME> - <STATE>" | COMMS DUE | CRM NOTES | TLC | CONSULTANT | DAY OFF), a row per Showed
// meeting. The workbook is a copy (JT 12/11): tabs are named "<week> AUTOMATED", written Fridays 9am Sydney (cron) or from
// Stats; existing tabs are never modified. Every write is logged in review_outcome_log (action cc_pays).
import { google } from 'googleapis';
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { loadMeetings } from './load';
import { loadOpenOpps } from './openOpps';
import { ensureReviewTables, loadSettings, logReview } from './store';
import { addDays, type ReviewMeeting, type ReviewViewer } from './types';

export const CC_PAYS_SHEET_ID = '1LWRtH2ps3aZbpUb1lzV-4c1WV_otp1UciwLHu4mWbZs';
export const AUTOMATED = 'AUTOMATED';
export const automatedTab = (ws: string) => `${weekLabel(ws)} ${AUTOMATED}`;
const HEAD = ['COMMS DUE', 'CRM NOTES', 'TLC', 'CONSULTANT', 'DAY OFF'];
const WIDTHS = [368, 141, 100, 100, 100, 223];
const BLANK_ROWS = 3;
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];

export type CcRow = { client: string; comms: string; crm: string; tlc: string; consultant: string; appointmentId: string; ymd: string };
export type CcBlock = { header: string; booker: string | null; old: boolean; rows: CcRow[] };
export type CcPays = { week: string; label: string; blocks: CcBlock[]; skipped: { client: string; ymd: string; reason: string }[]; templateTab: string };

const ord = (d: number) => `${d}${d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th'}`;
/** Manual tab style: "6th - 12th NOV26" / "30th OCT - 5th NOV26". */
export function weekLabel(ws: string): string {
  const we = addDays(ws, 6);
  const [, m1, d1] = ws.split('-').map(Number);
  const [y2, m2, d2] = we.split('-').map(Number);
  return `${ord(d1)}${m1 !== m2 ? ` ${MON[m1 - 1]}` : ''} - ${ord(d2)} ${MON[m2 - 1]}${String(y2).slice(2)}`;
}

function sheets() {
  const raw = process.env.GMAIL_READER_CREDENTIALS;
  if (!raw) throw new Error('GMAIL_READER_CREDENTIALS is not set (mailbox-reader service account key).');
  const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
  if (!key.client_email || !key.private_key) throw new Error('GMAIL_READER_CREDENTIALS is missing client_email or private_key.');
  const auth = new google.auth.JWT({ email: key.client_email, key: key.private_key.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  return google.sheets({ version: 'v4', auth });
}

/** Block headers (in order) from the latest manual tab; "OLD STAFF" marks the rest as old. */
async function templateBlocks(): Promise<{ tab: string; headers: { header: string; old: boolean }[]; titles: string[] }> {
  const sh = sheets();
  const meta = await sh.spreadsheets.get({ spreadsheetId: CC_PAYS_SHEET_ID, fields: 'sheets.properties(title,index)' });
  const titles = (meta.data.sheets || []).map((s) => String(s.properties?.title || ''));
  const tab = [...titles].reverse().find((t) => !/(\((tool|test)\)|AUTOMATED)\s*$/i.test(t) && /\d/.test(t)) || '';
  if (!tab) return { tab: '', headers: [], titles };
  const v = await sh.spreadsheets.values.get({ spreadsheetId: CC_PAYS_SHEET_ID, range: `'${tab.replace(/'/g, "''")}'!A1:B300` });
  const headers: { header: string; old: boolean }[] = [];
  let old = false;
  for (const r of v.data.values || []) {
    const a = String(r[0] || '').trim();
    if (/^OLD STAFF$/i.test(a)) old = true;
    else if (/^COMMS DUE/i.test(String(r[1] || '').trim()) && a) headers.push({ header: a, old });
  }
  return { tab, headers, titles };
}

// "ETHAN.L- NSW" -> first ETHAN, initial L.
const headerKey = (h: string) => {
  const [name] = h.split('-');
  const [first, init] = name.trim().toUpperCase().split('.');
  return { first: first.trim(), init: (init || '').trim().charAt(0) };
};
const matches = (h: string, booker: string) => {
  const k = headerKey(h);
  const parts = booker.toUpperCase().split(/\s+/).filter(Boolean);
  return parts[0] === k.first && (!k.init || (parts[parts.length - 1] || '').startsWith(k.init));
};

async function hasNoteNear(contactId: string, ymd: string): Promise<boolean> {
  const base = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
  const res = await ghlFetch(`${base}/contacts/${contactId}/notes`, {
    headers: { Authorization: `Bearer ${process.env.GHL_BEARER_TOKEN || ''}`, Version: '2021-07-28', Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  }, 'review-cc-pays');
  if (!res.ok) return false;
  const notes = ((await res.json()) as { notes?: { dateAdded?: string }[] }).notes || [];
  const t = Date.parse(`${ymd}T12:00:00+10:00`);
  return notes.some((n) => n.dateAdded && Math.abs(Date.parse(n.dateAdded) - t) <= 3.5 * 864e5);
}

const SYSTEM_VIEWER: ReviewViewer = { email: 'cc-pays', recorder: true, consultantIds: [] };

/** Builds the week's tab (no write). ws = Friday (YYYY-MM-DD). */
export async function buildCcPays(ws: string): Promise<CcPays> {
  const settings = await loadSettings();
  const [loaded, opps, tpl] = await Promise.all([
    loadMeetings(SYSTEM_VIEWER, ws, addDays(ws, 6), settings.callCentre, settings.salesAliases, settings.ghlOnlyFrom),
    loadOpenOpps(),
    templateBlocks(),
  ]);
  const showed = loaded.meetings.filter((m) => m.ymd >= ws && m.ymd <= addDays(ws, 6) && m.outcome === 'Showed')
    .sort((a, b) => a.start.localeCompare(b.start));
  const blocks: CcBlock[] = tpl.headers.map((h) => ({ header: h.header, booker: null, old: h.old, rows: [] }));
  const skipped: CcPays['skipped'] = [];
  const crm = new Map<string, boolean>();
  let i = 0;
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (i < showed.length) {
      const m = showed[i++];
      crm.set(m.id, m.contactId ? await hasNoteNear(m.contactId, m.ymd).catch(() => false) : false);
    }
  }));
  for (const m of showed as ReviewMeeting[]) {
    const client = m.contactName.replace(/\*$/, '').trim() + (m.kind === 'PR' ? ' - PR' : '');
    // Self-booked: the creator is the consultant; only paid when they have their own CC PAYS block (e.g. MARK - VIC).
    const self = m.bookerFrom === 'self';
    const booker = self ? m.consultant : m.booker;
    if (!booker) { skipped.push({ client, ymd: m.ymd, reason: 'No booker found' }); continue; }
    let b = blocks.find((x) => !x.old && matches(x.header, booker)) || (self ? undefined : blocks.find((x) => matches(x.header, booker)));
    if (!b && self) { skipped.push({ client, ymd: m.ymd, reason: `Self-booked by ${booker} (no CC PAYS block)` }); continue; }
    const sold = (opps.byContact[m.contactId] || []).some((o) => /SALE ADMIN/i.test(o.pipeline));
    const comms = (m.mode === 'F2F' ? 'SAT' : m.kind === 'PR' ? 'Google PR' : 'Google') + (sold ? ' + SOLD' : '');
    if (!b) {
      const p = booker.toUpperCase().split(/\s+/);
      b = { header: p.length > 1 ? `${p[0]}.${p[p.length - 1].charAt(0)}` : p[0], booker, old: false, rows: [] };
      const at = blocks.findIndex((x) => x.old);
      blocks.splice(at < 0 ? blocks.length : at, 0, b);
    }
    b.booker = booker;
    b.rows.push({ client, comms, crm: crm.get(m.id) ? 'YES' : '', tlc: m.tlc ? 'YES' : '', consultant: m.consultant || '', appointmentId: m.id, ymd: m.ymd });
  }
  return { week: ws, label: weekLabel(ws), blocks, skipped, templateTab: tpl.tab };
}

export type CcWriteResult = { tab: string; rows: number; readBack: number };

/** Writes a NEW tab "<week> AUTOMATED"; refuses if the tab exists. */
export async function writeCcPays(by: string, ws: string): Promise<CcWriteResult> {
  const data = await buildCcPays(ws);
  const tab = automatedTab(ws);
  const sh = sheets();
  const meta = await sh.spreadsheets.get({ spreadsheetId: CC_PAYS_SHEET_ID, fields: 'sheets.properties.title' });
  if ((meta.data.sheets || []).some((s) => s.properties?.title === tab)) throw new Error(`Tab "${tab}" already exists; existing tabs are never modified.`);

  const values: string[][] = [];
  const heads: number[] = [];
  const spans: [number, number][] = [];
  let oldDone = false;
  for (const b of data.blocks) {
    if (b.old && !oldDone) { values.push(['OLD STAFF']); values.push([]); oldDone = true; }
    const s = values.length;
    heads.push(s);
    values.push([b.header, ...HEAD]);
    for (const r of b.rows) values.push([r.client, r.comms, r.crm, r.tlc, r.consultant, '']);
    for (let k = 0; k < BLANK_ROWS; k++) values.push(['', '', '', '', '', '']);
    spans.push([s, values.length]);
  }
  const add = await sh.spreadsheets.batchUpdate({ spreadsheetId: CC_PAYS_SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: tab, gridProperties: { rowCount: Math.max(200, values.length + 20), columnCount: 10 } } } }] } });
  const sheetId = add.data.replies?.[0]?.addSheet?.properties?.sheetId;
  await sh.spreadsheets.values.update({ spreadsheetId: CC_PAYS_SHEET_ID, range: `'${tab}'!A1`, valueInputOption: 'RAW', requestBody: { values } });
  const solid = { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } };
  const range = (r0: number, r1: number) => ({ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: 0, endColumnIndex: 6 });
  await sh.spreadsheets.batchUpdate({ spreadsheetId: CC_PAYS_SHEET_ID, requestBody: { requests: [
    ...WIDTHS.map((px, c) => ({ updateDimensionProperties: { range: { sheetId, dimension: 'COLUMNS', startIndex: c, endIndex: c + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' } })),
    ...heads.map((r) => ({ repeatCell: { range: range(r, r + 1), cell: { userEnteredFormat: { backgroundColor: { red: 0.718, green: 0.718, blue: 0.718 }, textFormat: { bold: true, fontSize: 10 } } }, fields: 'userEnteredFormat(backgroundColor,textFormat)' } })),
    ...spans.map(([a, z]) => ({ updateBorders: { range: range(a, z), top: solid, bottom: solid, left: solid, right: solid, innerHorizontal: solid, innerVertical: solid } })),
  ] } });
  const back = await sh.spreadsheets.values.get({ spreadsheetId: CC_PAYS_SHEET_ID, range: `'${tab}'!A1:F${values.length + 5}` });
  const readBack = (back.data.values || []).filter((r) => r.length >= 2 && r[1] && !HEAD.includes(String(r[1]))).length;
  const rows = data.blocks.reduce((n, b) => n + b.rows.length, 0);
  await logReview(by, null, 'cc_pays', { week: ws, tab, rows, readBack, skipped: data.skipped.length });
  return { tab, rows, readBack };
}

export async function ccPaysTabExists(tab: string): Promise<boolean> {
  const meta = await sheets().spreadsheets.get({ spreadsheetId: CC_PAYS_SHEET_ID, fields: 'sheets.properties.title' });
  return (meta.data.sheets || []).some((s) => s.properties?.title === tab);
}
