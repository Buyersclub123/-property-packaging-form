// CC PAYS AUTOMATED (JT 11/11). One tab per reporting period in the CC PAYS workbook, same layout as the manual tabs:
// a block per booker (header "<NAME> - <STATE>" | COMMS DUE | CRM NOTES | TLC | CONSULTANT | DAY OFF), a row per Showed
// meeting. The workbook is a copy (JT 12/11): tabs are named "<period> AUTOMATED". Periods (JT 26/11): Mon-Sun week (written
// Mondays 9am Sydney by the cron), Fri-Thu week, month or custom (from Stats). Every AUTOMATED tab is rewritten whenever an
// outcome or TLC in its period is saved, so it shows actuals; DAY OFF entries are kept. Manual tabs are never touched.
// Every write is logged in review_outcome_log (action cc_pays).
import { google } from 'googleapis';
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { loadMeetings } from './load';
import { loadAllSignups } from './signups';
import { ensureReviewTables, loadSettings, logReview } from './store';
import { ccLabel, type CcPeriod, type CcPeriodKind } from './ccPaysPeriod';
import { sydYmd, type ReviewMeeting, type ReviewViewer } from './types';

export const CC_PAYS_SHEET_ID = '1LWRtH2ps3aZbpUb1lzV-4c1WV_otp1UciwLHu4mWbZs';
export const AUTOMATED = 'AUTOMATED';
export const automatedTab = (p: { from: string; to: string }) => `${ccLabel(p)} ${AUTOMATED}`;
const HEAD = ['COMMS DUE', 'CRM NOTES', 'TLC', 'CONSULTANT', 'DAY OFF'];
const WIDTHS = [368, 141, 100, 100, 100, 223];
const BLANK_ROWS = 3;

export type CcRow = { client: string; comms: string; crm: string; tlc: string; consultant: string; appointmentId: string; ymd: string };
export type CcBlock = { header: string; booker: string | null; old: boolean; rows: CcRow[] };
export type CcPays = CcPeriod & { label: string; blocks: CcBlock[]; skipped: { client: string; ymd: string; reason: string }[]; templateTab: string };

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

/** Builds the period's tab (no write). */
export async function buildCcPays(p: CcPeriod): Promise<CcPays> {
  const settings = await loadSettings();
  const [loaded, signups, tpl] = await Promise.all([
    loadMeetings(SYSTEM_VIEWER, p.from, p.to, settings.callCentre, settings.salesAliases, settings.ghlOnlyFrom),
    loadAllSignups(),
    templateBlocks(),
  ]);
  // + SOLD = a GHL sale (not cancelled) credited to this meeting: the client's last reported meeting before signing.
  const soldMeetings = new Set(signups.signups.filter((s) => s.meetingId && !s.cancelled).map((s) => s.meetingId!));
  const showed = loaded.meetings.filter((m) => m.ymd >= p.from && m.ymd <= p.to && m.outcome === 'Showed')
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
    const client = m.contactName.replace(/\*$/, '').trim() + (m.kind === 'PR' ? ' - PR' : m.kind === 'CF' ? ' - Cashflow Club' : '');
    // Self-booked: the creator is the consultant; only paid when they have their own CC PAYS block (e.g. MARK - VIC).
    const self = m.bookerFrom === 'self';
    const booker = self ? m.consultant : m.booker;
    if (!booker) { skipped.push({ client, ymd: m.ymd, reason: m.bookerFrom === 'online' ? 'Booked online (no CC credit)' : 'No booker found' }); continue; }
    let b = blocks.find((x) => !x.old && matches(x.header, booker)) || (self ? undefined : blocks.find((x) => matches(x.header, booker)));
    if (!b && self) { skipped.push({ client, ymd: m.ymd, reason: `Self-booked by ${booker} (no CC PAYS block)` }); continue; }
    const sold = soldMeetings.has(m.id);
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
  return { ...p, label: ccLabel(p), blocks, skipped, templateTab: tpl.tab };
}

export type CcWriteResult = { tab: string; rows: number; readBack: number; replaced: boolean };

const dayOffKey = (header: string, client: string) => `${header.trim().toUpperCase()}|${client.trim().toUpperCase()}`;

