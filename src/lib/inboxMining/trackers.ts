import { sheetsFor, googleErrorMessage } from './google';

// Live, read-only reads of the two trackers (handoff 5b / 5c). Read once per request, never cached.

export interface TrackerRow {
  tab: string;
  text: string;
}

export interface Tracker {
  name: string;
  rows: TrackerRow[];
  error?: string;
}

export interface Trackers {
  uncon: Tracker;
  construction: Tracker;
  /** email or domain -> builder name (Kata's sheet). */
  builderSenders: Map<string, string>;
}

export const FREE_MAIL = /^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|bigpond|optusnet|iinet|tpg|internode|westnet|dodo|aol|protonmail|proton)\./i;

async function readSheet(name: string, envVar: string): Promise<Tracker> {
  const id = process.env[envVar];
  const subject = process.env.INBOX_TRACKER_SUBJECT;
  if (!id) return { name, rows: [], error: `${envVar} is not set (live Google Sheet id)` };
  if (!subject) return { name, rows: [], error: 'INBOX_TRACKER_SUBJECT is not set (user the service account reads the sheet as)' };
  try {
    const sheets = sheetsFor(subject);
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'sheets.properties.title' }, { timeout: 60_000 });
    const tabs = (meta.data.sheets || []).map((s) => s.properties?.title || '').filter(Boolean);
    const res = await sheets.spreadsheets.values.batchGet({ spreadsheetId: id, ranges: tabs.map((t) => `'${t.replace(/'/g, "''")}'`) }, { timeout: 60_000 });
    const rows: TrackerRow[] = [];
    (res.data.valueRanges || []).forEach((vr, i) => {
      for (const r of vr.values || []) {
        const text = r.map((c) => String(c ?? '').trim()).filter(Boolean).join(' | ');
        if (text) rows.push({ tab: tabs[i], text });
      }
    });
    return { name, rows };
  } catch (e) {
    return { name, rows: [], error: googleErrorMessage(e, name) };
  }
}

export async function loadTrackers(): Promise<Trackers> {
  const [uncon, construction] = await Promise.all([
    readSheet('Property Team unconditionals / deal status', 'INBOX_UNCON_SHEET_ID'),
    readSheet("Kata's construction-update tracker", 'INBOX_CONSTRUCTION_SHEET_ID'),
  ]);
  const builderSenders = new Map<string, string>();
  // A domain or address listed under several builders is a broker/lender/client, not a builder.
  const seen = new Map<string, Set<string>>();
  for (const row of construction.rows) {
    if (/update tracker/i.test(row.tab)) continue;
    const emails = row.text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || [];
    const keyTab = /key builders/i.test(row.tab);
    const builder = keyTab ? row.text.split(' | ')[0] : row.tab;
    for (const e of emails) {
      const email = e.toLowerCase();
      if (email.endsWith('@buyersclub.com.au')) continue;
      // Per-builder tabs also list the clients' own (gmail etc.) addresses: only the Key builders tab may name a free-mail builder.
      if (!keyTab && FREE_MAIL.test(email.split('@')[1])) continue;
      const domain = email.split('@')[1];
      for (const k of FREE_MAIL.test(domain) ? [email] : [email, domain]) {
        seen.set(k, (seen.get(k) || new Set()).add(keyTab ? `key:${builder}` : builder));
        builderSenders.set(k, builder);
      }
    }
  }
  for (const [k, b] of seen) {
    const names = Array.from(b);
    const key = names.find((n) => n.startsWith('key:'));
    if (key) builderSenders.set(k, key.slice(4));
    else if (names.length > 1) builderSenders.delete(k);
  }
  return { uncon, construction, builderSenders };
}

export function trackerRowsFor(t: Tracker, surnames: string[]): TrackerRow[] {
  if (!surnames.length) return [];
  const res = surnames.map((s) => new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
  return t.rows.filter((r) => res.some((re) => re.test(r.text))).slice(0, 6);
}
