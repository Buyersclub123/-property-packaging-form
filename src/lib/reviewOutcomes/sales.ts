import { getDb } from '@/lib/db';
import { googleErrorMessage, sheetsFor } from '@/lib/inboxMining/google';
import { ensureReviewTables, loadSettings } from './store';
import { ghlUsers } from './sync';
import type { ReviewViewer, Sale, SaleCancel, SaleSource, SalesData } from './types';

// Read-only import of the Buyers Club Tracking sheet: one tab per office (sales signed) plus CANCELLATIONS.
// Copied into review_sales at most hourly (or on demand); nothing is written to the sheet.

export const SALES_SHEET_ID = '1pKeNHNSv6pnjbDjvSDq7IVSuVWbaLTO1nMCdSsrfVJ8';
const OFFICE_TABS: [string, string][] = [
  ['SYD SALES SHEET', 'Sydney'],
  ['VIC SALES SHEET', 'Victoria'],
  ['HILLS DISTRICT SHEET', 'Hills District'],
  ['GC SALES SHEET', 'Gold Coast'],
];
const CANCEL_TAB = 'CANCELLATIONS';
const STALE_MS = 60 * 60e3;
const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

interface SalesRow {
  id: string; kind: 'sale' | 'cancel'; office: string; row_no: number; client: string; signed_on: string;
  paid: number; balance: number; consultant: string; cc_member: string; broker: string; smsf: string; comments: string;
  lead_source: string; phone: string; ad_type: string; lead_date: string; refund: number; processed: string; reason: string;
}