/** Writes the tab "<period> AUTOMATED". If it exists: refuses, unless replace (manual Rewrite, or an outcome saved in the
 *  period) - then only that AUTOMATED tab is rewritten, in the same position, keeping its DAY OFF entries. */
export async function writeCcPays(by: string, p: CcPeriod, replace = false, tabName?: string): Promise<CcWriteResult> {
  const data = await buildCcPays(p);
  const tab = tabName || automatedTab(p);
  const sh = sheets();
  const meta = await sh.spreadsheets.get({ spreadsheetId: CC_PAYS_SHEET_ID, fields: 'sheets.properties(sheetId,title,index)' });
  const old = (meta.data.sheets || []).find((s) => s.properties?.title === tab);
  if (old && !replace) throw new Error(`Tab "${tab}" already exists; existing tabs are never modified.`);
  const dayOff = new Map<string, string>();
  if (old) {
    if (!tab.endsWith(` ${AUTOMATED}`)) throw new Error(`Refusing to delete "${tab}": only AUTOMATED tabs can be replaced.`);
    const prev = await sh.spreadsheets.values.get({ spreadsheetId: CC_PAYS_SHEET_ID, range: `'${tab.replace(/'/g, "''")}'!A1:F1000` });
    let header = '';
    for (const r of prev.data.values || []) {
      const a = String(r[0] || '');
      if (String(r[1] || '').trim() === HEAD[0]) header = a;
      else if (header && a.trim() && String(r[5] || '').trim()) dayOff.set(dayOffKey(header, a), String(r[5]));
    }
    await sh.spreadsheets.batchUpdate({ spreadsheetId: CC_PAYS_SHEET_ID, requestBody: { requests: [{ deleteSheet: { sheetId: old.properties?.sheetId } }] } });
  }

  const values: string[][] = [];
  const heads: number[] = [];
  const spans: [number, number][] = [];
  let oldDone = false;
  for (const b of data.blocks) {
    if (b.old && !oldDone) { values.push(['OLD STAFF']); values.push([]); oldDone = true; }
    const s = values.length;
    heads.push(s);
    values.push([b.header, ...HEAD]);
    for (const r of b.rows) values.push([r.client, r.comms, r.crm, r.tlc, r.consultant, dayOff.get(dayOffKey(b.header, r.client)) || '']);
    for (let k = 0; k < BLANK_ROWS; k++) values.push(['', '', '', '', '', '']);
    spans.push([s, values.length]);
  }
  const add = await sh.spreadsheets.batchUpdate({ spreadsheetId: CC_PAYS_SHEET_ID, requestBody: { requests: [{ addSheet: { properties: { title: tab, ...(old?.properties?.index != null ? { index: old.properties.index } : {}), gridProperties: { rowCount: Math.max(200, values.length + 20), columnCount: 10 } } } }] } });
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
  await logReview(by, null, 'cc_pays', { kind: p.kind, from: p.from, to: p.to, tab, rows, readBack, skipped: data.skipped.length, replaced: !!old, dayOffKept: dayOff.size });
  await ensureCcTabs();
  await getDb()`INSERT INTO review_cc_pays_tabs (tab, kind, period_from, period_to, written_at, written_by)
    VALUES (${tab}, ${p.kind}, ${p.from}, ${p.to}, NOW(), ${by})
    ON CONFLICT (tab) DO UPDATE SET kind = EXCLUDED.kind, period_from = EXCLUDED.period_from, period_to = EXCLUDED.period_to,
      written_at = EXCLUDED.written_at, written_by = EXCLUDED.written_by`;
  return { tab, rows, readBack, replaced: !!old };
}

