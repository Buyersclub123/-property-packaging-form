// Settlement confirmed -> Settled (JT 10/11, rebuilt to the Unconditional stage rule JT 17/11).
// Ticking settlement_confirmed in CTRT (the update route writes the checkbox) reads Property type + Contract type
// on the linked Property Record and then:
//   Established, or New single contract with no Construction stage -> opp Property Team > Settled; record 04_settled
//   New split contract with no Construction stage                  -> opp stays; record construction_stage preba,
//                                                                     land_registration Registered; status unchanged
//   New with a Construction stage set (before handover)            -> nothing moves; reported
//   Blank Property type, or New with blank Contract type           -> nothing moves; reported
// Setting construction_stage to handover in CTRT                   -> opp Property Team > Settled; record 04_settled
// GHL writes only log what they would change until the switch in Admin > Automated updates is turned on.
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
export const HANDOVER_STAGE = 'handover';
const SETTLED_STATUS = '04_settled';
const SPLIT_STAGE = 'preba';
const REGISTERED = 'Registered';

export type SettledStep = { step: string; field: string; before: string; after: string; readBack: string; result: string };
export type SettledSummary = { runId: string; dryRun: boolean; trigger: 'tick' | 'handover'; outcome: string; steps: SettledStep[]; verifiedValues: Record<string, string> };
type Opp = { name?: string; pipelineId?: string; pipelineStageId?: string; customFields?: { id: string; fieldValue?: unknown; fieldValueArray?: unknown; fieldValueString?: unknown; value?: unknown }[] };
type Rec = Record<string, string>;

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

async function readRecord(id: string): Promise<Rec | null> {
  try {
    const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${id}?locationId=${LOC}`, { headers: headers(), cache: 'no-store' }, 'ctr-settled-record');
    if (!res.ok) return null;
    const data = await res.json();
    const out: Rec = {};
    for (const [k, v] of Object.entries((data.record || data).properties || {})) out[k.split('.').pop() || k] = str(v);
    return out;
  } catch {
    return null;
  }
}

async function putRecord(id: string, properties: Record<string, string>): Promise<string> {
  const res = await ghlFetch(`${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${id}?locationId=${LOC}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify({ properties }),
  }, 'ctr-settled-record-put');
  return res.ok ? '' : `failed: GHL ${res.status} ${(await res.text()).slice(0, 200)}`;
}

async function stageNames(): Promise<{ settledId: string | null; settledDisplay: Record<string, string>; name: (pipelineId?: string, stageId?: string) => string }> {
  const res = await ghlFetch(`${BASE}/opportunities/pipelines?locationId=${LOC}`, { headers: headers(), cache: 'no-store' }, 'ctr-settled-pipelines');
  if (!res.ok) throw new Error(`GHL pipelines ${res.status}`);
  const pipelines = ((await res.json()).pipelines || []) as { id: string; name: string; stages: { id: string; name: string }[] }[];
  const pt = pipelines.find((p) => p.id === PIPELINE_ID.PROPERTY_TEAM);
  const settledStage = pt?.stages.find((s) => s.name.trim().toLowerCase() === 'settled');
  const settledId = settledStage?.id || null;
  const short = (n: string) => n.replace(/^\d+\.\s*/, '').replace(/\s*Pipeline$/i, '').trim();
  return {
    settledId,
    settledDisplay: pt && settledStage ? { pipelineId: pt.id, pipelineName: short(pt.name), pipelineStageId: settledStage.id, pipelineStage: settledStage.name } : {},
    name: (pipelineId, stageId) => {
      const p = pipelines.find((x) => x.id === pipelineId);
      const s = p?.stages.find((x) => x.id === stageId);
      return p ? `${short(p.name)} > ${s?.name || stageId || '?'}` : `${pipelineId || '?'} > ${stageId || '?'}`;
    },
  };
}

type Plan = { action: 'settle' | 'split' | 'report'; why: string };

