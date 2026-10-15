// Single field registry for property records.
// Every field is defined once: form key, GHL key, type, options, visibility and dependency rules.
// The quick-record form, its save whitelist and its copy loader all read from here.
// Rules are lifted from Step1DecisionTree.tsx / Step2PropertyDetails.tsx and must match the packaging tool.

export type Values = Record<string, string>;

export type FieldType =
  | 'select'
  | 'radio'
  | 'text'
  | 'currency'      // digits or TBC, displayed as $1,234
  | 'numberOrTbc'   // digits/decimals or TBC
  | 'yearOrTbc'     // 4 digits or TBC
  | 'textarea'
  | 'monthYear'     // month + year dropdowns with keyword options (TBC / Periodical / Registered / Completed)
  | 'readonly';

export type SectionId = 'decision' | 'address' | 'description' | 'price' | 'rental' | 'agent' | 'ba';

export interface Option { value: string; label: string }

export interface FieldDef {
  key: string;
  ghlKey: string | null;          // null = not written to GHL (UI-only driver)
  label: string | ((v: Values) => string);
  section: SectionId;
  type: FieldType;
  options?: Option[] | ((v: Values) => Option[]);
  dependsOn?: string[];           // drivers that must be answered before this field unlocks; changing a driver resets this field
  visible?: (v: Values) => boolean;
  required?: boolean | ((v: Values) => boolean);  // default true
  neverCopy?: boolean;            // forced blank when copying from another record
  placeholder?: string;
  help?: string;
  monthYearKeywords?: Option[];   // for type 'monthYear'
  monthYearSuffix?: string;       // e.g. ' approx.'
  width?: 'half' | 'full' | ((v: Values) => 'half' | 'full');
}

export const SECTIONS: { id: SectionId; title: string }[] = [
  { id: 'decision', title: 'Decision Tree' },
  { id: 'address', title: 'Property Address' },
  { id: 'description', title: 'Property Description' },
  { id: 'price', title: 'Purchase Price' },
  { id: 'rental', title: 'Rental Assessment' },
  { id: 'agent', title: 'Selling Agent' },
  { id: 'ba', title: 'Message for BA' },
];

// ---- shape helpers (Step2 lines 102-114, quick records are always lotType Individual) ----
export const isEstablished = (v: Values) => v.propertyType === 'Established';
export const isNew = (v: Values) => v.propertyType === 'New';
export const isDual = (v: Values) => v.dualOccupancy === 'Yes';
export const isSplit = (v: Values) => isNew(v) && v.dealType === '01_hl_comms';
export const isSingleNew = (v: Values) => isNew(v) && v.dealType === '02_single_comms';
export const hasCashbackRebate = (v: Values) =>
  v.dealType === '01_hl_comms' || v.dealType === '02_single_comms' || v.dealType === '03_internal_with_comms';
export const isStrataTitle = (v: Values) => {
  const t = (v.title || '').toLowerCase();
  return t.includes('strata') || t.includes('owners_corp');
};
const primaryTenanted = (v: Values) => isEstablished(v) && v.occupancyPrimary === 'tenanted';
const secondaryTenanted = (v: Values) => isEstablished(v) && isDual(v) && v.occupancySecondary === 'tenanted';

// ---- option lists (verbatim from the packaging tool) ----
const range = (n: number) => Array.from({ length: n + 1 }, (_, i) => ({ value: String(i), label: String(i) }));
const COUNT_OPTS: Option[] = [...range(10), { value: 'tbc', label: 'TBC' }];
const COUNT_OPTS_SECONDARY: Option[] = [...range(10), { value: 'TBC', label: 'TBC' }];
const BATH_OPTS: Option[] = [
  { value: '0', label: '0' },
  ...Array.from({ length: 19 }, (_, i) => ({ value: String(1 + i / 2), label: String(1 + i / 2) })),
  { value: 'tbc', label: 'TBC' },
];
const YES_NO: Option[] = [{ value: 'Yes', label: 'Yes' }, { value: 'No', label: 'No' }];
const OCCUPANCY_OPTS: Option[] = [
  { value: 'owner_occupied', label: 'Owner Occupied' },
  { value: 'tenanted', label: 'Tenanted' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'tbc', label: 'TBC' },
];
export const STATE_OPTS: Option[] = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT'].map((s) => ({ value: s, label: s }));
export const STATUS_OPTS: Option[] = [
  { value: '01_available', label: '01 Available' },
  { value: '02_eoi', label: '02 EOI' },
  { value: '03_contr_exchanged', label: "03 Contr' Exchanged" },
  { value: '07_test_record', label: '07 Test Record' },
];

