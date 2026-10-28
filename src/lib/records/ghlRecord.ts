import { ghlFetch } from '@/lib/ghlFetch';
import { PROPERTY_OBJECT_ID, PROPERTY_LINK_FIELD_ID } from '@/app/api/contract-team-reporting/fields';
import { PROPERTY_SECTIONS, propertyPageKey, type RecordBundle, type RecordField, type RecordGroup, type RecordPage } from './types';

// Read-only GHL reads for the record pop-out: GET requests and the Property Records search POST only. Nothing here writes.

const BASE = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const VERSION = process.env.GHL_API_VERSION || '2021-07-28';
const PROPERTY_OBJECT_KEY = 'custom_objects.property_reviews';
const DEFS_TTL = 10 * 60_000;
const BUNDLE_TTL = 60_000;

// JT 28/10: hide these opportunity folders in the pop-out.
const HIDDEN_FOLDERS = [/old\s*[-–]\s*ignore/i, /^automation folder$/i];
// Raw email HTML/text used by the packaging tool - unreadable in a field view.
const HIDDEN_PROPERTY_KEYS = new Set(['email_template_html', 'email_template_text', 'template_type']);

// JT 28/10: property fields grouped into fixed sections; anything not listed goes to 'Other'.
const SECTION_KEYS: Record<string, string[]> = {
  Address: [
    'property_address', 'lot_number', 'unit__lot', 'street_number', 'street_name', 'suburb_name', 'state', 'post_code', 'lga',
    'unit__lot_secondary', 'google_map', 'project_name', 'project_address', 'project_identifier', 'project_parent_id', 'is_parent_record',
  ],
  'Deal & builder': [
    'deal_type', 'contract_type', 'property_type', 'dwelling_type', 'dwelling_details', 'single_or_dual_occupancy', 'does_this_property_have_2_dwellings',
    'beds_primary', 'beds_additional__secondary__dual_key', 'bath_primary', 'baths_additional__secondary__dual_key',
    'garage_primary', 'garage_additional__secondary__dual_key', 'carport_primary', 'carport_additional__secondary__dual_key',
    'carspace_primary', 'carspace_additional__secondary__dual_key', 'land_size', 'build_size', 'title', 'year_built',
    'status', 'sourcer', 'packager', 'packager_email', 'packager_approved', 'qa_approved', 'ba_approved',
    'agent_name', 'agent_mobile', 'agent_email', 'project_brief', 'folder_link',
  ],
  'Price & contract': [
    'asking', 'asking_text', 'price_group', 'acceptable_acquisition__from', 'acceptable_acquisition__to', 'accepted_acquisition_target',
    'land_price', 'build_price', 'total_price', 'net_price', 'cashback_rebate_value', 'cashback_rebate_type',
    'offer_price', 'offer_price_land', 'offer_price_build', 'offer_status', 'offer_status_land', 'offer_status_build',
    'has_eoi_history', 'eoi_notes', 'closing_price', 'closing_ba', 'client_closed', 'purchase_price_additional_dialogue',
  ],
  Settlement: ['closing_date', 'land_registration', 'completion_date'],
  Finance: ['cf_insurance_value_', 'cf_councilwater_rates_', 'cf_depreciation_', 'body_corp__per_quarter', 'body_corp_description'],
  'Valuation & rent': [
    'occupancy', 'occupancy_primary', 'occupancy_secondary', 'current_rent_primary__per_week', 'current_rent_secondary__per_week',
    'expiry_primary', 'expiry_secondary', 'rent_appraisal_primary', 'rent_appraisal_primary_from', 'rent_appraisal_primary_to',
    'rent_appraisal_secondary', 'rent_appraisal_secondary_from', 'rent_appraisal_secondary_to', 'yield', 'appraised_yield',
    'comparable_sales', 'median_price_change__3_months', 'median_price_change__1_year', 'median_price_change__3_year',
    'median_price_change__5_year', 'median_yield', 'median_rent_change__1_year', 'rental_population', 'vacancy_rate',
    'rental_assessment_additional_dialogue', 'market_performance_additional_dialogue', 'market_perfornance_additional_dialogue',
  ],
};
// JT 28/10: consolidated address line first, then each part on its own.
const ADDRESS_LABELS: Record<string, string> = {
  property_address: 'Property address',
  lot_number: 'Lot',
  unit__lot: 'Unit',
  street_number: 'Street number',
  street_name: 'Street name',
  suburb_name: 'Suburb',
  state: 'State',
  post_code: 'Postcode',
  lga: 'LGA',
};
const SECTION_OF = new Map<string, { section: string; order: number }>();
for (const [section, keys] of Object.entries(SECTION_KEYS)) keys.forEach((k, i) => SECTION_OF.set(k, { section, order: i }));

