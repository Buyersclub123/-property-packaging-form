// Pure calculation and formatting rules shared by the quick-record tool.
// Lifted from Step2PropertyDetails.tsx (lines 14-95, 160-373) and Step1DecisionTree.tsx —
// must stay behaviourally identical to the packaging tool.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatCurrency(value: string | undefined): string {
  if (!value || value === '' || value.toUpperCase() === 'TBC') return value || '';
  const numValue = value.replace(/,/g, '');
  if (isNaN(Number(numValue))) return value;
  return '$' + Number(numValue).toLocaleString('en-US');
}

export function parseCurrency(value: string): string {
  if (!value) return '';
  const upperValue = value.toUpperCase();
  if (upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC') return upperValue;
  return value.replace(/[$,]/g, '');
}

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = parseCurrency(value);
  if (cleaned.toUpperCase() === 'TBC' || cleaned === '') return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseExpiry(value: string | undefined): { month: string; year: string; isTBC: boolean; isPeriodical: boolean } {
  if (!value) return { month: '', year: '', isTBC: false, isPeriodical: false };
  if (value.toUpperCase() === 'TBC') return { month: '', year: '', isTBC: true, isPeriodical: false };
  if (value.toUpperCase() === 'PERIODICAL') return { month: '', year: '', isTBC: false, isPeriodical: true };
  if (value.toUpperCase() === 'REGISTERED') return { month: '', year: '', isTBC: false, isPeriodical: false };
  const trimmed = value.replace(/\s+approx\.?$/i, '').trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 2 && parts[0] && parts[1]) return { month: parts[0], year: parts[1], isTBC: false, isPeriodical: false };
  if (trimmed.endsWith(' ') && trimmed.trim().length > 0) return { month: trimmed.trim(), year: '', isTBC: false, isPeriodical: false };
  if (trimmed.startsWith(' ') && trimmed.trim().length > 0) return { month: '', year: trimmed.trim(), isTBC: false, isPeriodical: false };
  if (MONTHS.includes(trimmed)) return { month: trimmed, year: '', isTBC: false, isPeriodical: false };
  if (/^\d{4}$/.test(trimmed)) return { month: '', year: trimmed, isTBC: false, isPeriodical: false };
  return { month: '', year: '', isTBC: false, isPeriodical: false };
}

export function formatExpiry(month: string, year: string, isTBC: boolean, isPeriodical: boolean): string {
  if (isTBC) return 'TBC';
  if (isPeriodical) return 'Periodical';
  if (month && year) return `${month} ${year}`;
  if (month) return `${month} `;
  if (year) return ` ${year}`;
  return '';
}

export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, i) => currentYear + i);
}

// A month/year value is complete when both parts are present (or it is a keyword).
export function isMonthYearComplete(value: string | undefined, keywords: string[]): boolean {
  if (!value) return false;
  if (keywords.some((k) => k.toUpperCase() === value.toUpperCase())) return true;
  const p = parseExpiry(value);
  return !!(p.month && p.year);
}

export interface CalcInput {
  propertyType?: string;        // 'New' | 'Established'
  dealType?: string;            // '01_hl_comms' | '02_single_comms' | '03_internal_with_comms' | '04_internal_nocomms' | '05_established'
  dualOccupancy?: string;       // 'Yes' | 'No'
  landPrice?: string;
  buildPrice?: string;
  totalPrice?: string;
  acceptableAcquisitionTo?: string;
  cashbackRebateType?: string;  // 'cashback' | 'rebate'
  cashbackRebateValue?: string;
  occupancyPrimary?: string;
  occupancySecondary?: string;
  currentRentPrimary?: string;
  currentRentSecondary?: string;
  rentAppraisalPrimaryTo?: string;
  rentAppraisalSecondaryTo?: string;
}

export function contractTypeSimplified(dealType: string | undefined): 'Split Contract' | 'Single Contract' | null {
  if (!dealType) return null;
  return dealType === '01_hl_comms' ? 'Split Contract' : 'Single Contract';
}

// Step2 lines 163-187
export function calcTotalPrice(v: CalcInput): number | null {
  const isHAndL = v.propertyType === 'New';
  const isSingleContract = v.dealType === '02_single_comms';
  if (isSingleContract && v.totalPrice) return toNumber(v.totalPrice);
  if (!isHAndL || isSingleContract) return null;
  if (!v.landPrice || !v.buildPrice) return null;
  const land = toNumber(v.landPrice);
  const build = toNumber(v.buildPrice);
  if (land === null || build === null) return null;
  return land + build;
}

// Step2 lines 189-203
export function calcNetPrice(v: CalcInput): number | null {
  if (v.cashbackRebateType !== 'cashback') return null;
  const total = calcTotalPrice(v);
  if (!total) return null;
  const cashback = toNumber(v.cashbackRebateValue);
  if (cashback === null) return null;
  return total - cashback;
}

