'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { StepIndicator } from '@/components/StepIndicator';
import { useFormStore } from '@/store/formStore';
import { Step3MarketPerformance } from '@/components/steps/Step3MarketPerformance';
import { Step6InsuranceCalculator } from '@/components/steps/Step6InsuranceCalculator';
import { Step6WashingtonBrown } from '@/components/steps/Step6WashingtonBrown';
import { Step7CashflowReview } from '@/components/steps/Step7CashflowReview';
import { Step5Proximity } from '@/components/steps/Step5Proximity';

// --- Types ---

type FieldBehaviour = 'blocked' | 'verify' | 'mandatory' | 'confirmable' | 'auto';

interface FieldDef {
  key: string;
  label: string;
  behaviour: FieldBehaviour;
  type?: 'text' | 'select' | 'textarea' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  dualOnly?: boolean;
  group?: string;
  hideForNew?: boolean;
  hideForEstablished?: boolean;
  hideForSplit?: boolean;
  hideForSingle?: boolean;
  note?: string;
  dynamicOptions?: string;
  allowBlank?: boolean;
}

interface SectionDef {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  page: 1 | 2;
  dialogueKey?: string;
  dialogueLabel?: string;
}

interface FieldState {
  confirmed: boolean;
  useExisting: boolean;
  newValue: string;
  pendingVerification?: boolean;
}

// --- Mock Source Data (Phase 1 only — replaced by GHL fetch in Phase 2) ---

const MOCK_SOURCE: Record<string, string> = {
  lotNumber: '142',
  streetNumber: '15',
  streetName: 'Riverside Drive',
  suburbName: 'Springfield',
  state: 'QLD',
  postCode: '4300',
  lga: 'Ipswich City',
  zoning: 'Residential',
  flood: 'No',
  bushfire: 'No',
  mining: 'No',
  otherOverlay: 'No',
  specialInfrastructure: 'No',
  dueDiligenceAcceptance: 'Yes',

  propertyType: 'New',
  contractType: 'Split Contract',
  dealType: '01_hl_comms',
  dwellingType: 'house',
  status: '01_available',
  sourcer: 'Nathan F',
  packager: 'James T',

  landSize: '400',
  buildSize: '187.5',
  bedsPrimary: '4',
  bathPrimary: '2',
  garagePrimary: '2',
  carportPrimary: '0',
  carspacePrimary: '0',
  bedsSecondary: '',
  bathSecondary: '',
  garageSecondary: '',
  carportSecondary: '',
  carspaceSecondary: '',
  yearBuilt: '',
  title: 'individual',
  bodyCorpPerQuarter: '',
  landRegistration: 'Registered',

  asking: 'offmarket',
  landPrice: '285000',
  buildPrice: '350000',
  totalPrice: '635000',
  cashbackRebateValue: '15000',
  cashbackRebateType: 'rebate',
  comparableSales: 'Recent sales in Springfield range from $580,000 to $680,000 for similar 4-bed houses.',

  occupancyPrimary: 'vacant',
  occupancySecondary: '',
  currentRentPrimary: '',
  currentRentSecondary: '',
  rentAppraisalPrimaryFrom: '520',
  rentAppraisalPrimaryTo: '550',
  rentAppraisalSecondaryFrom: '',
  rentAppraisalSecondaryTo: '',
  yield: '',
  appraisedYield: '4.26',

  medianPriceChange3Months: '1.2',
  medianPriceChange1Year: '5.8',
  medianPriceChange3Year: '22.4',
  medianPriceChange5Year: '45.1',
  medianYield: '4.3',
  medianRentChange1Year: '6.2',
  rentalPopulation: '35.2',
  vacancyRate: '0.8',

  insurance: '1850',
  councilWaterRates: '3200',
  depYear1: '12500',
  depYear2: '11200',
  depYear3: '10100',
  depYear4: '9100',
  depYear5: '8200',
  depYear6: '7400',
  depYear7: '6700',
  depYear8: '6100',
  depYear9: '5500',
  depYear10: '5000',

  whyThisProperty: 'Springfield is one of the fastest growing master-planned communities in South East Queensland with strong infrastructure investment and population growth driving demand.',
  proximity: 'Springfield Central Train Station: 1.2km\nOrion Shopping Centre: 0.8km\nMater Hospital Springfield: 2.1km\nUniversity of Southern Queensland: 0.5km',
  investmentHighlights: 'Population growth context\n• Springfield is projected to grow from 45,000 to 85,000 residents by 2036\n• $15 billion in infrastructure investment committed',

  propertyDescriptionAdditionalDialogue: 'Modern 4-bed home with premium inclusions. Builder offers 6-star energy rating and full landscaping.',
  purchasePriceAdditionalDialogue: 'Rebate of $15,000 included in build price, paid at settlement.',
  rentalAssessmentAdditionalDialogue: 'Rental appraisal provided by Ray White Springfield, dated June 2026.',
  marketPerformanceAdditionalDialogue: 'Springfield consistently outperforms greater Ipswich median growth.',
  messageForBA: '',
  attachmentsAdditionalDialogue: '',

  agentName: 'John Smith',
  agentMobile: '0412 345 678',
  agentEmail: 'john@developer.com.au',

  amapReportName: 'Ipswich City - May 2026',
};


// --- Normalization maps for GHL dropdown values ---
// GHL may store display labels OR option keys depending on when the record was created
const DEAL_TYPE_LABEL_TO_KEY: Record<string, string> = {
  'h&l with comms': '01_hl_comms',
  'single with comms': '02_single_comms',
  'internal with comms': '03_internal_with_comms',
  'internal no comms': '04_internal_nocomms',
  'established': '05_established',
};

const STATUS_LABEL_TO_KEY: Record<string, string> = {
  'available': '01_available',
  'eoi': '02_eoi',
  'contract exchanged': '03_contr_exchanged',
  'test record': '07_test_record',
};

// Normalize a GHL value to match dropdown option keys
// Handles: "02_single_comms" (already correct), "02 Single Comms" (GHL UI format), "Single with Comms" (display label)
const normalizeToOptionKey = (val: string, labelMap: Record<string, string>): string => {
  if (!val) return '';
  const trimmed = val.trim();
  // Already a valid option key (digits + underscore prefix)
  if (/^\d{2}_/.test(trimmed)) return trimmed;
  // Try GHL UI format: "02 Single Comms" → strip prefix, convert to key
  const prefixMatch = trimmed.match(/^(\d{2})\s+(.+)$/);
  if (prefixMatch) {
    const prefix = prefixMatch[1];
    const rest = prefixMatch[2].toLowerCase().replace(/\s+/g, '_');
    const candidate = `${prefix}_${rest}`;
    // Verify this is a known key by checking if it appears as a value in the label map
    const knownKeys = Object.values(labelMap);
    if (knownKeys.includes(candidate)) return candidate;
    // Also check directly in DISPLAY_LABELS
    if (DISPLAY_LABELS[candidate]) return candidate;
    return candidate; // Return the converted key even if not in our map
  }
  // Try display label lookup
  return labelMap[trimmed.toLowerCase()] || trimmed;
};

const normalizeDealType = (val: string): string => normalizeToOptionKey(val, DEAL_TYPE_LABEL_TO_KEY);
const normalizeStatus = (val: string): string => normalizeToOptionKey(val, STATUS_LABEL_TO_KEY);

// --- Subject line computation (mirrors useSubjectLine hook logic) ---
const DWELLING_TYPE_DISPLAY: Record<string, string> = {
  unit: 'Unit', townhouse: 'Townhouse', villa: 'Villa', house: 'House',
  dualkey: 'Dual-key', duplex: 'Duplex', multidwelling: 'Multi-dwelling', block_of_units: 'Block of Units',
};