function env() {
  const token = process.env.GHL_BEARER_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) throw new Error('GHL_BEARER_TOKEN / GHL_LOCATION_ID not set');
  return { token, locationId };
}

async function ghl(path: string, source: string, init?: { method: 'POST'; body: unknown }): Promise<any> {
  const { token } = env();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Version: VERSION, Accept: 'application/json' };
  if (init) headers['Content-Type'] = 'application/json';
  const res = await ghlFetch(
    `${BASE}${path}`,
    init ? { method: init.method, headers, body: JSON.stringify(init.body) } : { headers },
    source
  );
  if (!res.ok) throw new Error(`GHL ${path.split('?')[0]} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const cache = new Map<string, { at: number; value: Promise<unknown> }>();
function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  return value;
}

interface FieldDef { id: string; name: string; key: string; dataType: string; parentId: string; position: number }
interface Folder { id: string; name: string; position: number }
type Defs = { folders: Folder[]; fields: FieldDef[] };

const shortKey = (fieldKey: string) => (fieldKey || '').split('.').pop() || fieldKey;
const toDef = (x: any): FieldDef => ({
  id: x.id, name: String(x.name || '').trim(), key: shortKey(x.fieldKey), dataType: x.dataType || '', parentId: x.parentId || '', position: Number(x.position ?? 0),
});

function fieldDefs(model: 'opportunity' | 'contact'): Promise<Defs> {
  return cached(`defs:${model}`, DEFS_TTL, async () => {
    const { locationId } = env();
    const [f, d] = await Promise.all([
      ghl(`/locations/${locationId}/customFields/search?documentType=folder&model=${model}&skip=0&limit=100`, 'record-folders'),
      ghl(`/locations/${locationId}/customFields?model=${model}`, 'record-fields'),
    ]);
    return {
      folders: (f.customFieldFolders || [])
        .map((x: any) => ({ id: x.id, name: String(x.name || '').trim(), position: Number(x.position ?? 0) }))
        .sort((a: Folder, b: Folder) => a.position - b.position),
      fields: (d.customFields || []).filter((x: any) => x.documentType !== 'folder').map(toDef),
    };
  });
}

function propertyDefs(): Promise<FieldDef[]> {
  return cached('defs:property', DEFS_TTL, async () => {
    const { locationId } = env();
    const d = await ghl(`/custom-fields/object-key/${PROPERTY_OBJECT_KEY}?locationId=${locationId}`, 'record-property-fields');
    return (d.fields || []).map(toDef);
  });
}

type Lookups = { pipelines: Map<string, string>; stages: Map<string, string>; users: Map<string, string> };

function lookups(): Promise<Lookups> {
  return cached('lookups', DEFS_TTL, async () => {
    const { locationId } = env();
    const [p, u] = await Promise.all([
      ghl(`/opportunities/pipelines?locationId=${locationId}`, 'record-pipelines'),
      ghl(`/users/?locationId=${locationId}`, 'record-users'),
    ]);
    const pipelines = new Map<string, string>();
    const stages = new Map<string, string>();
    for (const x of p.pipelines || []) {
      pipelines.set(x.id, x.name);
      for (const s of x.stages || []) stages.set(s.id, s.name);
    }
    const users = new Map<string, string>();
    for (const x of u.users || []) users.set(x.id, x.name || [x.firstName, x.lastName].filter(Boolean).join(' '));
    return { pipelines, stages, users };
  });
}

type RawRecord = { id: string; createdAt?: string; updatedAt?: string; properties?: Record<string, unknown> };

const linkedOpp = (r: RawRecord) => {
  const p = r.properties || {};
  return String(p.linked_opportunity_id ?? p[PROPERTY_LINK_FIELD_ID] ?? '').trim();
};

// Property Records carry the link to their opportunity in a field, not a GHL association, so index them all.
function recordsByOpportunity(): Promise<Map<string, RawRecord[]>> {
  return cached('records', DEFS_TTL, async () => {
    const { locationId } = env();
    const byOpp = new Map<string, RawRecord[]>();
    for (let page = 1; page <= 50; page++) {
      const data = await ghl(`/objects/${PROPERTY_OBJECT_ID}/records/search`, 'record-property-search', {
        method: 'POST',
        body: { locationId, page, pageLimit: 100 },
      });
      const records: RawRecord[] = data.records || [];
      for (const r of records) {
        const opp = linkedOpp(r);
        if (opp) byOpp.set(opp, [...(byOpp.get(opp) || []), r]);
      }
      if (records.length < 100) break;
    }
    return byOpp;
  });
}

async function fetchRecord(id: string): Promise<RawRecord> {
  const { locationId } = env();
  const data = await ghl(`/objects/${PROPERTY_OBJECT_ID}/records/${id}?locationId=${locationId}`, 'record-property');
  return data.record || data;
}

const sydneyDate = (v: string | number) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const sydneyDateTime = (v: string | undefined) =>
  v ? new Date(v).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

function text(v: unknown, dataType = ''): string {
  if (v === undefined || v === null) return '';
  if (Array.isArray(v)) return v.map((x) => text(x)).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o.url === 'string') return o.url;
    if (typeof o.name === 'string') return o.name;
    return Object.values(o).map((x) => text(x)).filter(Boolean).join(', ');
  }
  if (dataType === 'DATE' && (typeof v === 'number' || /^\d{4}-\d{2}-\d{2}/.test(String(v)))) return sydneyDate(v as string | number);
  return String(v).trim();
}

function rawFieldValue(f: any): unknown {
  if (Array.isArray(f.fieldValueArray)) return f.fieldValueArray;
  if (f.fieldValueString !== undefined) return f.fieldValueString;
  if (f.fieldValueDate !== undefined) return sydneyDate(f.fieldValueDate);
  if (f.fieldValueNumber !== undefined) return f.fieldValueNumber;
  if (f.fieldValueFiles !== undefined) return f.fieldValueFiles;
  return f.fieldValue ?? f.value;
}

const field = (label: string, value: unknown, long = false): RecordField => ({ label, value: text(value), long });

// Custom fields grouped by GHL folder (folder order); fields in no live folder join the first group.
function folderGroups(first: RecordGroup, values: Map<string, unknown>, defs: Defs): RecordGroup[] {
  const known = new Set(defs.folders.map((f) => f.id));
  const sorted = [...defs.fields].sort((a, b) => a.position - b.position);
  const toField = (d: FieldDef): RecordField => ({ label: d.name, value: text(values.get(d.id), d.dataType), long: d.dataType === 'LARGE_TEXT' });
  first.fields.push(...sorted.filter((d) => !known.has(d.parentId)).map(toField));
  const groups = [first];
  for (const folder of defs.folders) {
    if (HIDDEN_FOLDERS.some((re) => re.test(folder.name))) continue;
    const fields = sorted.filter((d) => d.parentId === folder.id).map(toField);
    if (fields.length) groups.push({ name: folder.name, fields });
  }
  return groups;
}

function contactPage(c: any, defs: Defs, locationId: string): RecordPage {
  const name = c.contactName || c.name || [c.firstName, c.lastName].filter(Boolean).join(' ');
  const address = [c.address1, c.city, c.state, c.postalCode, c.country].filter(Boolean).join(', ');
  const values = new Map<string, unknown>((c.customFields || []).map((f: any) => [f.id, f.value ?? rawFieldValue(f)]));
  const details: RecordGroup = {
    name: 'Contact details',
    fields: [
      field('Name', name),
      field('First name', c.firstName),
      field('Last name', c.lastName),
      field('Email', c.email),
      field('Additional emails', (c.additionalEmails || []).map((e: any) => (typeof e === 'string' ? e : e?.email))),
      field('Phone', c.phone),
      field('Company', c.companyName),
      field('Address', address),
      field('Date of birth', c.dateOfBirth ? sydneyDate(c.dateOfBirth) : ''),
      field('Type', c.type),
      field('Source', c.source),
      field('Tags', c.tags),
      field('Created', sydneyDateTime(c.dateAdded)),
    ],
  };
  return {
    key: 'contact',
    kind: 'contact',
    menuLabel: 'Contact',
    title: name || '(no name)',
    source: 'GHL contact (live)',
    ghlUrl: `https://app.gohighlevel.com/v2/location/${locationId}/contacts/detail/${c.id}`,
    ids: `Contact ${c.id}`,
    groups: folderGroups(details, values, defs),
  };
}

