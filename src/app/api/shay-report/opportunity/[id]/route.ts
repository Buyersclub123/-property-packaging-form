import { NextResponse } from 'next/server';

const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const FINANCE_PIPELINE_ID = 'zgBRaMnACpskyf1wHCEV';
const TYPE_OF_PROPERTY_FIELD_ID = 'p1IK7Zi8w1q2tLBwTrIE';
const SETTLED_STAGE_ID = '8c6fd147-88ac-4991-aa94-c5b13bce7e4f';

const FIELD_IDS = {
  registeredAddress: 'PlNx1851lV5PSAotT4FT',
  bpRequested: 'lI4xRPFaeTDbXhiGIUFN',
  bpDueDate: 'es2ElmYbC2UHlSWT5iCo',
  bpRequestedExtensionDate: 'ipSQQfga7SErZTfwVAaw',
  bpExtensionStatus: 'FUTVzEIAPaNQ5GFvFNAA',
  bpScheduledDate: 'nMF1pg9HhWgclONNpXgB',
  bpConditionStatus: 'ltb5pdvpiOp47H5Q8g7C',
  bpNegotiationDetail: 'ninmdUiyIt5wmkeHpYMQ',
  financeFormalApproval: 'KaDnA48WSWgbYKtl3oPx',
  confirmedSettlementDate: 'WYmP8plPbH1E8NvUaGcP',
  insuranceStatus: 'pYAX5pGdutTTNbBFlCSp',
  preSettlementInspectionDate: 'ip0s6Ku4c7Qjt9rGh6rk',
  preSettlementInspectionStatus: 'ZxvlKtEUn9a0kjNr2kLe',
  latestStatusUpdate: 'bneDrNtsG4Qv05nFNJDC',
};

function getCustomFieldValue(customFields: any[], fieldId: string): string {
  const field = customFields?.find((f: any) => f.id === fieldId);
  if (!field) return '';
  if (field.fieldValueString) return field.fieldValueString;
  if (field.fieldValueDate) return new Date(field.fieldValueDate).toISOString().split('T')[0];
  if (field.fieldValueArray) return field.fieldValueArray.join(', ');
  return '';
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const res = await fetch(
      `https://services.leadconnectorhq.com/opportunities/${id}`,
      {
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          Version: '2021-07-28',
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `GHL API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const opp = data.opportunity || data;

    // Check if this opportunity belongs to the Finance pipeline
    if (opp.pipelineId !== FINANCE_PIPELINE_ID) {
      return NextResponse.json({ record: null, reason: 'Not in Finance pipeline' });
    }

    // Check Type of Property
    const typeField = opp.customFields?.find((f: any) => f.id === TYPE_OF_PROPERTY_FIELD_ID);
    if (typeField?.fieldValueString !== 'Established') {
      return NextResponse.json({ record: null, reason: 'Type of Property is not Established' });
    }

    // Check not Settled
    if (opp.pipelineStageId === SETTLED_STAGE_ID) {
      return NextResponse.json({ record: null, reason: 'In Settled stage' });
    }

    // Check address doesn't contain LOT
    const addrField = opp.customFields?.find((f: any) => f.id === FIELD_IDS.registeredAddress);
    const addr = (addrField?.fieldValueString || '').toUpperCase();
    if (addr.includes('LOT')) {
      return NextResponse.json({ record: null, reason: 'Address contains LOT' });
    }

    // Map to flat structure
    const record = {
      id: opp.id,
      ghlLink: `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/opportunities/${opp.id}`,
      name: opp.name || '',
      registeredAddress: getCustomFieldValue(opp.customFields || [], FIELD_IDS.registeredAddress),
      typeOfProperty: getCustomFieldValue(opp.customFields || [], TYPE_OF_PROPERTY_FIELD_ID),
      bpRequested: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpRequested),
      assignedTo: opp.assignedTo || '',
      bpDueDate: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpDueDate),
      bpRequestedExtensionDate: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpRequestedExtensionDate),
      bpExtensionStatus: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpExtensionStatus),
      bpScheduledDate: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpScheduledDate),
      bpConditionStatus: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpConditionStatus),
      bpNegotiationDetail: getCustomFieldValue(opp.customFields || [], FIELD_IDS.bpNegotiationDetail),
      financeFormalApproval: getCustomFieldValue(opp.customFields || [], FIELD_IDS.financeFormalApproval),
      confirmedSettlementDate: getCustomFieldValue(opp.customFields || [], FIELD_IDS.confirmedSettlementDate),
      insuranceStatus: getCustomFieldValue(opp.customFields || [], FIELD_IDS.insuranceStatus),
      preSettlementInspectionDate: getCustomFieldValue(opp.customFields || [], FIELD_IDS.preSettlementInspectionDate),
      preSettlementInspectionStatus: getCustomFieldValue(opp.customFields || [], FIELD_IDS.preSettlementInspectionStatus),
      latestStatusUpdate: getCustomFieldValue(opp.customFields || [], FIELD_IDS.latestStatusUpdate),
    };

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Shay report single opportunity fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunity' },
      { status: 500 }
    );
  }
}