function computeSubjectLine(params: {
  propertyType: string; contractTypeSimplified: string; lotType?: string;
  dwellingType: string; propertyAddress: string; lotNumber: string;
  bedsPrimary: string; bedsSecondary: string;
}): string {
  const { propertyType, contractTypeSimplified, lotType, dwellingType, propertyAddress, lotNumber, bedsPrimary, bedsSecondary } = params;
  if (!propertyAddress) return '';
  const addressUpper = propertyAddress.toUpperCase();

  if (propertyType === 'Established') {
    return `Property Review: ${addressUpper}`;
  }

  if (propertyType === 'New') {
    const isProject = lotType === 'Multiple';
    const isSplitContract = contractTypeSimplified === 'Split Contract';
    const isSingleContract = contractTypeSimplified === 'Single Contract';

    if (isProject) {
      const cleanAddr = addressUpper.replace(/^LOT\s+[\d\w]+,\s*/i, '').replace(/^(UNITS?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
      if (isSplitContract) return `Property Review (H&L Project): ${cleanAddr}`;
      if (isSingleContract) return `Property Review (Single Part Contract Project): ${cleanAddr}`;
      return `Property Review: ${addressUpper}`;
    }

    // Individual
    const totalBeds = (parseInt(bedsPrimary, 10) || 0) + (parseInt(bedsSecondary, 10) || 0);
    const dwellingDisplay = DWELLING_TYPE_DISPLAY[dwellingType] || '';
    let lotAddress = addressUpper;
    if (lotNumber && !/LOT/i.test(propertyAddress)) {
      lotAddress = `LOT ${lotNumber.toUpperCase()} ${addressUpper}`;
    }
    if (totalBeds > 0 && dwellingDisplay) {
      if (isSplitContract) return `Property Review (H&L ${totalBeds}-bed ${dwellingDisplay}): ${lotAddress}`;
      if (isSingleContract) return `Property Review (Single Part Contract ${totalBeds}-bed ${dwellingDisplay}): ${lotAddress}`;
    }
    return `Property Review: ${addressUpper}`;
  }

  return `Property Review: ${addressUpper}`;
}

// --- Flatten GHL API data to flat key-value pairs for Page 1 comparison ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flattenGhlData = (data: any): Record<string, string> => ({
  // Address
  lotNumber: data.address?.lotNumber || '',
  streetNumber: data.address?.streetNumber || '',
  streetName: data.address?.streetName || '',
  suburbName: data.address?.suburbName || '',
  state: (data.address?.state || '').toUpperCase(),
  postCode: data.address?.postCode || '',
  lga: data.address?.lga || '',
  propertyAddress: data.address?.propertyAddress || '',
  googleMap: data.address?.googleMap || '',
  // Risk Assessment
  zoning: data.riskOverlays?.zoning || '',
  flood: data.riskOverlays?.flood || '',
  floodDialogue: data.riskOverlays?.floodDialogue || '',
  bushfire: data.riskOverlays?.bushfire || '',
  bushfireDialogue: data.riskOverlays?.bushfireDialogue || '',
  mining: data.riskOverlays?.mining || '',
  miningDialogue: data.riskOverlays?.miningDialogue || '',
  otherOverlay: data.riskOverlays?.otherOverlay || '',
  otherOverlayDialogue: data.riskOverlays?.otherOverlayDialogue || '',
  specialInfrastructure: data.riskOverlays?.specialInfrastructure || '',
  specialInfrastructureDialogue: data.riskOverlays?.specialInfrastructureDialogue || '',
  dueDiligenceAcceptance: data.riskOverlays?.dueDiligenceAcceptance || '',
  // Decision Tree
  propertyType: data.decisionTree?.propertyType || '',
  contractType: data.decisionTree?.contractTypeSimplified || '',
  dealType: normalizeDealType(data.dealType || data.decisionTree?.contractType || ''),
  dwellingType: data.decisionTree?.dwellingType || '',
  status: normalizeStatus(data.decisionTree?.status || data.status || ''),
  dualOccupancy: data.decisionTree?.dualOccupancy || '',
  sourcer: data.sourcer || '',
  packager: data.packager || '',
  packagerEmail: data.packagerEmail || '',
  priceGroup: data.priceGroup || '',
  packagerApproved: data.packagerApproved || '',
  qaApproved: data.qaApproved || '',
  // Project fields
  projectIdentifier: data.projectIdentifier || '',
  isParentRecord: data.isParentRecord || '',
  projectParentId: data.projectParentId || '',
  projectAddress: data.projectAddress || '',
  // Property Description
  landSize: data.propertyDescription?.landSize || '',
  buildSize: data.propertyDescription?.buildSize || '',
  bedsPrimary: data.propertyDescription?.bedsPrimary || '',
  bathPrimary: data.propertyDescription?.bathPrimary || '',
  garagePrimary: data.propertyDescription?.garagePrimary || '',
  carportPrimary: data.propertyDescription?.carportPrimary || '',
  carspacePrimary: data.propertyDescription?.carspacePrimary || '',
  bedsSecondary: data.propertyDescription?.bedsSecondary || '',
  bathSecondary: data.propertyDescription?.bathSecondary || '',
  garageSecondary: data.propertyDescription?.garageSecondary || '',
  carportSecondary: data.propertyDescription?.carportSecondary || '',
  carspaceSecondary: data.propertyDescription?.carspaceSecondary || '',
  yearBuilt: data.propertyDescription?.yearBuilt || '',
  title: data.propertyDescription?.title || '',
  bodyCorpPerQuarter: data.propertyDescription?.bodyCorpPerQuarter || '',
  bodyCorpDescription: data.propertyDescription?.bodyCorpDescription || '',
  landRegistration: data.propertyDescription?.landRegistration || '',
  completionDate: data.propertyDescription?.completionDate || '',
  // Purchase Price
  asking: data.purchasePrice?.asking || '',
  askingText: data.purchasePrice?.askingText || '',
  acceptableAcquisitionFrom: data.purchasePrice?.acceptableAcquisitionFrom || '',
  acceptableAcquisitionTo: data.purchasePrice?.acceptableAcquisitionTo || '',
  landPrice: data.purchasePrice?.landPrice || '',
  buildPrice: data.purchasePrice?.buildPrice || '',
  totalPrice: data.purchasePrice?.totalPrice || '',
  cashbackRebateValue: data.purchasePrice?.cashbackRebateValue || '',
  cashbackRebateType: data.purchasePrice?.cashbackRebateType || '',
  comparableSales: data.purchasePrice?.comparableSales || '',
  // Rental Assessment
  occupancyPrimary: data.rentalAssessment?.occupancyPrimary || '',
  occupancySecondary: data.rentalAssessment?.occupancySecondary || '',
  currentRentPrimary: data.rentalAssessment?.currentRentPrimary || '',
  currentRentSecondary: data.rentalAssessment?.currentRentSecondary || '',
  expiryPrimary: data.rentalAssessment?.expiryPrimary || '',
  expirySecondary: data.rentalAssessment?.expirySecondary || '',
  rentAppraisalPrimaryFrom: data.rentalAssessment?.rentAppraisalPrimaryFrom || '',
  rentAppraisalPrimaryTo: data.rentalAssessment?.rentAppraisalPrimaryTo || '',
  rentAppraisalSecondaryFrom: data.rentalAssessment?.rentAppraisalSecondaryFrom || '',
  rentAppraisalSecondaryTo: data.rentalAssessment?.rentAppraisalSecondaryTo || '',
  yield: data.rentalAssessment?.yield || '',
  appraisedYield: data.rentalAssessment?.appraisedYield || '',
  // Market Performance
  medianPriceChange3Months: data.marketPerformance?.medianPriceChange3Months || '',
  medianPriceChange1Year: data.marketPerformance?.medianPriceChange1Year || '',
  medianPriceChange3Year: data.marketPerformance?.medianPriceChange3Year || '',
  medianPriceChange5Year: data.marketPerformance?.medianPriceChange5Year || '',
  medianYield: data.marketPerformance?.medianYield || '',
  medianRentChange1Year: data.marketPerformance?.medianRentChange1Year || '',
  rentalPopulation: data.marketPerformance?.rentalPopulation || '',
  vacancyRate: data.marketPerformance?.vacancyRate || '',
  // Content
  whyThisProperty: data.contentSections?.whyThisProperty || '',
  proximity: data.contentSections?.proximity || '',
  investmentHighlights: data.contentSections?.investmentHighlights || '',
  // Insurance & Depreciation
  insurance: data.insurance || '',
  councilWaterRates: data.councilWaterRates || '',
  depYear1: data.depreciation?.year1 || '',
  depYear2: data.depreciation?.year2 || '',
  depYear3: data.depreciation?.year3 || '',
  depYear4: data.depreciation?.year4 || '',
  depYear5: data.depreciation?.year5 || '',
  depYear6: data.depreciation?.year6 || '',
  depYear7: data.depreciation?.year7 || '',
  depYear8: data.depreciation?.year8 || '',
  depYear9: data.depreciation?.year9 || '',
  depYear10: data.depreciation?.year10 || '',
  // Folder
  folderLink: data.folderLink || '',
  // Agent
  agentName: data.sellingAgentName || data.agentInfo?.agentName || '',
  agentMobile: data.sellingAgentMobile || data.agentInfo?.agentMobile || '',
  agentEmail: data.sellingAgentEmail || data.agentInfo?.agentEmail || '',
  // Dialogue fields
  propertyDescriptionAdditionalDialogue: data.propertyDescription?.propertyDescriptionAdditionalDialogue || '',
  purchasePriceAdditionalDialogue: data.purchasePrice?.purchasePriceAdditionalDialogue || '',
  rentalAssessmentAdditionalDialogue: data.rentalAssessment?.rentalAssessmentAdditionalDialogue || '',
  marketPerformanceAdditionalDialogue: data.marketPerformance?.marketPerformanceAdditionalDialogue || '',
  messageForBA: data.messageForBA || '',
  attachmentsAdditionalDialogue: data.attachmentsAdditionalDialogue || '',
  // AMAP (must be re-selected)
  amapReportName: '',
});


// --- Section Definitions ---