function opportunityPage(o: any, defs: Defs, look: Lookups, locationId: string): RecordPage {
  const values = new Map<string, unknown>((o.customFields || []).map((f: any) => [f.id, rawFieldValue(f)]));
  const value = o.monetaryValue === undefined || o.monetaryValue === null ? '' : `A$ ${Number(o.monetaryValue).toLocaleString('en-AU')}`;
  const details: RecordGroup = {
    name: 'Opportunity details',
    fields: [
      field('Opportunity name', o.name),
      field('Pipeline', look.pipelines.get(o.pipelineId) || o.pipelineId),
      field('Stage', look.stages.get(o.pipelineStageId) || o.pipelineStageId),
      field('Status', o.status),
      field('Value', value),
      field('Owner', o.assignedTo ? look.users.get(o.assignedTo) || `GHL user not found (${o.assignedTo})` : ''),
      field('Followers', (o.followers || []).map((id: string) => look.users.get(id) || id)),
      field('Source', o.source),
      field('Created', sydneyDateTime(o.createdAt)),
      field('Last stage change', sydneyDateTime(o.lastStageChangeAt)),
      field('Last status change', sydneyDateTime(o.lastStatusChangeAt)),
      field('Updated', sydneyDateTime(o.updatedAt)),
    ],
  };
  return {
    key: 'opportunity',
    kind: 'opportunity',
    menuLabel: 'Opportunity',
    title: o.name || '(no name)',
    source: 'GHL opportunity (live)',
    ghlUrl: `https://app.gohighlevel.com/v2/location/${locationId}/opportunities/${o.id}?tab=Opportunity+details`,
    ids: `Opportunity ${o.id}`,
    groups: folderGroups(details, values, defs),
  };
}

