import { getDb } from '@/lib/db';
import { ensureTables } from './store';
import { fetchStageNames, fetchOpps, fetchRecords, recordText } from './ghl';
import { suggestionKey, type MatchResult, type Suggestion } from './types';

// Lag tracker. GHL is only read (bulk opportunity / Property Record search); results go to
// inbox_suggestion_lag and inbox_lag_checks. Actioned = the GHL value equals the proposed value.

export type LagStatus = 'open' | 'actioned' | 'already_set' | 'changed_other';

export async function ensureLagTables(): Promise<void> {
  await ensureTables();
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_suggestion_lag (
      item_id          INTEGER NOT NULL REFERENCES inbox_items(id) ON DELETE CASCADE,
      skey             TEXT NOT NULL,
      proposed         TEXT,
      first_checked_at TIMESTAMPTZ,
      first_value      TEXT,
      last_checked_at  TIMESTAMPTZ,
      last_value       TEXT,
      status           TEXT NOT NULL,
      actioned_at      TIMESTAMPTZ,
      changed_at       TIMESTAMPTZ,
      PRIMARY KEY (item_id, skey)
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_settings (
      key        TEXT PRIMARY KEY,
      value      TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      updated_by TEXT
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_lag_checks (
      id           SERIAL PRIMARY KEY,
      checked_at   TIMESTAMPTZ DEFAULT NOW(),
      checked      INTEGER,
      actioned_now INTEGER,
      changed_now  INTEGER,
      not_found    INTEGER,
      errors       JSONB DEFAULT '[]'::jsonb
    )`;
}

const show = (v: unknown) => (v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : String(v));
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

/** Comparable form: case/space-insensitive, money without $ and commas, dates as YYYY-MM-DD. */
export function norm(v: string): string {
  const s = v.trim().toLowerCase().replace(/\s+/g, ' ');
  if (/^\d{12,13}$/.test(s)) return new Date(Number(s)).toISOString().slice(0, 10);
  const money = s.replace(/[$,\s]/g, '');
  if (/^\d+(\.\d+)?$/.test(money)) return String(parseFloat(money));
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const isoDate = s.match(/^(\d{4}-\d{2}-\d{2})t/);
  return isoDate ? isoDate[1] : s;
}

export async function checkLag() {
  await ensureLagTables();
  const sql = getDb();
  const items = await sql`
    SELECT id, match, suggestions FROM inbox_items
    WHERE jsonb_array_length(COALESCE(suggestions, '[]'::jsonb)) > 0`;
  const prevRows = await sql`SELECT * FROM inbox_suggestion_lag`;
  const existing = new Map(prevRows.map((r) => [`${r.item_id}|${r.skey}`, r]));

  const names = await fetchStageNames();
  const [opps, records] = await Promise.all([fetchOpps(names), fetchRecords()]);
  const oppById = new Map(opps.map((o) => [o.id, o]));
  const recById = new Map(records.map((r) => [r.id, r]));

  const now = new Date().toISOString();
  const rows: { itemId: number; key: string; proposed: string; firstAt: string; firstValue: string; current: string;
    status: LagStatus; actionedAt: string | null; changedAt: string | null }[] = [];
  let actionedNow = 0, changedNow = 0, alreadySetNow = 0, notFound = 0;

  for (const it of items) {
    const m = it.match as MatchResult;
    for (const s of (it.suggestions || []) as Suggestion[]) {
      if (s.notInGhl) continue;
      let current: string | null = null;
      if (s.target === 'opportunity') {
        const o = m?.opportunityId ? oppById.get(m.opportunityId) : undefined;
        if (o) current = show(o.fields[s.fieldId || '']);
      } else {
        const r = m?.propertyRecordId ? recById.get(m.propertyRecordId) : undefined;
        if (r) current = recordText(r, s.fieldKey);
      }
      if (current === null) { notFound++; continue; }

      const key = suggestionKey(s);
      const proposed = show(s.proposed);
      const prev = existing.get(`${it.id}|${key}`);
      const equal = norm(current) === norm(proposed);
      let status: LagStatus;
      let actionedAt = iso(prev?.actioned_at);
      let changedAt = iso(prev?.changed_at);
      if (!prev) {
        status = equal ? 'already_set' : 'open';
        if (equal) alreadySetNow++;
      } else if (prev.status === 'actioned' || prev.status === 'already_set') {
        status = prev.status;
      } else if (equal) {
        status = 'actioned';
        actionedAt = now;
        actionedNow++;
      } else if (norm(current) !== norm(prev.first_value ?? '')) {
        status = 'changed_other';
        if (prev.status !== 'changed_other') { changedAt = now; changedNow++; }
      } else {
        status = 'open';
      }
      rows.push({
        itemId: it.id, key, proposed, firstAt: iso(prev?.first_checked_at) || now,
        firstValue: prev ? prev.first_value ?? '' : current, current, status, actionedAt, changedAt,
      });
    }
  }

  for (let i = 0; i < rows.length; i += 1000) {
    const b = rows.slice(i, i + 1000);
    await sql`
      INSERT INTO inbox_suggestion_lag (item_id, skey, proposed, first_checked_at, first_value, last_checked_at, last_value, status, actioned_at, changed_at)
      SELECT u.item_id, u.skey, u.proposed, u.first_at::timestamptz, u.first_value, ${now}::timestamptz, u.last_value, u.status,
        u.actioned_at::timestamptz, u.changed_at::timestamptz
      FROM unnest(${b.map((r) => r.itemId)}::int[], ${b.map((r) => r.key)}::text[], ${b.map((r) => r.proposed)}::text[],
        ${b.map((r) => r.firstAt)}::text[], ${b.map((r) => r.firstValue)}::text[], ${b.map((r) => r.current)}::text[],
        ${b.map((r) => r.status)}::text[], ${b.map((r) => r.actionedAt)}::text[], ${b.map((r) => r.changedAt)}::text[])
        AS u(item_id, skey, proposed, first_at, first_value, last_value, status, actioned_at, changed_at)
      ON CONFLICT (item_id, skey) DO UPDATE SET
        proposed = EXCLUDED.proposed, last_checked_at = EXCLUDED.last_checked_at, last_value = EXCLUDED.last_value,
        status = EXCLUDED.status, actioned_at = EXCLUDED.actioned_at, changed_at = EXCLUDED.changed_at`;
  }
  await sql`
    INSERT INTO inbox_lag_checks (checked_at, checked, actioned_now, changed_now, not_found)
    VALUES (${now}, ${rows.length}, ${actionedNow}, ${changedNow}, ${notFound})`;
  return { checkedAt: now, checked: rows.length, actionedNow, changedNow, alreadySetNow, notFound, opps: opps.length, records: records.length };
}

/** Formal start of measurement: the lag table only counts items received at or after it. Unset = not a formal measurement yet. */
export async function getMeasurementStart(): Promise<string | null> {
  await ensureLagTables();
  const rows = await getDb()`SELECT value FROM inbox_settings WHERE key = 'lag_measurement_start'`;
  return (rows[0]?.value as string) || null;
}

export async function setMeasurementStart(value: string | null, by: string): Promise<void> {
  await ensureLagTables();
  await getDb()`
    INSERT INTO inbox_settings (key, value, updated_at, updated_by) VALUES ('lag_measurement_start', ${value}, NOW(), ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const hoursBetween = (a: unknown, b: unknown) => (new Date(b as string).getTime() - new Date(a as string).getTime()) / 3_600_000;

export async function lagSummary(days: number) {
  const measurementStart = await getMeasurementStart();
  const sql = getDb();
  const windowStart = Date.now() - days * 86_400_000;
  const since = new Date(Math.max(windowStart, measurementStart ? new Date(measurementStart).getTime() : 0)).toISOString();
  const items = await sql`
    SELECT id, subject, received_at, suggested_at, suggestions,
      to_char(received_at AT TIME ZONE 'Australia/Sydney', 'YYYY-MM-DD') AS day
    FROM inbox_items WHERE received_at >= ${since}`;
  const lagRows = await sql`
    SELECT l.* FROM inbox_suggestion_lag l JOIN inbox_items i ON i.id = l.item_id WHERE i.received_at >= ${since}`;
  const lag = new Map(lagRows.map((r) => [`${r.item_id}|${r.skey}`, r]));
  const lastCheck = (await sql`SELECT * FROM inbox_lag_checks ORDER BY checked_at DESC LIMIT 1`)[0] || null;

  const byDay = new Map<string, { day: string; arrived: number; suggested: number; checkable: number; actioned: number;
    alreadySet: number; open: number; changedOther: number; notInGhl: number; sugHrs: number[]; actHrs: number[] }>();
  const open: { itemId: number; day: string; subject: string; field: string; proposed: string; current: string | null; status: string }[] = [];

  for (const it of items) {
    const d = byDay.get(it.day) || { day: it.day, arrived: 0, suggested: 0, checkable: 0, actioned: 0, alreadySet: 0, open: 0,
      changedOther: 0, notInGhl: 0, sugHrs: [] as number[], actHrs: [] as number[] };
    byDay.set(it.day, d);
    d.arrived++;
    const sugg = (it.suggestions || []) as Suggestion[];
    if (!sugg.length) continue;
    d.suggested++;
    if (it.suggested_at) d.sugHrs.push(Math.max(0, hoursBetween(it.received_at, it.suggested_at)));
    for (const s of sugg) {
      if (s.notInGhl) { d.notInGhl++; continue; }
      d.checkable++;
      const l = lag.get(`${it.id}|${suggestionKey(s)}`);
      if (l?.status === 'actioned') {
        d.actioned++;
        d.actHrs.push(Math.max(0, hoursBetween(it.received_at, l.actioned_at)));
      } else if (l?.status === 'already_set') {
        d.alreadySet++;
      } else {
        d.open++;
        if (l?.status === 'changed_other') d.changedOther++;
        open.push({ itemId: it.id, day: it.day, subject: it.subject || '', field: s.fieldLabel, proposed: show(s.proposed),
          current: l ? l.last_value : null, status: l ? l.status : 'not checked' });
      }
    }
  }

  const out = [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day)).map(({ sugHrs, actHrs, ...d }) => ({
    ...d, medianSuggestHrs: median(sugHrs), medianActionHrs: median(actHrs),
  }));
  return { days: out, open, lastCheck, measurementStart };
}
