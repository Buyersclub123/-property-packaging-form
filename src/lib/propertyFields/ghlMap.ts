// Registry values <-> GHL custom-object properties.
// Value conventions mirror Make.com 02b (the packaging tool's real create path) — see docs/quick-record-requirements.md §H.

import { FIELDS, isVisible, isDual, pruneHidden } from './registry';
import type { Values } from './registry';
import { deriveAll, composePropertyAddress } from './calcs';

const ASKING_TO_GHL: Record<string, string | null> = {
  onmarket: 'on-market',
  offmarket: 'off-market',
  prelaunch_opportunity: 'pre-launch opportunity',
  coming_soon: 'coming soon',
  tbc: null,
};
const ASKING_FROM_GHL: Record<string, string> = {
  'on-market': 'onmarket', 'off-market': 'offmarket', 'pre-launch opportunity': 'prelaunch_opportunity', 'coming soon': 'coming_soon', 'tbc': 'tbc',
};

const stripDomain = (email: string) => email.replace(/@buyersclub\.com\.au$/i, '');

const mapBath = (val: string) => (val.includes('.') ? val.replace('.', 'point') : val);
const unmapBath = (val: string) => val.replace(/(\d+)point5/gi, '$1.5');

export interface BuildPayloadInput {
  values: Values;
  userEmail: string;
  sourcer: string;
}

export interface BuildPayloadResult {
  properties: Record<string, string | number | string[]>;
  propertyAddress: string;
}

// Build the GHL create payload. Only registry fields (visible for the shape) and the derived/system keys are ever written.
export function toGhlProperties({ values, userEmail, sourcer }: BuildPayloadInput): BuildPayloadResult {
  const v = pruneHidden(values);
  const out: Record<string, string | number | string[]> = {};

  for (const f of FIELDS) {
    if (!f.ghlKey || !isVisible(f, v)) continue;
    let val = (v[f.key] || '').trim();
    if (!val) continue;
    switch (f.key) {
      case 'dualOccupancy':
        val = val === 'Yes' ? 'dual_occupancy' : 'single_occupancy';
        break;
      case 'asking': {
        const mapped = ASKING_TO_GHL[val];
        if (mapped === null || mapped === undefined) continue;
        val = mapped;
        break;
      }
      case 'bathPrimary':
      case 'bathSecondary':
        val = mapBath(val);
        break;
      case 'lotNumber':
        if (v.lotNumberNotApplicable === 'Yes') continue;
        break;
      case 'state':
      case 'unitNumber':
        val = val.toUpperCase();
        break;
    }
    out[f.ghlKey] = val;
  }

  const propertyAddress = composePropertyAddress({
    lotNumber: v.lotNumberNotApplicable === 'Yes' ? '' : v.lotNumber,
    unitNumber: v.hasUnitNumbers === 'Yes' ? v.unitNumber : '',
    streetNumber: v.streetNumber,
    streetName: v.streetName,
    suburbName: v.suburbName,
    state: v.state,
    postCode: v.postCode,
  });
  out.property_address = propertyAddress;

  const d = deriveAll(v);
  if (d.contractType) out.contract_type = d.contractType;
  if (d.priceGroup) out.price_group = d.priceGroup;
  if (d.netPrice !== null) out.net_price = d.netPrice;
  if (d.totalPrice !== null && v.dealType === '01_hl_comms') out.total_price = String(d.totalPrice);
  if (d.yield) out.yield = d.yield;
  if (d.appraisedYield) out.appraised_yield = d.appraisedYield;

  if (sourcer) out.sourcer = stripDomain(sourcer);
  out.packager = stripDomain(userEmail);
  out.packager_email = userEmail;
  out.packager_approved = 'Approved';
  out.qa_approved = 'Approved';
  out.quick_record = ['Yes']; // GHL checkbox fields must be sent as a list of selected options

  return { properties: out, propertyAddress };
}

// Reverse mapping for copy: GHL record properties -> registry values. Only registry fields come through;
// neverCopy fields are left blank. Everything else on the record (overlays, project, EOI…) is dropped.
export function fromGhlProperties(p: Record<string, unknown>): Values {
  const str = (k: string) => {
    const raw = p[k];
    if (raw === null || raw === undefined) return '';
    return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw);
  };
  const v: Values = {};

  const dealType = str('deal_type');
  const propertyTypeRaw = str('property_type').toLowerCase();
  v.propertyType = propertyTypeRaw.includes('est') ? 'Established'
    : propertyTypeRaw.includes('new') ? 'New'
    : (dealType === '01_hl_comms' || dealType === '02_single_comms') ? 'New'
    : dealType ? 'Established' : '';
  v.dealType = /^\d{2}_/.test(dealType) ? dealType : '';

  const sod = str('single_or_dual_occupancy').toLowerCase();
  const dwelling = str('dwelling_type');
  v.dualOccupancy = sod.includes('dual') || dwelling === 'dualkey' || dwelling === 'duplex' ? 'Yes'
    : sod.includes('single') ? 'No' : '';
  // Tri-plus dwelling types have no place on a quick record — force the user to choose.
  v.dwellingType = ['unit', 'townhouse', 'villa', 'house', 'dualkey', 'duplex'].includes(dwelling) ? dwelling : '';

  for (const f of FIELDS) {
    if (!f.ghlKey || f.neverCopy || v[f.key] !== undefined) continue;
    let val = str(f.ghlKey);
    if (!val) continue;
    switch (f.key) {
      case 'asking':
        val = ASKING_FROM_GHL[val.toLowerCase()] || val;
        break;
      case 'bathPrimary':
      case 'bathSecondary':
        val = unmapBath(val);
        break;
      case 'state':
        val = val.toUpperCase();
        break;
      case 'status':
        continue; // status is chosen fresh for the new record
    }
    v[f.key] = val;
  }

  if (!isDual(v)) {
    for (const k of ['bedsSecondary', 'bathSecondary', 'garageSecondary', 'carportSecondary', 'carspaceSecondary', 'occupancySecondary', 'currentRentSecondary', 'expirySecondary', 'rentAppraisalSecondaryFrom', 'rentAppraisalSecondaryTo']) delete v[k];
  }
  for (const f of FIELDS) if (f.neverCopy) delete v[f.key];
  return v;
}
