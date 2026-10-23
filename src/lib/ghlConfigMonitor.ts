/**
 * GHL configuration monitor — snapshot + diff.
 *
 * GHL has no webhook or audit-log API for changes to pipeline / stage / custom
 * field DEFINITIONS, so we poll: fetch the full configuration, normalise it,
 * and diff against the previous snapshot. Every call is `no-store`; a failure
 * in any call aborts the run (never diff against a partial picture).
 */

import { ghlFetch } from './ghlFetch';
import { REPORTING_PIPELINE_IDS, PIPELINE_NAMES } from './ghlPipelines';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

// ---------------------------------------------------------------------------
// Snapshot shape (keyed by ID so renames are detected as renames)
// ---------------------------------------------------------------------------

export interface StageDef { name: string; position: number }
export interface PipelineDef { name: string; stages: Record<string, StageDef> }
export interface FieldDef { name: string; key: string; dataType: string; options: string[] | null }

export interface ConfigSnapshot {
  pipelines: Record<string, PipelineDef>;
  fields: {
    opportunity: Record<string, FieldDef>;
    contact: Record<string, FieldDef>;
    objects: Record<string, { name: string; fields: Record<string, FieldDef> }>;
  };
}

export type EntityType = 'pipeline' | 'stage' | 'field' | 'object';
export type ChangeType = 'added' | 'removed' | 'renamed' | 'type_changed' | 'options_changed' | 'reordered' | 'missing_configured';

