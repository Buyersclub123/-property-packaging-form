// Settlement confirmed -> Settled (JT, 10/11). When a user ticks the opportunity checkbox settlement_confirmed in
// CTRT, the same save (1) writes the checkbox (done by the update route), (2) moves the opportunity to
// Property Team > Settled and (3) sets the linked Property Record status = 04_settled, status_change_date = today.
// (2) and (3) only log what they would change until the switch in Admin > Automated updates is turned on.
// Every run is logged step by step in ctr_settled_log with before / after / read back.
import { getDb } from '@/lib/db';
import { ghlFetch } from '@/lib/ghlFetch';
import { PIPELINE_ID } from '@/lib/ghlPipelines';
import { ensureStampTables } from '@/lib/ctrStamp';
import { PROPERTY_OBJECT_ID } from '@/app/api/contract-team-reporting/fields';
import { sendCtrAlert } from '@/app/api/contract-team-reporting/alerts';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOC = process.env.GHL_LOCATION_ID || '';
const VERSION = process.env.GHL_API_VERSION || '2021-07-28';

export const SETTLEMENT_CONFIRMED_KEY = 'opp_settlement_confirmed';
export const SETTLEMENT_CONFIRMED_FIELD_ID = 'Epjvk1xiuVzfKFV5LSG4';
const SETTLED_STATUS = '04_settled';

export type SettledStep = { step: string; field: string; before: string; after: string; readBack: string; result: string };
export type SettledSummary = { runId: string; dryRun: boolean; steps: SettledStep[] };
type Opp = { name?: string; pipelineId?: string; pipelineStageId?: string; customFields?: { id: string; fieldValue?: unknown; fieldValueArray?: unknown; fieldValueString?: unknown; value?: unknown }[] };

const headers = () => ({ Authorization: `Bearer ${TOKEN}`, Version: VERSION, 'Content-Type': 'application/json' });

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.map(str).filter(Boolean).join(', ');
  return String(v);
}

export async function ensureSettledTables(): Promise<void> {
  await ensureStampTables();
  await getDb()`CREATE TABLE IF NOT EXISTS ctr_settled_log (id serial PRIMARY KEY, run_id text NOT NULL, at timestamptz NOT NULL DEFAULT now(), user_email text, opportunity_id text NOT NULL, record_id text, step text NOT NULL, field text, old_value text, new_value text, read_back text, dry_run boolean NOT NULL, result text NOT NULL)`;
  await getDb()`ALTER TABLE ctr_settled_log ADD COLUMN IF NOT EXISTS opportunity_name text`;
}

// Same settings table as the nightly stamp; a missing row = dry run.
export async function settledApplyEnabled(): Promise<boolean> {
  await ensureSettledTables();
  const rows = (await getDb()`SELECT value FROM ctr_stamp_settings WHERE key = 'settled_apply'`) as { value: string }[];
  return rows[0]?.value === 'true';
}

export async function setSettledApply(on: boolean, by: string): Promise<void> {
  await ensureSettledTables();
  await getDb()`INSERT INTO ctr_stamp_settings (key, value, updated_by) VALUES ('settled_apply', ${String(on)}, ${by})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
}

export async function readOpportunity(id: string): Promise<Opp | null> {
  try {
    const res = await ghlFetch(`${BASE}/opportunities/${id}`, { headers: headers(), cache: 'no-store' }, 'ctr-settled-opp');
    if (!res.ok) return null;
    const data = await res.json();
    return (data.opportunity || data) as Opp;
  } catch {
    return null;
  }
}

export function checkboxValue(opp: Opp | null): string {
  const cf = opp?.customFields?.find((f) => f.id === SETTLEMENT_CONFIRMED_FIELD_ID);
  return str(cf?.fieldValueArray ?? cf?.fieldValue ?? cf?.fieldValueString ?? cf?.value);
}

async function readRecord(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${id}?locationId=${LOC}`, { headers: headers(), cache: 'no-store' }, 'ctr-settled-record');
    if (!res.ok) return null;
    const data = await res.json();
    return (data.record || data).properties || {};
  } catch {
    return null;
  }
}

