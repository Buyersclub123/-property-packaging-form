import { NextRequest, NextResponse } from 'next/server';

const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const PROPERTY_TEAM_PIPELINE_ID = 'zrb34FRmPnbIyAGFDeXJ';

const TIER_1_STAGE_IDS = [
  '5178d032-35d5-4b8e-8694-48a1afb0145a',
  '09e08409-928f-4a37-89a0-9b8b20fb58dc',
  '1ab3d6d1-e7cb-44c2-89ae-c32c663a4c92',
  '3dbb7880-05d1-4430-9c5f-f0bb97ac0c81',
  '25e97d2a-5001-4107-9764-4d39bf1ead00',
  '45c37207-8210-4e9d-b943-7eb5bf17c75a',
  'c050aa00-cf8a-44fe-be16-d0dc3069dd3b',
  '02656e9e-d8eb-4267-a3fc-8fe91a8b9cc7',
  'cef16f11-457a-4192-9ba2-c7a9f88b68d3',
  'edd71d3e-11f5-4de5-8546-21b0595be9cd',
  '5aaeb8c3-4680-438f-b545-21e5b9e92582',
  'f66556a2-08bc-4731-a5f1-161838e85487',
];

const TIER_2_STAGE_IDS = [
  'c25bab49-3841-42ca-a6b0-7db6f730b788',
  '62298717-2f72-4159-85ce-ddacbb5d7b9d',
  'eea0bb53-0172-414b-9883-dc96a3fae6a1',
  '02775ef3-8b84-468f-8a4e-28655265d4f8',
];

const TIER_3_PIPELINE_IDS = [
  'RDd4Kczt5mEuUhHfRr7C',
  'zgBRaMnACpskyf1wHCEV',
  'XMKCHlqekS7IU87PNLKB',
];

