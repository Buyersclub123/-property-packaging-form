// State x type EOI terms, lifted verbatim from the current GHL EOI builder
// funnel page (investment.buyersclub.com.au/eoi-form-page) so the demo shows
// the real wording the team sends today.
//
// DEMO ONLY — this folder never writes to GHL and never sends email.

export type PropertyType = 'established' | 'house_and_land';
export type AuState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS';

export const AU_STATES: AuState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS'];

export interface EoiTerms {
  deposit_amount: string;
  deposit_payable: string;
  finance: string;
  building_pest: string;
  commission: string;
  settlement: string;
  special_conditions: string[];
}

const GOOD_WORKING_ORDER =
  'The seller represents that at settlement all gas, electrical, hot water systems, all inclusions, plumbing fixtures and fittings will be in good working order.';
const VACANT_ACCESS =
  'If the property is vacant at unconditional: the Vendor agrees to allow the Agent access for pre-arranged open homes once the Contract becomes unconditional, and to facilitate private inspections with prospective tenants prior to settlement, to assist with securing a tenancy.';
const TENANT_CONFIRMATION =
  'Confirmation is required that the tenant (if applicable) has no rental arrears or outstanding court cases regarding the tenancy, and that there are no outstanding maintenance requests or pending issues between the tenant and the landlord.';
const TENANT_CONFIRMATION_EVIDENCE =
  'Confirmation that the tenant (if applicable) is not in rental arrears or has any outstanding court cases regarding tenancy and NIL outstanding maintenance requested and pending between the tenant and the landlord — evidence is required.';
const WALKTHROUGH = 'Subject to walk-through video satisfaction.';
const CLEANED = 'Property to be professionally cleaned prior to settlement if vacated.';
const PRE_SETTLEMENT = 'Pre-settlement inspection required.';

const ESTABLISHED_COMMISSION = 'As Per IBA';
const ESTABLISHED_SETTLEMENT = '42 Days from exchange date';

export const ESTABLISHED: Record<AuState, EoiTerms> = {
  NSW: {
    deposit_amount: '0.25% (typical)',
    deposit_payable:
      '0.25% deposit upon exchange and balance of deposit upon contract becoming unconditional',
    finance: 'N/A — minimum 21-day cooling-off period applies',
    building_pest: 'N/A — minimum 21-day cooling-off period applies',
    commission: ESTABLISHED_COMMISSION,
    settlement: ESTABLISHED_SETTLEMENT,
    special_conditions: [
      'Minimum 21-day cooling-off period.',
      GOOD_WORKING_ORDER,
      VACANT_ACCESS,
      TENANT_CONFIRMATION,
      WALKTHROUGH,
      CLEANED,
      PRE_SETTLEMENT,
    ],
  },
  VIC: {
    deposit_amount: '$5,000',
    deposit_payable:
      '5% deposit upon exchange and balance of deposit upon contract becoming unconditional',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: ESTABLISHED_COMMISSION,
    settlement: ESTABLISHED_SETTLEMENT,
    special_conditions: [
      GOOD_WORKING_ORDER,
      VACANT_ACCESS,
      TENANT_CONFIRMATION,
      'Subject to Victorian Tenancy Compliance Report being fully compliant.',
      WALKTHROUGH,
      CLEANED,
      PRE_SETTLEMENT,
    ],
  },
  QLD: {
    deposit_amount: '$5,000',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: ESTABLISHED_COMMISSION,
    settlement: ESTABLISHED_SETTLEMENT,
    special_conditions: [
      GOOD_WORKING_ORDER,
      VACANT_ACCESS,
      TENANT_CONFIRMATION,
      WALKTHROUGH,
      CLEANED,
      PRE_SETTLEMENT,
    ],
  },
  WA: {
    deposit_amount: '$5,000',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date',
    building_pest: '14 days from exchange date',
    commission: ESTABLISHED_COMMISSION,
    settlement: ESTABLISHED_SETTLEMENT,
    special_conditions: [
      GOOD_WORKING_ORDER,
      TENANT_CONFIRMATION_EVIDENCE,
      VACANT_ACCESS,
      WALKTHROUGH,
      CLEANED,
      PRE_SETTLEMENT,
    ],
  },
  SA: {
    deposit_amount: '$5,000',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: ESTABLISHED_COMMISSION,
    settlement: ESTABLISHED_SETTLEMENT,
    special_conditions: [
      'Standard 2 business days cooling-off period from the date the Form is obtained.',
      GOOD_WORKING_ORDER,
      TENANT_CONFIRMATION_EVIDENCE,
      VACANT_ACCESS,
      WALKTHROUGH,
      CLEANED,
      PRE_SETTLEMENT,
    ],
  },
  TAS: {
    deposit_amount: '5%',
    deposit_payable: '2 business days from exchange date',
    finance: '28 days from exchange date to satisfy',
    building_pest: '14 days from exchange date',
    commission: ESTABLISHED_COMMISSION,
    settlement: ESTABLISHED_SETTLEMENT,
    special_conditions: [
      GOOD_WORKING_ORDER,
      TENANT_CONFIRMATION,
      VACANT_ACCESS,
      WALKTHROUGH,
      CLEANED,
      PRE_SETTLEMENT,
    ],
  },
};

// H&L inherits the established terms for its state and overrides commission +
// settlement (inherit_from_established: true in the current builder).
const HL_SETTLEMENT =
  '21 Days from Registration, or 21 Days from Finance Unconditional, whichever is latter';

export function getTerms(state: AuState, type: PropertyType): EoiTerms {
  const base = ESTABLISHED[state];
  if (type === 'established') return { ...base, special_conditions: [...base.special_conditions] };
  return {
    ...base,
    commission: 'As Per IBA',
    settlement: HL_SETTLEMENT,
    special_conditions: [...base.special_conditions],
  };
}

export const TYPE_LABELS: Record<PropertyType, string> = {
  established: 'ESTABLISHED',
  house_and_land: 'H&L',
};

export const NOTES_FOOTER_HTML =
  'Exchanged contract is to be sent to: <a href="mailto:contracts@buyersclub.com.au">CONTRACTS@BUYERSCLUB.COM.AU</a><br /><br /><strong>Please do not send the contract directly to the purchaser</strong>';

// Best-effort state detection from a free-text property address. Returns null
// when it cannot tell, so the UI can ask rather than guess wrong.
export function detectState(address: string): AuState | null {
  const upper = (address || '').toUpperCase();
  for (const s of AU_STATES) {
    if (new RegExp(`\\b${s}\\b`).test(upper)) return s;
  }
  return null;
}

// Deal sheet "type" values carry an H&L marker for house and land packages.
export function detectType(recordType: string): PropertyType {
  const upper = (recordType || '').toUpperCase();
  if (upper.includes('H&L') || upper.includes('HOUSE AND LAND') || upper.includes('LAND')) {
    return 'house_and_land';
  }
  return 'established';
}
