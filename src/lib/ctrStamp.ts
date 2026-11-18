// Nightly change-date stamp (JT approved 1/11). For each tracked field it compares the current GHL value
// with last night's snapshot. Where the value changed AND the paired change-date is blank, it writes the date
// the change was first detected (the first dry-run log row for it, else today). It never overwrites a date
// that is already set. The first sight of a record only records a baseline.
// Runs dry (log only) until the "apply" setting is switched on in Admin > Automated updates. Every decision is
// logged in ctr_stamp_log. backdateStamps() is the one-off catch-up from the dry-run log (JT 17/11).
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { REPORTING_PIPELINE_IDS } from '@/lib/ghlPipelines';
import { PROPERTY_OBJECT_ID, PROPERTY_LINK_FIELD_ID } from '@/app/api/contract-team-reporting/fields';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOC = process.env.GHL_LOCATION_ID || '';
const MAX_PAGES = 200;

// opportunity.finance_status__residential -> opportunity.finance_status_change_date
const OPP_FIELD = { id: 'zTgTXnbDCLlXs3Ehx9sl', field: 'finance_status__residential', dateId: 'fXXr8HchG3ZmSYvsIYHo', dateField: 'finance_status_change_date' };
// Property Record field -> its change-date field
const RECORD_FIELDS: Record<string, string> = {
  construction_stage: 'construction_stage_change_date',
  status: 'status_change_date',
};

type Tracked = { object: 'opportunity' | 'property_record'; recordId: string; name: string; field: string; value: string; dateField: string; dateValue: string };
export type StampSummary = { runId: string; dryRun: boolean; checked: number; baselined: number; stamped: number; skippedDateSet: number; failed: number; errors: string[] };

const headers = () => ({ Authorization: `Bearer ${TOKEN}`, Version: '2021-07-28', 'Content-Type': 'application/json' });

export async function ensureStampTables(): Promise<void> {
  const sql = getDb();
  await sql`CREATE TABLE IF NOT EXISTS ctr_stamp_snapshots (object text NOT NULL, record_id text NOT NULL, field text NOT NULL, value text NOT NULL, seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (object, record_id, field))`;
  await sql`CREATE TABLE IF NOT EXISTS ctr_stamp_log (id serial PRIMARY KEY, run_id text NOT NULL, at timestamptz NOT NULL DEFAULT now(), object text NOT NULL, record_id text NOT NULL, field text NOT NULL, old_value text, new_value text, date_field text NOT NULL, date_written text, dry_run boolean NOT NULL, result text NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS ctr_stamp_settings (key text PRIMARY KEY, value text NOT NULL, updated_by text, updated_at timestamptz NOT NULL DEFAULT now())`;
}

export async function stampApplyEnabled(): Promise<boolean> {
  const rows = (await getDb()`SELECT value FROM ctr_stamp_settings WHERE key = 'apply'`) as { value: string }[];
  return rows[0]?.value === 'true';
}