const MONTH_YEAR_EXPIRY: Option[] = [{ value: 'TBC', label: 'TBC' }, { value: 'Periodical', label: 'Periodical' }];
const MONTH_YEAR_LAND_REG: Option[] = [{ value: 'Registered', label: 'Registered' }, { value: 'TBC', label: 'TBC' }];
const MONTH_YEAR_COMPLETION: Option[] = [{ value: 'Completed', label: 'Completed' }, { value: 'TBC', label: 'TBC' }];

export const FIELDS: FieldDef[] = [
  // ---------------- Decision tree (Step1DecisionTree order) ----------------
  { key: 'propertyType', ghlKey: 'property_type', label: 'Property Type', section: 'decision', type: 'select',
    options: [{ value: 'New', label: 'New' }, { value: 'Established', label: 'Established' }] },
  { key: 'dualOccupancy', ghlKey: 'single_or_dual_occupancy', label: 'Is this single or dual occupancy?', section: 'decision', type: 'select',
    dependsOn: ['propertyType'],
    options: [{ value: 'No', label: 'Single Occupancy' }, { value: 'Yes', label: 'Dual Occupancy' }] },
  { key: 'dwellingType', ghlKey: 'dwelling_type', label: 'Dwelling Type', section: 'decision', type: 'select',
    dependsOn: ['propertyType', 'dualOccupancy'],
    options: (v) => isDual(v)
      ? [{ value: 'dualkey', label: 'Dual-key' }, { value: 'duplex', label: 'Duplex' }]
      : [{ value: 'unit', label: 'Unit' }, { value: 'townhouse', label: 'Townhouse' }, { value: 'villa', label: 'Villa' }, { value: 'house', label: 'House' }] },
  { key: 'dealType', ghlKey: 'deal_type', label: 'Contract Type (for Deal Sheet)', section: 'decision', type: 'select',
    dependsOn: ['propertyType'],
    options: (v) => isNew(v)
      ? [{ value: '01_hl_comms', label: '01 H&L Comms' }, { value: '02_single_comms', label: '02 Single Comms' }]
      : [{ value: '03_internal_with_comms', label: '03 Internal with Comms' }, { value: '04_internal_nocomms', label: '04 Internal No-Comms' }, { value: '05_established', label: '05 Established' }] },
  { key: 'status', ghlKey: 'status', label: 'What status to open it in?', section: 'decision', type: 'select', options: STATUS_OPTS },
  // Lot / unit questions (packaging tool: Step1DecisionTree, after Status)
  { key: 'lotNumber', ghlKey: 'lot_number', label: 'Lot Number', section: 'decision', type: 'text',
    dependsOn: ['propertyType', 'dealType'], visible: isNew, neverCopy: true,
    required: (v) => v.lotNumberNotApplicable !== 'Yes',
    help: 'Enter the lot number if available. If the land is already registered and you have the full address, tick "Not Applicable".' },
  { key: 'lotNumberNotApplicable', ghlKey: null, label: 'Not Applicable', section: 'decision', type: 'radio',
    dependsOn: ['propertyType', 'dealType'], visible: isNew, neverCopy: true, required: false, options: YES_NO },
  { key: 'hasUnitNumbers', ghlKey: null, label: 'Does this property have unit numbers?', section: 'decision', type: 'radio',
    dependsOn: ['propertyType', 'dualOccupancy'], neverCopy: true, options: YES_NO },
  { key: 'unitNumber', ghlKey: 'unit__lot', label: 'Which unit(s) are we buying?', section: 'decision', type: 'text',
    dependsOn: ['hasUnitNumbers'], visible: (v) => v.hasUnitNumbers === 'Yes', neverCopy: true,
    placeholder: 'e.g. 2, 1-8 or A,B,C' },

  // ---------------- Address ----------------
  { key: 'streetNumber', ghlKey: 'street_number', label: 'Street Number', section: 'address', type: 'text', required: isEstablished, neverCopy: true, width: 'half',
    help: 'Required for Established properties. May be left blank for New (lot-only) addresses — you will be asked to confirm.' },
  { key: 'streetName', ghlKey: 'street_name', label: 'Street Name', section: 'address', type: 'text', width: 'half' },
  { key: 'suburbName', ghlKey: 'suburb_name', label: 'Suburb', section: 'address', type: 'text', width: 'half' },
  { key: 'state', ghlKey: 'state', label: 'State', section: 'address', type: 'select', options: STATE_OPTS, width: 'half' },
  { key: 'postCode', ghlKey: 'post_code', label: 'Post Code', section: 'address', type: 'text', width: 'half' },
  { key: 'lga', ghlKey: 'lga', label: 'LGA', section: 'address', type: 'readonly', width: 'half',
    help: 'Resolved automatically once Suburb, State and Post Code are entered.' },

  // ---------------- Property description (Step2 lines 396-955) ----------------
  { key: 'bedsPrimary', ghlKey: 'beds_primary', label: (v) => `Beds${isDual(v) ? ' (Primary)' : ''}`, section: 'description', type: 'select', options: COUNT_OPTS, dependsOn: ['dualOccupancy'], width: 'half' },
  { key: 'bedsSecondary', ghlKey: 'beds_additional__secondary__dual_key', label: 'Beds (Secondary)', section: 'description', type: 'select', options: COUNT_OPTS_SECONDARY, dependsOn: ['dualOccupancy'], visible: isDual, width: 'half' },
  { key: 'bathPrimary', ghlKey: 'bath_primary', label: (v) => `Bath${isDual(v) ? ' (Primary)' : ''}`, section: 'description', type: 'select', options: BATH_OPTS, dependsOn: ['dualOccupancy'], width: 'half' },
  { key: 'bathSecondary', ghlKey: 'baths_additional__secondary__dual_key', label: 'Bath (Secondary)', section: 'description', type: 'select', options: BATH_OPTS, dependsOn: ['dualOccupancy'], visible: isDual, width: 'half' },
  { key: 'garagePrimary', ghlKey: 'garage_primary', label: (v) => `Garage${isDual(v) ? ' (Primary)' : ''}`, section: 'description', type: 'select', options: COUNT_OPTS, dependsOn: ['dualOccupancy'], width: 'half' },
  { key: 'garageSecondary', ghlKey: 'garage_additional__secondary__dual_key', label: 'Garage (Secondary)', section: 'description', type: 'select', options: COUNT_OPTS_SECONDARY, dependsOn: ['dualOccupancy'], visible: isDual, width: 'half' },
  { key: 'carportPrimary', ghlKey: 'carport_primary', label: (v) => `Carport${isDual(v) ? ' (Primary)' : ''}`, section: 'description', type: 'select', options: COUNT_OPTS, dependsOn: ['dualOccupancy'], required: false, width: 'half' },
  { key: 'carportSecondary', ghlKey: 'carport_additional__secondary__dual_key', label: 'Carport (Secondary)', section: 'description', type: 'select', options: COUNT_OPTS_SECONDARY, dependsOn: ['dualOccupancy'], visible: isDual, required: false, width: 'half' },
  { key: 'carspacePrimary', ghlKey: 'carspace_primary', label: (v) => `Car Spaces${isDual(v) ? ' (Primary)' : ''}`, section: 'description', type: 'select', options: COUNT_OPTS, dependsOn: ['dualOccupancy'], required: false, width: 'half' },
  { key: 'carspaceSecondary', ghlKey: 'carspace_additional__secondary__dual_key', label: 'Car Spaces (Secondary)', section: 'description', type: 'select', options: COUNT_OPTS_SECONDARY, dependsOn: ['dualOccupancy'], visible: isDual, required: false, width: 'half' },
  { key: 'yearBuilt', ghlKey: 'year_built', label: 'Year Built', section: 'description', type: 'yearOrTbc', dependsOn: ['propertyType'], visible: isEstablished, placeholder: 'e.g., 2015 or TBC', width: 'half' },
  { key: 'landRegistration', ghlKey: 'land_registration', label: 'Land Registration', section: 'description', type: 'monthYear', dependsOn: ['propertyType', 'dealType'], visible: isNew,
    monthYearKeywords: MONTH_YEAR_LAND_REG, monthYearSuffix: ' approx.' },
  { key: 'completionDate', ghlKey: 'completion_date', label: 'Completion Date', section: 'description', type: 'monthYear', dependsOn: ['propertyType', 'dealType'], visible: isSingleNew,
    monthYearKeywords: MONTH_YEAR_COMPLETION, monthYearSuffix: ' approx.' },
  { key: 'landSize', ghlKey: 'land_size', label: 'Land Size (m²)', section: 'description', type: 'numberOrTbc', placeholder: 'e.g., 600 or TBC', width: 'half' },
  { key: 'buildSize', ghlKey: 'build_size', label: 'Build Size (m²)', section: 'description', type: 'numberOrTbc', dependsOn: ['propertyType'], visible: isNew, placeholder: 'e.g., 144.75 or TBC', width: 'half' },
  { key: 'title', ghlKey: 'title', label: 'Title', section: 'description', type: 'select', width: 'half', options: [
    { value: 'individual', label: 'Individual' }, { value: 'torrens', label: 'Torrens' }, { value: 'green', label: 'Green' },
    { value: 'strata', label: 'Strata' }, { value: 'owners_corp_community', label: 'Owners Corp (Community)' },
    { value: 'survey_strata', label: 'Survey Strata' }, { value: 'built_strata', label: 'Built Strata' }, { value: 'tbc', label: 'TBC' },
  ] },
  { key: 'bodyCorpPerQuarter', ghlKey: 'body_corp__per_quarter', label: 'Body Corp Per Quarter ($)', section: 'description', type: 'currency', dependsOn: ['title'], visible: isStrataTitle, placeholder: 'e.g., $500 or TBC', width: 'half' },

  // ---------------- Purchase price (Step2 lines 1054-1340) ----------------
  { key: 'asking', ghlKey: 'asking', label: 'Asking', section: 'price', type: 'select', dependsOn: ['propertyType'], visible: isEstablished, options: [
    { value: 'onmarket', label: 'On-market' }, { value: 'offmarket', label: 'Off-market' }, { value: 'prelaunch_opportunity', label: 'Pre-launch' },
    { value: 'coming_soon', label: 'Coming Soon' }, { value: 'tbc', label: 'TBC' },
  ] },
  { key: 'askingText', ghlKey: 'asking_text', label: 'Asking Text', section: 'price', type: 'text', dependsOn: ['propertyType'], visible: isEstablished, placeholder: 'e.g., $650,000, Contact Agent' },
  { key: 'totalPrice', ghlKey: 'total_price', label: 'Total Price ($)', section: 'price', type: 'currency', dependsOn: ['propertyType', 'dealType'], visible: isSingleNew, placeholder: 'e.g., $650,000 or TBC', width: 'half' },
  { key: 'landPrice', ghlKey: 'land_price', label: 'Land Price ($)', section: 'price', type: 'currency', dependsOn: ['propertyType', 'dealType'], visible: isSplit, placeholder: 'e.g., $300,000 or TBC', width: 'half' },
  { key: 'buildPrice', ghlKey: 'build_price', label: 'Build Price ($)', section: 'price', type: 'currency', dependsOn: ['propertyType', 'dealType'], visible: isSplit, placeholder: 'e.g., $350,000 or TBC', width: 'half' },
  { key: 'cashbackRebateType', ghlKey: 'cashback_rebate_type', label: 'Cashback/Rebate Type', section: 'price', type: 'select', dependsOn: ['dealType'], visible: hasCashbackRebate, width: 'half',
    options: [{ value: 'cashback', label: 'Cashback' }, { value: 'rebate', label: 'Rebate' }] },
  { key: 'cashbackRebateValue', ghlKey: 'cashback_rebate_value', label: 'Cashback/Rebate Value ($)', section: 'price', type: 'currency', dependsOn: ['dealType'], visible: hasCashbackRebate, placeholder: 'e.g., $5,000 or TBC', width: 'half' },
  { key: 'acceptableAcquisitionFrom', ghlKey: 'acceptable_acquisition__from', label: 'Acceptable Acquisition From ($)', section: 'price', type: 'currency', dependsOn: ['propertyType'], visible: isEstablished, width: 'half' },
  { key: 'acceptableAcquisitionTo', ghlKey: 'acceptable_acquisition__to', label: 'Acceptable Acquisition To ($)', section: 'price', type: 'currency', dependsOn: ['propertyType'], visible: isEstablished, width: 'half' },

  // ---------------- Rental assessment (Step2 lines 1434-2130) ----------------
  { key: 'occupancyPrimary', ghlKey: 'occupancy_primary', label: 'Occupancy', section: 'rental', type: 'select', options: OCCUPANCY_OPTS, dependsOn: ['propertyType', 'dualOccupancy'], visible: isEstablished, width: (v) => isDual(v) ? 'half' : 'full' },
  { key: 'occupancySecondary', ghlKey: 'occupancy_secondary', label: 'Occupancy', section: 'rental', type: 'select', options: OCCUPANCY_OPTS, dependsOn: ['propertyType', 'dualOccupancy'], visible: (v) => isEstablished(v) && isDual(v), width: 'half' },
  { key: 'currentRentPrimary', ghlKey: 'current_rent_primary__per_week', label: 'Current Rent ($ per week)', section: 'rental', type: 'currency', dependsOn: ['occupancyPrimary'], visible: primaryTenanted, placeholder: 'e.g., $500 or TBC', width: 'half' },
  { key: 'expiryPrimary', ghlKey: 'expiry_primary', label: 'Expiry', section: 'rental', type: 'monthYear', dependsOn: ['occupancyPrimary'], visible: primaryTenanted, monthYearKeywords: MONTH_YEAR_EXPIRY },
  { key: 'currentRentSecondary', ghlKey: 'current_rent_secondary__per_week', label: 'Current Rent ($ per week)', section: 'rental', type: 'currency', dependsOn: ['occupancySecondary'], visible: secondaryTenanted, placeholder: 'e.g., $500 or TBC', width: 'half' },
  { key: 'expirySecondary', ghlKey: 'expiry_secondary', label: 'Expiry', section: 'rental', type: 'monthYear', dependsOn: ['occupancySecondary'], visible: secondaryTenanted, monthYearKeywords: MONTH_YEAR_EXPIRY },
  { key: 'rentAppraisalPrimaryFrom', ghlKey: 'rent_appraisal_primary_from', label: 'Rent Appraisal From ($ per week)', section: 'rental', type: 'currency', dependsOn: ['dualOccupancy'], placeholder: 'e.g., $500 or TBC', width: 'half' },
  { key: 'rentAppraisalPrimaryTo', ghlKey: 'rent_appraisal_primary_to', label: 'Rent Appraisal To ($ per week)', section: 'rental', type: 'currency', dependsOn: ['dualOccupancy'], placeholder: 'e.g., $550 or TBC', width: 'half' },
  { key: 'rentAppraisalSecondaryFrom', ghlKey: 'rent_appraisal_secondary_from', label: 'Rent Appraisal From ($ per week)', section: 'rental', type: 'currency', dependsOn: ['dualOccupancy'], visible: isDual, placeholder: 'e.g., $400 or TBC', width: 'half' },
  { key: 'rentAppraisalSecondaryTo', ghlKey: 'rent_appraisal_secondary_to', label: 'Rent Appraisal To ($ per week)', section: 'rental', type: 'currency', dependsOn: ['dualOccupancy'], visible: isDual, placeholder: 'e.g., $450 or TBC', width: 'half' },

  // ---------------- Agent / BA ----------------
  { key: 'agentName', ghlKey: 'agent_name', label: 'Agent Name', section: 'agent', type: 'text', width: 'half' },
  { key: 'agentMobile', ghlKey: 'agent_mobile', label: 'Agent Mobile', section: 'agent', type: 'text', width: 'half' },
  { key: 'agentEmail', ghlKey: 'agent_email', label: 'Agent Email', section: 'agent', type: 'text', width: 'half' },
  { key: 'messageForBA', ghlKey: 'message_for_ba', label: 'Message for BA', section: 'ba', type: 'textarea', neverCopy: true,
    required: (v) => v.noMessageForBA !== 'Yes',
    help: 'This message will appear at the beginning of the email sent to the Business Analyst. Tick "No message needed" if there is nothing to add.' },
  { key: 'noMessageForBA', ghlKey: null, label: 'No message needed', section: 'ba', type: 'radio', options: YES_NO, required: false, neverCopy: true },
];

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

