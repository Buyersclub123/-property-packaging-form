// ============================================================================
// Deal Sheet Record Transformation
// Shared utility — extracted from /api/deal-sheet/route.ts
// Replicates the Make.com Scenario 03 Code Module field joins
// ============================================================================

export interface GHLRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  properties: Record<string, string>;
}

export interface GHLSearchResponse {
  records: GHLRecord[];
  meta?: {
    total?: number;
    currentPage?: number;
    nextPage?: number;
  };
}

export function formatCurrency(value: string | undefined | null): string {
  if (!value || value === '' || value === null) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return '$' + num.toLocaleString('en-AU');
}

export function hasValue(val: string | undefined | null): boolean {
  return val !== null && val !== undefined && val !== '' && val !== '0';
}

export function formatType(value: string | undefined): string {
  if (!value) return '';
  let formatted = value.replace(/_/g, ' ');
  formatted = formatted.replace(/\b\w/g, (l) => l.toUpperCase());
  return formatted;
}

export function formatStatus(value: string | undefined): string {
  if (!value) return '';
  let formatted = value.replace(/_/g, ' ');
  formatted = formatted.replace(/\b\w/g, (l) => l.toUpperCase());
  return formatted;
}

export function formatPriceGroup(value: string | undefined): string {
  if (!value) return '';
  let formatted = value.toString().trim();
  formatted = formatted.replace(/_+$/, '');

  if (formatted.includes('__')) {
    const parts = formatted.split('__');
    if (parts.length === 2) {
      const first = parts[0].replace(/[^0-9]/g, '');
      const second = parts[1].replace(/[^0-9]/g, '');
      if (first && second) {
        formatted = `$${first}-${second}k`;
      }
    }
  } else if (formatted.match(/^\d+$/)) {
    formatted = `$${formatted}+`;
  }

  return formatted;
}