// Every AUTOMATED tab written, with its period, so a saved outcome can find the tabs it appears in.
let tabsReady: Promise<void> | null = null;
function ensureCcTabs(): Promise<void> {
  tabsReady ??= (async () => {
    await ensureReviewTables();
    const sql = getDb();
    await sql`CREATE TABLE IF NOT EXISTS review_cc_pays_tabs (
      tab TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      period_from TEXT NOT NULL,
      period_to TEXT NOT NULL,
      written_at TIMESTAMPTZ,
      written_by TEXT,
      dirty_at TIMESTAMPTZ,
      lock_until TIMESTAMPTZ
    )`;
    // Tabs written before 26/11 were Fri-Thu weeks, logged with their Friday.
    await sql`INSERT INTO review_cc_pays_tabs (tab, kind, period_from, period_to, written_at, written_by)
      SELECT DISTINCT ON (detail->>'tab') detail->>'tab', 'fri-thu', detail->>'week', to_char((detail->>'week')::date + 6, 'YYYY-MM-DD'), at, by_email
      FROM review_outcome_log WHERE action = 'cc_pays' AND detail->>'tab' IS NOT NULL AND detail->>'week' IS NOT NULL
      ORDER BY detail->>'tab', at DESC
      ON CONFLICT (tab) DO NOTHING`;
  })().catch((e) => { tabsReady = null; throw e; });
  return tabsReady;
}

/** Rewrites run on the live site only, so localhost never changes the workbook. */
export const autoRewriteOn = () => !!process.env.VERCEL || process.env.CC_PAYS_AUTO_REWRITE === '1';

/** An outcome or TLC was saved: flags every AUTOMATED tab whose period has the meeting's date. */
export async function markCcPaysDirty(appointmentId: string): Promise<string[]> {
  await ensureCcTabs();
  const sql = getDb();
  const [m] = await sql`SELECT start_at FROM review_meetings WHERE appointment_id = ${appointmentId}`;
  if (!m?.start_at) return [];
  const ymd = sydYmd(m.start_at as string | Date);
  const rows = await sql`UPDATE review_cc_pays_tabs SET dirty_at = NOW() WHERE period_from <= ${ymd} AND period_to >= ${ymd} RETURNING tab`;
  return rows.map((r) => String(r.tab));
}

export type CcRefreshResult = { rewrote: string[]; removed: string[]; failed: { tab: string; error: string }[]; off?: string };

/** Rewrites flagged tabs one at a time. A tab is locked while it is written; a save during the write flags it again. */
export async function refreshDirtyCcPays(by: string, max = 6): Promise<CcRefreshResult> {
  const out: CcRefreshResult = { rewrote: [], removed: [], failed: [] };
  if (!autoRewriteOn()) return { ...out, off: 'Automatic rewrites run on the live site only.' };
  await ensureCcTabs();
  const sql = getDb();
  for (let n = 0; n < max; n++) {
    const [t] = await sql`UPDATE review_cc_pays_tabs SET lock_until = NOW() + INTERVAL '5 minutes', dirty_at = NULL
      WHERE tab = (SELECT tab FROM review_cc_pays_tabs WHERE dirty_at IS NOT NULL AND (lock_until IS NULL OR lock_until < NOW()) ORDER BY dirty_at LIMIT 1)
        AND (lock_until IS NULL OR lock_until < NOW())
      RETURNING tab, kind, period_from, period_to`;
    if (!t) break;
    const tab = String(t.tab);
    try {
      // Someone deleted the tab in the workbook: leave it deleted.
      if (!(await ccPaysTabExists(tab))) { await sql`DELETE FROM review_cc_pays_tabs WHERE tab = ${tab}`; out.removed.push(tab); continue; }
      await writeCcPays(by, { kind: t.kind as CcPeriodKind, from: String(t.period_from), to: String(t.period_to) }, true, tab);
      out.rewrote.push(tab);
    } catch (e) {
      out.failed.push({ tab, error: (e as Error).message });
      await sql`UPDATE review_cc_pays_tabs SET dirty_at = COALESCE(dirty_at, NOW()) WHERE tab = ${tab}`;
      await logReview(by, null, 'cc_pays_failed', { tab, error: (e as Error).message });
    } finally {
      await sql`UPDATE review_cc_pays_tabs SET lock_until = NULL WHERE tab = ${tab}`;
    }
  }
  return out;
}

export async function ccPaysTabExists(tab: string): Promise<boolean> {
  const meta = await sheets().spreadsheets.get({ spreadsheetId: CC_PAYS_SHEET_ID, fields: 'sheets.properties.title' });
  return (meta.data.sheets || []).some((s) => s.properties?.title === tab);
}