function propertyPage(r: RawRecord, defs: FieldDef[], n: number): RecordPage {
  const props = r.properties || {};
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const keys = [...defs.map((d) => d.key), ...Object.keys(props).filter((k) => !byKey.has(k) && k !== PROPERTY_LINK_FIELD_ID)];
  const sections = new Map<string, { order: number; f: RecordField }[]>();
  for (const k of new Set(keys)) {
    if (HIDDEN_PROPERTY_KEYS.has(k)) continue;
    const d = byKey.get(k);
    const place = SECTION_OF.get(k);
    const section = place?.section || 'Other';
    const order = place ? place.order : 1000 + (d?.position ?? 1e6);
    const raw = k === 'linked_opportunity_id' ? linkedOpp(r) : props[k];
    const f = { label: ADDRESS_LABELS[k] || d?.name || k, value: text(raw, d?.dataType), long: d?.dataType === 'LARGE_TEXT' };
    sections.set(section, [...(sections.get(section) || []), { order, f }]);
  }
  const address = text(props.property_address);
  return {
    key: propertyPageKey(r.id),
    kind: 'property',
    menuLabel: `Property ${n}`,
    title: address || '(no address)',
    source: 'GHL Property Record (live)',
    ids: `Property Record ${r.id}`,
    note: [r.createdAt && `Created ${sydneyDateTime(r.createdAt)}`, r.updatedAt && `updated ${sydneyDateTime(r.updatedAt)}`].filter(Boolean).join(', '),
    groups: PROPERTY_SECTIONS.map((name) => ({
      name,
      fields: (sections.get(name) || []).sort((a, b) => a.order - b.order).map((x) => x.f),
    })).filter((g) => g.fields.length),
  };
}

async function buildBundle(opportunityId: string, recordIds: string[]): Promise<RecordBundle> {
  const { locationId } = env();
  const warnings: string[] = [];
  const [oRes, oppDefs, look] = await Promise.all([
    ghl(`/opportunities/${opportunityId}`, 'record-opportunity'),
    fieldDefs('opportunity'),
    lookups(),
  ]);
  const o = oRes.opportunity;
  if (!o) throw new Error(`GHL returned no opportunity for ${opportunityId}`);

  const pages: RecordPage[] = [];
  if (o.contactId) {
    try {
      const [c, cDefs] = await Promise.all([ghl(`/contacts/${o.contactId}`, 'record-contact'), fieldDefs('contact')]);
      pages.push(contactPage(c.contact, cDefs, locationId));
    } catch (e) {
      warnings.push(`Contact could not be read: ${(e as Error).message}`);
    }
  }
  pages.push(opportunityPage(o, oppDefs, look, locationId));

  const records: RawRecord[] = [];
  try {
    records.push(...((await recordsByOpportunity()).get(opportunityId) || []));
  } catch (e) {
    warnings.push(`Property Records could not be searched: ${(e as Error).message}`);
  }
  for (const id of recordIds) {
    if (records.some((r) => r.id === id)) continue;
    try {
      records.push(await fetchRecord(id));
    } catch (e) {
      warnings.push(`Property Record ${id} could not be read: ${(e as Error).message}`);
    }
  }
  if (records.length) {
    const defs = await propertyDefs().catch((e) => {
      warnings.push(`Property field labels could not be read: ${(e as Error).message}`);
      return [] as FieldDef[];
    });
    records.forEach((r, i) => pages.push(propertyPage(r, defs, i + 1)));
  }

  return {
    opportunityId,
    title: o.name || '(no name)',
    createdAt: sydneyDateTime(o.createdAt),
    fetchedAt: new Date().toISOString(),
    pages,
    warnings,
  };
}

export function loadOpportunityBundle(opportunityId: string, recordIds: string[] = []): Promise<RecordBundle> {
  const ids = [...new Set(recordIds)].sort();
  return cached(`bundle:${opportunityId}:${ids.join(',')}`, BUNDLE_TTL, () => buildBundle(opportunityId, ids));
}