// The Unconditional stage rule, from the linked record's Property type, Contract type and Construction stage.
export function settledPlan(rec: Rec): Plan {
  const type = rec.property_type || '';
  const contract = rec.contract_type || '';
  const stage = rec.construction_stage || '';
  if (!type) return { action: 'report', why: 'Property type is blank on the Property Record' };
  if (type === 'established') return { action: 'settle', why: 'Established' };
  if (type !== 'new') return { action: 'report', why: `Property type "${type}" is not Established or New` };
  if (stage === HANDOVER_STAGE) return { action: 'settle', why: 'New, Construction stage is handover' };
  if (stage) return { action: 'report', why: `New with Construction stage "${stage}" (before handover): build in progress, or the contract type may be wrong` };
  if (!contract) return { action: 'report', why: 'New with a blank Contract type' };
  if (contract === 'single_contract') return { action: 'settle', why: 'New single contract, no Construction stage' };
  if (contract === 'split_contract') return { action: 'split', why: 'New split contract, no Construction stage' };
  return { action: 'report', why: `Contract type "${contract}" is not Single or Split` };
}

// Runs after the CTRT save. trigger 'tick' = Settlement confirmed ticked; 'handover' = construction_stage set to handover.
// oppBefore = the opportunity read before the save.
export async function runSettled(args: {
  email: string | null; opportunityId: string; propertyRecordId: string | null; oppBefore: Opp | null;
  statusInSameSave: boolean; trigger?: 'tick' | 'handover';
}): Promise<SettledSummary> {
  const { email, opportunityId, propertyRecordId, oppBefore, statusInSameSave } = args;
  const trigger = args.trigger || 'tick';
  const runId = `settled-${Date.now()}`;
  const dryRun = !(await settledApplyEnabled());
  const steps: SettledStep[] = [];
  const verifiedValues: Record<string, string> = {};
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const todayIso = new Date(today).toISOString();
  const afterOpp = await readOpportunity(opportunityId);

  if (trigger === 'tick') {
    const ticked = checkboxValue(afterOpp);
    steps.push({ step: '1 checkbox', field: 'settlement_confirmed', before: checkboxValue(oppBefore) || '(blank)', after: 'Yes', readBack: afterOpp ? ticked || '(blank)' : '(could not read)', result: ticked === 'Yes' ? 'written' : 'read back does not match' });
  }

  // Decide from the linked record.
  const rec = propertyRecordId ? await readRecord(propertyRecordId) : null;
  const facts = rec ? `property_type ${rec.property_type || '(blank)'}, contract_type ${rec.contract_type || '(blank)'}, construction_stage ${rec.construction_stage || '(blank)'}` : '';
  let plan: Plan;
  if (!propertyRecordId) plan = { action: 'report', why: 'No linked Property Record' };
  else if (!rec) plan = { action: 'report', why: 'Could not read the Property Record' };
  else if (trigger === 'handover') plan = rec.construction_stage === HANDOVER_STAGE ? { action: 'settle', why: 'Construction stage set to handover' } : { action: 'report', why: `Construction stage read back as "${rec.construction_stage || '(blank)'}", not handover` };
  else plan = settledPlan(rec);
  steps.push({ step: '2 rule', field: 'property_type, contract_type, construction_stage', before: facts || '(no record)', after: plan.action === 'settle' ? 'Settled' : plan.action === 'split' ? 'split: Pre-BA + Registered' : 'no change', readBack: '', result: `${plan.action === 'report' ? 'reported' : 'rule'}: ${plan.why}` });

  if (plan.action === 'settle') {
    // Property Team > Settled
    try {
      const names = await stageNames();
      const from = names.name(oppBefore?.pipelineId ?? afterOpp?.pipelineId, oppBefore?.pipelineStageId ?? afterOpp?.pipelineStageId);
      const to = names.name(PIPELINE_ID.PROPERTY_TEAM, names.settledId || undefined);
      if (!names.settledId) {
        steps.push({ step: '3 stage', field: 'pipeline stage', before: from, after: 'Property Team > Settled', readBack: '', result: 'failed: no Settled stage in the Property Team pipeline' });
      } else if (afterOpp?.pipelineId === PIPELINE_ID.PROPERTY_TEAM && afterOpp?.pipelineStageId === names.settledId) {
        steps.push({ step: '3 stage', field: 'pipeline stage', before: from, after: to, readBack: from, result: 'skipped: already at Property Team > Settled' });
        Object.assign(verifiedValues, names.settledDisplay);
      } else if (dryRun) {
        steps.push({ step: '3 stage', field: 'pipeline stage', before: from, after: to, readBack: '', result: 'dry run: would move' });
      } else {
        const res = await ghlFetch(`${BASE}/opportunities/${opportunityId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ pipelineId: PIPELINE_ID.PROPERTY_TEAM, pipelineStageId: names.settledId }) }, 'ctr-settled-move');
        if (!res.ok) {
          steps.push({ step: '3 stage', field: 'pipeline stage', before: from, after: to, readBack: '', result: `failed: GHL ${res.status} ${(await res.text()).slice(0, 200)}` });
        } else {
          const back = await readOpportunity(opportunityId);
          const ok = back?.pipelineId === PIPELINE_ID.PROPERTY_TEAM && back?.pipelineStageId === names.settledId;
          steps.push({ step: '3 stage', field: 'pipeline stage', before: from, after: to, readBack: back ? names.name(back.pipelineId, back.pipelineStageId) : '(could not read)', result: ok ? 'applied' : 'read back does not match' });
          if (ok) Object.assign(verifiedValues, names.settledDisplay);
        }
      }
    } catch (e) {
      steps.push({ step: '3 stage', field: 'pipeline stage', before: '', after: 'Property Team > Settled', readBack: '', result: `failed: ${e instanceof Error ? e.message : String(e)}` });
    }

    // Property Record status = 04_settled, status_change_date = today
    const pr = (result: string, before = '', readBack = '') =>
      steps.push({ step: '4 property record', field: 'status, status_change_date', before, after: `status ${SETTLED_STATUS}, status_change_date ${today}`, readBack, result });
    const before = `status ${rec!.status || '(blank)'}, status_change_date ${(rec!.status_change_date || '').slice(0, 10) || '(blank)'}`;
    if (statusInSameSave) pr('skipped: Status was set in the same save', before);
    else if (rec!.status === SETTLED_STATUS) {
      pr('skipped: already 04_settled (date kept)', before);
      verifiedValues.co_status = rec!.status;
      verifiedValues.co_status_change_date = rec!.status_change_date || '';
    }
    else if (dryRun) pr('dry run: would set', before);
    else {
      const err = await putRecord(propertyRecordId!, { status: SETTLED_STATUS, status_change_date: todayIso });
      if (err) pr(err, before);
      else {
        const back = await readRecord(propertyRecordId!);
        const readBack = back ? `status ${back.status}, status_change_date ${(back.status_change_date || '').slice(0, 10)}` : '(could not read)';
        const ok = back && back.status === SETTLED_STATUS && (back.status_change_date || '').startsWith(today);
        pr(ok ? 'applied' : 'read back does not match', before, readBack);
        if (ok) {
          verifiedValues.co_status = back.status;
          verifiedValues.co_status_change_date = back.status_change_date;
        }
      }
    }
  } else if (plan.action === 'split') {
    // Opp stays; record construction_stage Pre-BA (+ change date) and land_registration Registered; status unchanged.
    const want = { construction_stage: SPLIT_STAGE, construction_stage_change_date: todayIso, land_registration: REGISTERED };
    const before = `construction_stage ${rec!.construction_stage || '(blank)'}, land_registration ${rec!.land_registration || '(blank)'}, status ${rec!.status || '(blank)'}`;
    const after = `construction_stage ${SPLIT_STAGE} (date ${today}), land_registration ${REGISTERED}, status unchanged`;
    const step = (result: string, readBack = '') => steps.push({ step: '3 property record (split)', field: 'construction_stage, construction_stage_change_date, land_registration', before, after, readBack, result });
    if (dryRun) step('dry run: would set');
    else {
      const err = await putRecord(propertyRecordId!, want);
      if (err) step(err);
      else {
        const back = await readRecord(propertyRecordId!);
        const readBack = back ? `construction_stage ${back.construction_stage}, land_registration ${back.land_registration}, status ${back.status}` : '(could not read)';
        const ok = back && back.construction_stage === SPLIT_STAGE && back.land_registration === REGISTERED && back.status === rec!.status && (back.construction_stage_change_date || '').startsWith(today);
        step(ok ? 'applied' : 'read back does not match', readBack);
        if (ok) {
          verifiedValues.co_construction_stage = back.construction_stage;
          verifiedValues.co_construction_stage_change_date = back.construction_stage_change_date;
          verifiedValues.co_land_registration = back.land_registration;
        }
      }
    }
  }

  const oppName = afterOpp?.name || oppBefore?.name || null;
  const outcome = plan.action === 'report' ? `Reported, nothing moved: ${plan.why}` : plan.action === 'split' ? `Split contract: opportunity stays; record set to Pre-BA + Registered (${plan.why})` : `Settled (${plan.why})`;
  try {
    const sql = getDb();
    for (const s of steps) {
      await sql`INSERT INTO ctr_settled_log (run_id, user_email, opportunity_id, opportunity_name, record_id, step, field, old_value, new_value, read_back, dry_run, result)
        VALUES (${runId}, ${email}, ${opportunityId}, ${oppName}, ${propertyRecordId}, ${s.step}, ${s.field}, ${s.before}, ${s.after}, ${s.readBack}, ${dryRun}, ${s.result})`;
    }
    await sql`INSERT INTO ctr_settled_log (run_id, user_email, opportunity_id, opportunity_name, record_id, step, dry_run, result)
      VALUES (${runId}, ${email}, ${opportunityId}, ${oppName}, ${propertyRecordId}, ${`run (${trigger})`}, ${dryRun}, ${steps.map((s) => `${s.step}: ${s.result}`).join('; ')})`;
  } catch (e) {
    console.error('CTR settled log failed:', e);
  }

  const failed = steps.filter((s) => /^failed|does not match/.test(s.result));
  const trig = trigger === 'tick' ? 'ticked Settlement confirmed' : 'set Construction stage to handover';
  if (failed.length) {
    sendCtrAlert({
      type: 'settled-automation-failed',
      subject: 'Settlement confirmed -> Settled: a step failed',
      reason: `A user ${trig} in CTRT and part of the automatic update did not complete.`,
      impact: 'The opportunity stage and/or Property Record may not match Settlement confirmed.',
      action: 'Check Admin > Automated updates (Settlement confirmed log) and fix the record in GHL.',
      detailsHtml: `<p>Opportunity: ${oppName || ''} (${opportunityId})</p><ul>${failed.map((s) => `<li>${s.step}: ${s.result}</li>`).join('')}</ul>`,
    });
  } else if (plan.action === 'report' && !dryRun) {
    sendCtrAlert({
      type: 'settled-reported',
      subject: 'Settlement confirmed -> Settled: not moved, needs checking',
      reason: `A user ${trig} in CTRT, but the Property Record does not meet the Settled rule.`,
      impact: 'Nothing was moved. The opportunity and Property Record are unchanged.',
      action: 'Check the Property Record type, contract type and construction stage in GHL.',
      detailsHtml: `<p>Opportunity: ${oppName || ''} (${opportunityId})</p><p>${plan.why}</p><p>${facts}</p>`,
    });
  }
  return { runId, dryRun, trigger, outcome, steps, verifiedValues };
}