async function stageNames(): Promise<{ settledId: string | null; name: (pipelineId?: string, stageId?: string) => string }> {
  const res = await ghlFetch(`${BASE}/opportunities/pipelines?locationId=${LOC}`, { headers: headers(), cache: 'no-store' }, 'ctr-settled-pipelines');
  if (!res.ok) throw new Error(`GHL pipelines ${res.status}`);
  const pipelines = ((await res.json()).pipelines || []) as { id: string; name: string; stages: { id: string; name: string }[] }[];
  const pt = pipelines.find((p) => p.id === PIPELINE_ID.PROPERTY_TEAM);
  const settledId = pt?.stages.find((s) => s.name.trim().toLowerCase() === 'settled')?.id || null;
  const short = (n: string) => n.replace(/^\d+\.\s*/, '').replace(/\s*Pipeline$/i, '').trim();
  return {
    settledId,
    name: (pipelineId, stageId) => {
      const p = pipelines.find((x) => x.id === pipelineId);
      const s = p?.stages.find((x) => x.id === stageId);
      return p ? `${short(p.name)} > ${s?.name || stageId || '?'}` : `${pipelineId || '?'} > ${stageId || '?'}`;
    },
  };
}

// Runs after the checkbox was written. oppBefore = the opportunity read before the save.
export async function runSettled(args: { email: string | null; opportunityId: string; propertyRecordId: string | null; oppBefore: Opp | null; statusInSameSave: boolean }): Promise<SettledSummary> {
  const { email, opportunityId, propertyRecordId, oppBefore, statusInSameSave } = args;
  const runId = `settled-${Date.now()}`;
  const dryRun = !(await settledApplyEnabled());
  const steps: SettledStep[] = [];
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });

  // (1) checkbox, read back
  const afterOpp = await readOpportunity(opportunityId);
  const ticked = checkboxValue(afterOpp);
  steps.push({ step: '1 checkbox', field: 'settlement_confirmed', before: checkboxValue(oppBefore) || '(blank)', after: 'Yes', readBack: afterOpp ? ticked || '(blank)' : '(could not read)', result: ticked === 'Yes' ? 'written' : 'read back does not match' });

  // (2) Property Team > Settled
  try {
    const names = await stageNames();
    const from = names.name(oppBefore?.pipelineId, oppBefore?.pipelineStageId);
    const to = names.name(PIPELINE_ID.PROPERTY_TEAM, names.settledId || undefined);
    if (!names.settledId) {
      steps.push({ step: '2 stage', field: 'pipeline stage', before: from, after: 'Property Team > Settled', readBack: '', result: 'failed: no Settled stage in the Property Team pipeline' });
    } else if (afterOpp?.pipelineId === PIPELINE_ID.PROPERTY_TEAM && afterOpp?.pipelineStageId === names.settledId) {
      steps.push({ step: '2 stage', field: 'pipeline stage', before: from, after: to, readBack: from, result: 'skipped: already at Property Team > Settled' });
    } else if (dryRun) {
      steps.push({ step: '2 stage', field: 'pipeline stage', before: from, after: to, readBack: '', result: 'dry run: would move' });
    } else {
      const res = await ghlFetch(`${BASE}/opportunities/${opportunityId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ pipelineId: PIPELINE_ID.PROPERTY_TEAM, pipelineStageId: names.settledId }) }, 'ctr-settled-move');
      if (!res.ok) {
        steps.push({ step: '2 stage', field: 'pipeline stage', before: from, after: to, readBack: '', result: `failed: GHL ${res.status} ${(await res.text()).slice(0, 200)}` });
      } else {
        const back = await readOpportunity(opportunityId);
        const ok = back?.pipelineId === PIPELINE_ID.PROPERTY_TEAM && back?.pipelineStageId === names.settledId;
        steps.push({ step: '2 stage', field: 'pipeline stage', before: from, after: to, readBack: back ? names.name(back.pipelineId, back.pipelineStageId) : '(could not read)', result: ok ? 'applied' : 'read back does not match' });
      }
    }
  } catch (e) {
    steps.push({ step: '2 stage', field: 'pipeline stage', before: '', after: 'Property Team > Settled', readBack: '', result: `failed: ${e instanceof Error ? e.message : String(e)}` });
  }

  // (3) Property Record status = 04_settled, status_change_date = today
  const pr = (result: string, before = '', after = `status ${SETTLED_STATUS}, status_change_date ${today}`, readBack = '') =>
    steps.push({ step: '3 property record', field: 'status, status_change_date', before, after, readBack, result });
  if (!propertyRecordId) {
    pr('skipped: no linked Property Record');
  } else if (statusInSameSave) {
    pr('skipped: Status was set in the same save');
  } else {
    const rec = await readRecord(propertyRecordId);
    const before = rec ? `status ${str(rec.status) || '(blank)'}, status_change_date ${str(rec.status_change_date).slice(0, 10) || '(blank)'}` : '(could not read)';
    if (!rec) pr('failed: could not read the Property Record', before);
    else if (str(rec.status) === SETTLED_STATUS) pr('skipped: already 04_settled (date kept)', before);
    else if (dryRun) pr('dry run: would set', before);
    else {
      const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${propertyRecordId}?locationId=${LOC}`, {
        method: 'PUT', headers: headers(), body: JSON.stringify({ properties: { status: SETTLED_STATUS, status_change_date: new Date(today).toISOString() } }),
      }, 'ctr-settled-record-put');
      if (!res.ok) pr(`failed: GHL ${res.status} ${(await res.text()).slice(0, 200)}`, before);
      else {
        const back = await readRecord(propertyRecordId);
        const readBack = back ? `status ${str(back.status)}, status_change_date ${str(back.status_change_date).slice(0, 10)}` : '(could not read)';
        pr(back && str(back.status) === SETTLED_STATUS && str(back.status_change_date).startsWith(today) ? 'applied' : 'read back does not match', before, undefined, readBack);
      }
    }
  }

  const oppName = afterOpp?.name || oppBefore?.name || null;
  try {
    const sql = getDb();
    for (const s of steps) {
      await sql`INSERT INTO ctr_settled_log (run_id, user_email, opportunity_id, opportunity_name, record_id, step, field, old_value, new_value, read_back, dry_run, result)
        VALUES (${runId}, ${email}, ${opportunityId}, ${oppName}, ${propertyRecordId}, ${s.step}, ${s.field}, ${s.before}, ${s.after}, ${s.readBack}, ${dryRun}, ${s.result})`;
    }
    await sql`INSERT INTO ctr_settled_log (run_id, user_email, opportunity_id, opportunity_name, record_id, step, dry_run, result)
      VALUES (${runId}, ${email}, ${opportunityId}, ${oppName}, ${propertyRecordId}, 'run', ${dryRun}, ${steps.map((s) => `${s.step}: ${s.result}`).join('; ')})`;
  } catch (e) {
    console.error('CTR settled log failed:', e);
  }

  const failed = steps.filter((s) => /^failed|does not match/.test(s.result));
  if (failed.length) {
    sendCtrAlert({
      type: 'settled-automation-failed',
      subject: 'Settlement confirmed -> Settled: a step failed',
      reason: 'A user ticked Settlement confirmed in CTRT and part of the automatic update did not complete.',
      impact: 'The opportunity stage and/or Property Record status may not match Settlement confirmed.',
      action: 'Check Admin > Automated updates (Settlement confirmed log) and fix the record in GHL.',
      detailsHtml: `<p>Opportunity: ${oppName || ''} (${opportunityId})</p><ul>${failed.map((s) => `<li>${s.step}: ${s.result}</li>`).join('')}</ul>`,
    });
  }
  return { runId, dryRun, steps };
}