export function transformRecord(record: GHLRecord) {
  const p = record.properties;

  const isDual =
    p.single_or_dual_occupancy &&
    p.single_or_dual_occupancy.toLowerCase().includes('dual');

  // Type
  const type = formatType(p.deal_type);

  // Packager
  const packager = p.packager || '';

  // Sourcer
  const sourcer = p.sourcer || '';

  // Status
  const status = formatStatus(p.status);

  // Review Date (from system-level createdAt)
  const reviewDate = record.createdAt ? record.createdAt.split('T')[0] : '';

  // Last Update (from system-level updatedAt)
  const lastUpdate = record.updatedAt ? record.updatedAt.split('T')[0] : '';

  // Packager Approved
  const packagerApproved = p.packager_approved || '';

  // QA Approved
  const qaApproved = p.qa_approved || '';

  // Property Address
  const propertyAddress = p.property_address || '';

  // Asking - join asking + asking_text
  let asking = p.asking || '';
  if (p.asking_text && p.asking_text.trim() !== '') {
    asking = `${asking} - ${p.asking_text}`;
  }

  // Price Group
  const priceGroup = formatPriceGroup(p.price_group);

  // BA Message
  const baMessage = p.message_for_ba || '';

  // Acceptable Acquisition / Total Price
  let acceptAcqTotal = '';
  const isEstablished =
    p.property_type && p.property_type.toLowerCase().includes('established');

  if (isEstablished) {
    const from = p.acceptable_acquisition__from;
    const to = p.acceptable_acquisition__to;
    if (hasValue(from) && hasValue(to)) {
      acceptAcqTotal = `${formatCurrency(from)} – ${formatCurrency(to)}`;
    } else if (hasValue(from)) {
      acceptAcqTotal = formatCurrency(from);
    }
  } else {
    const landPrice = p.land_price;
    const buildPrice = p.build_price;
    const total = p.total_price;
    if (hasValue(landPrice) && hasValue(buildPrice)) {
      const calculatedTotal = hasValue(total) ? total : String(parseFloat(landPrice || '0') + parseFloat(buildPrice || '0'));
      acceptAcqTotal = `Land: ${formatCurrency(landPrice)} | Build: ${formatCurrency(buildPrice)} | Total: ${formatCurrency(calculatedTotal)}`;
    } else if (hasValue(total)) {
      acceptAcqTotal = `Total: ${formatCurrency(total)}`;
    }
  }

  // CONFIG - Bed/Bath/Garage
  const formatPoint5 = (val: string) => val.replace(/(\d+)point5/gi, '$1.5');
  let config = '';
  const bedsPrimary = formatPoint5(p.beds_primary || '');
  const bedsSecondary = formatPoint5(p.beds_additional__secondary__dual_key || '');
  const bathPrimary = formatPoint5(p.bath_primary || '');
  const bathSecondary = formatPoint5(p.baths_additional__secondary__dual_key || '');
  const garagePrimary = formatPoint5(p.garage_primary || '');
  const garageSecondary = formatPoint5(p.garage_additional__secondary__dual_key || '');

  if (isDual && hasValue(bedsSecondary)) {
    config = `${bedsPrimary}+${bedsSecondary} / ${bathPrimary}+${bathSecondary} / ${garagePrimary}+${garageSecondary}`;
  } else {
    config = `${bedsPrimary} / ${bathPrimary} / ${garagePrimary}`;
  }

  // Current Rent
  let currentRent = '';
  if (isEstablished) {
    if (isDual && hasValue(p.current_rent_secondary__per_week)) {
      const primary = parseFloat(p.current_rent_primary__per_week || '0');
      const secondary = parseFloat(p.current_rent_secondary__per_week || '0');
      currentRent = formatCurrency(String(primary + secondary));
    } else if (hasValue(p.current_rent_primary__per_week)) {
      currentRent = formatCurrency(p.current_rent_primary__per_week);
    } else {
      currentRent = 'N/A';
    }
  } else {
    currentRent = 'N/A';
  }

  // Appraised Rent
  let appraisedRent = '';
  const rentPrimaryFrom = parseFloat(p.rent_appraisal_primary_from || '0');
  const rentPrimaryTo = parseFloat(p.rent_appraisal_primary_to || '0');
  const rentSecondaryFrom = parseFloat(p.rent_appraisal_secondary_from || '0');
  const rentSecondaryTo = parseFloat(p.rent_appraisal_secondary_to || '0');

  if (isDual && hasValue(p.rent_appraisal_secondary_from)) {
    const fromTotal = rentPrimaryFrom + rentSecondaryFrom;
    const toTotal = rentPrimaryTo + rentSecondaryTo;
    appraisedRent = `${formatCurrency(String(fromTotal))} - ${formatCurrency(String(toTotal))}`;
  } else if (hasValue(p.rent_appraisal_primary_from) && hasValue(p.rent_appraisal_primary_to)) {
    appraisedRent = `${formatCurrency(String(rentPrimaryFrom))} - ${formatCurrency(String(rentPrimaryTo))}`;
  }

  // LGA
  const lga = p.lga || '';

  // Land Size
  const landSize = p.land_size || '';

  // Title Type
  const titleType = p.title || '';

  // Year Built or Registration
  const yearBuiltOrRegistration = isEstablished
    ? p.year_built || ''
    : p.land_registration || '';

  // Selling Agent
  const agentName = p.agent_name || '';
  const agentEmail = p.agent_email || '';
  const agentMobile = p.agent_mobile || '';
  let sellingAgent = '';
  if (agentName || agentEmail || agentMobile) {
    sellingAgent = [agentName, agentEmail, agentMobile].filter(Boolean).join(' | ');
  }

  // Cashback
  const cashbackType = p.cashback_rebate_type || '';
  const cashbackValue = p.cashback_rebate_value || '';

  // Closing fields
  const closingBA = p.closing_ba || '';
  const closingPrice = p.closing_price || '';
  const clientClosed = p.client_closed || '';
  const closingDate = p.closing_date || '';

  // Folder link
  const folderLink = p.folder_link || '';

  // Portal link (only when QA approved)
  let portalLink = '';
  if (packagerApproved.toLowerCase() === 'approved' && qaApproved.toLowerCase() === 'approved' && propertyAddress) {
    const SCENARIO_5_WEBHOOK = 'https://hook.eu1.make.com/g9pcjs2imabfea3viiy6213ejgrdprn1';
    const MODULE_1_WEBHOOK = 'https://hook.eu1.make.com/bkq23g13n4ae6spskdbwpru7hleol6sl';
    const API_URL = 'https://property-review-form.vercel.app';
    portalLink = `https://property-packaging-form.vercel.app/portal?webhookUrl=${encodeURIComponent(SCENARIO_5_WEBHOOK)}&module1Webhook=${encodeURIComponent(MODULE_1_WEBHOOK)}&apiUrl=${encodeURIComponent(API_URL)}&recordId=${encodeURIComponent(record.id)}&propertyId=${encodeURIComponent(record.id)}&propertyAddress=${encodeURIComponent(propertyAddress)}`;
  }

  // Sort key
  const sortKey = `${type} - ${status} - ${priceGroup}`;

  return {
    id: record.id,
    type,
    packager,
    sourcer,
    status,
    reviewDate,
    lastUpdate,
    packagerApproved,
    qaApproved,
    propertyAddress,
    asking,
    priceGroup,
    baMessage,
    acceptAcqTotal,
    config,
    currentRent,
    appraisedRent,
    lga,
    landSize,
    titleType,
    yearBuiltOrRegistration,
    sellingAgent,
    cashbackType,
    cashbackValue,
    closingBA,
    closingPrice,
    clientClosed,
    closingDate,
    sortKey,
    folderLink,
    portalLink,
  };
}
