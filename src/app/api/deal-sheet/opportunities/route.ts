import { NextRequest, NextResponse } from 'next/server';
import {
  PIPELINE_ID,
  POST_EXCHANGE_PIPELINE_IDS,
  PROPERTY_TEAM_PRICE_BRACKET_STAGE_IDS,
} from '@/lib/ghlPipelines';

const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
// Pipeline + stage IDs come from the single source of truth.
const PROPERTY_TEAM_PIPELINE_ID = PIPELINE_ID.PROPERTY_TEAM;

const REGISTERED_ADDRESS_FIELD_ID = 'PlNx1851lV5PSAotT4FT';
const TOTAL_PURCHASE_PRICE_FIELD_ID = 'eJLct739hxbwrkrdtfca';
const ASSIGNED_BA_FIELD_ID = 'NXqFwEzo28k6lOkbyT5N';

// Solicitor/broker custom field IDs on the opportunity (used by EOI prefill)
const SOLICITOR_NAME_FIELD_ID = 'QOoYpW6A8G1Jk8xWs7h1';
const SOLICITOR_COMPANY_FIELD_ID = 'bQ7bndudaNLmlLkYeDpG';
const SOLICITOR_EMAIL_FIELD_ID = 'fr5S8FvqtZi3Pixo7fSY';
const SOLICITOR_PHONE_FIELD_ID = 'ff8fVDpZc9gwDH9nJdTR';
const BROKER_NAME_FIELD_ID = 'lX2e29gQ1iFuQ0DksM5W';
const BROKER_COMPANY_FIELD_ID = 'bV6k9SaZ1UJpOuALO1xY';
const BROKER_EMAIL_FIELD_ID = 'puGMV3MWyU13n4sBLHDj';
const BROKER_PHONE_FIELD_ID = 'hSW5hSoB1mZyHsnk2o6n';

// Purchaser 2 / Partner fields (Opportunity Details folder)
const PARTNER_NAME_FIELD_ID = 'xFKbtz7Lt1X2nNTeFSSH';
const PARTNER_EMAIL_FIELD_ID = 'd0iUirsqy4kdUVMpHLfD';
const PARTNER_PHONE_FIELD_ID = 'gpStrUSjZVHE4xyolRvH';
const PARTNER_ADDRESS_FIELD_ID = 'KpxtSsE1JT2Hgo8gSkvF';
// Purchaser 1 address (Opportunity Details folder)
const POSTAL_ADDRESS_FIELD_ID = 'jY0D9emvA78Tr7TsKMB3';

// Contract Entity fields (Property Team Info New folder)
const ENTITY_SMSF_NAME_FIELD_ID = 'wWJMsF5GadaOEEVuPsGP';
const ENTITY_PERSONAL_NAME_FIELD_ID = 'wsnXOFf7F4z3TDQEFsCw';
const ENTITY_TRUST_NAME_FIELD_ID = 'EbDMmXJTBxkkWFBDChy5';
const ENTITY_TYPE_FIELD_ID = 'V62a5vivXnAKQ4pwKajt';

interface GHLCustomField {
  id: string;
  fieldValue?: string | number | null;       // GHL single-opp response uses this
  fieldValueString?: string;                  // GHL search/list response uses these
  fieldValueNumber?: number;
  fieldValueDate?: number;
  value?: string | number | null;
  type?: string;
}