const str = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim();
const money = (v: unknown) => {
  const n = Number(str(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const pad = (n: number) => String(n).padStart(2, '0');

/** dd/mm/yyyy (or yy). A typo'd year (e.g. 0204) falls back to the month heading the row sits under. */
function parseDate(v: unknown, fallbackYear: number | null = null): string {
  const m = str(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return '';
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (y < 100) y += 2000;
  if ((y < 2014 || y > 2040) && fallbackYear) y = fallbackYear;
  if (y < 2014 || y > 2040 || mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return `${y}-${pad(mo)}-${pad(d)}`;
}

const monthHeading = (v: unknown): number | null => {
  const m = str(v).match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  return m && MON.includes(m[1].slice(0, 3).toLowerCase()) ? Number(m[2]) : null;
};

export async function readSalesSheet(): Promise<SalesRow[]> {
  const subject = process.env.INBOX_TRACKER_SUBJECT;
  if (!subject) throw new Error('INBOX_TRACKER_SUBJECT is not set, so the Tracking sheet cannot be read.');
  const sheets = sheetsFor(subject);
  let ranges;
  try {
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SALES_SHEET_ID,
      ranges: [...OFFICE_TABS.map(([t]) => `'${t}'!A1:O8000`), `'${CANCEL_TAB}'!A1:K4000`],
    });
    ranges = res.data.valueRanges || [];
  } catch (e) {
    throw new Error(googleErrorMessage(e, 'the Buyers Club Tracking sheet'));
  }
  const out: SalesRow[] = [];
  const base = { paid: 0, balance: 0, consultant: '', cc_member: '', broker: '', smsf: '', comments: '', lead_source: '', phone: '', ad_type: '', lead_date: '', refund: 0, processed: '', reason: '' };
  OFFICE_TABS.forEach(([tab, office], ti) => {
    const rows = (ranges[ti]?.values || []) as unknown[][];
    let year: number | null = null;
    rows.forEach((r, i) => {
      if (i === 0) return;
      const heading = monthHeading(r[0]);
      if (heading) { year = heading; return; }
      const client = str(r[0]);
      const signed = parseDate(r[1], year);
      if (!client || !signed || (!str(r[2]) && !str(r[3]) && !str(r[4]))) return;
      out.push({
        ...base, id: `${tab}#${i + 1}`, kind: 'sale', office, row_no: i + 1, client, signed_on: signed,
        paid: money(r[2]), balance: money(r[3]), consultant: str(r[4]), cc_member: str(r[5]), broker: str(r[6]), smsf: str(r[7]),
        comments: str(r[8]), lead_source: str(r[9]), phone: str(r[10]), ad_type: str(r[13]), lead_date: parseDate(r[14]),
      });
    });
  });
  const cancels = (ranges[OFFICE_TABS.length]?.values || []) as unknown[][];
  cancels.forEach((r, i) => {
    if (i === 0) return;
    const client = str(r[0]);
    const signed = parseDate(r[1]);
    if (!client || !signed) return;
    out.push({
      ...base, id: `${CANCEL_TAB}#${i + 1}`, kind: 'cancel', office: '', row_no: i + 1, client, signed_on: signed,
      paid: money(r[2]), consultant: str(r[3]), refund: money(r[4]), processed: str(r[5]), reason: str(r[6]), comments: str(r[8]),
      lead_source: str(r[9]), phone: str(r[10]),
    });
  });
  return out;
}

interface SyncStatus { at: string; sales: number; cancels: number }

async function syncStatus(): Promise<SyncStatus | null> {
  const rows = await getDb()`SELECT value FROM review_settings WHERE key = 'sales_sync'`;
  return (rows[0]?.value as SyncStatus | undefined) ?? null;
}

export async function syncSales(): Promise<SyncStatus> {
  await ensureReviewTables();
  const sql = getDb();
  const rows = await readSalesSheet();
  const at = new Date().toISOString();
  for (let i = 0; i < rows.length; i += 800) {
    const batch = JSON.stringify(rows.slice(i, i + 800));
    await sql`INSERT INTO review_sales (id, kind, office, row_no, client, signed_on, paid, balance, consultant, cc_member, broker, smsf,
        comments, lead_source, phone, ad_type, lead_date, refund, processed, reason, synced_at)
      SELECT r.id, r.kind, r.office, r.row_no, r.client, r.signed_on, r.paid, r.balance, r.consultant, r.cc_member, r.broker, r.smsf,
        r.comments, r.lead_source, r.phone, r.ad_type, r.lead_date, r.refund, r.processed, r.reason, ${at}::timestamptz
      FROM jsonb_to_recordset(${batch}::jsonb) AS r(id text, kind text, office text, row_no int, client text, signed_on text, paid numeric,
        balance numeric, consultant text, cc_member text, broker text, smsf text, comments text, lead_source text, phone text, ad_type text,
        lead_date text, refund numeric, processed text, reason text)
      ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, office = EXCLUDED.office, row_no = EXCLUDED.row_no, client = EXCLUDED.client,
        signed_on = EXCLUDED.signed_on, paid = EXCLUDED.paid, balance = EXCLUDED.balance, consultant = EXCLUDED.consultant,
        cc_member = EXCLUDED.cc_member, broker = EXCLUDED.broker, smsf = EXCLUDED.smsf, comments = EXCLUDED.comments,
        lead_source = EXCLUDED.lead_source, phone = EXCLUDED.phone, ad_type = EXCLUDED.ad_type, lead_date = EXCLUDED.lead_date,
        refund = EXCLUDED.refund, processed = EXCLUDED.processed, reason = EXCLUDED.reason, synced_at = EXCLUDED.synced_at`;
  }
  await sql`DELETE FROM review_sales WHERE synced_at < ${at}::timestamptz`;
  const status: SyncStatus = { at, sales: rows.filter((r) => r.kind === 'sale').length, cancels: rows.filter((r) => r.kind === 'cancel').length };
  await sql`INSERT INTO review_settings (key, value, updated_by) VALUES ('sales_sync', ${JSON.stringify(status)}::jsonb, 'sales sync')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW()`;
  return status;
}

const lower = (s: string) => s.toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
const titleCase = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/\b([a-z])/g, (c) => c.toUpperCase());

/** Sheet name -> a known name: alias, exact, "Phil Harker" ~ "Phil H", or a unique first name with the same last initial. */
export function nameMatcher(candidates: string[], aliases: Record<string, string>) {
  const alias = new Map(Object.entries(aliases).map(([k, v]) => [lower(k), v]));
  const exact = new Map(candidates.map((c) => [lower(c), c]));
  const split = (s: string) => {
    const [f = '', ...rest] = lower(s).split(' ');
    return { f, l: rest.join(' ') };
  };
  return (raw: string): string => {
    const r = str(raw);
    if (!r) return '';
    const a = alias.get(lower(r)) ?? exact.get(lower(r));
    if (a) return a;
    const { f, l } = split(r);
    const sameFirst = candidates.filter((c) => split(c).f === f);
    const prefix = sameFirst.filter((c) => {
      const cl = split(c).l;
      return l ? !!cl && (cl.startsWith(l) || l.startsWith(cl)) : false;
    });
    if (prefix.length === 1) return prefix[0];
    if (sameFirst.length === 1) {
      const cl = split(sameFirst[0]).l;
      if (!l || !cl || cl[0] === l[0]) return sameFirst[0];
    }
    return titleCase(r);
  };
}

const SOURCE_LIKE = /self\s*-?\s*(gen|booked)|booked himself|repeat|resold|referr?al|referal/i;

export function sourceOf(raw: string): SaleSource | null {
  const t = raw.toLowerCase().trim();
  if (!t) return null;
  if (/referr?al|referal|referred/.test(t)) return 'Referral';
  if (/repeat|resold|re-?engag/.test(t)) return 'Repeat';
  if (/self\s*-?\s*(gen|booked)|booked himself/.test(t)) return 'Self Gen';
  if (/^pr\b|portfolio/.test(t)) return 'PR';
  if (/kyu|searchbox|seo|fat ?cow|new lead|google|facebook|insta|website|tradies|\bads?\b/.test(t)) return 'New Lead';
  return 'Other';
}

const nameKey = (n: string) =>
  n.toLowerCase().replace(/\b(mr|mrs|ms|miss|dr|and)\b/g, ' ').replace(/[^a-z ]/g, ' ').split(' ').filter(Boolean).sort().join(' ');
const daysApart = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) / 864e5;

export async function loadSales(viewer: ReviewViewer, force = false): Promise<SalesData> {
  await ensureReviewTables();
  const warnings: string[] = [];
  const status = await syncStatus();
  let syncedAt = status?.at ?? null;
  if (force || !status || Date.now() - Date.parse(status.at) > STALE_MS) {
    try {
      syncedAt = (await syncSales()).at;
    } catch (e) {
      warnings.push(`Tracking sheet not refreshed${syncedAt ? ' (showing the last copy)' : ''}: ${(e as Error).message}`);
    }
  }
  const [rows, users, settings] = await Promise.all([
    getDb()`SELECT * FROM review_sales ORDER BY signed_on, id`,
    ghlUsers().catch(() => []),
    loadSettings(),
  ]);
  const nameByEmail = new Map(users.map((u) => [u.email, u.name]));
  const consultantOf = nameMatcher(users.map((u) => u.name), settings.salesAliases);
  const ccNames = settings.callCentre.map((e) => nameByEmail.get(e) || e.split('@')[0].split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('.'));
  const ccOf = nameMatcher(ccNames, settings.salesAliases);

  const sales: Sale[] = [];
  const rawCancels: typeof rows = [];
  for (const r of rows) {
    if (r.kind === 'cancel') { rawCancels.push(r); continue; }
    const ccRaw = String(r.cc_member || '');
    const ccIsSource = SOURCE_LIKE.test(ccRaw);
    sales.push({
      id: String(r.id),
      office: String(r.office || ''),
      client: String(r.client || ''),
      signed: String(r.signed_on || ''),
      fee: Number(r.paid || 0) + Number(r.balance || 0),
      paid: Number(r.paid || 0),
      consultant: consultantOf(String(r.consultant || '')),
      consultantRaw: String(r.consultant || ''),
      cc: ccIsSource ? '' : ccOf(ccRaw),
      ccRaw,
      source: sourceOf(String(r.lead_source || '')) ?? (ccIsSource ? sourceOf(ccRaw) : null) ?? 'Unknown',
      sourceRaw: String(r.lead_source || '') || (ccIsSource ? ccRaw : ''),
      broker: String(r.broker || ''),
      smsf: String(r.smsf || ''),
      comments: String(r.comments || ''),
      phone: String(r.phone || ''),
      adType: String(r.ad_type || ''),
      leadDate: String(r.lead_date || ''),
      cancelled: false,
    });
  }
  const byKey = new Map<string, Sale[]>();
  for (const s of sales) byKey.set(nameKey(s.client), [...(byKey.get(nameKey(s.client)) || []), s]);
  const cancels: SaleCancel[] = rawCancels.map((r) => {
    const signed = String(r.signed_on || '');
    const same = (byKey.get(nameKey(String(r.client || ''))) || []).filter((s) => !s.cancelled);
    const near = same.filter((s) => daysApart(s.signed, signed) <= 7).sort((a, b) => daysApart(a.signed, signed) - daysApart(b.signed, signed));
    const sale = near[0] || (same.length === 1 ? same[0] : null);
    if (sale) sale.cancelled = true;
    return {
      id: String(r.id),
      client: String(r.client || ''),
      signed,
      deposit: Number(r.paid || 0),
      refund: Number(r.refund || 0),
      consultant: sale?.consultant || consultantOf(String(r.consultant || '')),
      office: sale?.office || (/\bVIC\b/.test(String(r.client || '')) ? 'Victoria' : 'Unknown'),
      processed: String(r.processed || ''),
      reason: String(r.reason || ''),
      saleId: sale?.id ?? null,
      fee: sale?.fee ?? 0,
      source: sale?.source ?? sourceOf(String(r.lead_source || '')) ?? 'Unknown',
      cc: sale?.cc ?? '',
    };
  });

  let visibleSales = sales;
  let visibleCancels = cancels;
  if (!viewer.recorder) {
    const mine = new Set(users.filter((u) => viewer.consultantIds.includes(u.id)).map((u) => u.name));
    visibleSales = sales.filter((s) => mine.has(s.consultant));
    visibleCancels = cancels.filter((c) => mine.has(c.consultant));
  }
  return {
    sales: visibleSales,
    cancels: visibleCancels,
    offices: [...OFFICE_TABS.map(([, o]) => o), ...(visibleCancels.some((c) => c.office === 'Unknown') ? ['Unknown'] : [])],
    syncedAt,
    warnings,
  };
}