// Keys that are populated by the tool (not typed) but still flow through the whitelist.
export const DERIVED_GHL_KEYS = [
  'property_address', 'contract_type', 'price_group', 'net_price', 'yield', 'appraised_yield',
  'sourcer', 'packager', 'packager_email', 'packager_approved', 'qa_approved', 'quick_record',
] as const;

export function fieldWidth(f: FieldDef, v: Values): 'half' | 'full' {
  if (!f.width) return 'full';
  return typeof f.width === 'function' ? f.width(v) : f.width;
}

export function fieldLabel(f: FieldDef, v: Values): string {
  return typeof f.label === 'function' ? f.label(v) : f.label;
}

export function fieldOptions(f: FieldDef, v: Values): Option[] {
  if (!f.options) return [];
  return typeof f.options === 'function' ? f.options(v) : f.options;
}

export function isVisible(f: FieldDef, v: Values): boolean {
  return f.visible ? f.visible(v) : true;
}

export function isRequired(f: FieldDef, v: Values): boolean {
  if (!isVisible(f, v)) return false;
  if (f.required === undefined) return true;
  return typeof f.required === 'function' ? f.required(v) : f.required;
}

// A field is locked until every driver it depends on has a value.
export function isLocked(f: FieldDef, v: Values): boolean {
  return (f.dependsOn || []).some((d) => !v[d]);
}

