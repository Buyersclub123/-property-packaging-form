import { NextRequest, NextResponse } from 'next/server';

const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

// Map our field keys to GHL custom field IDs
const FIELD_TO_GHL_ID: Record<string, string> = {
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

// Fields that are DATE type in GHL
const DATE_FIELDS = new Set([
  'bpDueDate',
  'bpRequestedExtensionDate',
  'bpScheduledDate',
  'confirmedSettlementDate',
  'preSettlementInspectionDate',
]);

// Fields that are CHECKBOX type (array in GHL)
const CHECKBOX_FIELDS = new Set(['bpRequested', 'financeFormalApproval']);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId, changes, assignedTo } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
    }

    // Build custom fields update array
    const customFields: any[] = [];
    for (const [key, value] of Object.entries(changes || {})) {
      const ghlId = FIELD_TO_GHL_ID[key];
      if (!ghlId) continue;

      if (DATE_FIELDS.has(key)) {
        // Convert date string to timestamp or empty
        if (value) {
          customFields.push({ id: ghlId, field_value: new Date(value as string).toISOString() });
        } else {
          customFields.push({ id: ghlId, field_value: '' });
        }
      } else if (CHECKBOX_FIELDS.has(key)) {
        // Checkbox: array of values or empty array
        customFields.push({ id: ghlId, field_value: value ? ['Yes'] : [] });
      } else {
        customFields.push({ id: ghlId, field_value: value || '' });
      }
    }

    // Build the update payload
    const payload: any = {};
    if (customFields.length > 0) {
      payload.customFields = customFields;
    }
    if (assignedTo !== undefined) {
      payload.assignedTo = assignedTo || '';
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No changes to save' }, { status: 400 });
    }

    const url = `https://services.leadconnectorhq.com/opportunities/${opportunityId}?locationId=${LOCATION_ID}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Shay report update failed:', res.status, errorText);
      return NextResponse.json({ error: `GHL API error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Shay report update error:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}
