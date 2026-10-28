import { ghlFetch } from '@/lib/ghlFetch';
import { PROPERTY_OBJECT_ID, PROPERTY_LINK_FIELD_ID } from '@/app/api/contract-team-reporting/fields';

// Read-only GHL access: GET requests and search POSTs only. Nothing here writes.
export const INBOX_PIPELINES = {
  propertyTeam: 'zrb34FRmPnbIyAGFDeXJ',
  finance: 'zgBRaMnACpskyf1wHCEV',
  construction: 'XMKCHlqekS7IU87PNLKB',
};
export const REGISTERED_ADDRESS_FIELD = 'PlNx1851lV5PSAotT4FT';

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const VERSION = process.env.GHL_API_VERSION || '2021-07-28';

function env() {
  const token = process.env.GHL_BEARER_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error('GHL_BEARER_TOKEN / GHL_LOCATION_ID not set');
  return { token, locationId };
}

function headers(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, Version: VERSION, Accept: 'application/json' };
}

interface RawField {
  id: string;
  fieldValueString?: string;
  fieldValueArray?: string[];
  fieldValueDate?: number;
  fieldValueNumber?: number;
  fieldValue?: unknown;
  value?: unknown;
}

interface RawOpp {
  id: string;
  name?: string;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: string;
  contact?: { name?: string };
  contactId?: string;
  lastStageChangeAt?: string;
  customFields?: RawField[];
  updatedAt?: string;
}

export interface Opp {
  id: string;
  name: string;
  pipelineId: string;
  pipelineName: string;
  stageName: string;
  status: string;
  contactName: string;
  contactId: string;
  lastStageChangeAt: string;
  registeredAddress: string;
  fields: Record<string, string | string[]>;
}

export interface PropRecord {
  id: string;
  props: Record<string, unknown>;
}

function fieldValue(f: RawField): string | string[] | undefined {
  if (Array.isArray(f.fieldValueArray)) return f.fieldValueArray;
  if (f.fieldValueString !== undefined) return f.fieldValueString;
  if (f.fieldValueDate !== undefined) return new Date(f.fieldValueDate).toISOString().slice(0, 10);
  if (f.fieldValueNumber !== undefined) return String(f.fieldValueNumber);
  const v = f.fieldValue ?? f.value;
  if (Array.isArray(v)) return v.map(String);
  if (v !== undefined && v !== null) return String(v);
  return undefined;
}

export interface StageNames {
  pipelines: Map<string, string>;
  stages: Map<string, string>;
}

export async function fetchStageNames(): Promise<StageNames> {
  const { token, locationId } = env();
  const res = await ghlFetch(`${BASE}/opportunities/pipelines?locationId=${locationId}`, { headers: headers(token) }, 'inbox-stages');
  if (!res.ok) throw new Error(`GHL pipelines HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const pipelines = new Map<string, string>();
  const stages = new Map<string, string>();
  for (const p of data.pipelines || []) {
    pipelines.set(p.id, p.name);
    for (const s of p.stages || []) stages.set(s.id, s.name);
  }
  return { pipelines, stages };
}

function toOpp(o: RawOpp, names: StageNames): Opp {
  const fields: Record<string, string | string[]> = {};
  for (const f of o.customFields || []) {
    const v = fieldValue(f);
    if (v !== undefined) fields[f.id] = v;
  }
  const addr = fields[REGISTERED_ADDRESS_FIELD];
  return {
    id: o.id,
    name: o.name || '',
    pipelineId: o.pipelineId || '',
    pipelineName: names.pipelines.get(o.pipelineId || '') || o.pipelineId || '',
    stageName: names.stages.get(o.pipelineStageId || '') || o.pipelineStageId || '',
    status: o.status || '',
    contactName: o.contact?.name || '',
    contactId: o.contactId || '',
    lastStageChangeAt: o.lastStageChangeAt || '',
    registeredAddress: Array.isArray(addr) ? addr.join(' ') : addr || '',
    fields,
  };
}

export async function fetchOpps(names: StageNames): Promise<Opp[]> {
  const { token, locationId } = env();
  const all: Opp[] = [];
  for (const pipelineId of Object.values(INBOX_PIPELINES)) {
    let startAfter: number | undefined;
    let startAfterId: string | undefined;
    for (let page = 0; page < 50; page++) {
      const url = new URL(`${BASE}/opportunities/search`);
      url.searchParams.set('location_id', locationId);
      url.searchParams.set('pipeline_id', pipelineId);
      url.searchParams.set('limit', '100');
      if (startAfter !== undefined && startAfterId) {
        url.searchParams.set('startAfter', String(startAfter));
        url.searchParams.set('startAfterId', startAfterId);
      }
      const res = await ghlFetch(url.toString(), { headers: headers(token) }, 'inbox-opps');
      if (!res.ok) throw new Error(`GHL opportunities HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const opps: RawOpp[] = data.opportunities || [];
      all.push(...opps.map((o) => toOpp(o, names)));
      if (opps.length < 100 || !data.meta?.startAfterId) break;
      startAfter = data.meta.startAfter;
      startAfterId = data.meta.startAfterId;
    }
  }
  return all;
}

function toRecord(r: { id?: string; properties?: Record<string, unknown> }): PropRecord {
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(r.properties || {})) {
    const short = k === PROPERTY_LINK_FIELD_ID ? 'linked_opportunity_id' : k.includes('.') ? k.split('.').pop()! : k;
    props[short] = v;
  }
  return { id: r.id || '', props };
}

export async function fetchRecords(): Promise<PropRecord[]> {
  const { token, locationId } = env();
  const all: PropRecord[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await ghlFetch(
      `${BASE}/objects/${PROPERTY_OBJECT_ID}/records/search`,
      {
        method: 'POST',
        headers: { ...headers(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, page, pageLimit: 100 }),
      },
      'inbox-records'
    );
    if (!res.ok) throw new Error(`GHL Property Records HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const records = data.records || [];
    all.push(...records.map(toRecord));
    if (records.length < 100) break;
  }
  return all;
}

export async function fetchOpp(id: string, names: StageNames): Promise<Opp> {
  const { token } = env();
  const res = await ghlFetch(`${BASE}/opportunities/${id}`, { headers: headers(token) }, 'inbox-opp');
  if (!res.ok) throw new Error(`GHL opportunity ${id} HTTP ${res.status}`);
  const data = await res.json();
  return toOpp(data.opportunity, names);
}

export async function fetchRecord(id: string): Promise<PropRecord> {
  const { token, locationId } = env();
  const res = await ghlFetch(
    `${BASE}/objects/${PROPERTY_OBJECT_ID}/records/${id}?locationId=${locationId}`,
    { headers: headers(token) },
    'inbox-record'
  );
  if (!res.ok) throw new Error(`GHL Property Record ${id} HTTP ${res.status}`);
  const data = await res.json();
  return toRecord(data.record || data);
}

export function recordText(r: PropRecord, key: string): string {
  const v = r.props[key];
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