// All fields that (transitively) depend on `key` — used to reset dependents when a driver changes.
export function dependentsOf(key: string): string[] {
  const out = new Set<string>();
  const walk = (k: string) => {
    for (const f of FIELDS) {
      if ((f.dependsOn || []).includes(k) && !out.has(f.key)) { out.add(f.key); walk(f.key); }
    }
  };
  walk(key);
  return [...out];
}

export function visibleFields(v: Values): FieldDef[] {
  return FIELDS.filter((f) => isVisible(f, v));
}

function monthYearComplete(value: string, f: FieldDef): boolean {
  if (!value) return false;
  const kws = (f.monthYearKeywords || []).map((o) => o.value.toUpperCase());
  if (kws.includes(value.toUpperCase())) return true;
  const trimmed = value.replace(/\s+approx\.?$/i, '').trim();
  const parts = trimmed.split(/\s+/);
  return parts.length === 2 && !!parts[0] && !!parts[1];
}

// Mandatory-when-shown validation. Returns { key: message }.
export function validateValues(v: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of FIELDS) {
    if (!isVisible(f, v) || !isRequired(f, v)) continue;
    const val = (v[f.key] || '').trim();
    const label = fieldLabel(f, v);
    if (f.type === 'monthYear') {
      if (!monthYearComplete(val, f)) errors[f.key] = `${label} is required`;
      continue;
    }
    if (!val) { errors[f.key] = `${label} is required`; continue; }
    if (f.type === 'yearOrTbc' && !(/^\d{4}$/.test(val) || val.toUpperCase() === 'TBC')) errors[f.key] = `${label} must be a 4-digit year or TBC`;
    if (f.type === 'currency' && !(/^\d+$/.test(val) || val.toUpperCase() === 'TBC')) errors[f.key] = `${label} must be a whole dollar amount or TBC`;
    if (f.type === 'numberOrTbc' && !(/^\d*\.?\d+$/.test(val) || val.toUpperCase() === 'TBC')) errors[f.key] = `${label} must be a number or TBC`;
    if (f.options) {
      const opts = fieldOptions(f, v);
      if (opts.length && !opts.some((o) => o.value === val)) errors[f.key] = `${label}: "${val}" is not a valid option`;
    }
  }
  if (!errors.postCode && v.postCode && !/^\d{4}$/.test(v.postCode.trim())) errors.postCode = 'Post Code must be 4 digits';
  return errors;
}

// Strip values for fields that are not visible for the current shape, so hidden data never leaks.
export function pruneHidden(v: Values): Values {
  const out: Values = {};
  for (const f of FIELDS) {
    if (isVisible(f, v) && v[f.key] !== undefined && v[f.key] !== '') out[f.key] = v[f.key];
  }
  return out;
}