const STAGE_NAME_MAP: Record<string, string> = {
  // Property Team - Tier 1
  '5178d032-35d5-4b8e-8694-48a1afb0145a': '$300k-$400k | PERSONAL',
  '09e08409-928f-4a37-89a0-9b8b20fb58dc': '$300k-$400k | SMSF',
  '1ab3d6d1-e7cb-44c2-89ae-c32c663a4c92': '$400k-$500k | PERSONAL',
  '3dbb7880-05d1-4430-9c5f-f0bb97ac0c81': '$400k-$500k | SMSF',
  '25e97d2a-5001-4107-9764-4d39bf1ead00': '$500k-$600k | PERSONAL',
  '45c37207-8210-4e9d-b943-7eb5bf17c75a': '$500k-$600k | SMSF',
  'c050aa00-cf8a-44fe-be16-d0dc3069dd3b': '$600k-$700k | PERSONAL',
  '02656e9e-d8eb-4267-a3fc-8fe91a8b9cc7': '$600k-$700k | SMSF',
  'cef16f11-457a-4192-9ba2-c7a9f88b68d3': '$700k-$800k | PERSONAL',
  'edd71d3e-11f5-4de5-8546-21b0595be9cd': '$700k-$800k | SMSF',
  '5aaeb8c3-4680-438f-b545-21e5b9e92582': '$800k+ | PERSONAL',
  'f66556a2-08bc-4731-a5f1-161838e85487': '$800k+ | SMSF',
  // Property Team - Tier 2
  'c25bab49-3841-42ca-a6b0-7db6f730b788': 'EOI / Under Negotiation',
  '62298717-2f72-4159-85ce-ddacbb5d7b9d': 'Deal Accepted',
  'eea0bb53-0172-414b-9883-dc96a3fae6a1': 'Contracts Issued | HOLD - WIP',
  '02775ef3-8b84-468f-8a4e-28655265d4f8': 'Contracts Issued | Finalised',
  // Contracts pipeline
  '7fb6df7b-8258-49ed-b86e-a932f4702c75': 'Held up contract - Problem client',
  'bcf21862-65bc-4a6e-80e6-c1503dc39656': '1st of July',
  'c5ce4afc-7834-4545-a702-9d3cfa824b54': 'Contracts Issued | HOLD - WIP',
  'b400f3af-fd21-4665-99ee-0631982b20ec': 'Contracts Issued | Finalised',
  '089ef745-2f71-48f6-bb27-ca267855bbfd': 'Contracts Sent to Solicitor',
  '4acd3ec6-37b5-4635-b4fe-887d67809c97': 'Contract Amendments Required',
  '10a6de0e-d3b3-4315-beb7-7969c982bae5': 'Contract Sent For Signing',
  '26535f8a-f6c7-4c27-a936-16c46376c843': 'Sent for Exchange',
  '23303e35-a818-4d2d-9861-f2940616e91d': 'Exchanged',
  'e54ed086-e0f2-4c50-a442-98b12150fb8a': 'Signed Land/P. Build',
  'e4d0f144-32d0-4fcb-b73c-64d4d4a40065': 'Build contract issued/in review',
  '0ebda3f2-8ff8-45e9-8e1d-c7f3b3e6b882': 'Signed Build/P. Land VIC',
  '61dbb41a-61b8-4921-862b-821b20d917a2': 'Land issued/in review VIC',
  // Finance pipeline
  '8fc931f4-4694-42aa-a56e-cb80ff314460': 'Unregistered | Pending Finance',
  '5a5c4474-150b-48bc-ba3c-a172c415ea1a': 'SMSF / SINGLE CONTRACT',
  '30daaf81-e148-4217-a121-d624cc565ced': 'No val access',
  'ab0ee0bb-9b05-4cfc-975a-749d565f03fc': 'Pending Finance',
  'e6db59ed-b1c4-48cc-9ec3-587d23336691': 'Valuation Ordered',
  'c99d0135-cd6a-467a-bb47-eac2f6d494b5': 'Application Lodged',
  '2befdf02-7a80-4e9f-8766-8052a6f6cd93': 'Formal Approval/unregistered',
  '22a44a98-f33b-4e18-a50d-325e47106419': 'Formal Approval',
  '8c6fd147-88ac-4991-aa94-c5b13bce7e4f': 'Settled',
  // Construction pipeline
  '2f519b35-9011-496f-b318-3d1ce5d4a28b': 'PRE BA SMSF | IN CONSTRUCTION',
  '77c8dfc4-be73-44ab-9052-ee3fc382c3a2': 'Pre BA',
  '754ba328-d153-4cfb-a2d9-22659999623f': 'BA Issued',
  'a95c06da-764a-4093-9b99-3cf21184a468': 'Slab',
  '3f77b25f-9248-46bd-ae3d-d6630c229ad5': 'FRAME/PLATE HEIGHT',
  '4e057da4-0aae-4afd-af4f-92d9fa42c80e': 'Enclosed/ROOF COVER',
  '03da62d5-45fa-4a38-a47a-21611a126aae': 'TILING/Lock up',
  'c010c432-9240-48e5-b521-c40b53ba107d': 'Fixing/PLASTERING',
  '114381c7-7f68-47e7-8b0e-efe74755cee2': 'PRACTICAL COMPLETION',
  '59f1b5f8-0df3-4af2-9da5-805c8ccde6ed': 'LANDSCAPING PENDING',
  '08aa8a2b-4a2a-44f6-97c1-57e26b2f09ac': 'HANDOVER',
};

const REGISTERED_ADDRESS_FIELD_ID = 'PlNx1851lV5PSAotT4FT';
const TOTAL_PURCHASE_PRICE_FIELD_ID = 'eJLct739hxbwrkrdtfca';
const ASSIGNED_BA_FIELD_ID = 'NXqFwEzo28k6lOkbyT5N';

interface GHLCustomField {
  id: string;
  fieldValueString?: string;
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
  lastStageChangeAt: string;
}

function getCustomFieldValue(
  customFields: GHLCustomField[] | undefined,
  fieldId: string
): string {
  if (!customFields) return '';
  const field = customFields.find((f) => f.id === fieldId);
  if (!field) return '';
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
    stageName: STAGE_NAME_MAP[opp.pipelineStageId || ''] || '',
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

export async function GET(request: NextRequest) {
  try {
    const tierParam = request.nextUrl.searchParams.get('tier') || '1';
    const tier = parseInt(tierParam, 10);

    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier. Must be 1, 2, or 3.' },
        { status: 400 }
      );
    }

    let opportunities: OpportunityResult[] = [];

    if (tier === 1) {
      opportunities = await fetchPipelineOpportunities(
        PROPERTY_TEAM_PIPELINE_ID,
        TIER_1_STAGE_IDS
      );
    } else if (tier === 2) {
      opportunities = await fetchPipelineOpportunities(
        PROPERTY_TEAM_PIPELINE_ID,
        TIER_2_STAGE_IDS
      );
    } else {
      const allResults = await Promise.all(
        TIER_3_PIPELINE_IDS.map((id) => fetchPipelineOpportunities(id))
      );
      opportunities = allResults.flat();
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
