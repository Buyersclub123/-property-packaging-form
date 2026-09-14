import { NextResponse } from 'next/server';
import { FIELD_MAP, ARRAY_FIELDS } from '@/app/api/contract-team/fields';
import { GHLRecord, GHLSearchResponse as COGHLSearchResponse } from '@/lib/dealSheetTransform';

export const dynamic = 'force-dynamic';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = '2021-07-28';

const PIPELINE_IDS = [
  'zgBRaMnACpskyf1wHCEV',
  'XMKCHlqekS7IU87PNLKB',
  'RDd4Kczt5mEuUhHfRr7C',
  'zrb34FRmPnbIyAGFDeXJ',
];

const PIPELINE_NAMES: Record<string, string> = {
  'zgBRaMnACpskyf1wHCEV': 'Finance',
  'XMKCHlqekS7IU87PNLKB': 'Construction',
  'RDd4Kczt5mEuUhHfRr7C': 'Contracts',
  'zrb34FRmPnbIyAGFDeXJ': 'Property Team',
};

const FALLBACK_USER_MAP: Record<string, string> = {
  ZTfbfK0bOGIDsla2JJ2d: 'Will Eaton',
};

let userMapCache: Record<string, string> = {};
let stageNameCache: Record<string, string> = {};

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
  name?: string;
  status?: string;
  pipelineId?: string;
  pipelineStageId?: string;
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

interface GHLOppSearchResponse {
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

async function fetchUsers() {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/users/?locationId=${GHL_LOCATION_ID}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
          Accept: 'application/json',
        },
        cache: 'no-store',
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

async function fetchPipelineStages() {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
        },
        cache: 'no-store',
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

async function fetchCustomObjects(): Promise<GHLRecord[]> {
  const allRecords: GHLRecord[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://services.leadconnectorhq.com/objects/${GHL_OBJECT_ID}/records/search`,
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
      console.error(`GHL Custom Object API error (page ${page}):`, response.status, errorText);
      throw new Error(`GHL API error: ${response.status}`);
    }

    const data: COGHLSearchResponse = await response.json();
    if (data.records && data.records.length > 0) {
      allRecords.push(...data.records);
      page++;
      if (data.records.length < 100) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }

    if (page > 20) {
      hasMore = false;
    }
  }

  return allRecords;
}

async function fetchOpportunities(): Promise<GHLOpportunity[]> {
  const allOpportunities: GHLOpportunity[] = [];

  for (const pipelineId of PIPELINE_IDS) {
    let hasMore = true;
    let startAfter: number | undefined;
    let startAfterId: string | undefined;
    let pageCount = 0;

    while (hasMore) {
      const url = new URL('https://services.leadconnectorhq.com/opportunities/search');
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
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `GHL Opportunities API error (pipeline ${pipelineId}, page ${pageCount}):`,
          response.status,
          errorText
        );
        throw new Error(`GHL API error: ${response.status}`);
      }

      const data: GHLOppSearchResponse = await response.json();
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

function transformOpportunity(opp: GHLOpportunity): Record<string, string> {
  const customFieldValues: Record<string, string> = {};

  if (opp.customFields) {
    for (const cf of opp.customFields) {
      const friendlyName = FIELD_MAP[cf.id];
      const key = friendlyName || `opp_${cf.id}`;

      if (ARRAY_FIELDS.has(cf.id) && cf.fieldValueArray) {
        customFieldValues[key] = cf.fieldValueArray.join(', ');
      } else if (cf.fieldValueString) {
        customFieldValues[key] = cf.fieldValueString;
      } else if (cf.fieldValueDate) {
        const d = new Date(cf.fieldValueDate);
        customFieldValues[key] = d.toISOString().split('T')[0];
      } else if (cf.fieldValue !== null && cf.fieldValue !== undefined && cf.fieldValue !== '') {
        customFieldValues[key] = String(cf.fieldValue);
      } else if (cf.value !== null && cf.value !== undefined) {
        customFieldValues[key] = String(cf.value);
      }
    }
  }

  const stageName = stageNameCache[opp.pipelineStageId || ''] || opp.pipelineStageId || '';
  const ownerName = userMapCache[opp.assignedTo || ''] || opp.assignedTo || '';
  const followers = (opp.followers || []).map((id) => userMapCache[id] || id).join(', ');
  const daysSince = opp.lastStageChangeAt
    ? String(Math.floor((Date.now() - new Date(opp.lastStageChangeAt).getTime()) / (1000 * 60 * 60 * 24)))
    : '';

  return {
    id: opp.id || '',
    opportunityName: opp.name || '',
    stage: stageName,
    pipelineId: opp.pipelineId || '',
    pipelineStageId: opp.pipelineStageId || '',
    pipelineName: PIPELINE_NAMES[opp.pipelineId || ''] || opp.pipelineId || '',
    status: opp.status || '',
    createdAt: opp.createdAt || '',
    updatedAt: opp.updatedAt || '',
    lastStageChangeAt: opp.lastStageChangeAt || '',
    daysSinceStageChange: daysSince,
    monetaryValue: opp.monetaryValue ? String(opp.monetaryValue) : '',
    contactName: opp.contact?.name || '',
    contactEmail: opp.contact?.email || '',
    contactPhone: opp.contact?.phone || '',
    owner: ownerName,
    followers: followers,
    ghlLink: opp.id
      ? `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/${opp.id}?tab=Opportunity+details`
      : '',
    ...customFieldValues,
  };
}

function buildUnifiedRecords(
  coRecords: GHLRecord[],
  opps: GHLOpportunity[]
): Record<string, string>[] {
  const oppRecords: Record<string, Record<string, string>> = {};
  const usedOppIds = new Set<string>();

  for (const opp of opps) {
    if (opp.id) {
      oppRecords[opp.id] = transformOpportunity(opp);
    }
  }

  const unified: Record<string, string>[] = [];

  for (const record of coRecords) {
    const linkedId = record.properties?.linked_opportunity_id || '';
    const coFields: Record<string, string> = {
      coRecordId: record.id || '',
      coCreatedAt: record.createdAt || '',
      coUpdatedAt: record.updatedAt || '',
      coLinkedOpportunityId: linkedId,
    };

    for (const [key, value] of Object.entries(record.properties || {})) {
      coFields[`co_${key}`] = value ?? '';
    }

    let merged = { ...coFields };

    if (linkedId && oppRecords[linkedId]) {
      merged = { ...merged, ...oppRecords[linkedId] };
      usedOppIds.add(linkedId);
    }

    unified.push(merged);
  }

  // Include opportunity-only rows that were not linked
  for (const [oppId, oppRecord] of Object.entries(oppRecords)) {
    if (!usedOppIds.has(oppId)) {
      unified.push({
        coRecordId: '',
        coCreatedAt: '',
        coUpdatedAt: '',
        coLinkedOpportunityId: '',
        ...oppRecord,
      });
    }
  }

  return unified;
}

export async function GET(request: Request) {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration (GHL_BEARER_TOKEN or GHL_LOCATION_ID)' },
        { status: 500 }
      );
    }

    // Cache-busting query param ignored
    await Promise.all([fetchUsers(), fetchPipelineStages()]);

    const [coRecords, opps] = await Promise.all([fetchCustomObjects(), fetchOpportunities()]);
    const records = buildUnifiedRecords(coRecords, opps);

    return NextResponse.json(
      {
        records,
        total: records.length,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('GHL data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GHL data' },
      { status: 502 }
    );
  }
}