// Step2 lines 205-221
export function calcPropertyPrice(v: CalcInput): number | null {
  if (v.propertyType === 'Established' && v.acceptableAcquisitionTo) return toNumber(v.acceptableAcquisitionTo);
  if (v.propertyType === 'New') return calcTotalPrice(v);
  return null;
}

// Step2 lines 223-239
export function calcPriceGroup(v: CalcInput): '300__500k' | '500__700k' | '700_' | null {
  const total = calcTotalPrice(v);
  const priceValue = total ? String(total) : v.acceptableAcquisitionTo;
  if (!priceValue) return null;
  const price = toNumber(priceValue);
  if (price === null) return null;
  if (price >= 300000 && price < 500000) return '300__500k';
  if (price >= 500000 && price < 700000) return '500__700k';
  if (price >= 700000) return '700_';
  return null;
}

// Step2 lines 266-310 — returns "x.xx" or null
export function calcCurrentYield(v: CalcInput): string | null {
  const isDual = v.dualOccupancy === 'Yes';
  const isPrimaryTenanted = v.occupancyPrimary === 'tenanted';
  const isSecondaryTenanted = isDual && v.occupancySecondary === 'tenanted';
  const propertyPrice = calcPropertyPrice(v);
  if (!(isPrimaryTenanted || isSecondaryTenanted) || !propertyPrice) return null;
  let totalWeeklyRent = 0;
  if (isPrimaryTenanted) {
    const r = toNumber(v.currentRentPrimary);
    if (r !== null && r > 0) totalWeeklyRent += r;
  }
  if (isSecondaryTenanted) {
    const r = toNumber(v.currentRentSecondary);
    if (r !== null && r > 0) totalWeeklyRent += r;
  }
  if (totalWeeklyRent <= 0) return null;
  return ((totalWeeklyRent * 52) / propertyPrice * 100).toFixed(2);
}

// Step2 lines 312-340 — returns "x.xx" or null
export function calcAppraisedYield(v: CalcInput): string | null {
  const propertyPrice = calcPropertyPrice(v);
  if (!propertyPrice || !v.rentAppraisalPrimaryTo) return null;
  const weeklyRent = toNumber(v.rentAppraisalPrimaryTo);
  if (weeklyRent === null || weeklyRent <= 0) return null;
  let totalWeeklyRent = weeklyRent;
  if (v.dualOccupancy === 'Yes' && v.rentAppraisalSecondaryTo) {
    const secondary = toNumber(v.rentAppraisalSecondaryTo);
    if (secondary !== null && secondary > 0) totalWeeklyRent += secondary;
  }
  return ((totalWeeklyRent * 52) / propertyPrice * 100).toFixed(2);
}

export interface Derived {
  contractType: 'Split Contract' | 'Single Contract' | null;
  totalPrice: number | null;
  netPrice: number | null;
  propertyPrice: number | null;
  priceGroup: '300__500k' | '500__700k' | '700_' | null;
  yield: string;           // "~ x.xx%" or ''
  appraisedYield: string;  // "~ x.xx%" or ''
}

export function deriveAll(v: CalcInput): Derived {
  const currentYield = calcCurrentYield(v);
  const appraisedYield = calcAppraisedYield(v);
  return {
    contractType: contractTypeSimplified(v.dealType),
    totalPrice: calcTotalPrice(v),
    netPrice: calcNetPrice(v),
    propertyPrice: calcPropertyPrice(v),
    priceGroup: calcPriceGroup(v),
    yield: currentYield !== null ? `~ ${currentYield}%` : '',
    appraisedYield: appraisedYield !== null ? `~ ${appraisedYield}%` : '',
  };
}

export function priceGroupLabel(key: string | null | undefined): string {
  const map: Record<string, string> = { '300__500k': '$300 - 500k', '500__700k': '$500 - 700k', '700_': '$700 +' };
  return key ? map[key] || key : '';
}

// Address composition — mirrors Step1DecisionTree lot/unit handling (lines 313-320, 772-776):
// base = "<streetNumber> <streetName> <suburb> <STATE> <postcode>" (space-joined, no commas),
// prefixed with "Lot N, " and/or "Unit U, " — e.g. "Lot 88, Evi Cct Pialba QLD 4655".
export interface AddressParts {
  lotNumber?: string;
  unitNumber?: string;
  streetNumber?: string;
  streetName?: string;
  suburbName?: string;
  state?: string;
  postCode?: string;
}

export function composePropertyAddress(a: AddressParts): string {
  const base = [a.streetNumber, a.streetName, a.suburbName, a.state ? a.state.toUpperCase() : '', a.postCode]
    .map((s) => (s || '').trim()).filter(Boolean).join(' ');
  const prefixes: string[] = [];
  if (a.lotNumber && a.lotNumber.trim()) prefixes.push(`Lot ${a.lotNumber.trim()}`);
  if (a.unitNumber && a.unitNumber.trim()) {
    const u = a.unitNumber.trim().toUpperCase();
    prefixes.push(/[-,]/.test(u) ? `Units ${u}` : `Unit ${u}`);
  }
  return [...prefixes, base].filter(Boolean).join(', ');
}