export async function setStampApply(on: boolean, by: string): Promise<void> {
  await getDb()`INSERT INTO ctr_stamp_settings (key, value, updated_by) VALUES ('apply', ${String(on)}, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(', ');
  return String(v);
}

const keyOf = (object: string, recordId: string, field: string) => `${object}|${recordId}|${field}`;
const sydneyToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });

async function readOpportunities(): Promise<Tracked[]> {
  const out: Tracked[] = [];
  for (const pipelineId of REPORTING_PIPELINE_IDS) {
    let startAfter: number | undefined;
    let startAfterId: string | undefined;
    for (let page = 0; ; page++) {
      if (page >= MAX_PAGES) throw new Error(`Opportunities in pipeline ${pipelineId} exceed ${MAX_PAGES * 100}`);
      const url = new URL(`${BASE}/opportunities/search`);
      url.searchParams.set('location_id', LOC);
      url.searchParams.set('pipeline_id', pipelineId);
      url.searchParams.set('status', 'open');
      url.searchParams.set('limit', '100');
      if (startAfter !== undefined && startAfterId) {
        url.searchParams.set('startAfter', String(startAfter));
        url.searchParams.set('startAfterId', startAfterId);
      }
      const res = await ghlFetch(url.toString(), { headers: headers(), cache: 'no-store' }, 'ctr-stamp-opps');
      if (!res.ok) throw new Error(`GHL opportunities ${res.status}`);
      const data = await res.json();
      const opps = (data.opportunities || []) as { id: string; name?: string; customFields?: { id: string; fieldValueString?: string; fieldValueDate?: number; fieldValue?: unknown; value?: unknown }[] }[];
      for (const o of opps) {
        const cf = (id: string) => o.customFields?.find((c) => c.id === id);
        const v = cf(OPP_FIELD.id);
        const d = cf(OPP_FIELD.dateId);
        out.push({
          object: 'opportunity', recordId: o.id, name: o.name || '', field: OPP_FIELD.field,
          value: v?.fieldValueString || str(v?.fieldValue ?? v?.value),
          dateField: OPP_FIELD.dateField,
          dateValue: d?.fieldValueDate ? String(d.fieldValueDate) : str(d?.fieldValueString ?? d?.fieldValue ?? d?.value),
        });
      }
      if (opps.length < 100 || !data.meta?.startAfterId) break;
      startAfter = data.meta.startAfter;
      startAfterId = data.meta.startAfterId;
    }
  }
  return out;
}

async function readRecords(): Promise<Tracked[]> {
  const out: Tracked[] = [];
  for (let page = 1; ; page++) {
    if (page > MAX_PAGES) throw new Error(`Property Records exceed ${MAX_PAGES * 100}`);
    const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/search`, {
      method: 'POST', headers: headers(), cache: 'no-store',
      body: JSON.stringify({ locationId: LOC, page, pageLimit: 100 }),
    }, 'ctr-stamp-records');
    if (!res.ok) throw new Error(`GHL Property Records ${res.status}`);
    const records = ((await res.json()).records || []) as { id: string; properties?: Record<string, unknown> }[];
    for (const r of records) {
      const p: Record<string, string> = {};
      for (const [k, v] of Object.entries(r.properties || {})) p[k === PROPERTY_LINK_FIELD_ID ? 'linked_opportunity_id' : k.split('.').pop() || k] = str(v);
      for (const [field, dateField] of Object.entries(RECORD_FIELDS)) {
        out.push({ object: 'property_record', recordId: r.id, name: p.property_address || '', field, value: p[field] || '', dateField, dateValue: p[dateField] || '' });
      }
    }
    if (records.length < 100) break;
  }
  return out;
}

async function writeDate(t: Tracked, iso: string): Promise<void> {
  const res = t.object === 'opportunity'
    ? await ghlFetch(`${BASE}/opportunities/${t.recordId}?locationId=${LOC}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ customFields: [{ id: OPP_FIELD.dateId, field_value: iso }] }),
      }, 'ctr-stamp-write-opp')
    : await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${t.recordId}?locationId=${LOC}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ properties: { [t.dateField]: iso } }),
      }, 'ctr-stamp-write-record');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

function toYmd(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10);
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d+$/.test(s)) return new Date(Number(s)).toISOString().slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

async function readBackDate(t: Tracked): Promise<string> {
  if (t.object === 'opportunity') {
    const res = await ghlFetch(`${BASE}/opportunities/${t.recordId}`, { headers: headers(), cache: 'no-store' }, 'ctr-stamp-readback-opp');
    if (!res.ok) throw new Error(`read back HTTP ${res.status}`);
    const cf = ((await res.json()).opportunity?.customFields || []) as { id: string; fieldValueDate?: number; fieldValueString?: string; fieldValue?: unknown; value?: unknown }[];
    const d = cf.find((c) => c.id === OPP_FIELD.dateId);
    return toYmd(d?.fieldValueDate ?? d?.fieldValueString ?? d?.fieldValue ?? d?.value);
  }
  const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${t.recordId}?locationId=${LOC}`, { headers: headers(), cache: 'no-store' }, 'ctr-stamp-readback-record');
  if (!res.ok) throw new Error(`read back HTTP ${res.status}`);
  const props = ((await res.json()).record?.properties || {}) as Record<string, unknown>;
  const k = Object.keys(props).find((x) => (x.split('.').pop() || x) === t.dateField);
  return toYmd(k ? props[k] : '');
}