interface GHLOpportunity {
  id: string;
  name: string;
  pipelineId?: string;
  pipelineStageId?: string;
  lastStageChangeAt?: string;
  customFields?: GHLCustomField[];
  contact?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface GHLResponse {
  opportunities?: GHLOpportunity[];
  meta?: {
    nextPageUrl?: string | null;
    startAfter?: number | string | null;
    startAfterId?: string | null;
    total?: number;
  };
}

interface OpportunityResult {
  id: string;
  name: string;
  registeredAddress: string;
  totalPurchasePrice: string;
  assignedBA: string;
  pipelineStageId: string;
  stageName: string;
  pipelineName: string;
  lastStageChangeAt: string;
  // Present on the single-opportunity (?id=) lookup only — the list endpoints
  // do not return contact details. Used to prefill the EOI purchaser.
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  // Solicitor/broker fields from opportunity custom fields (EOI prefill)
  solicitorName?: string;
  solicitorCompany?: string;
  solicitorEmail?: string;
  solicitorPhone?: string;
  brokerName?: string;
  brokerCompany?: string;
  brokerEmail?: string;
  brokerPhone?: string;
  // Purchaser address + Partner (Purchaser 2) fields
  postalAddress?: string;
  partnerName?: string;
  partnerEmail?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  // Contract Entity
  contractEntity?: string;
  entityType?: string;
}

// Pipeline + stage names resolved live from GHL (programme rule: no hardcoded
// lists, no fallbacks — if the fetch fails, names are blank).
// Same pattern as the reporting tool's fetchPipelineStages().
let stageNameCache: Record<string, string> = {};
let pipelineNameByStageId: Record<string, string> = {};
let pipelineCacheAt = 0;
const PIPELINE_CACHE_MS = 60 * 60 * 1000;

async function loadPipelineNames(): Promise<void> {
  if (Date.now() - pipelineCacheAt < PIPELINE_CACHE_MS && Object.keys(stageNameCache).length > 0) {
    return;
  }
  try {
    const res = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${LOCATION_ID}`, {
      headers: { Authorization: `Bearer ${BEARER_TOKEN}`, Version: '2021-07-28' },
      cache: 'no-store',
    });
    if (!res.ok) return;
    const data = await res.json();
    const stages: Record<string, string> = {};
    const pipelines: Record<string, string> = {};
    for (const pipeline of data.pipelines || []) {
      for (const stage of pipeline.stages || []) {
        stages[stage.id] = (stage.name || '').trim();
        pipelines[stage.id] = (pipeline.name || '').trim();
      }
    }
    if (Object.keys(stages).length > 0) {
      stageNameCache = stages;
      pipelineNameByStageId = pipelines;
      pipelineCacheAt = Date.now();
    }
  } catch (err) {
    console.error('Pipeline name fetch failed:', err);
  }
}

function getCustomFieldValue(
  customFields: GHLCustomField[] | undefined,
  fieldId: string
): string {
  if (!customFields) return '';
  const field = customFields.find((f) => f.id === fieldId);
  if (!field) return '';
  // GHL single-opp endpoint returns `fieldValue`; search/list returns `fieldValueString`
  if (field.fieldValue != null) return String(field.fieldValue);
  if (field.fieldValueString != null) return field.fieldValueString;
  if (field.fieldValueNumber != null) return String(field.fieldValueNumber);
  if (field.value != null) return String(field.value);
  return '';
}

function formatDateDDMMYYYY(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function mapOpportunity(opp: GHLOpportunity): OpportunityResult {
  return {
    id: opp.id,
    name: opp.name || '',
    registeredAddress: getCustomFieldValue(opp.customFields, REGISTERED_ADDRESS_FIELD_ID),
    totalPurchasePrice: getCustomFieldValue(opp.customFields, TOTAL_PURCHASE_PRICE_FIELD_ID),
    assignedBA: getCustomFieldValue(opp.customFields, ASSIGNED_BA_FIELD_ID),
    pipelineStageId: opp.pipelineStageId || '',
    stageName: stageNameCache[opp.pipelineStageId || ''] || '',
    pipelineName: pipelineNameByStageId[opp.pipelineStageId || ''] || '',
    lastStageChangeAt: formatDateDDMMYYYY(opp.lastStageChangeAt),
  };
}

async function fetchPipelineOpportunities(
  pipelineId: string,
  allowedStageIds?: string[]
): Promise<OpportunityResult[]> {
  const results: OpportunityResult[] = [];
  let startAfter: string | number | undefined;
  let startAfterId: string | undefined;

  while (true) {
    const params = new URLSearchParams();
    params.set('location_id', LOCATION_ID);
    params.set('pipeline_id', pipelineId);
    params.set('limit', '100');
    if (startAfter != null) params.set('startAfter', String(startAfter));
    if (startAfterId != null) params.set('startAfterId', startAfterId);

    const url = `${GHL_API_BASE}/opportunities/search?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL opportunities search failed:', response.status, errorText);
      throw new Error(`GHL API error: ${response.status}`);
    }

    const data: GHLResponse = await response.json();
    const opportunities = data.opportunities || [];

    for (const opp of opportunities) {
      if (opp.pipelineId && opp.pipelineId !== pipelineId) continue;
      if (allowedStageIds && !allowedStageIds.includes(opp.pipelineStageId || '')) {
        continue;
      }
      results.push(mapOpportunity(opp));
    }

    if (!data.meta?.nextPageUrl) break;

    startAfter = data.meta.startAfter ?? undefined;
    startAfterId = data.meta.startAfterId ?? undefined;

    if (startAfter == null && startAfterId == null) break;
  }

  return results;
}

// Two tier schemes coexist (do NOT "clean up" — see docs/deal-sheet-eoi-d1-brief.md):
// default (no v param) = legacy scheme used by /deal-sheet/matching (T1 PT price brackets,
// T2 entire Property Team pipeline, T3 Finance+Construction); v=2 = EOI-link-modal scheme
// (T1 entire Property Team pipeline, T2 Finance+Construction).
// The Contracts pipeline was deleted in GHL (Oct 2026); its work now lives in
// Property Team stages, so the former "Contracts" tier collapsed into Property Team.

