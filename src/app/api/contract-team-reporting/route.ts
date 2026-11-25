import { NextResponse } from 'next/server';
import {
  ARRAY_FIELDS,
  FIELD_MAP,
  PROPERTY_OBJECT_ID,
  PROPERTY_LINK_FIELD_ID,
  OPP_DYNAMIC_PREFIX,
} from './fields';
import { sendCtrAlert } from './alerts';
import { ghlFetch } from '@/lib/ghlFetch';
import { PIPELINE_NAMES, PIPELINE_ID } from '@/lib/ghlPipelines';
import { searchGhlOpportunities } from '@/lib/ghlOpportunitySearch';
// Safety limit only: hitting it fails the load loudly instead of returning a truncated report.
const MAX_PAGES = 200;
const PROPERTY_OBJECT_KEY = 'custom_objects.property_reviews';
let lastBuildMs = 0;

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

interface GHLCustomField {
  id: string;
  type?: string;
  fieldValueString?: string;
  fieldValueDate?: number;
  fieldValueArray?: string[];
  fieldValue?: string | number | boolean | null;
  value?: string | number | boolean | null;
}

interface GHLOpportunity {
  id: string;
  name: string;
  status: string;
  pipelineId: string;
  pipelineStageId: string;
  assignedTo?: string;
  followers?: string[];
  contact?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  monetaryValue?: number;
  createdAt?: string;
  updatedAt?: string;
  lastStageChangeAt?: string;
  customFields?: GHLCustomField[];
}

interface GHLSearchResponse {
  opportunities: GHLOpportunity[];
  meta?: {
    total?: number;
    currentPage?: number;
    nextPage?: number | null;
    nextPageUrl?: string;
    startAfter?: number;
    startAfterId?: string;
  };
}

interface GHLPropertyRecord {
  id?: string;
  updatedAt?: string;
  properties?: Record<string, unknown>;
}

interface GHLPropertyRecordsResponse {
  records?: GHLPropertyRecord[];
  meta?: {
    total?: number;
    currentPage?: number;
    nextPage?: number | null;
    nextPageUrl?: string;
    startAfter?: number;
    startAfterId?: string;
  };
}

interface ReportRecord extends Record<string, string> {
  id: string;
  name: string;
  opportunityName: string;
  pipelineStage: string;
  registeredAddress: string;
  assignedTo: string;
  assignedBA: string;
  ghlLink: string;
}

let userMapCache: Record<string, string> = {};

let stageNameCache: Record<string, string> = {};

async function fetchUsers(): Promise<void> {
  try {
    const response = await ghlFetch(
      `${GHL_BASE_URL}/users/?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
          Accept: 'application/json',
        },
        cache: 'no-store',
      },
      'ctr-users'
    );
    if (!response.ok) throw new Error(`GHL users HTTP ${response.status}`);
    const data = await response.json();
    const users = data.users || [];
    const map: Record<string, string> = {};
    for (const user of users) {
      if (user.id && (user.name || user.firstName || user.lastName)) {
        map[user.id] = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
    }
    userMapCache = map;
  } catch (e) {
    console.error('Failed to fetch GHL users:', e);
    throw e;
  }
}

async function fetchPipelineStages(): Promise<void> {
  try {
    const response = await ghlFetch(
      `${GHL_BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
        },
        cache: 'no-store',
      },
      'ctr-stages'
    );
    if (!response.ok) throw new Error(`GHL pipelines HTTP ${response.status}`);
    const data = await response.json();
    if (data.pipelines) {
      // Replace, don't merge: stages deleted in GHL must not linger.
      stageNameCache = {};
      for (const pipeline of data.pipelines) {
        if (pipeline.stages) {
          for (const stage of pipeline.stages) {
            stageNameCache[stage.id] = (stage.name || '').trim();
          }
        }
      }
      // A pipeline this tool is configured for no longer exists in GHL
      // (e.g. deleted/restructured by someone in GHL). Alert and fail loudly —
      // never report on a partial set of pipelines as if it were complete.
      const missing = data.pipelines.some((p: { id: string }) => p.id === PIPELINE_ID.PROPERTY_TEAM)
        ? [] : [PIPELINE_ID.PROPERTY_TEAM];
      if (missing.length > 0) {
        const names = missing.map((id) => `${PIPELINE_NAMES[id] || 'Unknown'} (${id})`).join(', ');
        sendCtrAlert({
          type: 'configured-pipeline-missing',
          subject: 'A pipeline the tool reports on no longer exists in GHL',
          reason: `The tool is configured to report on these pipelines but GHL no longer returns them: ${names}.`,
          impact: 'The Contract Team Reporting Tool cannot load until this is resolved.',
          action: 'Check Settings → Pipelines in GHL. If the pipeline was deliberately removed, update src/lib/ghlPipelines.ts. If it was deleted by mistake, restore it from GHL Audit Logs (60-day window).',
        });
        throw new Error(`Configured pipeline(s) missing from GHL: ${names}`);
      }
    } else throw new Error('GHL returned no pipeline definitions');
  } catch (e) {
    console.error('Failed to fetch pipeline stages:', e);
    throw e;
  }
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value.map(toStringValue).filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    const v = value as { id?: string; value?: unknown };
    if (v.id !== undefined) return String(v.id);
    if (v.value !== undefined) return toStringValue(v.value);
    return JSON.stringify(value);
  }
  return String(value);
}

