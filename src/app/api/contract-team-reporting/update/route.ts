import { NextRequest, NextResponse } from 'next/server';
import { FRIENDLY_TO_FIELD_ID, PROPERTY_OBJECT_ID, PROPERTY_FIELD_TYPES, CO_PREFIX } from '../fields';
import { sendCtrAlert } from '../alerts';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_API_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

// Read-only fields can never be written from the tool (feedback items 7 + 29)
const READ_ONLY = new Set([
  'registeredAddress',
  'assignedBA',
  'partnerName',
  'partnerEmail',
  'partnerPhone',
]);

// Fields that are DATE type in GHL
const DATE_FIELDS = new Set([
  'bpDueDate',
  'bpRequestedExtensionDate',
  'bpScheduledDate',
  'confirmedSettlementDate',
  'preSettlementInspectionDate',
  'exchangeDate',
  'unconditionalDate',
  'financeDueDate',
  'financeRequestedExtensionDate',
  'lastFinanceUpdateDate',
  'lastConstructionUpdateDate',
  'buildDepositIssuedDate',
  'registrationDateETA',
  'valuationExpectedAccessDate',
]);

// Checkbox (array) fields in GHL and the value that means "ticked"
const CHECKBOX_ON_VALUE: Record<string, string> = {
  bpRequested: 'Yes',
  financeApprovalReceived: 'Yes',
  financeFormalApproval: 'Yes', // alias of financeApprovalReceived
  landDepositPaid: 'Yes',
  buildDepositIssued: 'Yes',
  buildDepositPaid: 'Yes',
  pmIntroSent: 'Yes',
  registration: 'Registered',
};

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId, changes, assignedTo, propertyRecordId } = body;

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
    }

    // Split changes into opportunity custom fields and property record (co_) fields
    const customFields: { id: string; field_value: unknown }[] = [];
    const propertyProps: Record<string, unknown> = {};

    for (const [rawKey, rawValue] of Object.entries(changes || {})) {
      const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);

      // Custom object (Property Review) fields — written to the property record.
      // READ-ONLY for now (feedback item 31): flip to false to re-enable.
      const CO_FIELDS_READ_ONLY = true;
      if (rawKey.startsWith(CO_PREFIX)) {
        if (CO_FIELDS_READ_ONLY) continue;
        const coKey = rawKey.slice(CO_PREFIX.length);
        if (coKey === 'record_id' || coKey === 'linked_opportunity_id') continue;
        const dataType = PROPERTY_FIELD_TYPES[coKey];
        if (!dataType) continue;
        if (dataType === 'DATE') {
          propertyProps[coKey] = value ? new Date(value).toISOString() : '';
        } else if (dataType === 'NUMERICAL') {
          propertyProps[coKey] = value === '' ? '' : Number(value);
        } else {
          propertyProps[coKey] = value;
        }
        continue;
      }

      // financeFormalApproval is an alias the B&P layout uses
      const key = rawKey === 'financeFormalApproval' ? 'financeApprovalReceived' : rawKey;
      if (READ_ONLY.has(key)) continue;
      const ghlId = FRIENDLY_TO_FIELD_ID[key];
      if (!ghlId) continue;

      if (key in CHECKBOX_ON_VALUE || rawKey in CHECKBOX_ON_VALUE) {
        const onValue = CHECKBOX_ON_VALUE[key] ?? CHECKBOX_ON_VALUE[rawKey];
        const ticked = value === 'true' || value === onValue || value === 'Yes';
        customFields.push({ id: ghlId, field_value: ticked ? [onValue] : [] });
      } else if (DATE_FIELDS.has(key)) {
        customFields.push({ id: ghlId, field_value: value ? new Date(value).toISOString() : '' });
      } else {
        customFields.push({ id: ghlId, field_value: value });
      }
    }

    if (Object.keys(propertyProps).length > 0 && !propertyRecordId) {
      return NextResponse.json(
        { error: 'This record has no linked Property Review record — custom object fields cannot be saved' },
        { status: 400 }
      );
    }

    const payload: { customFields?: typeof customFields; assignedTo?: string } = {};
    if (customFields.length > 0) payload.customFields = customFields;
    if (assignedTo !== undefined) payload.assignedTo = assignedTo || '';

    if (Object.keys(payload).length === 0 && Object.keys(propertyProps).length === 0) {
      return NextResponse.json({ error: 'No changes to save' }, { status: 400 });
    }

    // 1. Update opportunity custom fields
    if (Object.keys(payload).length > 0) {
      const url = `${GHL_BASE_URL}/opportunities/${opportunityId}?locationId=${GHL_LOCATION_ID}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('CTR opportunity update failed:', res.status, errorText);
        sendCtrAlert({
          type: 'opportunity-save-failed',
          subject: 'A user\'s edit failed to save to GHL (opportunity fields)',
          reason: 'A user edited opportunity fields in the tool and GHL rejected the save.',
          impact: 'The user\'s change was NOT written to GHL. They saw an error in the tool, but data they typed may be lost if they navigate away.',
          action: 'Check GHL API status and the GHL_BEARER_TOKEN write scopes. Ask the team if edits are failing repeatedly.',
          detailsHtml: `<p>Opportunity: ${opportunityId}</p><p>HTTP ${res.status}</p><pre>${errorText.slice(0, 1000)}</pre>`,
        });
        return NextResponse.json({ error: `GHL API error (opportunity): ${res.status}` }, { status: res.status });
      }
    }

    // 2. Update the linked Property Review custom object record
    if (Object.keys(propertyProps).length > 0) {
      const url = `${GHL_BASE_URL}/objects/${PROPERTY_OBJECT_ID}/records/${propertyRecordId}?locationId=${GHL_LOCATION_ID}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GHL_API_TOKEN}`,
          Version: GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: propertyProps }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('CTR property record update failed:', res.status, errorText);
        sendCtrAlert({
          type: 'property-save-failed',
          subject: 'A user\'s edit failed to save to GHL (custom object fields)',
          reason: 'A user edited Property Review (custom object) fields in the tool and GHL rejected the save.',
          impact: 'The user\'s change was NOT written to the Property Review record. They saw an error in the tool.',
          action: 'Check GHL API status and that the GHL_BEARER_TOKEN can write custom object records.',
          detailsHtml: `<p>Property record: ${propertyRecordId}</p><p>HTTP ${res.status}</p><pre>${errorText.slice(0, 1000)}</pre>`,
        });
        return NextResponse.json({ error: `GHL API error (property record): ${res.status}` }, { status: res.status });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CTR update error:', error);
    return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 });
  }
}