export async function GET(request: NextRequest) {
  try {
    await loadPipelineNames();

    // Single-opportunity lookup by id. The EOI edit modal needs the linked
    // opportunity regardless of which pipeline it now sits in — searching a
    // single tier misses anything that has moved on to Contracts/Finance/
    // Construction, which left the modal with no selection and a permanently
    // disabled Confirm button.
    const oppId = request.nextUrl.searchParams.get('id');
    if (oppId) {
      const res = await fetch(`${GHL_API_BASE}/opportunities/${oppId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('GHL single opportunity fetch failed:', res.status, errorText);
        return NextResponse.json(
          { error: `GHL API error: ${res.status}` },
          { status: res.status }
        );
      }
      const data = await res.json();
      const opp: GHLOpportunity | undefined = data.opportunity || data;
      
      if (!opp || !opp.id) {
        return NextResponse.json({ opportunities: [], total: 0 });
      }
      const mapped: OpportunityResult = {
        ...mapOpportunity(opp),
        contactName: opp.contact?.name || '',
        contactEmail: opp.contact?.email || '',
        contactPhone: opp.contact?.phone || '',
        solicitorName: getCustomFieldValue(opp.customFields, SOLICITOR_NAME_FIELD_ID),
        solicitorCompany: getCustomFieldValue(opp.customFields, SOLICITOR_COMPANY_FIELD_ID),
        solicitorEmail: getCustomFieldValue(opp.customFields, SOLICITOR_EMAIL_FIELD_ID),
        solicitorPhone: getCustomFieldValue(opp.customFields, SOLICITOR_PHONE_FIELD_ID),
        brokerName: getCustomFieldValue(opp.customFields, BROKER_NAME_FIELD_ID),
        brokerCompany: getCustomFieldValue(opp.customFields, BROKER_COMPANY_FIELD_ID),
        brokerEmail: getCustomFieldValue(opp.customFields, BROKER_EMAIL_FIELD_ID),
        brokerPhone: getCustomFieldValue(opp.customFields, BROKER_PHONE_FIELD_ID),
        postalAddress: getCustomFieldValue(opp.customFields, POSTAL_ADDRESS_FIELD_ID),
        partnerName: getCustomFieldValue(opp.customFields, PARTNER_NAME_FIELD_ID),
        partnerEmail: getCustomFieldValue(opp.customFields, PARTNER_EMAIL_FIELD_ID),
        partnerPhone: getCustomFieldValue(opp.customFields, PARTNER_PHONE_FIELD_ID),
        partnerAddress: getCustomFieldValue(opp.customFields, PARTNER_ADDRESS_FIELD_ID),
        contractEntity: getCustomFieldValue(opp.customFields, ENTITY_TRUST_NAME_FIELD_ID)
          || getCustomFieldValue(opp.customFields, ENTITY_SMSF_NAME_FIELD_ID)
          || getCustomFieldValue(opp.customFields, ENTITY_PERSONAL_NAME_FIELD_ID),
        entityType: getCustomFieldValue(opp.customFields, ENTITY_TYPE_FIELD_ID),
      };
      return NextResponse.json({ opportunities: [mapped], total: 1 });
    }

    const tierParam = request.nextUrl.searchParams.get('tier') || '1';
    const tier = parseInt(tierParam, 10);
    const isV2 = request.nextUrl.searchParams.get('v') === '2';

    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be 1, 2, or 3.' },
        { status: 400 }
      );
    }

    let opportunities: OpportunityResult[] = [];

    const fetchPostExchange = async () => {
      const allResults = await Promise.all(
        POST_EXCHANGE_PIPELINE_IDS.map((id) => fetchPipelineOpportunities(id))
      );
      return allResults.flat();
    };

    if (isV2) {
      if (tier === 1) {
        opportunities = await fetchPipelineOpportunities(PROPERTY_TEAM_PIPELINE_ID);
      } else {
        opportunities = await fetchPostExchange();
      }
    } else if (tier === 1) {
      opportunities = await fetchPipelineOpportunities(
        PROPERTY_TEAM_PIPELINE_ID,
        PROPERTY_TEAM_PRICE_BRACKET_STAGE_IDS
      );
    } else if (tier === 2) {
      opportunities = await fetchPipelineOpportunities(PROPERTY_TEAM_PIPELINE_ID);
    } else {
      opportunities = await fetchPostExchange();
    }

    return NextResponse.json({
      opportunities,
      total: opportunities.length,
    });
  } catch (error) {
    console.error('Fetch opportunities error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
