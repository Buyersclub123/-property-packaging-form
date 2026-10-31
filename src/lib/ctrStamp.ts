// Nightly change-date stamp (JT approved 1/11). For each tracked field it compares the current GHL value
// with last night's snapshot. Where the value changed AND the paired change-date is blank, it writes today's
// date. It never overwrites a date that is already set. The first sight of a record only records a baseline.
// Runs dry (log only) until the "apply" setting is switched on in Admin > Automated updates. Every decision is
// logged in ctr_stamp_log.
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

type Tracked = { object: 'opportunity' | 'property_record'; recordId: string; field: string; value: string; dateField: string; dateValue: string };
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
      const opps = (data.opportunities || []) as { id: string; customFields?: { id: string; fieldValueString?: string; fieldValueDate?: number; fieldValue?: unknown; value?: unknown }[] }[];
      for (const o of opps) {
        const cf = (id: string) => o.customFields?.find((c) => c.id === id);
        const v = cf(OPP_FIELD.id);
        const d = cf(OPP_FIELD.dateId);
        out.push({
          object: 'opportunity', recordId: o.id, field: OPP_FIELD.field,
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
        out.push({ object: 'property_record', recordId: r.id, field, value: p[field] || '', dateField, dateValue: p[dateField] || '' });
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

export async function runStamp(opts: { forceDryRun?: boolean } = {}): Promise<StampSummary> {
  await ensureStampTables();
  const sql = getDb();
  const dryRun = opts.forceDryRun || !(await stampApplyEnabled());
  const runId = new Date().toISOString();
  const summary: StampSummary = { runId, dryRun, checked: 0, baselined: 0, stamped: 0, skippedDateSet: 0, failed: 0, errors: [] };
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const iso = new Date(today).toISOString();

  const tracked = [...(await readOpportunities()), ...(await readRecords())];
  const snaps = (await sql`SELECT object, record_id, field, value FROM ctr_stamp_snapshots`) as { object: string; record_id: string; field: string; value: string }[];
  const prev = new Map(snaps.map((s) => [`${s.object}|${s.record_id}|${s.field}`, s.value]));

  for (const t of tracked) {
    summary.checked++;
    const before = prev.get(`${t.object}|${t.recordId}|${t.field}`);
    if (before === undefined) summary.baselined++;
    else if (before !== t.value) {
      if (t.dateValue) {
        summary.skippedDateSet++;
        await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result)
          VALUES (${runId}, ${t.object}, ${t.recordId}, ${t.field}, ${before}, ${t.value}, ${t.dateField}, ${null}, ${dryRun}, 'skipped: date already set')`;
      } else {
        let result = dryRun ? 'dry run: would write' : 'written';
        if (!dryRun) {
          try { await writeDate(t, iso); summary.stamped++; } catch (e) { result = `failed: ${e instanceof Error ? e.message : String(e)}`; summary.failed++; summary.errors.push(`${t.recordId}: ${result}`); }
        } else summary.stamped++;
        await sql`INSERT INTO ctr_stamp_log (run_id, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result)
          VALUES (${runId}, ${t.object}, ${t.recordId}, ${t.field}, ${before}, ${t.value}, ${t.dateField}, ${today}, ${dryRun}, ${result})`;
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
