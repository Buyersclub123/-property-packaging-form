import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const FINANCE_PIPELINE_ID = 'zgBRaMnACpskyf1wHCEV';
const TYPE_OF_PROPERTY_FIELD_ID = 'p1IK7Zi8w1q2tLBwTrIE';
const SETTLED_STAGE_ID = '8c6fd147-88ac-4991-aa94-c5b13bce7e4f';

const EXCLUSIONS_FILE = path.join(process.cwd(), 'data', 'shay-report-exclusions.json');

function loadExclusions(): string[] {
  try {
    if (fs.existsSync(EXCLUSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(EXCLUSIONS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

// Field IDs for the report columns
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

export async function GET() {
  try {
    const allOpps: any[] = [];
    let startAfter = '';
    let startAfterId = '';
    let page = 0;

    while (true) {
      let url = `https://services.leadconnectorhq.com/opportunities/search?location_id=${LOCATION_ID}&pipeline_id=${FINANCE_PIPELINE_ID}&limit=100`;
      if (startAfter && startAfterId) {
        url += `&startAfter=${encodeURIComponent(startAfter)}&startAfterId=${encodeURIComponent(startAfterId)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}`, Version: '2021-07-28' },
      });

      if (!res.ok) {
        console.error(`Shay report fetch page ${page} failed: ${res.status}`);
        break;
      }

      const data = await res.json();
      const opps = data.opportunities || [];
      allOpps.push(...opps);

      if (!data.meta?.nextPageUrl) break;
      startAfter = data.meta.startAfter ?? '';
      startAfterId = data.meta.startAfterId ?? '';
      if (!startAfter && !startAfterId) break;
      page++;
      if (page > 20) break;
    }

    // Load exclusions from file
    const excludedNames = new Set(loadExclusions());

    // Filter: Established type, not Settled stage, no "LOT" in address, not excluded
    const filtered = allOpps.filter((opp) => {
      // Must be Established type
      const typeField = opp.customFields?.find((f: any) => f.id === TYPE_OF_PROPERTY_FIELD_ID);
      if (typeField?.fieldValueString !== 'Established') return false;

      // Exclude Settled stage
      if (opp.pipelineStageId === SETTLED_STAGE_ID) return false;

      // Exclude if address contains "LOT"
      const addrField = opp.customFields?.find((f: any) => f.id === FIELD_IDS.registeredAddress);
      const addr = (addrField?.fieldValueString || '').toUpperCase();
      if (addr.includes('LOT')) return false;

      // Exclude by name
      if (excludedNames.has(opp.name || '')) return false;

      return true;
    });

    // Map to flat structure
    const records = filtered.map((opp) => ({
      id: opp.id,
      ghlLink: `https://app.gohighlevel.com/v2/location/${LOCATION_ID}/opportunities/${opp.id}`,
      name: opp.name || '',
      registeredAddress: getCustomFieldValue(opp.customFields || [], FIELD_IDS.registeredAddress),
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
    }));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Shay report fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
  }
}