function toShortPropertyKey(rawKey: string): string {
  if (rawKey === PROPERTY_LINK_FIELD_ID) return 'linked_opportunity_id';
  if (rawKey.includes('.')) {
    return rawKey.split('.').pop() || rawKey;
  }
  return rawKey;
}

async function fetchPropertyRecords(): Promise<{ records: GHLPropertyRecord[]; keys: Set<string> }> {
  const allRecords: GHLPropertyRecord[] = [];
  const allKeys = new Set<string>();

  if (!PROPERTY_OBJECT_ID) {
    console.error('PROPERTY_OBJECT_ID not configured.');
    return { records: allRecords, keys: allKeys };
  }

  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await ghlFetch(
      `${GHL_BASE_URL}/objects/${PROPERTY_OBJECT_ID}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          page,
          pageLimit: 100,
        }),
      },
      'ctr-properties'
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL Property Records API error:', response.status, errorText);
      sendCtrAlert({
        type: 'property-records-fetch-failed',
        subject: 'Property Review records could not be loaded from GHL',
        reason: 'The tool asked GHL for the Property Review custom object records and GHL returned an error.',
        impact: 'The report still loads, but all custom object columns (Deal Type, Land Size, Contract Type, etc.) will show blank values until this recovers.',
        action: 'Check GHL API status and that the GHL_BEARER_TOKEN has access to custom objects. If it persists, the token may have expired or lost scopes.',
        detailsHtml: `<p>HTTP ${response.status}</p><pre>${errorText.slice(0, 1000)}</pre>`,
      });
      throw new Error(`GHL Property Records API error: ${response.status}`);
    }

    const data: GHLPropertyRecordsResponse = await response.json();
    const records = data.records || [];
    if (records.length === 0) break;

    allRecords.push(...records);
    page++;

    for (const record of records) {
      const props = record.properties || {};
      for (const rawKey of Object.keys(props)) {
        allKeys.add(toShortPropertyKey(rawKey));
      }
    }

    hasMore = records.length === 100;

    if (hasMore && page > MAX_PAGES) {
      sendCtrAlert({
        type: 'page-limit-reached',
        subject: 'Property Review records exceeded the tool\'s page limit',
        reason: `More than ${MAX_PAGES * 100} Property Review records were returned.`,
        impact: 'The report did not load (it never shows a partial set).',
        action: 'Raise MAX_PAGES in src/app/api/contract-team-reporting/route.ts.',
      });
      throw new Error(`Property Review records exceed ${MAX_PAGES * 100}; report not loaded.`);
    }
  }

  return { records: allRecords, keys: allKeys };
}

// Opportunity custom fields the tool has no friendly name for, keyed opp_<GHL key>, from the live schema:
// New Opportunity fields appear as columns; a failed schema read fails the load.
async function fetchOpportunityDynamicKeys(): Promise<Map<string, string>> {
  const keys = new Map<string, string>();
  try {
    const response = await ghlFetch(
      `${GHL_BASE_URL}/locations/${GHL_LOCATION_ID}/customFields?model=opportunity`,
      { headers: { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION }, cache: 'no-store' },
      'ctr-opportunity-schema'
    );
    if (!response.ok) throw new Error(`GHL opportunity customFields error: ${response.status}`);
    const data = await response.json();
    for (const f of (data.customFields || []) as { id: string; fieldKey?: string; model?: string }[]) {
      if (f.model !== 'opportunity' || FIELD_MAP[f.id]) continue;
      const short = (f.fieldKey || '').split('.').pop();
      if (short) keys.set(f.id, `${OPP_DYNAMIC_PREFIX}${short}`);
    }
  } catch (e) {
    console.error('CTR opportunity schema error:', e);
    throw e;
  }
  return keys;
}

// Every Property Review field key from the live schema, so new fields get a co_ column
// even before any record holds a value.
async function fetchPropertySchemaKeys(): Promise<string[]> {
  const response = await ghlFetch(
    `${GHL_BASE_URL}/custom-fields/object-key/${PROPERTY_OBJECT_KEY}?locationId=${GHL_LOCATION_ID}`,
    { headers: { Authorization: `Bearer ${GHL_API_TOKEN}`, Version: GHL_API_VERSION }, cache: 'no-store' },
    'ctr-property-schema'
  );
  if (!response.ok) throw new Error(`GHL Property Review schema error: ${response.status}`);
  const data = await response.json();
  return ((data.fields || []) as { fieldKey?: string }[])
    .map((f) => (f.fieldKey ? toShortPropertyKey(f.fieldKey) : ''))
    .filter(Boolean);
}

const DAY_MS = 1000 * 60 * 60 * 24;
function daysSince(date: string): string {
  if (!date) return '';
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? '' : String(Math.floor((Date.now() - t) / DAY_MS));
}

// Calendar day (YYYY-MM-DD, Sydney) of a GHL date value: date-only strings and midnight-UTC
// timestamps are taken as that day; real timestamps / epoch ms are converted to Sydney time.
function sydneyDay(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(value)) return value.slice(0, 10);
  const d = new Date(/^\d+$/.test(value) ? Number(value) : value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

// Whole days from a change date to today (Sydney): 0 on the day of change.
function daysSinceDay(value: string): string {
  if (!value) return '';
  const day = sydneyDay(value);
  if (!day) return '';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  return String(Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / DAY_MS));
}

function transformOpportunity(
  opp: GHLOpportunity,
  propertyByOppId: Map<string, Record<string, string>>,
  allPropertyKeys: Set<string>,
  oppDynamicKeys: Map<string, string>
): ReportRecord {
  const customFieldValues: Record<string, string> = {};
  if (opp.customFields) {
    for (const cf of opp.customFields) {
      const friendlyName = FIELD_MAP[cf.id] || oppDynamicKeys.get(cf.id);
      if (friendlyName) {
        if ((ARRAY_FIELDS.has(cf.id) || !FIELD_MAP[cf.id]) && cf.fieldValueArray) {
          customFieldValues[friendlyName] = cf.fieldValueArray.join(', ');
        } else if (cf.fieldValueString) {
          customFieldValues[friendlyName] = cf.fieldValueString;
        } else if (cf.fieldValueDate) {
          const d = new Date(cf.fieldValueDate);
          customFieldValues[friendlyName] = d.toISOString().split('T')[0];
        } else if (cf.fieldValue !== null && cf.fieldValue !== undefined && cf.fieldValue !== '') {
          customFieldValues[friendlyName] = String(cf.fieldValue);
        } else if (cf.value !== null && cf.value !== undefined) {
          customFieldValues[friendlyName] = String(cf.value);
        }
      }
    }
  }

  const stageName = stageNameCache[opp.pipelineStageId] || opp.pipelineStageId || '';
  const ownerName = userMapCache[opp.assignedTo || ''] || (opp.assignedTo ? 'Unknown User' : '');
  const followers = (opp.followers || []).map((id) => userMapCache[id] || 'Unknown User').join(', ');

  const base: ReportRecord = {
    id: opp.id,
    name: opp.name || '',
    opportunityName: opp.name || '',
    pipelineStage: stageName,
    registeredAddress: customFieldValues['registeredAddress'] || '',
    assignedTo: ownerName,
    assignedBA: customFieldValues['assignedBA'] || '',
    ghlLink: opp.id
      ? `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/${opp.id}?tab=Opportunity+details`
      : '',
    exchangeEmail: opp.id ? `/exchange-email/compose?oppId=${encodeURIComponent(opp.id)}` : '',
    pipelineId: opp.pipelineId || '',
    pipelineName: PIPELINE_NAMES[opp.pipelineId] || opp.pipelineId || '',
    pipelineStageId: opp.pipelineStageId || '',
    status: opp.status || '',
    contactName: opp.contact?.name || '',
    contactEmail: opp.contact?.email || '',
    contactPhone: opp.contact?.phone || '',
    monetaryValue: opp.monetaryValue ? String(opp.monetaryValue) : '',
    createdAt: opp.createdAt || '',
    updatedAt: opp.updatedAt || '',
    lastStageChangeAt: opp.lastStageChangeAt || '',
    daysSinceStageChange: opp.lastStageChangeAt
      ? String(Math.floor((Date.now() - new Date(opp.lastStageChangeAt).getTime()) / (1000 * 60 * 60 * 24)))
      : '',
    owner: ownerName,
    followers,
    // Transactional / reference fields
    bpRequested: customFieldValues['bpRequested'] || '',
    bpDueDate: customFieldValues['bpDueDate'] || '',
    bpExtensionStatus: customFieldValues['bpExtensionStatus'] || '',
    bpScheduledDate: customFieldValues['bpScheduledDate'] || '',
    bpConditionStatus: customFieldValues['bpConditionStatus'] || '',
    bpNegotiationDetail: customFieldValues['bpNegotiationDetail'] || '',
    bpRequestedExtensionDate: customFieldValues['bpRequestedExtensionDate'] || '',
    financeApprovalReceived: customFieldValues['financeApprovalReceived'] || '',
    financeFormalApproval: customFieldValues['financeApprovalReceived'] || '',
    confirmedSettlementDate: customFieldValues['confirmedSettlementDate'] || '',
    insuranceStatus: customFieldValues['insuranceStatus'] || '',
    preSettlementInspectionDate: customFieldValues['preSettlementInspectionDate'] || '',
    preSettlementInspectionStatus: customFieldValues['preSettlementInspectionStatus'] || '',
    brokerName: customFieldValues['brokerName'] || '',
    brokerCompany: customFieldValues['brokerCompany'] || '',
    brokerEmail: customFieldValues['brokerEmail'] || '',
    brokerPhone: customFieldValues['brokerPhone'] || '',
    solicitorName: customFieldValues['solicitorName'] || '',
    solicitorCompany: customFieldValues['solicitorCompany'] || '',
    solicitorEmail: customFieldValues['solicitorEmail'] || '',
    solicitorPhone: customFieldValues['solicitorPhone'] || '',
    personalName: customFieldValues['personalName'] || '',
    latestStatusUpdate: customFieldValues['latestStatusUpdate'] || '',
    propertyRecordCtrtLink: customFieldValues['propertyRecordCtrtLink'] || '',
    linkedPropertyAddress: customFieldValues['linkedPropertyAddress'] || '',
    linkedPropertyRecordId: customFieldValues['linkedPropertyRecordId'] || '',
    agentBuilderDetails: customFieldValues['agentBuilderDetails'] || '',
    briefNotes: customFieldValues['briefNotes'] || '',
    settlementDate: customFieldValues['settlementDate'] || '',
    registration: customFieldValues['registration'] || '',
    registrationDateETA: customFieldValues['registrationDateETA'] || '',
    buildDepositIssued: customFieldValues['buildDepositIssued'] || '',
    buildDepositIssuedDate: customFieldValues['buildDepositIssuedDate'] || '',
    buildDepositPaid: customFieldValues['buildDepositPaid'] || '',
    pmIntroSent: customFieldValues['pmIntroSent'] || '',
    unconditionalDate: customFieldValues['unconditionalDate'] || '',
    landDepositPaid: customFieldValues['landDepositPaid'] || '',
    exchangeDate: customFieldValues['exchangeDate'] || '',
    financeDueDate: customFieldValues['financeDueDate'] || '',
    financeExtensionStatus: customFieldValues['financeExtensionStatus'] || '',
    financeRequestedExtensionDate: customFieldValues['financeRequestedExtensionDate'] || '',
    lastConstructionUpdateDate: customFieldValues['lastConstructionUpdateDate'] || '',
    lastFinanceUpdateDate: customFieldValues['lastFinanceUpdateDate'] || '',
    valuationExpectedAccessDate: customFieldValues['valuationExpectedAccessDate'] || '',
    typeOfProperty: customFieldValues['typeOfProperty'] || '',
    partnerName: customFieldValues['partnerName'] || '',
    partnerEmail: customFieldValues['partnerEmail'] || '',
    partnerPhone: customFieldValues['partnerPhone'] || '',
    smsfName: customFieldValues['smsfName'] || '',
    trustName: customFieldValues['trustName'] || '',
    accountantName: customFieldValues['accountantName'] || '',
    accountantCompany: customFieldValues['accountantCompany'] || '',
    accountantEmail: customFieldValues['accountantEmail'] || '',
    accountantPhone: customFieldValues['accountantPhone'] || '',
    propertyManager: customFieldValues['propertyManager'] || '',
    propertyManagerDetails: customFieldValues['propertyManagerDetails'] || '',
    stage: stageName,
  };
  // Any other mapped field (e.g. the new-mapping fields) not listed above.
  for (const friendly of Object.values(FIELD_MAP)) {
    if (!(friendly in base)) base[friendly] = customFieldValues[friendly] || '';
  }
  // Live-schema Opportunity fields: only non-empty values are sent (the page lists every key from the schema).
  for (const key of oppDynamicKeys.values()) {
    if (customFieldValues[key]) base[key] = customFieldValues[key];
  }

  // Custom object (Property Review) fields are prefixed with co_ so they can
  // never collide with / overwrite opportunity fields (e.g. status vs Status).
  const propertyValues = propertyByOppId.get(opp.id);
  for (const key of allPropertyKeys) {
    base[`co_${key}`] = propertyValues?.[key] ?? '';
  }
  base.propertyRecordCount = propertyValues?.__count ?? '0';
  base.propertyRecordIds = propertyValues?.__ids ?? '';
  base.linkedProperties = propertyValues?.__summary ?? '';
  base.linkedPropertyRecords = propertyValues?.__records ?? '[]';

  // Dates describe the fields; there are no synthetic population/duplicate masks.
  const constructionStage = base.co_construction_stage || '';
  base.daysInFinanceStatus = base.financeStatus ? daysSinceDay(base.financeStatusChangeDate) : '';
  base.daysInConstructionStage = constructionStage ? daysSinceDay(base.co_construction_stage_change_date || '') : '';

  return base;
}

function buildPropertyLookup(
  records: GHLPropertyRecord[],
  allKeys: Set<string>
): { propertyByOppId: Map<string, Record<string, string>>; allPropertyKeys: Set<string> } {
  const propertyByOppId = new Map<string, Record<string, string>>();
  const candidates = new Map<string, Record<string, string>[]>();

  for (const record of records) {
    const props = record.properties || {};
    let linkedOppId: string | undefined;
    const values: Record<string, string> = {};
    // Keep the property record's own id so custom object fields can be written back
    values['record_id'] = record.id || '';
    allKeys.add('record_id');

    for (const [rawKey, rawValue] of Object.entries(props)) {
      const shortKey = toShortPropertyKey(rawKey);
      const value = toStringValue(rawValue);
      values[shortKey] = value;
      if (
        shortKey === 'linked_opportunity_id' ||
        rawKey === PROPERTY_LINK_FIELD_ID
      ) {
        linkedOppId = value;
      }
    }

    if (linkedOppId) {
      const list = candidates.get(linkedOppId) || [];
      list.push(values);
      candidates.set(linkedOppId, list);
    }
  }

  // A record exists regardless of lifecycle status. Multiple links are exposed,
  // never resolved by silently choosing the latest/active record.
  for (const [oppId, list] of candidates) {
    const linked = [...new Map(list.map((values) => [values.record_id, values])).values()];
    propertyByOppId.set(oppId, {
      ...(linked.length === 1 ? linked[0] : {}),
      __count: String(linked.length),
      __ids: linked.map((values) => values.record_id).join(', '),
      __summary: linked.map((values) => `${values.property_address || '(address not set)'} · ${values.status || '(status not set)'}`).join('\n'),
      __records: JSON.stringify(linked),
    });
  }

  return { propertyByOppId, allPropertyKeys: allKeys };
}

async function buildReport(historical = false): Promise<ReportRecord[]> {
  const started = Date.now();
  const [opportunityData, propertyData, schemaKeys, oppDynamicKeys] = await Promise.all([
    Promise.all([fetchPipelineStages(), fetchUsers()]).then(() => fetchAllOpportunities(historical)),
    fetchPropertyRecords(),
    fetchPropertySchemaKeys(),
    fetchOpportunityDynamicKeys(),
  ]);

  const allOpportunities = opportunityData;
  const { records: propertyRecords, keys: allPropertyKeys } = propertyData;
  for (const k of schemaKeys) allPropertyKeys.add(k);
  const { propertyByOppId } = buildPropertyLookup(propertyRecords, allPropertyKeys);

  const report = allOpportunities
    .map((opp) => transformOpportunity(opp, propertyByOppId, allPropertyKeys, oppDynamicKeys))
    .sort((a, b) => {
      const dateA = a.confirmedSettlementDate || '9999-12-31';
      const dateB = b.confirmedSettlementDate || '9999-12-31';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  lastBuildMs = Date.now() - started;
  return report;
}

function respond(records: ReportRecord[], fetchedAt: number, served: 'live', historical: boolean) {
  return NextResponse.json(records, {
    headers: {
      'X-Fetched-At': String(fetchedAt),
      'X-Served-From': served,
      'X-Reporting-Population': 'property-team-open-default-v1',
      'X-Opportunity-Status-Scope': historical ? 'all' : 'open',
      'X-Build-Ms': served === 'live' ? String(lastBuildMs) : '',
      'X-Record-Count': String(records.length),
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: Request) {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration (GHL_BEARER_TOKEN or GHL_LOCATION_ID)' },
        { status: 500 }
      );
    }

    const historical = request ? new URL(request.url).searchParams.get('historical') === '1' : false;
    const records = await buildReport(historical);
    return respond(records, Date.now(), 'live', historical);
  } catch (err) {
    console.error('Contract Team Reporting API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    sendCtrAlert({
      type: 'report-data-fetch-failed',
      subject: 'Report data failed to load from GHL',
      reason: 'The live Property Team data fetch failed while a user was loading the report.',
      impact: 'Users see an error instead of the report until GHL recovers or the issue is fixed.',
      action: 'Check GHL API status. If GHL is up, check the GHL_BEARER_TOKEN is valid and the Vercel function logs for details.',
      detailsHtml: `<pre>${message.slice(0, 1000)}</pre>`,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchAllOpportunities(historical: boolean): Promise<GHLOpportunity[]> {
  return searchGhlOpportunities<GHLOpportunity>(
    [{ field: 'pipeline_id', operator: 'eq', value: PIPELINE_ID.PROPERTY_TEAM },
      ...(!historical ? [{ field: 'status', operator: 'eq' as const, value: 'open' }] : [])],
    'ctr-property-team',
  );
}