const YES_NO_OPTIONS = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const SECTIONS: SectionDef[] = [
  {
    id: 'project',
    title: 'Project',
    description: 'Project properties share a project identifier. Duplicated records are always children (never a second parent).',
    page: 1,
    fields: [
      { key: 'projectIdentifier', label: 'Project Identifier', behaviour: 'auto' },
      { key: 'projectAddress', label: 'Project Address', behaviour: 'auto' },
      { key: 'isParentRecord', label: 'Is Parent Record', behaviour: 'blocked', note: 'Duplicated records are always set to "No" — a project can only have one parent record.' },
    ],
  },
  {
    id: 'address',
    title: 'Property Address & Risk Assessment',
    description: 'Lot number and street number must be manually entered and verified. Address validation (Stash/Geoscape) will run in Phase 3.',
    page: 1,
    fields: [
      { key: 'lotNumber', label: 'Lot Number', behaviour: 'verify', group: 'Address', placeholder: 'Enter lot number' },
      { key: 'streetNumber', label: 'Street Number', behaviour: 'verify', group: 'Address', placeholder: 'Enter street number', allowBlank: true },
      { key: 'streetName', label: 'Street Name', behaviour: 'confirmable', group: 'Address' },
      { key: 'suburbName', label: 'Suburb', behaviour: 'confirmable', group: 'Address' },
      { key: 'state', label: 'State', behaviour: 'confirmable', group: 'Address', type: 'select', options: [
        { value: 'NSW', label: 'NSW' }, { value: 'VIC', label: 'VIC' }, { value: 'QLD', label: 'QLD' },
        { value: 'WA', label: 'WA' }, { value: 'SA', label: 'SA' }, { value: 'TAS', label: 'TAS' },
        { value: 'NT', label: 'NT' }, { value: 'ACT', label: 'ACT' },
      ]},
      { key: 'postCode', label: 'Post Code', behaviour: 'confirmable', group: 'Address' },
      { key: 'lga', label: 'LGA', behaviour: 'confirmable', group: 'Address' },
      { key: 'googleMap', label: 'Google Map URL', behaviour: 'confirmable', group: 'Address' },
      { key: 'zoning', label: 'Zoning', behaviour: 'confirmable', group: 'Risk Assessment' },
      { key: 'flood', label: 'Flood Risk', behaviour: 'confirmable', group: 'Risk Assessment', type: 'select', options: YES_NO_OPTIONS },
      { key: 'floodDialogue', label: 'Flood Dialogue', behaviour: 'confirmable', group: 'Risk Assessment' },
      { key: 'bushfire', label: 'Bushfire Risk', behaviour: 'confirmable', group: 'Risk Assessment', type: 'select', options: YES_NO_OPTIONS },
      { key: 'bushfireDialogue', label: 'Bushfire Dialogue', behaviour: 'confirmable', group: 'Risk Assessment' },
      { key: 'mining', label: 'Mining', behaviour: 'confirmable', group: 'Risk Assessment', type: 'select', options: YES_NO_OPTIONS },
      { key: 'miningDialogue', label: 'Mining Dialogue', behaviour: 'confirmable', group: 'Risk Assessment' },
      { key: 'otherOverlay', label: 'Other Overlay', behaviour: 'confirmable', group: 'Risk Assessment', type: 'select', options: YES_NO_OPTIONS },
      { key: 'otherOverlayDialogue', label: 'Other Overlay Dialogue', behaviour: 'confirmable', group: 'Risk Assessment' },
      { key: 'specialInfrastructure', label: 'Special Infrastructure', behaviour: 'confirmable', group: 'Risk Assessment', type: 'select', options: YES_NO_OPTIONS },
      { key: 'specialInfrastructureDialogue', label: 'Special Infrastructure Dialogue', behaviour: 'confirmable', group: 'Risk Assessment' },
      { key: 'dueDiligenceAcceptance', label: 'Due Diligence Acceptance', behaviour: 'confirmable', group: 'Risk Assessment', type: 'select', options: YES_NO_OPTIONS },
    ],
    dialogueKey: undefined,
  },
  {
    id: 'decisionTree',
    title: 'Decision Tree',
    page: 1,
    fields: [
      { key: 'propertyType', label: 'Property Type', behaviour: 'confirmable', type: 'select', options: [
        { value: 'New', label: 'New' }, { value: 'Established', label: 'Established' },
      ]},
      { key: 'contractType', label: 'Contract Type', behaviour: 'confirmable', type: 'select', options: [
        { value: 'Split Contract', label: 'Split Contract' }, { value: 'Single Contract', label: 'Single Contract' },
      ]},
      { key: 'dealType', label: 'Deal Type', behaviour: 'confirmable', type: 'select', options: [
        { value: '01_hl_comms', label: '01 H&L with Comms' },
        { value: '02_single_comms', label: '02 Single with Comms' },
        { value: '03_internal_with_comms', label: '03 Internal with Comms' },
        { value: '04_internal_nocomms', label: '04 Internal no Comms' },
        { value: '05_established', label: '05 Established' },
      ]},
      { key: 'dwellingType', label: 'Dwelling Type', behaviour: 'confirmable', type: 'select', options: [
        { value: 'house', label: 'House' }, { value: 'unit', label: 'Unit' },
        { value: 'townhouse', label: 'Townhouse' }, { value: 'villa', label: 'Villa' },
        { value: 'dualkey', label: 'Dual Key' }, { value: 'duplex', label: 'Duplex' },
        { value: 'multidwelling', label: 'Multi-dwelling' }, { value: 'block_of_units', label: 'Block of Units' },
      ]},
      { key: 'status', label: 'Status', behaviour: 'confirmable', type: 'select', options: [
        { value: '01_available', label: '01 Available' },
        { value: '02_eoi', label: '02 EOI' },
        { value: '03_contr_exchanged', label: '03 Contract Exchanged' },
        { value: '07_test_record', label: '07 Test Record' },
      ]},
      { key: 'sourcer', label: 'Sourcer', behaviour: 'confirmable', type: 'select', options: [], dynamicOptions: 'sourcerPackager' },
      { key: 'packager', label: 'Packager', behaviour: 'confirmable', type: 'select', options: [], dynamicOptions: 'sourcerPackager' },
    ],
  },
  {
    id: 'propertyDetails',
    title: 'Property Details',
    description: 'Land size, build size, and bedroom/bathroom/garage counts require explicit confirmation.',
    page: 1,
    fields: [
      { key: 'landSize', label: 'Land Size (sqm)', behaviour: 'mandatory', type: 'number' },
      { key: 'buildSize', label: 'Build Size (sqm)', behaviour: 'mandatory', type: 'number' },
      { key: 'bedsPrimary', label: 'Beds (Primary)', behaviour: 'mandatory', type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'bathPrimary', label: 'Bath (Primary)', behaviour: 'mandatory', type: 'select', options: [
        { value: '0', label: '0' },
        ...Array.from({ length: 19 }, (_, i) => ({ value: String(1 + i / 2), label: String(1 + i / 2) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'garagePrimary', label: 'Garage (Primary)', behaviour: 'mandatory', type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'carportPrimary', label: 'Carport (Primary)', behaviour: 'mandatory', type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'carspacePrimary', label: 'Car Space (Primary)', behaviour: 'mandatory', type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'bedsSecondary', label: 'Beds (Secondary)', behaviour: 'mandatory', dualOnly: true, type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'bathSecondary', label: 'Bath (Secondary)', behaviour: 'mandatory', dualOnly: true, type: 'select', options: [
        { value: '0', label: '0' },
        ...Array.from({ length: 19 }, (_, i) => ({ value: String(1 + i / 2), label: String(1 + i / 2) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'garageSecondary', label: 'Garage (Secondary)', behaviour: 'mandatory', dualOnly: true, type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'carportSecondary', label: 'Carport (Secondary)', behaviour: 'mandatory', dualOnly: true, type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'carspaceSecondary', label: 'Car Space (Secondary)', behaviour: 'mandatory', dualOnly: true, type: 'select', options: [
        ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) })),
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'yearBuilt', label: 'Year Built', behaviour: 'confirmable', hideForNew: true },
      { key: 'title', label: 'Title', behaviour: 'confirmable', type: 'select', options: [
        { value: 'individual', label: 'Individual' }, { value: 'torrens', label: 'Torrens' },
        { value: 'green', label: 'Green' }, { value: 'strata', label: 'Strata' },
        { value: 'owners_corp_community', label: 'Owners Corp/Community' },
        { value: 'survey_strata', label: 'Survey Strata' },
        { value: 'built_strata', label: 'Built Strata' },
        { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'bodyCorpPerQuarter', label: 'Body Corp (per quarter)', behaviour: 'confirmable', type: 'number' },
      { key: 'bodyCorpDescription', label: 'Body Corp Description', behaviour: 'confirmable' },
      { key: 'landRegistration', label: 'Land Registration', behaviour: 'confirmable' },
      { key: 'completionDate', label: 'Completion Date', behaviour: 'confirmable', hideForEstablished: true },
    ],
    dialogueKey: 'propertyDescriptionAdditionalDialogue',
    dialogueLabel: 'Property Description Additional Dialogue',
  },
  {
    id: 'purchasePrice',
    title: 'Purchase Price',
    description: 'All price fields require explicit confirmation.',
    page: 1,
    fields: [
      { key: 'asking', label: 'Asking', behaviour: 'mandatory', hideForNew: true, type: 'select', options: [
        { value: 'onmarket', label: 'On Market' }, { value: 'offmarket', label: 'Off Market' },
        { value: 'prelaunch_opportunity', label: 'Pre-launch Opportunity' },
        { value: 'coming_soon', label: 'Coming Soon' }, { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'acceptableAcquisitionFrom', label: 'Acceptable Acquisition From ($)', behaviour: 'confirmable', hideForNew: true, type: 'number' },
      { key: 'acceptableAcquisitionTo', label: 'Acceptable Acquisition To ($)', behaviour: 'confirmable', hideForNew: true, type: 'number' },
      { key: 'landPrice', label: 'Land Price ($)', behaviour: 'mandatory', hideForEstablished: true, hideForSingle: true, type: 'number' },
      { key: 'buildPrice', label: 'Build Price ($)', behaviour: 'mandatory', hideForEstablished: true, hideForSingle: true, type: 'number' },
      { key: 'totalPrice', label: 'Total Price ($)', behaviour: 'auto' },
      { key: 'cashbackRebateValue', label: 'Cashback/Rebate Value ($)', behaviour: 'confirmable', type: 'number' },
      { key: 'cashbackRebateType', label: 'Cashback/Rebate Type', behaviour: 'confirmable', type: 'select', options: [
        { value: 'cashback', label: 'Cashback' }, { value: 'rebate', label: 'Rebate' },
      ]},
      { key: 'comparableSales', label: 'Comparable Sales', behaviour: 'confirmable', type: 'textarea' },
      { key: 'priceGroup', label: 'Price Group', behaviour: 'confirmable', type: 'select', options: [
        { value: '300__500k', label: '$300 - 500k' },
        { value: '500__700k', label: '$500 - 700k' },
        { value: '700_', label: '$700 +' },
      ]},
    ],
    dialogueKey: 'purchasePriceAdditionalDialogue',
    dialogueLabel: 'Purchase Price Additional Dialogue',
  },
  {
    id: 'rental',
    title: 'Rental Assessment',
    page: 1,
    fields: [
      { key: 'occupancyPrimary', label: 'Occupancy (Primary)', behaviour: 'confirmable', hideForNew: true, type: 'select', options: [
        { value: 'owner_occupied', label: 'Owner Occupied' }, { value: 'tenanted', label: 'Tenanted' },
        { value: 'vacant', label: 'Vacant' }, { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'currentRentPrimary', label: 'Current Rent Primary ($/week)', behaviour: 'confirmable', hideForNew: true, type: 'number' },
      { key: 'rentAppraisalPrimaryFrom', label: 'Rent Appraisal From ($/week)', behaviour: 'confirmable', type: 'number' },
      { key: 'rentAppraisalPrimaryTo', label: 'Rent Appraisal To ($/week)', behaviour: 'confirmable', type: 'number' },
      { key: 'occupancySecondary', label: 'Occupancy (Secondary)', behaviour: 'confirmable', dualOnly: true, hideForNew: true, type: 'select', options: [
        { value: 'owner_occupied', label: 'Owner Occupied' }, { value: 'tenanted', label: 'Tenanted' },
        { value: 'vacant', label: 'Vacant' }, { value: 'tbc', label: 'TBC' },
      ]},
      { key: 'expiryPrimary', label: 'Expiry (Primary)', behaviour: 'confirmable', hideForNew: true },
      { key: 'currentRentSecondary', label: 'Current Rent Secondary ($/week)', behaviour: 'confirmable', dualOnly: true, hideForNew: true, type: 'number' },
      { key: 'expirySecondary', label: 'Expiry (Secondary)', behaviour: 'confirmable', dualOnly: true, hideForNew: true },
      { key: 'rentAppraisalSecondaryFrom', label: 'Rent Appraisal Secondary From ($/week)', behaviour: 'confirmable', dualOnly: true, type: 'number' },
      { key: 'rentAppraisalSecondaryTo', label: 'Rent Appraisal Secondary To ($/week)', behaviour: 'confirmable', dualOnly: true, type: 'number' },
      { key: 'yield', label: 'Yield %', behaviour: 'auto', hideForNew: true },
      { key: 'appraisedYield', label: 'Appraised Yield %', behaviour: 'auto' },
    ],
    dialogueKey: 'rentalAssessmentAdditionalDialogue',
    dialogueLabel: 'Rental Assessment Additional Dialogue',
  },
  {
    id: 'marketPerformance',
    title: 'Market Performance',
    description: 'Values are inherited from the source property. If market performance needs to be updated, edit the source record(s) before creating the duplicate.',
    page: 2,
    fields: [
      { key: 'medianPriceChange3Months', label: 'Median Price Change 3 Months %', behaviour: 'confirmable' },
      { key: 'medianPriceChange1Year', label: 'Median Price Change 1 Year %', behaviour: 'confirmable' },
      { key: 'medianPriceChange3Year', label: 'Median Price Change 3 Year %', behaviour: 'confirmable' },
      { key: 'medianPriceChange5Year', label: 'Median Price Change 5 Year %', behaviour: 'confirmable' },
      { key: 'medianYield', label: 'Median Yield %', behaviour: 'confirmable' },
      { key: 'medianRentChange1Year', label: 'Median Rent Change 1 Year %', behaviour: 'confirmable' },
      { key: 'rentalPopulation', label: 'Rental Population %', behaviour: 'confirmable' },
      { key: 'vacancyRate', label: 'Vacancy Rate %', behaviour: 'confirmable' },
    ],
  },
  {
    id: 'content',
    title: 'Proximity & Content',
    description: 'Auto-carried from source record. Edit as needed.',
    page: 2,
    fields: [
      { key: 'investmentHighlights', label: 'Investment Highlights', behaviour: 'auto', type: 'textarea' },
      { key: 'whyThisProperty', label: 'Why This Property', behaviour: 'auto', type: 'textarea' },
      { key: 'proximity', label: 'Proximity', behaviour: 'auto', type: 'textarea' },
    ],
  },
  {
    id: 'insurance',
    title: 'Insurance Calculator',
    description: 'Pre-populated from source record. Use Terri Scheer to get a fresh quote if needed.',
    page: 2,
    fields: [
      { key: 'insurance', label: 'Annual Insurance ($)', behaviour: 'confirmable' },
      { key: 'councilWaterRates', label: 'Council/Water Rates ($)', behaviour: 'confirmable' },
      { key: 'depYear1', label: 'Depreciation Year 1', behaviour: 'confirmable' },
      { key: 'depYear2', label: 'Depreciation Year 2', behaviour: 'confirmable' },
      { key: 'depYear3', label: 'Depreciation Year 3', behaviour: 'confirmable' },
      { key: 'depYear4', label: 'Depreciation Year 4', behaviour: 'confirmable' },
      { key: 'depYear5', label: 'Depreciation Year 5', behaviour: 'confirmable' },
      { key: 'depYear6', label: 'Depreciation Year 6', behaviour: 'confirmable' },
      { key: 'depYear7', label: 'Depreciation Year 7', behaviour: 'confirmable' },
      { key: 'depYear8', label: 'Depreciation Year 8', behaviour: 'confirmable' },
      { key: 'depYear9', label: 'Depreciation Year 9', behaviour: 'confirmable' },
      { key: 'depYear10', label: 'Depreciation Year 10', behaviour: 'confirmable' },
    ],
  },
  {
    id: 'cashflow',
    title: 'Cashflow Review',
    description: 'AMAP report must be re-selected. A new folder and cashflow spreadsheet will be created on submission.',
    page: 2,
    fields: [
      { key: 'amapReportName', label: 'AMAP Report', behaviour: 'blocked', placeholder: 'Must re-select AMAP report (Phase 3)' },
    ],
  },
  {
    id: 'agent',
    title: 'Agent Information',
    page: 2,
    fields: [
      { key: 'agentName', label: 'Agent Name', behaviour: 'confirmable' },
      { key: 'agentMobile', label: 'Agent Mobile', behaviour: 'confirmable' },
      { key: 'agentEmail', label: 'Agent Email', behaviour: 'confirmable' },
    ],
    dialogueKey: 'messageForBA',
    dialogueLabel: 'Message for BA',
  },
  {
    id: 'approval',
    title: 'Approval Status',
    page: 2,
    fields: [
      { key: 'packagerApproved', label: 'Packager Approved', behaviour: 'confirmable', type: 'select', options: [
        { value: '', label: '(blank)' }, { value: 'Approved', label: 'Approved' },
      ]},
      { key: 'qaApproved', label: 'QA Approved', behaviour: 'confirmable', type: 'select', options: [
        { value: '', label: '(blank)' }, { value: 'Approved', label: 'Approved' },
      ]},
    ],
  },
];

// --- Display label helpers ---

const DISPLAY_LABELS: Record<string, string> = {
  offmarket: 'Off Market',
  onmarket: 'On Market',
  prelaunch_opportunity: 'Pre-launch Opportunity',
  coming_soon: 'Coming Soon',
  tbc: 'TBC',
  house: 'House',
  unit: 'Unit',
  townhouse: 'Townhouse',
  villa: 'Villa',
  dualkey: 'Dual Key',
  duplex: 'Duplex',
  multidwelling: 'Multi-dwelling',
  block_of_units: 'Block of Units',
  '01_hl_comms': 'H&L with Comms',
  '02_single_comms': 'Single with Comms',
  '03_internal_with_comms': 'Internal with Comms',
  '04_internal_nocomms': 'Internal no Comms',
  '05_established': 'Established',
  '01_available': 'Available',
  '02_eoi': 'EOI',
  '03_contr_exchanged': 'Contract Exchanged',
  '07_test_record': 'Test Record',
  individual: 'Individual',
  torrens: 'Torrens',
  green: 'Green',
  strata: 'Strata',
  owners_corp_community: 'Owners Corp/Community',
  survey_strata: 'Survey Strata',
  built_strata: 'Built Strata',
  owner_occupied: 'Owner Occupied',
  tenanted: 'Tenanted',
  vacant: 'Vacant',
  partially_tenanted: 'Partially Tenanted',
  cashback: 'Cashback',
  rebate: 'Rebate',
};

function displayValue(value: string): string {
  if (!value) return '—';
  return DISPLAY_LABELS[value] || value;
}

// --- Component ---

export default function DuplicatePage() {
  const [recordId, setRecordId] = useState('');
  const [sourceLoaded, setSourceLoaded] = useState(false);
  const [sourceData, setSourceData] = useState<Record<string, string>>({});
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});
  const [occupancy, setOccupancy] = useState<'No' | 'Yes' | 'Tri-plus'>('No');
  const [sourceOccupancy, setSourceOccupancy] = useState<string>('No');
  const [currentStep, setCurrentStep] = useState(0);
  const [dialogueValues, setDialogueValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blockedDealType, setBlockedDealType] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [sourcerPackagerOptions, setSourcerPackagerOptions] = useState<string[]>([]);
  const [createdFolderLink, setCreatedFolderLink] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const { updateFormData, updateAddress, resetForm, formData: storeFormData } = useFormStore();

  const page1Sections = SECTIONS.filter((s) => s.page === 1);
  const page2Sections = SECTIONS.filter((s) => s.page === 2);
  // Step 0 = Page 1 comparison, Steps 1..N = individual Page 2 sections
  const totalSteps = 1 + page2Sections.length;
  const stepLabels = ['Property Details', ...page2Sections.map((s) => s.title)];

  // Fetch sourcer/packager names from API
  useEffect(() => {
    fetch('/api/sourcers')
      .then(r => r.json())
      .then(data => {
        if (data.sourcers && data.sourcers.length > 0) {
          setSourcerPackagerOptions(data.sourcers);
        }
      })
      .catch(() => {
        // Fallback
        setSourcerPackagerOptions(['aaditya.m', 'ali.h', 'james.r', 'jess.d', 'john.t', 'josh.w', 'mohit.k', 'sachin.s', 'shay.m', 'will.s']);
      });
  }, []);

  // Populate formStore with source data so existing step components render correctly
  const populateFormStore = (source: Record<string, string>) => {
    resetForm();
    updateFormData({
      address: {
        propertyAddress: `${source.streetNumber || ''} ${source.streetName || ''}, ${source.suburbName || ''} ${source.state || ''} ${source.postCode || ''}`.trim(),
        lotNumber: source.lotNumber || '',
        streetNumber: source.streetNumber || '',
        streetName: source.streetName || '',
        suburbName: source.suburbName || '',
        state: source.state || '',
        postCode: source.postCode || '',
        lga: source.lga || '',
        googleMap: source.googleMap || '',
        folderLink: source.folderLink || '',
      },
      decisionTree: {
        propertyType: (source.propertyType || null) as any,
        contractType: (source.contractType || null) as any,
        contractTypeSimplified: (source.contractType || null) as any,
        dualOccupancy: (source.dualOccupancy || null) as any,
        dwellingType: (source.dwellingType || null) as any,
        status: (source.status || null) as any,
        lotType: 'Individual' as any,
      },
      propertyDescription: {
        landSize: source.landSize || '',
        buildSize: source.buildSize || '',
        bedsPrimary: source.bedsPrimary || '',
        bathPrimary: source.bathPrimary || '',
        garagePrimary: source.garagePrimary || '',
        yearBuilt: source.yearBuilt || '',
        landRegistration: source.landRegistration || '',
        propertyDescriptionAdditionalDialogue: source.propertyDescriptionAdditionalDialogue || '',
      },
      purchasePrice: {
        landPrice: source.landPrice || '',
        buildPrice: source.buildPrice || '',
        totalPrice: source.totalPrice || '',
        purchasePriceAdditionalDialogue: source.purchasePriceAdditionalDialogue || '',
      },
      rentalAssessment: {
        rentalAssessmentAdditionalDialogue: source.rentalAssessmentAdditionalDialogue || '',
      },
      marketPerformance: {
        marketPerformanceAdditionalDialogue: source.marketPerformanceAdditionalDialogue || '',
        medianPriceChange3Months: source.medianPriceChange3Months || '',
        medianPriceChange1Year: source.medianPriceChange1Year || '',
        medianPriceChange3Year: source.medianPriceChange3Year || '',
        medianPriceChange5Year: source.medianPriceChange5Year || '',
        medianYield: source.medianYield || '',
        medianRentChange1Year: source.medianRentChange1Year || '',
        rentalPopulation: source.rentalPopulation || '',
        vacancyRate: source.vacancyRate || '',
      },
      insurance: source.insurance || '',
      councilWaterRates: source.councilWaterRates || '',
      depreciation: {
        year1: source.depYear1 || '',
        year2: source.depYear2 || '',
        year3: source.depYear3 || '',
        year4: source.depYear4 || '',
        year5: source.depYear5 || '',
        year6: source.depYear6 || '',
        year7: source.depYear7 || '',
        year8: source.depYear8 || '',
        year9: source.depYear9 || '',
        year10: source.depYear10 || '',
      },
      contentSections: {
        proximity: source.proximity || '',
        whyThisProperty: source.whyThisProperty || '',
        investmentHighlights: source.investmentHighlights || '',
      },
      sellingAgentName: source.agentName || '',
      sellingAgentEmail: source.agentEmail || '',
      sellingAgentMobile: source.agentMobile || '',
      messageForBA: source.messageForBA || '',
      attachmentsAdditionalDialogue: source.attachmentsAdditionalDialogue || '',
      // Project fields — force child record, never duplicate as parent
      projectIdentifier: source.projectIdentifier || '',
      projectAddress: source.projectAddress || '',
      isParentRecord: 'No', // Always force to No — cannot have 2 parents
      projectParentId: source.isParentRecord === 'Yes' ? recordId.trim() : (source.projectParentId || ''),
    });
  };

  // Load source record from GHL
  const handleLoad = async () => {
    if (!recordId.trim()) return;
    setLoading(true);
    setError('');
    setSubmitResult(null);
    try {
      const response = await fetch(`/api/properties/${recordId.trim()}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to load record');

      const ghlData = result.data;

      // Flatten for Page 1 comparison UI
      const flatSource = flattenGhlData(ghlData);

      // Gate: only allow H&L Comms and Single Comms deal types
      const allowedDealTypes = ['01_hl_comms', '02_single_comms'];
      if (!allowedDealTypes.includes(flatSource.dealType)) {
        setSourceData(flatSource); // still show the "Source loaded" banner
        setSourceLoaded(true);
        setBlockedDealType(true);
        setError('The duplicate tool is only to be used for 01 H&L Comms or 02 Single Comms properties (including projects).');
        setLoading(false);
        return;
      }
      
      // Override project parent ID for the new record (never duplicate as parent)
      if (flatSource.isParentRecord === 'Yes') {
        flatSource.projectParentId = recordId.trim(); // Point to source as parent
      }
      
      setSourceData(flatSource);
      setSourceOccupancy(flatSource.dualOccupancy || 'No');
      setOccupancy((flatSource.dualOccupancy as any) || 'No');

      // Populate formStore for Page 2 components (API returns nested FormData structure)
      resetForm();
      updateFormData(ghlData);
      // folderLink: only propagate for project duplicates (they reuse the existing folder)
      // Non-project records need a NEW folder created, so don't set source folderLink
      const isProjectRecord = !!(flatSource.projectIdentifier && flatSource.projectIdentifier.trim());
      if (ghlData.folderLink && isProjectRecord) {
        updateFormData({ address: { ...(ghlData.address || {}), folderLink: ghlData.folderLink } });
      } else {
        // Clear any folderLink that may have been set via ghlData spread
        updateFormData({ address: { ...(ghlData.address || {}), folderLink: '' } });
      }

      // Look up hotspotting report by LGA so it's available for folder creation and Content step
      const hsLga = flatSource.lga || '';
      const hsSuburb = flatSource.suburbName || '';
      const hsState = flatSource.state || '';
      if ((hsLga || hsSuburb) && hsState) {
        fetch('/api/investment-highlights/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lga: hsLga, suburb: hsSuburb, state: hsState }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.found && data.data) {
              updateFormData({
                hotspottingPdfFileId: data.data.pdfFileId || '',
                hotspottingPdfLink: data.data.pdfDriveLink || '',
                hotspottingReportName: data.data.reportName || '',
                hotspottingValidPeriod: data.data.validPeriod || '',
              });
            }
          })
          .catch(() => { /* non-blocking */ });
      }

      // Initialize field states
      const initialStates: Record<string, FieldState> = {};
      const isProjectDuplicate = !!(flatSource.projectIdentifier && flatSource.projectIdentifier.trim());
      const isSingleContract = flatSource.contractType === 'Single Contract';
      SECTIONS.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.behaviour === 'auto') {
            // For Single Contract, totalPrice needs manual confirmation (no land+build to calc from)
            if (field.key === 'totalPrice' && isSingleContract) {
              initialStates[field.key] = { confirmed: false, useExisting: false, newValue: '' };
            } else {
              initialStates[field.key] = { confirmed: true, useExisting: true, newValue: flatSource[field.key] || '' };
            }
          } else if (field.key === 'streetNumber' && isProjectDuplicate) {
            // For projects, street number is auto (non-editable)
            initialStates[field.key] = { confirmed: true, useExisting: true, newValue: flatSource[field.key] || '' };
          } else if (field.behaviour === 'blocked') {
            // Blocked fields are non-editable — auto-confirm
            initialStates[field.key] = { confirmed: true, useExisting: false, newValue: 'No' };
          } else if (field.behaviour === 'verify') {
            // For project duplicates, auto-confirm AMAP (skipped — already in folder)
            if (isProjectDuplicate && field.key === 'amapReportName') {
              initialStates[field.key] = { confirmed: true, useExisting: true, newValue: '' };
            } else {
              // Verify fields always start blank — user must manually enter and verify
              initialStates[field.key] = { confirmed: false, useExisting: false, newValue: '', pendingVerification: false };
            }
          } else if (section.page === 2) {
            // For non-projects, approval fields should not pull across source values
            if (!isProjectDuplicate && (field.key === 'packagerApproved' || field.key === 'qaApproved')) {
              initialStates[field.key] = { confirmed: true, useExisting: false, newValue: '' };
            } else {
              const val = flatSource[field.key] || '';
              initialStates[field.key] = { confirmed: val !== '', useExisting: false, newValue: val };
            }
          } else {
            initialStates[field.key] = { confirmed: false, useExisting: false, newValue: '' };
          }
        });
      });
      setFieldStates(initialStates);

      // Populate dialogue values from source
      const initialDialogue: Record<string, string> = {};
      SECTIONS.forEach((section) => {
        if (section.dialogueKey) {
          initialDialogue[section.dialogueKey] = flatSource[section.dialogueKey] || '';
        }
      });
      initialDialogue['attachmentsAdditionalDialogue'] = flatSource.attachmentsAdditionalDialogue || '';
      setDialogueValues(initialDialogue);

      setSourceLoaded(true);
      setCurrentStep(0);
    } catch (err: any) {
      setError(err.message || 'Failed to load record');
    } finally {
      setLoading(false);
    }
  };

  // Create property folder for non-project duplicates
  const handleCreateFolder = async () => {
    const address = [
      getEffectiveValue('lotNumber') ? `Lot ${getEffectiveValue('lotNumber')},` : '',
      getEffectiveValue('streetNumber'),
      getEffectiveValue('streetName') + ',',
      getEffectiveValue('suburbName'),
      getEffectiveValue('state'),
      getEffectiveValue('postCode'),
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    if (!address) {
      setFolderError('Property address is required — confirm address fields first.');
      return;
    }

    setIsCreatingFolder(true);
    setFolderError(null);

    try {
      const formStoreData = useFormStore.getState().formData;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { folderLink: _srcFolder, ...addressWithoutFolder } = formStoreData.address || {} as any;

      // Look up hotspotting report by LGA so shortcut is added to folder
      // Prefer value already set by InvestmentHighlightsField (from Content step)
      let hotspottingPdfFileId = formStoreData.hotspottingPdfFileId || '';
      if (!hotspottingPdfFileId) {
        const lga = getEffectiveValue('lga');
        const suburb = getEffectiveValue('suburbName');
        const state = getEffectiveValue('state');
        if ((lga || suburb) && state) {
          try {
            const hsRes = await fetch('/api/investment-highlights/lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lga: lga || '', suburb: suburb || '', state }),
            });
            if (hsRes.ok) {
              const hsData = await hsRes.json();
              if (hsData.found && hsData.data?.pdfFileId) {
                hotspottingPdfFileId = hsData.data.pdfFileId;
              }
            }
          } catch (hsErr) {
            console.warn('Hotspotting lookup failed (non-blocking):', hsErr);
          }
        }
      }

      const response = await fetch('/api/create-property-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAddress: address,
          formData: {
            ...formStoreData,
            folderLink: undefined,
            hotspottingPdfFileId: hotspottingPdfFileId || undefined,
            address: {
              ...addressWithoutFolder,
              folderLink: undefined,
              lotNumber: getEffectiveValue('lotNumber'),
              streetNumber: getEffectiveValue('streetNumber'),
              streetName: getEffectiveValue('streetName'),
              suburbName: getEffectiveValue('suburbName'),
              state: getEffectiveValue('state'),
              postCode: getEffectiveValue('postCode'),
              propertyAddress: address,
            },
            decisionTree: {
              ...formStoreData.decisionTree,
              contractTypeSimplified: getEffectiveValue('contractType') || null,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const result = await response.json();
      if (result.success) {
        setCreatedFolderLink(result.folderLink);
        updateAddress({ folderLink: result.folderLink, folderName: result.folderName });
      } else {
        throw new Error(result.error || 'Failed to create folder');
      }
    } catch (err) {
      console.error('Error creating folder:', err);
      setFolderError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Submit: Create new GHL record
  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const formStoreData = useFormStore.getState().formData;

      const submitData = {
        ...formStoreData,
        // Override address from Page 1 effective values
        address: {
          ...formStoreData.address,
          lotNumber: getEffectiveValue('lotNumber'),
          streetNumber: getEffectiveValue('streetNumber'),
          streetName: getEffectiveValue('streetName'),
          suburbName: getEffectiveValue('suburbName'),
          state: getEffectiveValue('state'),
          postCode: getEffectiveValue('postCode'),
          lga: getEffectiveValue('lga'),
          propertyAddress: [
            getEffectiveValue('lotNumber') ? `Lot ${getEffectiveValue('lotNumber')},` : '',
            getEffectiveValue('streetNumber'),
            getEffectiveValue('streetName') + ',',
            getEffectiveValue('suburbName'),
            getEffectiveValue('state'),
            getEffectiveValue('postCode'),
          ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
          googleMap: getEffectiveValue('googleMap'),
        },
        // Override risk overlays from Page 1
        riskOverlays: {
          ...formStoreData.riskOverlays,
          zoning: getEffectiveValue('zoning'),
          flood: getEffectiveValue('flood'),
          floodDialogue: getEffectiveValue('floodDialogue'),
          bushfire: getEffectiveValue('bushfire'),
          bushfireDialogue: getEffectiveValue('bushfireDialogue'),
          mining: getEffectiveValue('mining'),
          miningDialogue: getEffectiveValue('miningDialogue'),
          otherOverlay: getEffectiveValue('otherOverlay'),
          otherOverlayDialogue: getEffectiveValue('otherOverlayDialogue'),
          specialInfrastructure: getEffectiveValue('specialInfrastructure'),
          specialInfrastructureDialogue: getEffectiveValue('specialInfrastructureDialogue'),
          dueDiligenceAcceptance: getEffectiveValue('dueDiligenceAcceptance'),
        },
        // Override decision tree from Page 1
        decisionTree: {
          ...formStoreData.decisionTree,
          propertyType: getEffectiveValue('propertyType') || null,
          contractTypeSimplified: getEffectiveValue('contractType') || null,
          dualOccupancy: occupancy,
          dwellingType: getEffectiveValue('dwellingType') || null,
          status: getEffectiveValue('status') || null,
        },
        // Override property description from Page 1
        propertyDescription: {
          ...formStoreData.propertyDescription,
          bedsPrimary: getEffectiveValue('bedsPrimary'),
          bathPrimary: getEffectiveValue('bathPrimary'),
          garagePrimary: getEffectiveValue('garagePrimary'),
          carportPrimary: getEffectiveValue('carportPrimary'),
          carspacePrimary: getEffectiveValue('carspacePrimary'),
          bedsSecondary: occupancy === 'Yes' ? getEffectiveValue('bedsSecondary') : '',
          bathSecondary: occupancy === 'Yes' ? getEffectiveValue('bathSecondary') : '',
          garageSecondary: occupancy === 'Yes' ? getEffectiveValue('garageSecondary') : '',
          carportSecondary: occupancy === 'Yes' ? getEffectiveValue('carportSecondary') : '',
          carspaceSecondary: occupancy === 'Yes' ? getEffectiveValue('carspaceSecondary') : '',
          yearBuilt: getEffectiveValue('yearBuilt'),
          landSize: getEffectiveValue('landSize'),
          buildSize: getEffectiveValue('buildSize'),
          title: getEffectiveValue('title'),
          bodyCorpPerQuarter: getEffectiveValue('bodyCorpPerQuarter'),
          bodyCorpDescription: getEffectiveValue('bodyCorpDescription'),
          landRegistration: getEffectiveValue('landRegistration'),
          completionDate: getEffectiveValue('completionDate'),
          propertyDescriptionAdditionalDialogue: dialogueValues['propertyDescriptionAdditionalDialogue'] || '',
        },
        // Override purchase price from Page 1
        purchasePrice: {
          ...formStoreData.purchasePrice,
          asking: getEffectiveValue('asking'),
          askingText: sourceData.askingText || '',
          acceptableAcquisitionFrom: getEffectiveValue('acceptableAcquisitionFrom'),
          acceptableAcquisitionTo: getEffectiveValue('acceptableAcquisitionTo'),
          landPrice: getEffectiveValue('landPrice'),
          buildPrice: getEffectiveValue('buildPrice'),
          totalPrice: getEffectiveValue('totalPrice'),
          cashbackRebateValue: getEffectiveValue('cashbackRebateValue'),
          cashbackRebateType: getEffectiveValue('cashbackRebateType'),
          comparableSales: getEffectiveValue('comparableSales'),
          priceGroup: getEffectiveValue('priceGroup'),
          purchasePriceAdditionalDialogue: dialogueValues['purchasePriceAdditionalDialogue'] || '',
        },
        // Override rental assessment from Page 1
        rentalAssessment: {
          ...formStoreData.rentalAssessment,
          occupancyPrimary: getEffectiveValue('occupancyPrimary'),
          occupancySecondary: occupancy === 'Yes' ? getEffectiveValue('occupancySecondary') : '',
          currentRentPrimary: getEffectiveValue('currentRentPrimary'),
          currentRentSecondary: occupancy === 'Yes' ? getEffectiveValue('currentRentSecondary') : '',
          expiryPrimary: getEffectiveValue('expiryPrimary'),
          expirySecondary: occupancy === 'Yes' ? getEffectiveValue('expirySecondary') : '',
          rentAppraisalPrimaryFrom: getEffectiveValue('rentAppraisalPrimaryFrom'),
          rentAppraisalPrimaryTo: getEffectiveValue('rentAppraisalPrimaryTo'),
          rentAppraisalSecondaryFrom: occupancy === 'Yes' ? getEffectiveValue('rentAppraisalSecondaryFrom') : '',
          rentAppraisalSecondaryTo: occupancy === 'Yes' ? getEffectiveValue('rentAppraisalSecondaryTo') : '',
          yield: getEffectiveValue('yield'),
          appraisedYield: getEffectiveValue('appraisedYield'),
          rentalAssessmentAdditionalDialogue: dialogueValues['rentalAssessmentAdditionalDialogue'] || '',
        },
        // Agent info
        agentInfo: {
          agentName: getEffectiveValue('agentName'),
          agentMobile: getEffectiveValue('agentMobile'),
          agentEmail: getEffectiveValue('agentEmail'),
        },
        // Top-level fields
        sourcer: getEffectiveValue('sourcer'),
        packager: getEffectiveValue('packager'),
        packagerEmail: sourceData.packagerEmail || '',
        priceGroup: getEffectiveValue('priceGroup'),
        dealType: getEffectiveValue('dealType'),
        status: getEffectiveValue('status'),
        messageForBA: dialogueValues['messageForBA'] || '',
        attachmentsAdditionalDialogue: dialogueValues['attachmentsAdditionalDialogue'] || '',
        // Packager Approved & QA Approved
        packagerApproved: getEffectiveValue('packagerApproved'),
        qaApproved: getEffectiveValue('qaApproved'),
        // Project fields — always force child, never duplicate as parent
        projectIdentifier: getEffectiveValue('projectIdentifier'),
        projectAddress: getEffectiveValue('projectAddress'),
        isParentRecord: 'No',
        projectParentId: sourceData.projectParentId || '',
        // Market Performance — copy from source (stored in form store from load)
        marketPerformance: formStoreData.marketPerformance || {},
      };

      // Compute subject line from effective values
      const propertyAddress = submitData.address?.propertyAddress || '';
      const subjectLine = computeSubjectLine({
        propertyType: getEffectiveValue('propertyType'),
        contractTypeSimplified: getEffectiveValue('contractType'),
        lotType: formStoreData.decisionTree?.lotType || undefined,
        dwellingType: getEffectiveValue('dwellingType'),
        propertyAddress,
        lotNumber: getEffectiveValue('lotNumber'),
        bedsPrimary: getEffectiveValue('bedsPrimary'),
        bedsSecondary: getEffectiveValue('bedsSecondary'),
      });
      submitData.subjectLine = subjectLine;

      const response = await fetch('/api/ghl/submit-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to create record');

      setSubmitResult(result.recordId || 'created');
    } catch (err: any) {
      setError(err.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle "use existing" checkbox
  const handleUseExisting = (key: string) => {
    setFieldStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      const toggled = !current.useExisting;
      return {
        ...prev,
        [key]: {
          confirmed: toggled ? true : (current.newValue !== ''),
          useExisting: toggled,
          newValue: toggled ? (sourceData[key] || '') : current.newValue,
        },
      };
    });
  };

  // Update new value for a field
  const handleNewValue = (key: string, value: string) => {
    const field = SECTIONS.flatMap((s) => s.fields).find((f) => f.key === key);
    if (field?.behaviour === 'verify') {
      setFieldStates((prev) => ({
        ...prev,
        [key]: { confirmed: false, useExisting: false, newValue: value, pendingVerification: value !== '' },
      }));
    } else {
      setFieldStates((prev) => ({
        ...prev,
        [key]: { confirmed: value !== '', useExisting: false, newValue: value },
      }));
    }
  };

  // Verify a 'verify' field — user explicitly confirms the entered value
  const handleVerifyField = (key: string) => {
    setFieldStates((prev) => {
      const current = prev[key];
      if (!current || !current.newValue) return prev;
      return { ...prev, [key]: { ...current, confirmed: true, pendingVerification: false } };
    });
  };


  // Get visible fields for a section (accounting for occupancy + property/contract type)
  const getVisibleFields = (section: SectionDef): FieldDef[] => {
    const propType = sourceData['propertyType'] || fieldStates['propertyType']?.newValue || '';
    const contractSimplified = sourceData['contractType'] || fieldStates['contractType']?.newValue || '';
    return section.fields.filter((field) => {
      if (field.dualOnly && occupancy !== 'Yes') return false;
      if (field.hideForNew && propType === 'New') return false;
      if (field.hideForEstablished && propType === 'Established') return false;
      if (field.hideForSplit && contractSimplified === 'Split Contract') return false;
      if (field.hideForSingle && contractSimplified === 'Single Contract') return false;
      return true;
    });
  };

  // Check if a section is complete
  const isSectionComplete = (section: SectionDef): boolean => {
    const visibleFields = getVisibleFields(section);
    return visibleFields.every((field) => {
      const state = fieldStates[field.key];
      if (!state) return false;
      // Allow empty confirmable fields on Page 2 to pass (empty is a valid state)
      if (section.page === 2 && field.behaviour === 'confirmable' && !sourceData[field.key] && !state.newValue) return true;
      return state.confirmed;
    });
  };

  // Count confirmed fields in section
  const sectionProgress = (section: SectionDef): { confirmed: number; total: number } => {
    const visibleFields = getVisibleFields(section);
    const confirmed = visibleFields.filter((f) => fieldStates[f.key]?.confirmed).length;
    return { confirmed, total: visibleFields.length };
  };

  // Sync fieldStates for Page 2 fields populated by step components (not by the comparison UI)
  // e.g. depreciation entered via Step6WashingtonBrown writes to formData.depreciation but not to fieldStates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sourceLoaded) return;
    const depMap: Record<string, string> = {};
    for (let i = 1; i <= 10; i++) {
      const val = storeFormData.depreciation?.[`year${i}` as keyof typeof storeFormData.depreciation] || '';
      depMap[`depYear${i}`] = typeof val === 'string' ? val : '';
    }
    depMap['insurance'] = storeFormData.insurance || '';
    depMap['councilWaterRates'] = storeFormData.councilWaterRates || '';

    setFieldStates(prev => {
      let changed = false;
      const updated = { ...prev };
      for (const [key, val] of Object.entries(depMap)) {
        if (updated[key] && !updated[key].confirmed && val !== '') {
          updated[key] = { ...updated[key], confirmed: true, newValue: val };
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
  }, [storeFormData.depreciation, storeFormData.insurance, storeFormData.councilWaterRates, sourceLoaded]);

  // Auto-resize textareas when fieldStates change (e.g. Use Existing populates values)
  useEffect(() => {
    requestAnimationFrame(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea[data-autogrow]');
      textareas.forEach((t) => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
    });
  }, [fieldStates]);

  // Check if all sections complete
  const allComplete = useMemo(() => {
    if (!sourceLoaded) return false;
    const isProject = !!(sourceData.projectIdentifier?.trim());
    return SECTIONS
      .filter((s) => s.id !== 'project' || isProject)
      .every((s) => isSectionComplete(s));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldStates, sourceLoaded, occupancy, sourceData]);

  // Get the effective value for a field (what will be submitted)
  const getEffectiveValue = (key: string): string => {
    const state = fieldStates[key];
    if (!state) return '';
    if (state.useExisting) return sourceData[key] || '';
    return state.newValue;
  };

  // Auto-calculate derived fields — matches Step2PropertyDetails logic exactly
  useEffect(() => {
    if (!sourceLoaded) return;
    setFieldStates((prev) => {
      const updated = { ...prev };
      let changed = false;

      // Helper to get current effective value from state
      const eff = (key: string): string => {
        const s = updated[key];
        if (!s) return '';
        if (s.useExisting) return sourceData[key] || '';
        return s.newValue;
      };

      const parseCurrencyVal = (val: string): number => {
        if (!val) return 0;
        const cleaned = String(val).replace(/[$,]/g, '').trim();
        if (cleaned.toUpperCase() === 'TBC' || cleaned === '') return 0;
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      };

      const contractType = eff('contractType');
      const propertyType = eff('propertyType');
      const isHAndL = contractType === 'Split Contract';
      const isEstablished = propertyType === 'Established';
      const isSingleContract = !isHAndL;

      // --- Total Price (Step2: lines 163-187) ---
      // Single Contract: totalPrice is entered directly, no auto-calc
      // Split Contract (H&L): totalPrice = landPrice + buildPrice
      let totalPrice = 0;
      if (isSingleContract) {
        totalPrice = parseCurrencyVal(eff('totalPrice'));
      } else if (isHAndL) {
        const landPrice = parseCurrencyVal(eff('landPrice'));
        const buildPrice = parseCurrencyVal(eff('buildPrice'));
        if (landPrice > 0 && buildPrice > 0) {
          totalPrice = landPrice + buildPrice;
          const calcTotal = String(totalPrice);
          if (updated['totalPrice'] && updated['totalPrice'].newValue !== calcTotal) {
            updated['totalPrice'] = { confirmed: true, useExisting: false, newValue: calcTotal };
            changed = true;
          }
        }
      }

      // --- Property Price for yield (Step2: lines 205-221) ---
      // Established: acceptableAcquisitionTo
      // H&L: totalPrice (land + build)
      let propertyPrice = 0;
      if (isEstablished) {
        propertyPrice = parseCurrencyVal(eff('acceptableAcquisitionTo') || eff('totalPrice'));
      } else if (isHAndL) {
        propertyPrice = totalPrice;
      }

      // --- Price Group (Step2: lines 223-239) ---
      // Based on totalPrice or acceptableAcquisitionTo
      const priceValue = totalPrice > 0 ? totalPrice : parseCurrencyVal(eff('acceptableAcquisitionTo'));
      if (priceValue > 0) {
        let calcPriceGroup = '';
        if (priceValue >= 300000 && priceValue < 500000) calcPriceGroup = '300__500k';
        else if (priceValue >= 500000 && priceValue < 700000) calcPriceGroup = '500__700k';
        else if (priceValue >= 700000) calcPriceGroup = '700_';
        if (calcPriceGroup && updated['priceGroup'] && !updated['priceGroup'].useExisting && updated['priceGroup'].newValue !== calcPriceGroup) {
          updated['priceGroup'] = { ...updated['priceGroup'], newValue: calcPriceGroup, confirmed: true };
          changed = true;
        }
      }

      // --- Current Yield (Step2: lines 266-310) ---
      // Only if at least one unit is tenanted
      if (propertyPrice > 0) {
        const isPrimaryTenanted = eff('occupancyPrimary') === 'tenanted';
        const isSecondaryTenanted = eff('occupancySecondary') === 'tenanted';
        if (isPrimaryTenanted || isSecondaryTenanted) {
          let totalWeeklyRent = 0;
          if (isPrimaryTenanted) totalWeeklyRent += parseCurrencyVal(eff('currentRentPrimary'));
          if (isSecondaryTenanted) totalWeeklyRent += parseCurrencyVal(eff('currentRentSecondary'));
          if (totalWeeklyRent > 0) {
            const yieldVal = (totalWeeklyRent * 52 / propertyPrice * 100).toFixed(2);
            const displayYield = `~ ${yieldVal}%`;
            if (updated['yield'] && updated['yield'].newValue !== displayYield) {
              updated['yield'] = { confirmed: true, useExisting: false, newValue: displayYield };
              changed = true;
            }
          }
        }
      }

      // --- Appraised Yield (Step2: lines 312-340) ---
      // Uses rentAppraisalPrimaryTo (+ SecondaryTo for dual) / propertyPrice
      if (propertyPrice > 0) {
        const rentTo = parseCurrencyVal(eff('rentAppraisalPrimaryTo'));
        if (rentTo > 0) {
          let totalWeeklyRent = rentTo;
          const rentSecondaryTo = parseCurrencyVal(eff('rentAppraisalSecondaryTo'));
          if (rentSecondaryTo > 0) totalWeeklyRent += rentSecondaryTo;
          const yieldVal = (totalWeeklyRent * 52 / propertyPrice * 100).toFixed(2);
          const displayYield = `~ ${yieldVal}%`;
          if (updated['appraisedYield'] && updated['appraisedYield'].newValue !== displayYield) {
            updated['appraisedYield'] = { confirmed: true, useExisting: false, newValue: displayYield };
            changed = true;
          }
        }
      }

      return changed ? updated : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldStates, sourceLoaded]);

  // "Use All Existing" for a section
  const handleUseAllExisting = (section: SectionDef) => {
    const visibleFields = getVisibleFields(section);
    setFieldStates((prev) => {
      const updated = { ...prev };
      visibleFields.forEach((field) => {
        if (field.behaviour === 'blocked') return;
        const sourceVal = sourceData[field.key] || '';
        if (field.behaviour === 'verify') {
          // Verify fields: never auto-populate, user must always enter manually
          return;
        }
        updated[field.key] = {
          confirmed: true,
          useExisting: true,
          newValue: sourceVal,
        };
      });
      return updated;
    });
  };

  // Reset all fields in a section
  const handleResetSection = (section: SectionDef) => {
    const visibleFields = getVisibleFields(section);
    setFieldStates((prev) => {
      const updated = { ...prev };
      const cType = sourceData['contractType'] || fieldStates['contractType']?.newValue || '';
      visibleFields.forEach((field) => {
        if (field.behaviour === 'auto') {
          if (field.key === 'totalPrice' && cType === 'Single Contract') {
            updated[field.key] = { confirmed: false, useExisting: false, newValue: '' };
          } else {
            updated[field.key] = { confirmed: true, useExisting: true, newValue: sourceData[field.key] || '' };
          }
        } else if (field.behaviour === 'blocked') {
          updated[field.key] = { confirmed: true, useExisting: false, newValue: 'No' };
        } else if (field.behaviour === 'verify') {
          updated[field.key] = { confirmed: false, useExisting: false, newValue: '', pendingVerification: false };
        } else {
          updated[field.key] = { confirmed: false, useExisting: false, newValue: '' };
        }
      });
      return updated;
    });
  };

  // Render a field row
  const renderField = (field: FieldDef) => {
    const state = fieldStates[field.key];
    if (!state) return null;
    const sourceVal = sourceData[field.key] || '';
    const isBlocked = field.behaviour === 'blocked';
    const isVerify = field.behaviour === 'verify';
    const contractSimplified = sourceData['contractType'] || fieldStates['contractType']?.newValue || '';
    const isProject = !!(sourceData.projectIdentifier?.trim());
    const isAuto = (field.behaviour === 'auto' && !(field.key === 'totalPrice' && contractSimplified === 'Single Contract'))
      || (field.key === 'streetNumber' && isProject);
    const isConfirmed = state.confirmed;

    const borderClass = isConfirmed
      ? 'border-green-400 bg-green-50/30'
      : state.pendingVerification
        ? 'border-amber-400 bg-amber-50/20'
        : 'border-gray-200';

    return (
      <div
        key={field.key}
        className={`grid grid-cols-12 gap-3 items-start py-3 px-3 rounded-lg mb-1 border ${borderClass} transition-colors duration-200`}
      >
        {/* Field label */}
        <div className="col-span-2 pt-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          {field.behaviour === 'mandatory' && (
            <span className="text-xs text-amber-600 block mt-0.5">Requires confirmation</span>
          )}
        </div>

        {/* Source value (read-only) */}
        <div className="col-span-3 pt-2">
          <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-600 font-mono min-h-[38px]">
            {field.type === 'textarea' && sourceVal ? (
              <pre className="whitespace-pre-wrap font-mono text-sm">{sourceVal}</pre>
            ) : field.type === 'select' && sourceVal ? (
              <>
                <span className="font-mono">{sourceVal}</span>
                {DISPLAY_LABELS[sourceVal] && (
                  <span className="text-xs text-gray-400 block">{DISPLAY_LABELS[sourceVal]}</span>
                )}
              </>
            ) : (
              displayValue(sourceVal)
            )}
          </div>
          <span className="text-xs text-gray-400 mt-0.5 block">Source</span>
        </div>

        {/* New value input */}
        <div className="col-span-5">
          {isBlocked && field.note ? (
            <div>
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-600 font-mono min-h-[38px]">
                No
              </div>
              <span className="text-xs text-gray-500 mt-1 block italic">{field.note}</span>
            </div>
          ) : field.type === 'textarea' ? (
            <textarea
              value={state.useExisting ? sourceVal : state.newValue}
              onChange={(e) => handleNewValue(field.key, e.target.value)}
              disabled={state.useExisting && !isAuto}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
                state.useExisting && !isAuto
                  ? 'bg-green-50 border-green-300 text-gray-700'
                  : 'border-gray-300 bg-white'
              }`}
              placeholder={field.placeholder || 'Enter value'}
            />
          ) : field.type === 'select' ? (
            <select
              value={state.useExisting ? sourceVal : state.newValue}
              onChange={(e) => handleNewValue(field.key, e.target.value)}
              disabled={state.useExisting}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                state.useExisting
                  ? 'bg-green-50 border-green-300 text-gray-700'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <option value="">Select...</option>
              {field.dynamicOptions === 'sourcerPackager'
                ? sourcerPackagerOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))
                : field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))
              }
            </select>
          ) : (field.key === 'landRegistration' || field.key === 'completionDate') && !state.useExisting ? (
            (() => {
              const currentVal = state.newValue || '';
              const isLandReg = field.key === 'landRegistration';
              const fixedLabel = isLandReg ? 'Registered' : 'Completed';
              const isFixed = currentVal.toUpperCase() === fixedLabel.toUpperCase();
              const isTBC = currentVal.toUpperCase() === 'TBC';
              const isExpected = !isFixed && !isTBC;
              const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
              const currentYear = new Date().getFullYear();
              const years = Array.from({ length: 8 }, (_, i) => String(currentYear + i));
              // Parse "Month Year approx." back to parts
              const trimmed = currentVal.replace(/\s+approx\.?$/i, '').trim();
              const parts = trimmed.split(/\s+/);
              const selectedMonth = (isExpected && parts.length >= 1 && months.includes(parts[0])) ? parts[0] : '';
              const selectedYear = (isExpected && parts.length >= 2) ? parts[1] : '';
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="radio" checked={isExpected} onChange={() => handleNewValue(field.key, '')} className="w-4 h-4" />
                    <span className="text-sm font-medium">Expected</span>
                  </div>
                  {isExpected && (
                    <div className="flex gap-2 ml-6">
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          const m = e.target.value;
                          if (m && selectedYear) handleNewValue(field.key, `${m} ${selectedYear} approx.`);
                          else if (m) handleNewValue(field.key, `${m} approx.`);
                          else handleNewValue(field.key, '');
                        }}
                        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Month...</option>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const y = e.target.value;
                          if (selectedMonth && y) handleNewValue(field.key, `${selectedMonth} ${y} approx.`);
                          else if (y) handleNewValue(field.key, `${y} approx.`);
                          else handleNewValue(field.key, '');
                        }}
                        className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="">Year...</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isFixed} onChange={(e) => handleNewValue(field.key, e.target.checked ? fixedLabel : '')} className="w-4 h-4" />
                    <span className="text-sm">{fixedLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={isTBC} onChange={(e) => handleNewValue(field.key, e.target.checked ? 'TBC' : '')} className="w-4 h-4" />
                    <span className="text-sm">TBC</span>
                  </div>
                </div>
              );
            })()
          ) : field.type === 'number' ? (
            <input
              type="text"
              inputMode="numeric"
              value={state.useExisting ? sourceVal : state.newValue}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                handleNewValue(field.key, cleaned);
              }}
              disabled={state.useExisting}
              className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                state.useExisting || isConfirmed
                  ? 'bg-green-50 border-green-300 text-gray-700'
                  : 'border-gray-300 bg-white'
              }`}
              placeholder={field.placeholder || 'Enter numeric value'}
            />
          ) : (
            <>
              <textarea
                value={state.useExisting ? sourceVal : state.newValue}
                onChange={(e) => handleNewValue(field.key, e.target.value)}
                disabled={state.useExisting}
                rows={1}
                data-autogrow
                onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden ${
                  state.useExisting || isConfirmed
                    ? 'bg-green-50 border-green-300 text-gray-700'
                    : 'border-gray-300 bg-white'
                }`}
                placeholder={field.placeholder || 'Enter value'}
              />
              {isVerify && state.pendingVerification && !state.confirmed && (
                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
                  <span className="text-xs text-amber-800">
                    Please verify: <strong>{state.newValue}</strong> — is this correct?
                  </span>
                  <button
                    onClick={() => handleVerifyField(field.key)}
                    className="ml-3 px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
                  >
                    Confirm
                  </button>
                </div>
              )}
              {isVerify && field.allowBlank && !state.newValue && !state.confirmed && (
                <button
                  onClick={() => setFieldStates(prev => ({
                    ...prev,
                    [field.key]: { confirmed: true, useExisting: false, newValue: '', pendingVerification: false },
                  }))}
                  className="mt-1.5 px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                >
                  Not applicable — confirm as blank
                </button>
              )}
            </>
          )}
          <span className="text-xs text-gray-400 mt-0.5 block">New Record</span>
        </div>

        {/* Use existing checkbox */}
        <div className="col-span-2 pt-2 flex justify-center">
          {(isBlocked || isVerify) ? (
            <span className="text-xs text-gray-400 italic">N/A</span>
          ) : isAuto ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Auto
            </span>
          ) : (
            <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={state.useExisting}
                onChange={() => handleUseExisting(field.key)}
                className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
              />
              <span className="text-xs text-gray-500">Use existing</span>
            </label>
          )}
        </div>
      </div>
    );
  };

  // Render fields with sub-group dividers
  const renderFieldsWithGroups = (fields: FieldDef[]) => {
    const elements: React.ReactNode[] = [];
    let lastGroup: string | undefined;
    fields.forEach((field) => {
      if (field.group && field.group !== lastGroup) {
        if (lastGroup !== undefined) {
          elements.push(<div key={`divider-${field.group}`} className="border-t border-gray-200 my-3" />);
        }
        elements.push(
          <div key={`group-${field.group}`} className="px-3 pt-2 pb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{field.group}</span>
          </div>
        );
        lastGroup = field.group;
      }
      elements.push(renderField(field));
    });
    return elements;
  };

  // Section header (shared between Page 1 and Page 2)
  const renderSectionHeader = (section: SectionDef, index: number) => {
    const progress = sectionProgress(section);
    const complete = progress.confirmed === progress.total;
    return (
      <div className={`px-6 py-4 border-b flex items-center justify-between ${complete ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
            complete ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {complete ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
            {section.description && <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${complete ? 'text-green-700' : 'text-gray-500'}`}>
            {progress.confirmed}/{progress.total} confirmed
          </span>
          {section.id !== 'content' && section.id !== 'project' && (
            <div className="flex gap-2">
              <button onClick={() => handleUseAllExisting(section)} className="text-xs px-3 py-1.5 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                Use all existing
              </button>
              <button onClick={() => handleResetSection(section)} className="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                Reset
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Page 1: Side-by-side comparison section
  const renderComparisonSection = (section: SectionDef, index: number) => {
    const visibleFields = getVisibleFields(section);
    return (
      <div key={section.id} className="bg-white rounded-lg shadow mb-6">
        {renderSectionHeader(section, index)}
        <div className="grid grid-cols-12 gap-3 px-6 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-2">Field</div>
          <div className="col-span-3">Source Value</div>
          <div className="col-span-5">New Record Value</div>
          <div className="col-span-2 text-center">Action</div>
        </div>
        <div className="px-3 py-2">
          {renderFieldsWithGroups(visibleFields)}
        </div>
        {section.dialogueKey && (
          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById(`dialogue-${section.id}`);
                if (el) el.classList.toggle('hidden');
              }}
              className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left"
            >
              <span className="font-semibold text-gray-900">
                {section.dialogueLabel || 'Additional Dialogue'} (Text will appear exactly as typed in email template)
              </span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div id={`dialogue-${section.id}`} className={dialogueValues[section.dialogueKey] ? '' : 'hidden'}>
              <div className="p-4 bg-white">
                {sourceData.projectIdentifier ? (
                  <>
                    <p className="text-xs text-blue-600 mb-2">Carried from source record. The email only uses the parent record&apos;s value.</p>
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 min-h-[2.5rem] whitespace-pre-wrap">
                      {dialogueValues[section.dialogueKey] || <span className="text-gray-400 italic">No value in source record</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <textarea
                      value={dialogueValues[section.dialogueKey] || ''}
                      onChange={(e) => setDialogueValues((prev) => ({ ...prev, [section.dialogueKey!]: e.target.value }))}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                      rows={3}
                      placeholder={`Additional dialogue for ${section.title.toLowerCase()}`}
                      spellCheck={true}
                    />
                    {sourceData[section.dialogueKey] && (
                      <p className="text-xs text-gray-400 mt-1">Source: {sourceData[section.dialogueKey].substring(0, 80)}{sourceData[section.dialogueKey].length > 80 ? '...' : ''}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  // Page 2: Form-style field (pre-populated from source, directly editable)
  const renderFormField = (field: FieldDef) => {
    const state = fieldStates[field.key];
    if (!state) return null;
    const sourceVal = sourceData[field.key] || '';
    const isBlocked = field.behaviour === 'blocked';
    const isConfirmed = state.confirmed;

    return (
      <div key={field.key} className={`p-4 rounded-lg mb-2 border transition-colors duration-200 ${
        isConfirmed ? 'border-green-400 bg-green-50/30' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          <div className="flex items-center gap-2">
            {sourceVal && <span className="text-xs text-gray-400">Source: <span className="font-mono">{displayValue(sourceVal)}</span></span>}
            {isBlocked && <span className="text-xs text-gray-400 italic ml-2">N/A</span>}
            {isConfirmed && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium ml-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </div>
        {field.type === 'textarea' ? (
          <textarea value={state.newValue} onChange={(e) => handleNewValue(field.key, e.target.value)}
            disabled={isBlocked} rows={4}
            className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${
              isBlocked ? 'bg-gray-100 border-gray-200 text-gray-400' : 'border-gray-300 bg-white'
            }`} placeholder={field.placeholder || 'Enter value'} />
        ) : (
          <textarea value={state.newValue} onChange={(e) => handleNewValue(field.key, e.target.value)}
            disabled={isBlocked} rows={1} data-autogrow
            onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
            className={`w-full px-3 py-2 border rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden ${
              isBlocked ? 'bg-gray-100 border-gray-200 text-gray-400' : 'border-gray-300 bg-white'
            }`} placeholder={field.placeholder || 'Enter value'} />
        )}
      </div>
    );
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Duplicate Property Record</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create a new property record based on an existing one. Review and confirm each field before submission.
              </p>
            </div>
            <Image src="/logo.jpg" alt="Buyers Club Logo" width={150} height={112} className="object-contain" />
          </div>

          {/* Record ID input */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Source Record</h2>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">GHL Record ID</label>
                <input type="text" value={recordId} onChange={(e) => setRecordId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleLoad(); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  placeholder="Paste GHL record ID here..." />
              </div>
              <button onClick={handleLoad} disabled={!recordId.trim() || loading}
                className={`px-6 py-2 rounded-md font-medium text-white transition-colors ${recordId.trim() && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}>
                {loading ? 'Loading...' : 'Load Record'}
              </button>
              {sourceLoaded && (
                <button onClick={() => { setSourceLoaded(false); setSourceData({}); setFieldStates({}); setRecordId(''); setError(''); setBlockedDealType(false); setSubmitResult(null); setCreatedFolderLink(''); setFolderError(null); resetForm(); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50">
                  Clear
                </button>
              )}
            </div>
            {sourceLoaded && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800"><strong>Source loaded:</strong> {sourceData.propertyAddress || `Record ${recordId}`}</p>
                <p className="text-xs text-green-600 mt-1">
                  Source occupancy: {sourceOccupancy === 'Yes' ? 'Dual' : sourceOccupancy === 'Tri-plus' ? 'Tri-plus' : 'Single'}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg shadow p-4 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-800"><strong>Error:</strong> {error}</p>
                {!blockedDealType && <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-sm">Dismiss</button>}
              </div>
            </div>
          )}

          {sourceLoaded && !error && (
            <>
              {/* Occupancy Type Selector */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Occupancy Type</h2>
                    <p className="text-sm text-gray-500 mt-1">This controls the field structure below. Change if the new property has a different occupancy type.</p>
                  </div>
                  <div className="flex gap-2">
                    {(['No', 'Yes', 'Tri-plus'] as const).map((opt) => {
                      const label = opt === 'No' ? 'Single' : opt === 'Yes' ? 'Dual' : 'Tri-plus';
                      return (
                        <button key={opt} onClick={() => setOccupancy(opt)}
                          className={`px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                            occupancy === opt ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                          }`}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {occupancy !== sourceOccupancy && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      Occupancy changed from <strong>{sourceOccupancy === 'Yes' ? 'Dual' : sourceOccupancy === 'Tri-plus' ? 'Tri-plus' : 'Single'}</strong> to{' '}
                      <strong>{occupancy === 'Yes' ? 'Dual' : occupancy === 'Tri-plus' ? 'Tri-plus' : 'Single'}</strong>.
                      {occupancy === 'Yes' && ' Secondary dwelling fields are now visible.'}
                      {occupancy === 'No' && ' Secondary dwelling fields have been hidden.'}
                      {occupancy === 'Tri-plus' && ' Tri-plus dwelling configuration will be available in Phase 3.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-medium text-gray-500">
                    {SECTIONS.filter((s) => s.id !== 'project' || !!(sourceData.projectIdentifier?.trim())).reduce((a, s) => a + sectionProgress(s).confirmed, 0)}/
                    {SECTIONS.filter((s) => s.id !== 'project' || !!(sourceData.projectIdentifier?.trim())).reduce((a, s) => a + sectionProgress(s).total, 0)} fields confirmed
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(SECTIONS.filter((s) => s.id !== 'project' || !!(sourceData.projectIdentifier?.trim())).reduce((a, s) => a + sectionProgress(s).confirmed, 0) / Math.max(SECTIONS.filter((s) => s.id !== 'project' || !!(sourceData.projectIdentifier?.trim())).reduce((a, s) => a + sectionProgress(s).total, 0), 1)) * 100}%` }} />
                </div>
              </div>

              {/* Step 0: Side-by-side comparison (scrollable) */}
              {currentStep === 0 && (
                <>
                  {page1Sections
                    .filter((section) => section.id !== 'project' || !!(sourceData.projectIdentifier?.trim()))
                    .map((section, index) => renderComparisonSection(section, index))}
                  <div className="flex justify-end pt-4">
                    <button onClick={() => {
                      // Sync form store with effective values from Page 1 before entering Page 2
                      // This ensures step components (e.g. cashflow sheet naming) use the new record's values
                      updateFormData({
                        address: {
                          ...storeFormData.address,
                          lotNumber: getEffectiveValue('lotNumber'),
                          streetNumber: getEffectiveValue('streetNumber'),
                          streetName: getEffectiveValue('streetName'),
                          suburbName: getEffectiveValue('suburbName'),
                          state: getEffectiveValue('state'),
                          postCode: getEffectiveValue('postCode'),
                          lga: getEffectiveValue('lga'),
                          propertyAddress: [
                            getEffectiveValue('lotNumber') ? `Lot ${getEffectiveValue('lotNumber')},` : '',
                            getEffectiveValue('streetNumber'),
                            getEffectiveValue('streetName') + ',',
                            getEffectiveValue('suburbName'),
                            getEffectiveValue('state'),
                            getEffectiveValue('postCode'),
                          ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(),
                        },
                        projectIdentifier: getEffectiveValue('projectIdentifier'),
                      });
                      setCurrentStep(1);
                    }} className="btn-primary">
                      Next
                    </button>
                  </div>
                </>
              )}

              {/* Steps 1+: Property form style UI (one section per step) */}
              {currentStep > 0 && currentStep <= page2Sections.length && (() => {
                const section = page2Sections[currentStep - 1];
                const globalIndex = page1Sections.length + (currentStep - 1);
                const isLastStep = currentStep === page2Sections.length;

                return (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    {/* Step Indicators — same as MultiStepForm */}
                    <div className="mb-8">
                      <div className="flex items-center justify-between">
                        {page2Sections.map((sec, idx) => {
                          const stepNum = idx + 1;
                          const isActive = currentStep === stepNum;
                          const isCompleted = currentStep > stepNum;
                          return (
                            <div key={sec.id} className="flex items-center flex-1 cursor-pointer" onClick={() => setCurrentStep(stepNum)}>
                              <StepIndicator
                                step={stepNum}
                                title={sec.title}
                                isActive={isActive}
                                isCompleted={isCompleted || isSectionComplete(sec)}
                              />
                              {idx < page2Sections.length - 1 && (
                                <div className={`flex-1 h-1 mx-2 ${
                                  currentStep > stepNum || isSectionComplete(sec) ? 'bg-green-500' : 'bg-gray-300'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section content — render actual existing components */}
                    <div className="mb-8">
                      {section.id === 'marketPerformance' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div />
                            <button
                              onClick={() => {
                                updateFormData({ marketPerformance: {} });
                              }}
                              className="text-sm px-4 py-2 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Clear & Re-enter
                            </button>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                            <p className="text-sm text-blue-800">Market performance values are inherited from the <strong>source property</strong>. If these values need updating, edit the source record(s) before creating the duplicate.</p>
                          </div>
                          <Step3MarketPerformance />
                        </>
                      )}

                      {section.id === 'insurance' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div />
                            <button
                              onClick={() => {
                                updateFormData({ insurance: '', depreciation: {} });
                              }}
                              className="text-sm px-4 py-2 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Clear & Re-enter
                            </button>
                          </div>

                          <Step6InsuranceCalculator />
                          <div className="border-t border-gray-200 my-8" />

                          {/* Folder creation for non-projects, source folder link for projects */}
                          {!sourceData.projectIdentifier?.trim() && (
                            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                              <h3 className="text-lg font-semibold mb-4">Create Property Folder</h3>
                              <p className="text-sm text-gray-600 mb-4">
                                Create a new property folder with a cashflow spreadsheet for this duplicate record.
                              </p>

                              {!createdFolderLink ? (
                                <div className="space-y-3">
                                  <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 font-mono">
                                    {[
                                      getEffectiveValue('lotNumber') ? `Lot ${getEffectiveValue('lotNumber')},` : '',
                                      getEffectiveValue('streetNumber'),
                                      getEffectiveValue('streetName') ? getEffectiveValue('streetName') + ',' : '',
                                      getEffectiveValue('suburbName'),
                                      getEffectiveValue('state'),
                                      getEffectiveValue('postCode'),
                                    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || 'Confirm address fields first'}
                                  </div>
                                  <button
                                    onClick={handleCreateFolder}
                                    disabled={isCreatingFolder}
                                    className="px-6 py-2 rounded-md font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isCreatingFolder ? 'Creating Folder...' : 'Create Folder'}
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                  <p className="text-sm font-medium text-green-900 mb-2">✓ Folder created successfully!</p>
                                  <a
                                    href={createdFolderLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                                  >
                                    {createdFolderLink}
                                  </a>
                                  <div className="mt-3">
                                    <a
                                      href={createdFolderLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors text-sm"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                      View Folder in Google Drive
                                    </a>
                                  </div>
                                </div>
                              )}

                              {folderError && (
                                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                                  <p className="text-sm text-red-700">{folderError}</p>
                                </div>
                              )}
                            </div>
                          )}

                          <Step6WashingtonBrown
                            folderLink={sourceData.projectIdentifier?.trim() ? (sourceData.folderLink || undefined) : undefined}
                            sourceDepreciation={Array.from({ length: 10 }, (_, i) => ({
                              year: i + 1,
                              value: sourceData[`depYear${i + 1}`] || '',
                            })).filter(d => d.value)}
                          />
                        </>
                      )}

                      {section.id === 'cashflow' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div />
                            <button
                              onClick={() => {
                                updateFormData({ councilWaterRates: '' });
                              }}
                              className="text-sm px-4 py-2 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Clear & Re-enter
                            </button>
                          </div>
                          <Step7CashflowReview />
                        </>
                      )}

                      {section.id === 'content' && (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <div />
                            <button
                              onClick={() => {
                                updateFormData({ contentSections: { proximity: '', whyThisProperty: '', investmentHighlights: '' } });
                              }}
                              className="text-sm px-4 py-2 rounded-md border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Clear & Re-enter
                            </button>
                          </div>
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
                            <p className="text-sm text-blue-800">Content below is pre-populated from the <strong>source GHL record</strong>. Review and edit as needed for the new property.</p>
                          </div>
                          <Step5Proximity />
                        </>
                      )}

                      {section.id === 'approval' && (
                        <>
                          <h2 className="text-2xl font-bold mb-6">Approval Status</h2>
                          <div className="space-y-1 mb-8">
                            {getVisibleFields(section).map((field) => renderFormField(field))}
                          </div>
                        </>
                      )}

                      {section.id === 'agent' && (
                        <>
                          <h2 className="text-2xl font-bold mb-6">Agent Information</h2>
                          <div className="space-y-1 mb-8">
                            {(() => {
                              const visibleFields = getVisibleFields(section);
                              const elements: React.ReactNode[] = [];
                              let lastGroup: string | undefined;
                              visibleFields.forEach((field) => {
                                if (field.group && field.group !== lastGroup) {
                                  if (lastGroup !== undefined) elements.push(<div key={`div-${field.group}`} className="border-t border-gray-200 my-4" />);
                                  elements.push(<h3 key={`grp-${field.group}`} className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-4 mb-2">{field.group}</h3>);
                                  lastGroup = field.group;
                                }
                                elements.push(renderFormField(field));
                              });
                              return elements;
                            })()}
                          </div>

                          {/* Message for BA */}
                          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="text-lg font-semibold block mb-2">Message for BA {sourceData.projectIdentifier ? '' : '(Optional)'}</label>
                            {sourceData.projectIdentifier ? (
                              <>
                                <p className="text-xs text-blue-600 mb-2">Carried from source record. The email only uses the parent record&apos;s value.</p>
                                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 min-h-[2.5rem]">
                                  {dialogueValues['messageForBA'] || <span className="text-gray-400 italic">No value in source record</span>}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-gray-500 mb-2">
                                  Any message or notes for the Buyers Agent reviewing this property.
                                </p>
                                <textarea
                                  value={dialogueValues['messageForBA'] || ''}
                                  onChange={(e) => setDialogueValues((prev) => ({ ...prev, messageForBA: e.target.value }))}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                                  rows={3}
                                  placeholder="Enter message for BA..."
                                  spellCheck={true}
                                />
                              </>
                            )}
                          </div>

                          {/* Attachments Additional Dialogue */}
                          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                            <label className="text-lg font-semibold block mb-2">Attachments Additional Dialogue {sourceData.projectIdentifier ? '' : '(Optional)'}</label>
                            {sourceData.projectIdentifier ? (
                              <>
                                <p className="text-xs text-blue-600 mb-2">Carried from source record. The email only uses the parent record&apos;s value.</p>
                                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-md text-sm text-gray-700 min-h-[2.5rem]">
                                  {dialogueValues['attachmentsAdditionalDialogue'] || <span className="text-gray-400 italic">No value in source record</span>}
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-gray-500 mb-2">
                                  Additional notes or dialogue related to attachments and supporting documentation.
                                </p>
                                <textarea
                                  value={dialogueValues['attachmentsAdditionalDialogue'] || ''}
                                  onChange={(e) => setDialogueValues((prev) => ({ ...prev, attachmentsAdditionalDialogue: e.target.value }))}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                                  rows={3}
                                  placeholder="Enter any additional notes about attachments..."
                                  spellCheck={true}
                                />
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Docs info note — on last step */}
                    {isLastStep && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="text-sm font-semibold text-blue-800 mb-1">Documents & Photos</h3>
                        <p className="text-sm text-blue-700">
                          Documents and photos will need to be uploaded separately after the new record is created.
                        </p>
                      </div>
                    )}

                    {/* Submit button — on last step */}
                    {isLastStep && (
                      <div className="mb-6">
                        {!allComplete && (
                          <>
                            <p className="text-sm text-amber-700 mb-2">All fields must be confirmed before you can create the duplicate record.</p>
                            <details className="mb-3">
                              <summary className="text-xs text-amber-600 cursor-pointer hover:underline">Show unconfirmed fields</summary>
                              <ul className="mt-1 text-xs text-amber-800 list-disc pl-4">
                                {SECTIONS.flatMap(s => getVisibleFields(s).filter(f => !fieldStates[f.key]?.confirmed).map(f => (
                                  <li key={f.key}><strong>{s.title}</strong>: {f.label} ({f.behaviour})</li>
                                )))}
                              </ul>
                            </details>
                          </>
                        )}
                        {allComplete && !submitResult && (
                          <p className="text-sm text-green-700 font-medium mb-3">All fields confirmed. Ready to create the new record.</p>
                        )}
                        {submitResult && (
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                            <p className="text-base text-green-800 font-semibold mb-2">✓ Record created successfully</p>
                            {submitResult !== 'created' && (
                              <p className="text-sm text-green-700 mb-2">Record ID: <code className="font-mono bg-green-100 px-1 rounded">{submitResult}</code></p>
                            )}
                            <div className="text-sm text-green-800 space-y-1">
                              <p>Please verify in GHL that the record has been created correctly.</p>
                              {sourceData.projectIdentifier && (
                                <p className="font-medium">For this project record, also check that the new lot appears correctly in the project email.</p>
                              )}
                            </div>
                          </div>
                        )}
                        {!submitResult && (
                          <button disabled={!allComplete || submitting}
                            className={`w-full px-8 py-3 rounded-lg font-semibold text-white text-base transition-colors ${
                              allComplete && !submitting ? 'bg-green-600 hover:bg-green-700 shadow-sm' : 'bg-gray-400 cursor-not-allowed'
                            }`}
                            onClick={handleSubmit}>
                            {submitting ? 'Creating Record...' : 'Create Duplicate Record'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Navigation — same as MultiStepForm */}
                    <div className="flex justify-between items-center pt-6 border-t">
                      <button
                        onClick={() => setCurrentStep(currentStep - 1)}
                        className="btn-secondary"
                      >
                        Previous
                      </button>
                      <div className="text-sm text-gray-500">
                        Step {currentStep} of {page2Sections.length}
                      </div>
                      {!isLastStep && (() => {
                        const isContentStep = section.id === 'content';
                        const contentReviewed = storeFormData.contentSections?.contentReviewed;
                        const blocked = isContentStep && !contentReviewed;
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={() => { if (!blocked) setCurrentStep(currentStep + 1); }}
                              disabled={blocked}
                              className={blocked ? 'btn-primary opacity-50 cursor-not-allowed' : 'btn-primary'}
                            >
                              Next
                            </button>
                            {blocked && <span className="text-xs text-amber-600">Tick the review checkbox above to proceed</span>}
                          </div>
                        );
                      })()}
                      {isLastStep && <div />}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
