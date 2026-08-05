import { NextResponse } from 'next/server';
import { FIELD_MAP, ARRAY_FIELDS } from './fields';

const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';

// Pipeline IDs for Finance and Construction
const PIPELINE_IDS = [
  'zgBRaMnACpskyf1wHCEV', // 06. FINANCE Pipeline
  'XMKCHlqekS7IU87PNLKB', // 07. CONSTRUCTION Pipeline
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

interface TransformedRecord {
  id: string;
  opportunityName: string;
  registeredAddress: string;
  stage: string;
  pipelineId: string;
  pipelineStageId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  monetaryValue: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastStageChangeAt: string;
  ghlLink: string;
  // Editable transactional fields
  bpRequested: string;
  bpDueDate: string;
  bpExtensionStatus: string;
  bpScheduledDate: string;
  bpConditionStatus: string;
  bpNegotiationDetail: string;
  financeApprovalReceived: string;
  confirmedSettlementDate: string;
  insuranceStatus: string;
  preSettlementInspectionDate: string;
  preSettlementInspectionStatus: string;
  // Additional reference fields
  brokerName: string;
  brokerCompany: string;
  solicitorName: string;
  latestStatusUpdate: string;
  agentBuilderDetails: string;
  briefNotes: string;
  assignedBA: string;
  personalName: string;
  settlementDate: string;
  registration: string;
  registrationDateETA: string;
  buildDepositIssued: string;
  buildDepositIssuedDate: string;
  buildDepositPaid: string;
  pmIntroSent: string;
  unconditionalDate: string;
  landDepositPaid: string;
  exchangeDate: string;
  financeDueDate: string;
  financeExtensionStatus: string;
  lastConstructionUpdateDate: string;
  lastFinanceUpdateDate: string;
  daysSinceStageChange: string;
  pipelineName: string;
  bpRequestedExtensionDate: string;
  financeRequestedExtensionDate: string;
  valuationExpectedAccessDate: string;
}

// Pipeline name and stage name caches
const PIPELINE_NAMES: Record<string, string> = {
  'zgBRaMnACpskyf1wHCEV': 'Finance',
  'XMKCHlqekS7IU87PNLKB': 'Construction',
};
let stageNameCache: Record<string, string> = {};

async function fetchPipelineStages(): Promise<void> {
  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${GHL_LOCATION_ID}`,
      {
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: '2021-07-28',
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

function transformOpportunity(opp: GHLOpportunity): TransformedRecord {
  // Parse custom fields into a map
  const customFieldValues: Record<string, string> = {};
  if (opp.customFields) {
    for (const cf of opp.customFields) {
      const friendlyName = FIELD_MAP[cf.id];
      if (friendlyName) {
        if (ARRAY_FIELDS.has(cf.id) && cf.fieldValueArray) {
          // Checkbox/multi-select fields — join array values
          customFieldValues[friendlyName] = cf.fieldValueArray.join(', ');
        } else if (cf.fieldValueString) {
          customFieldValues[friendlyName] = cf.fieldValueString;
        } else if (cf.fieldValueDate) {
          // Convert epoch ms to ISO date string (YYYY-MM-DD)
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

  return {
    id: opp.id,
    opportunityName: opp.name || '',
    registeredAddress: customFieldValues['registeredAddress'] || '',
    stage: stageName,
    pipelineId: opp.pipelineId || '',
    pipelineStageId: opp.pipelineStageId || '',
    contactName: opp.contact?.name || '',
    contactEmail: opp.contact?.email || '',
    contactPhone: opp.contact?.phone || '',
    monetaryValue: opp.monetaryValue ? String(opp.monetaryValue) : '',
    status: opp.status || '',
    createdAt: opp.createdAt || '',
    updatedAt: opp.updatedAt || '',
    lastStageChangeAt: opp.lastStageChangeAt || '',
    ghlLink: opp.id
      ? `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/${opp.id}?tab=Opportunity+details`
      : '',
    // Editable transactional fields
    bpRequested: customFieldValues['bpRequested'] || '',
    bpDueDate: customFieldValues['bpDueDate'] || '',
    bpExtensionStatus: customFieldValues['bpExtensionStatus'] || '',
    bpScheduledDate: customFieldValues['bpScheduledDate'] || '',
    bpConditionStatus: customFieldValues['bpConditionStatus'] || '',
    bpNegotiationDetail: customFieldValues['bpNegotiationDetail'] || '',
    financeApprovalReceived: customFieldValues['financeApprovalReceived'] || '',
    confirmedSettlementDate: customFieldValues['confirmedSettlementDate'] || '',
    insuranceStatus: customFieldValues['insuranceStatus'] || '',
    preSettlementInspectionDate: customFieldValues['preSettlementInspectionDate'] || '',
    preSettlementInspectionStatus: customFieldValues['preSettlementInspectionStatus'] || '',
    // Additional reference fields
    brokerName: customFieldValues['brokerName'] || '',
    brokerCompany: customFieldValues['brokerCompany'] || '',
    solicitorName: customFieldValues['solicitorName'] || '',
    latestStatusUpdate: customFieldValues['latestStatusUpdate'] || '',
    agentBuilderDetails: customFieldValues['agentBuilderDetails'] || '',
    briefNotes: customFieldValues['briefNotes'] || '',
    assignedBA: customFieldValues['assignedBA'] || '',
    personalName: customFieldValues['personalName'] || '',
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
    lastConstructionUpdateDate: customFieldValues['lastConstructionUpdateDate'] || '',
    lastFinanceUpdateDate: customFieldValues['lastFinanceUpdateDate'] || '',
    pipelineName: PIPELINE_NAMES[opp.pipelineId] || opp.pipelineId || '',
    daysSinceStageChange: opp.lastStageChangeAt
      ? String(Math.floor((Date.now() - new Date(opp.lastStageChangeAt).getTime()) / (1000 * 60 * 60 * 24)))
      : '',
    bpRequestedExtensionDate: customFieldValues['bpRequestedExtensionDate'] || '',
    financeRequestedExtensionDate: customFieldValues['financeRequestedExtensionDate'] || '',
    valuationExpectedAccessDate: customFieldValues['valuationExpectedAccessDate'] || '',
  };
}

export async function GET() {
  try {
    if (!GHL_API_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json(
        { error: 'Missing GHL configuration (GHL_BEARER_TOKEN or GHL_LOCATION_ID)' },
        { status: 500 }
      );
    }

    // Fetch pipeline stage names first
    await fetchPipelineStages();

    // Fetch opportunities from Finance + Construction pipelines (cursor-based pagination)
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
            Version: '2021-07-28',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`GHL Opportunities API error (pipeline ${pipelineId}, page ${pageCount}):`, response.status, errorText);
          return NextResponse.json(
            { error: `GHL API error: ${response.status}` },
            { status: 502 }
          );
        }

        const data: GHLSearchResponse = await response.json();

        if (data.opportunities && data.opportunities.length > 0) {
          allOpportunities.push(...data.opportunities);
          pageCount++;

          // Use cursor from meta for next page
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

        // Safety limit per pipeline
        if (pageCount > 30) {
          hasMore = false;
        }
      }
    }

    // Transform and sort by Confirmed Settlement Date ascending
    const records = allOpportunities
      .filter((opp) => opp.status === 'open') // Only open opportunities
      .map(transformOpportunity)
      .sort((a, b) => {
        const dateA = a.confirmedSettlementDate || '9999-12-31';
        const dateB = b.confirmedSettlementDate || '9999-12-31';
        return dateA.localeCompare(dateB);
      });

    return NextResponse.json({
      records,
      total: records.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Contract team fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contract team data' },
      { status: 500 }
    );
  }
}