// First detection (Sydney date) of each still-pending change: the earliest dry-run "would write" row whose
// old value is still the snapshot value (a dry run keeps the snapshot, so the change is logged every night).
async function firstDetections(): Promise<Map<string, string>> {
  const rows = (await getDb()`SELECT l.object, l.record_id, l.field, min(l.date_written) AS first
    FROM ctr_stamp_log l JOIN ctr_stamp_snapshots s ON s.object = l.object AND s.record_id = l.record_id AND s.field = l.field AND s.value = coalesce(l.old_value, '')
    WHERE l.dry_run AND l.result LIKE 'dry run%' AND l.date_written IS NOT NULL
    GROUP BY 1, 2, 3`) as { object: string; record_id: string; field: string; first: string }[];
  return new Map(rows.map((r) => [keyOf(r.object, r.record_id, r.field), r.first]));
}

export async function runStamp(opts: { forceDryRun?: boolean } = {}): Promise<StampSummary> {
  await ensureStampTables();
  const sql = getDb();
  const dryRun = opts.forceDryRun || !(await stampApplyEnabled());
  const runId = new Date().toISOString();
  const summary: StampSummary = { runId, dryRun, checked: 0, baselined: 0, stamped: 0, skippedDateSet: 0, failed: 0, errors: [] };
  const today = sydneyToday();
  const first = dryRun ? new Map<string, string>() : await firstDetections();

  const tracked = [...(await readOpportunities()), ...(await readRecords())];
  const snaps = (await sql`SELECT object, record_id, field, value FROM ctr_stamp_snapshots`) as { object: string; record_id: string; field: string; value: string }[];
  const prev = new Map(snaps.map((s) => [keyOf(s.object, s.record_id, s.field), s.value]));

  for (const t of tracked) {
    summary.checked++;
    const before = prev.get(keyOf(t.object, t.recordId, t.field));
    if (before === undefined) summary.baselined++;
    else if (before !== t.value) {
      if (t.dateValue) {
        summary.skippedDateSet++;
        await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result)
          VALUES (${runId}, ${t.object}, ${t.recordId}, ${t.field}, ${before}, ${t.value}, ${t.dateField}, ${null}, ${dryRun}, 'skipped: date already set')`;
      } else {
        const date = first.get(keyOf(t.object, t.recordId, t.field)) || today;
        let result = dryRun ? 'dry run: would write' : 'written';
        if (!dryRun) {
          try { await writeDate(t, new Date(date).toISOString()); summary.stamped++; } catch (e) { result = `failed: ${e instanceof Error ? e.message : String(e)}`; summary.failed++; summary.errors.push(`${t.recordId}: ${result}`); }
        } else summary.stamped++;
        await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result)
          VALUES (${runId}, ${t.object}, ${t.recordId}, ${t.field}, ${before}, ${t.value}, ${t.dateField}, ${date}, ${dryRun}, ${result})`;
        // A failed write keeps the old snapshot so the change is retried next night.
        // A dry run keeps it too, so the change is still stamped once writing is switched on.
        if (result.startsWith('failed') || dryRun) continue;
      }
    }
    await sql`INSERT INTO ctr_stamp_snapshots (object, record_id, field, value) VALUES (${t.object}, ${t.recordId}, ${t.field}, ${t.value})
      ON CONFLICT (object, record_id, field) DO UPDATE SET value = EXCLUDED.value, seen_at = now()`;
  }
  await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, date_field, dry_run, result)
    VALUES (${runId}, 'run', '-', '-', '-', ${dryRun}, ${`summary: checked ${summary.checked}, baselined ${summary.baselined}, stamped ${summary.stamped}, date already set ${summary.skippedDateSet}, failed ${summary.failed}`})`;
  return summary;
}

export type BackdateItem = { object: string; recordId: string; name: string; field: string; from: string; to: string; dateField: string; firstDetected: string; result?: string; readBack?: string };
export type BackdateSummary = {
  runId: string; write: boolean; since: string;
  counts: { pending: number; toWrite: number; written: number; failed: number; preSince: number; dateAlreadySet: number; noLongerChanged: number };
  items: BackdateItem[]; preSince: BackdateItem[];
};

// One-off catch-up (JT 17/11): every change in the dry-run log first detected on/after `since` whose change-date
// is still blank gets the date of first detection. Set dates are never touched. Changes first detected before
// `since` are listed only. write=false is a dry run; write=true writes each date and reads it back from GHL.
export async function backdateStamps(opts: { since: string; write: boolean }): Promise<BackdateSummary> {
  await ensureStampTables();
  const sql = getDb();
  const runId = `backdate ${new Date().toISOString()}`;
  const first = await firstDetections();
  const tracked = [...(await readOpportunities()), ...(await readRecords())];
  const snaps = (await sql`SELECT object, record_id, field, value FROM ctr_stamp_snapshots`) as { object: string; record_id: string; field: string; value: string }[];
  const prev = new Map(snaps.map((s) => [keyOf(s.object, s.record_id, s.field), s.value]));
  const out: BackdateSummary = { runId, write: opts.write, since: opts.since, counts: { pending: first.size, toWrite: 0, written: 0, failed: 0, preSince: 0, dateAlreadySet: 0, noLongerChanged: 0 }, items: [], preSince: [] };

  for (const t of tracked) {
    const firstDetected = first.get(keyOf(t.object, t.recordId, t.field));
    if (!firstDetected) continue;
    const from = prev.get(keyOf(t.object, t.recordId, t.field)) ?? '';
    const item: BackdateItem = { object: t.object, recordId: t.recordId, name: t.name, field: t.field, from, to: t.value, dateField: t.dateField, firstDetected };
    if (from === t.value) { out.counts.noLongerChanged++; continue; }
    if (t.dateValue) { out.counts.dateAlreadySet++; continue; }
    if (firstDetected < opts.since) { out.counts.preSince++; out.preSince.push(item); continue; }
    out.counts.toWrite++;
    out.items.push(item);
    if (!opts.write) continue;
    try {
      await writeDate(t, new Date(firstDetected).toISOString());
      item.readBack = await readBackDate(t);
      item.result = item.readBack === firstDetected ? 'written, read back' : `read back mismatch: ${item.readBack || '(blank)'}`;
    } catch (e) {
      item.result = `failed: ${e instanceof Error ? e.message : String(e)}`;
    }
    const ok = item.result === 'written, read back';
    if (ok) out.counts.written++; else out.counts.failed++;
    await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result)
      VALUES (${runId}, ${t.object}, ${t.recordId}, ${t.field}, ${from}, ${t.value}, ${t.dateField}, ${firstDetected}, false, ${`backdate: ${item.result}`})`;
    if (ok) await sql`INSERT INTO ctr_stamp_snapshots (object, record_id, field, value) VALUES (${t.object}, ${t.recordId}, ${t.field}, ${t.value})
      ON CONFLICT (object, record_id, field) DO UPDATE SET value = EXCLUDED.value, seen_at = now()`;
  }
  await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, date_field, dry_run, result)
    VALUES (${runId}, 'run', '-', '-', '-', ${!opts.write}, ${`backdate since ${opts.since}: to write ${out.counts.toWrite}, written ${out.counts.written}, failed ${out.counts.failed}, before ${opts.since} ${out.counts.preSince}, date already set ${out.counts.dateAlreadySet}, no longer changed ${out.counts.noLongerChanged}`})`;
  return out;
}
