import { NextResponse } from 'next/server';
import {
  ARRAY_FIELDS,
  FIELD_MAP,
  PROPERTY_OBJECT_ID,
  PROPERTY_LINK_FIELD_ID,
} from './fields';
import { sendCtrAlert } from './alerts';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

const PIPELINE_IDS = [
  'zgBRaMnACpskyf1wHCEV', // 06. FINANCE Pipeline
  'XMKCHlqekS7IU87PNLKB', // 07. CONSTRUCTION Pipeline
  'RDd4Kczt5mEuUhHfRr7C', // 05. CONTRACTS Pipeline
  'zrb34FRmPnbIyAGFDeXJ', // 04. PROPERTY TEAM Pipeline
];

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

const FALLBACK_USER_MAP: Record<string, string> = {
  ZTfbfK0bOGIDsla2JJ2d: 'Will Eaton',
};

let userMapCache: Record<string, string> = {};

const PIPELINE_NAMES: Record<string, string> = {
  'zgBRaMnACpskyf1wHCEV': 'Finance',
  'XMKCHlqekS7IU87PNLKB': 'Construction',
  'RDd4Kczt5mEuUhHfRr7C': 'Contracts',
  'zrb34FRmPnbIyAGFDeXJ': 'Property Team',
};

let stageNameCache: Record<string, string> = {};

async function fetchUsers(): Promise<void> {
  try {
    const response = await fetch(
      `${GHL_BASE_URL}/users/?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
          Accept: 'application/json',
        },
      }
    );
    if (!response.ok) return;
    const data = await response.json();
    const users = data.users || [];
    const map: Record<string, string> = {};
    for (const user of users) {
      if (user.id && (user.name || user.firstName || user.lastName)) {
        map[user.id] = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      }
    }
    userMapCache = { ...FALLBACK_USER_MAP, ...map };
  } catch (e) {
    console.error('Failed to fetch GHL users:', e);
  }
}

async function fetchPipelineStages(): Promise<void> {
  try {
    const response = await fetch(
      `${GHL_BASE_URL}/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
        },
      }
    );
    if (!response.ok) return;
    const data = await response.json();
    if (data.pipelines) {
      for (const pipeline of data.pipelines) {
        if (pipeline.stages) {
          for (const stage of pipeline.stages) {
            stageNameCache[stage.id] = stage.name;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to fetch pipeline stages:', e);
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
    const response = await fetch(
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
      }
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
      // Return what we have rather than failing completely.
      break;
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

    if (page > 30) {
      break;
    }
  }

  return { records: allRecords, keys: allKeys };
}

function transformOpportunity(
  opp: GHLOpportunity,
  propertyByOppId: Map<string, Record<string, string>>,
  allPropertyKeys: Set<string>
): ReportRecord {
  const customFieldValues: Record<string, string> = {};
  if (opp.customFields) {
    for (const cf of opp.customFields) {
      const friendlyName = FIELD_MAP[cf.id];
      if (friendlyName) {
        if (ARRAY_FIELDS.has(cf.id) && cf.fieldValueArray) {
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
    stage: stageName,
  };

  // Custom object (Property Review) fields are prefixed with co_ so they can
  // never collide with / overwrite opportunity fields (e.g. status vs Status).
  const propertyValues = propertyByOppId.get(opp.id);
  for (const key of allPropertyKeys) {
    base[`co_${key}`] = propertyValues?.[key] ?? '';
  }

  return base;
}

function buildPropertyLookup(
  records: GHLPropertyRecord[],
  allKeys: Set<string>
): { propertyByOppId: Map<string, Record<string, string>>; allPropertyKeys: Set<string> } {
  const propertyByOppId = new Map<string, Record<string, string>>();

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
      propertyByOppId.set(linkedOppId, values);
    }
  }

  return { propertyByOppId, allPropertyKeys: allKeys };
}

export async function GET() {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration (GHL_BEARER_TOKEN or GHL_LOCATION_ID)' },
        { status: 500 }
      );
    }

    const [opportunityData, propertyData] = await Promise.all([
      Promise.all([fetchPipelineStages(), fetchUsers()]).then(() => fetchAllOpportunities()),
      fetchPropertyRecords(),
    ]);

    const allOpportunities = opportunityData;
    const { records: propertyRecords, keys: allPropertyKeys } = propertyData;
    const { propertyByOppId } = buildPropertyLookup(propertyRecords, allPropertyKeys);

    const records = allOpportunities
      .filter((opp) => opp.status === 'open')
      .map((opp) => transformOpportunity(opp, propertyByOppId, allPropertyKeys))
      .filter((r) => {
        if (r.pipelineId === 'zgBRaMnACpskyf1wHCEV' && r.pipelineStage.toLowerCase() === 'settled') return false;
        if (r.pipelineId === 'XMKCHlqekS7IU87PNLKB' && r.pipelineStage.toLowerCase() === 'handover') return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = a.confirmedSettlementDate || '9999-12-31';
        const dateB = b.confirmedSettlementDate || '9999-12-31';
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

    return NextResponse.json(records);
  } catch (err) {
    console.error('Contract Team Reporting API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    sendCtrAlert({
      type: 'report-data-fetch-failed',
      subject: 'Report data failed to load from GHL',
      reason: 'The main data fetch (opportunities across the 4 pipelines) failed while a user was loading the report.',
      impact: 'Users see an error instead of the report until GHL recovers or the issue is fixed.',
      action: 'Check GHL API status. If GHL is up, check the GHL_BEARER_TOKEN is valid and the Vercel function logs for details.',
      detailsHtml: `<pre>${message.slice(0, 1000)}</pre>`,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchAllOpportunities(): Promise<GHLOpportunity[]> {
  const allOpportunities: GHLOpportunity[] = [];

  for (const pipelineId of PIPELINE_IDS) {
    let hasMore = true;
    let startAfter: number | undefined;
    let startAfterId: string | undefined;
    let pageCount = 0;

    while (hasMore) {
      const url = new URL(`${GHL_BASE_URL}/opportunities/search`);
      url.searchParams.set('location_id', GHL_LOCATION_ID);
      url.searchParams.set('pipeline_id', pipelineId);
      url.searchParams.set('limit', '100');
      if (startAfter !== undefined && startAfterId) {
        url.searchParams.set('startAfter', String(startAfter));
        url.searchParams.set('startAfterId', startAfterId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GHL Opportunities API error (pipeline ${pipelineId}, page ${pageCount}):`, response.status, errorText);
        throw new Error(`GHL API error: ${response.status} ${errorText}`);
      }

      const data: GHLSearchResponse = await response.json();

      if (data.opportunities && data.opportunities.length > 0) {
        allOpportunities.push(...data.opportunities);
        pageCount++;

        if (data.meta?.startAfter && data.meta?.startAfterId) {
          startAfter = data.meta.startAfter;
          startAfterId = data.meta.startAfterId;
        } else {
          hasMore = false;
        }

        if (data.opportunities.length < 100) {
          hasMore = false;
        }
        if (data.meta?.nextPage === null) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      if (pageCount > 30) {
        hasMore = false;
      }
    }
  }

  return allOpportunities;
}