export interface ChangeEvent {
  entityType: EntityType;
  changeType: ChangeType;
  scope: string;        // e.g. pipeline name for a stage; "opportunity"/"contact"/object key for a field
  entityId: string;
  entityName: string;
  before: unknown;
  after: unknown;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function ghlJson(path: string, source: string): Promise<any> {
  const res = await ghlFetch(
    `${GHL_BASE_URL}${path}`,
    { headers: { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION }, cache: 'no-store' },
    source
  );
  if (!res.ok) throw new Error(`GHL ${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

function normaliseField(f: any, opts: unknown): FieldDef {
  const options = Array.isArray(opts) ? opts.map((o: any) => (typeof o === 'string' ? o : o.label || o.key || String(o))) : null;
  return {
    name: f.name || '',
    key: (f.fieldKey || '').split('.').pop() || '',
    dataType: f.dataType || '',
    options,
  };
}

export async function fetchSnapshot(): Promise<ConfigSnapshot> {
  if (!GHL_API_TOKEN || !GHL_LOCATION_ID) throw new Error('GHL_BEARER_TOKEN / GHL_LOCATION_ID not configured');

  const [pipelinesRes, oppFieldsRes, contactFieldsRes, objectsRes] = await Promise.all([
    ghlJson(`/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`, 'monitor-pipelines'),
    ghlJson(`/locations/${GHL_LOCATION_ID}/customFields?model=opportunity`, 'monitor-opp-fields'),
    ghlJson(`/locations/${GHL_LOCATION_ID}/customFields?model=contact`, 'monitor-contact-fields'),
    ghlJson(`/objects/?locationId=${GHL_LOCATION_ID}`, 'monitor-objects'),
  ]);

  const pipelines: Record<string, PipelineDef> = {};
  for (const p of pipelinesRes.pipelines || []) {
    const stages: Record<string, StageDef> = {};
    for (const s of p.stages || []) stages[s.id] = { name: (s.name || '').trim(), position: Number(s.position ?? 0) };
    pipelines[p.id] = { name: (p.name || '').trim(), stages };
  }

  const opportunity: Record<string, FieldDef> = {};
  for (const f of oppFieldsRes.customFields || []) {
    if (f.model && f.model !== 'opportunity') continue;
    opportunity[f.id] = normaliseField(f, f.picklistOptions);
  }
  const contact: Record<string, FieldDef> = {};
  for (const f of contactFieldsRes.customFields || []) {
    if (f.model && f.model !== 'contact') continue;
    contact[f.id] = normaliseField(f, f.picklistOptions);
  }

  const objects: ConfigSnapshot['fields']['objects'] = {};
  const objectList: any[] = objectsRes.objects || [];
  for (const o of objectList) {
    const key: string = o.key || o.id;
    if (!key) continue;
    const schema = await ghlJson(`/objects/${key}?locationId=${GHL_LOCATION_ID}&fetchProperties=true`, 'monitor-object-schema');
    const fields: Record<string, FieldDef> = {};
    for (const f of schema.fields || schema.object?.fields || []) fields[f.id] = normaliseField(f, f.options);
    objects[key] = { name: o.labels?.singular || o.name || key, fields };
  }

  return { pipelines, fields: { opportunity, contact, objects } };
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

function sameOptions(a: string[] | null, b: string[] | null): boolean {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function diffFields(prev: Record<string, FieldDef>, curr: Record<string, FieldDef>, scope: string, out: ChangeEvent[]) {
  for (const id of Object.keys(curr)) {
    const c = curr[id], p = prev[id];
    if (!p) { out.push({ entityType: 'field', changeType: 'added', scope, entityId: id, entityName: c.name, before: null, after: c }); continue; }
    if (p.name !== c.name) out.push({ entityType: 'field', changeType: 'renamed', scope, entityId: id, entityName: c.name, before: p.name, after: c.name });
    if (p.dataType !== c.dataType) out.push({ entityType: 'field', changeType: 'type_changed', scope, entityId: id, entityName: c.name, before: p.dataType, after: c.dataType });
    if (!sameOptions(p.options, c.options)) out.push({ entityType: 'field', changeType: 'options_changed', scope, entityId: id, entityName: c.name, before: p.options, after: c.options });
  }
  for (const id of Object.keys(prev)) {
    if (!curr[id]) out.push({ entityType: 'field', changeType: 'removed', scope, entityId: id, entityName: prev[id].name, before: prev[id], after: null });
  }
}

export function diffSnapshots(prev: ConfigSnapshot, curr: ConfigSnapshot): ChangeEvent[] {
  const out: ChangeEvent[] = [];

  // Pipelines + stages
  for (const pid of Object.keys(curr.pipelines)) {
    const c = curr.pipelines[pid], p = prev.pipelines[pid];
    if (!p) {
      out.push({ entityType: 'pipeline', changeType: 'added', scope: '', entityId: pid, entityName: c.name, before: null, after: { name: c.name, stages: Object.values(c.stages).map((s) => s.name) } });
      continue;
    }
    if (p.name !== c.name) out.push({ entityType: 'pipeline', changeType: 'renamed', scope: '', entityId: pid, entityName: c.name, before: p.name, after: c.name });
    for (const sid of Object.keys(c.stages)) {
      const cs = c.stages[sid], ps = p.stages[sid];
      if (!ps) { out.push({ entityType: 'stage', changeType: 'added', scope: c.name, entityId: sid, entityName: cs.name, before: null, after: cs.name }); continue; }
      if (ps.name !== cs.name) out.push({ entityType: 'stage', changeType: 'renamed', scope: c.name, entityId: sid, entityName: cs.name, before: ps.name, after: cs.name });
      else if (ps.position !== cs.position) out.push({ entityType: 'stage', changeType: 'reordered', scope: c.name, entityId: sid, entityName: cs.name, before: ps.position, after: cs.position });
    }
    for (const sid of Object.keys(p.stages)) {
      if (!c.stages[sid]) out.push({ entityType: 'stage', changeType: 'removed', scope: c.name, entityId: sid, entityName: p.stages[sid].name, before: p.stages[sid].name, after: null });
    }
  }
  for (const pid of Object.keys(prev.pipelines)) {
    if (!curr.pipelines[pid]) {
      const p = prev.pipelines[pid];
      out.push({ entityType: 'pipeline', changeType: 'removed', scope: '', entityId: pid, entityName: p.name, before: { name: p.name, stages: Object.values(p.stages).map((s) => s.name) }, after: null });
    }
  }

  // Fields
  diffFields(prev.fields.opportunity, curr.fields.opportunity, 'opportunity', out);
  diffFields(prev.fields.contact, curr.fields.contact, 'contact', out);
  for (const key of Object.keys(curr.fields.objects)) {
    const c = curr.fields.objects[key], p = prev.fields.objects[key];
    if (!p) { out.push({ entityType: 'object', changeType: 'added', scope: '', entityId: key, entityName: c.name, before: null, after: Object.values(c.fields).map((f) => f.name) }); continue; }
    diffFields(p.fields, c.fields, key, out);
  }
  for (const key of Object.keys(prev.fields.objects)) {
    if (!curr.fields.objects[key]) out.push({ entityType: 'object', changeType: 'removed', scope: '', entityId: key, entityName: prev.fields.objects[key].name, before: Object.values(prev.fields.objects[key].fields).map((f) => f.name), after: null });
  }

  return out;
}

/**
 * The pipelines our tools are configured for (src/lib/ghlPipelines.ts) must
 * all exist in the live snapshot. Returned as change events so they flow
 * through the same alerting as everything else.
 */
export function checkConfiguredPipelines(curr: ConfigSnapshot): ChangeEvent[] {
  return REPORTING_PIPELINE_IDS.filter((id) => !curr.pipelines[id]).map((id) => ({
    entityType: 'pipeline' as const,
    changeType: 'missing_configured' as const,
    scope: 'src/lib/ghlPipelines.ts',
    entityId: id,
    entityName: PIPELINE_NAMES[id] || id,
    before: PIPELINE_NAMES[id] || id,
    after: null,
  }));
}

export function snapshotCounts(s: ConfigSnapshot) {
  const stages = Object.values(s.pipelines).reduce((n, p) => n + Object.keys(p.stages).length, 0);
  const objectFields = Object.values(s.fields.objects).reduce((n, o) => n + Object.keys(o.fields).length, 0);
  return {
    pipelines: Object.keys(s.pipelines).length,
    stages,
    opportunityFields: Object.keys(s.fields.opportunity).length,
    contactFields: Object.keys(s.fields.contact).length,
    objects: Object.keys(s.fields.objects).length,
    objectFields,
  };
}

// Minor changes are reported but visually de-emphasised.
export function isMinor(c: ChangeEvent): boolean {
  return c.changeType === 'reordered';
}
