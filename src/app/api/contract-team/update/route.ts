import { NextRequest, NextResponse } from 'next/server';
import { FRIENDLY_TO_FIELD_ID } from '../fields';

const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';

// Fields that are allowed to be edited (transactional fields only)
const EDITABLE_FIELDS = new Set([
  'bpRequested',
  'bpDueDate',
  'bpExtensionStatus',
  'bpScheduledDate',
  'bpConditionStatus',
  'bpNegotiationDetail',
  'bpRequestedExtensionDate',
  'financeApprovalReceived',
  'confirmedSettlementDate',
  'insuranceStatus',
  'preSettlementInspectionDate',
  'preSettlementInspectionStatus',
  'latestStatusUpdate',
  'buildDepositIssued',
  'buildDepositIssuedDate',
  'buildDepositPaid',
  'pmIntroSent',
  'unconditionalDate',
  'landDepositPaid',
  'exchangeDate',
  'financeDueDate',
  'financeExtensionStatus',
  'financeRequestedExtensionDate',
  'lastConstructionUpdateDate',
  'lastFinanceUpdateDate',
  'registration',
  'registrationDateETA',
  'briefNotes',
]);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId, field, value } = body;

    if (!opportunityId || !field) {
      return NextResponse.json(
        { error: 'opportunityId and field are required' },
        { status: 400 }
      );
    }

    if (!EDITABLE_FIELDS.has(field)) {
      return NextResponse.json(
        { error: `Field "${field}" is not editable` },
        { status: 403 }
      );
    }

    const fieldId = FRIENDLY_TO_FIELD_ID[field];
    if (!fieldId) {
      return NextResponse.json(
        { error: `Unknown field: ${field}` },
        { status: 400 }
      );
    }

    // GHL Opportunities API: Update opportunity custom field
    const url = `https://services.leadconnectorhq.com/opportunities/${opportunityId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GHL_API_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customFields: [
          {
            id: fieldId,
            field_value: value ?? '',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL update failed:', response.status, errorText);
      return NextResponse.json(
        { error: `GHL API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, opportunity: data });
  } catch (error) {
    console.error('Contract team update error:', error);
    return NextResponse.json(
      { error: 'Failed to update field' },
      { status: 500 }
    );
  }
}
