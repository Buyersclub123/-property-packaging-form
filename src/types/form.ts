// Form field types and interfaces

export type PropertyType = 'New' | 'Established';
export type ContractType = '01_hl_comms' | '02_single_comms' | '03_internal_with_comms' | '04_internal_nocomms' | '05_established';
export type ContractTypeSimplified = 'Single Contract' | 'Split Contract';
export type LotType = 'Individual' | 'Multiple';
export type DualOccupancy = 'Yes' | 'No' | 'Mixed' | 'TBC' | '';

export type YesNo = 'Yes' | 'No' | '';
export type AskingType = 'onmarket' | 'offmarket' | 'prelaunch_opportunity' | 'coming_soon' | 'tbc';
export type OccupancyType = 'owner_occupied' | 'tenanted' | 'vacant' | 'tbc';
export type TitleType = 'individual' | 'torrens' | 'green' | 'strata' | 'owners_corp_community' | 'survey_strata' | 'built_strata' | 'tbc';
export type CashbackRebateType = 'cashback' | 'rebate';
export type DealType = '01_hl_comms' | '02_single_comms' | '03_internal_with_comms' | '04_internal_nocomms' | '05_established';
export type StatusType = '01_available' | '02_eoi' | '03_contr_exchanged' | '05_remove_no_interest' | '06_remove_lost';

// Step 0: Decision Tree (now Step 1 after reordering)
export interface DecisionTree {
  propertyType: PropertyType | null;
  contractType: ContractType | null;
  contractTypeSimplified?: ContractTypeSimplified | null; // Computed field: "Single Contract" or "Split Contract" for H&L properties
  lotType: LotType | null;
  dualOccupancy: DualOccupancy | null;
  status: StatusType | null;
}

// Step 1: Address
export interface AddressData {
  propertyAddress: string; // Overlay/Google Maps address (can be approximate)
  unitLotPrimary?: string;
  unitLotSecondary?: string;
  lotNumber?: string; // Lot number for new developments (empty string means "Not Applicable" was selected)
  lotNumberNotApplicable?: boolean; // Flag to track if "Not Applicable" was explicitly selected
  unitNumber?: string; // Unit number(s) - can be single (e.g., "2"), range (e.g., "1-8"), or list (e.g., "A,B,C")
  hasUnitNumbers?: boolean; // Does this property have unit numbers? (Yes/No)
  streetNumber?: string; // Project Address components (for validation/LGA lookup)
  streetName?: string; // Project Address components
  suburbName?: string; // Project Address components
  state?: string; // Project Address components
  postCode?: string; // Project Address components
  projectAddress?: string; // Combined Project Address (used in email template)
  usePropertyAddressForProject?: boolean; // If true, use propertyAddress for projectAddress
  projectName?: string; // Project name (for projects)
  googleMap?: string;
  latitude?: number;
  longitude?: number;
  lga?: string; // LGA for Investment Highlights lookup (shared, not duplicated)
  
  // Property Address for GHL/Client Records (actual property address)
  // Note: Lot numbers are handled in Property Details step (Step 2) for multi-lot projects
  isNewDevelopment?: boolean;
  propertyAddressForGHL?: {
    streetNumber?: string;
    streetName?: string;
    suburbName?: string;
    state?: string;
    postCode?: string;
  };
  
  // Address verification state
  addressVerified?: boolean; // True when verified via Stash/Geoscape
  addressFieldsEditable?: boolean; // True when user clicks "Edit Address Fields"
  addressSource?: 'stash' | 'individual'; // Which address source to use for propertyAddress
  stashPropertyAddress?: string; // Store original Stash/Geoscape validated address for restoration
  
  // Google Drive folder (created when "Continue with Packaging" is clicked)
  folderLink?: string; // Link to property folder in Google Drive
  folderName?: string; // Name of the property folder
}

// Step 2: Stash Risk Overlays
export interface RiskOverlays {
  zoning?: string;
  flood: YesNo;
  floodDialogue?: string;
  bushfire: YesNo;
  bushfireDialogue?: string;
  mining: YesNo;
  miningDialogue?: string;
  otherOverlay: YesNo;
  otherOverlayDialogue?: string;
  specialInfrastructure: YesNo;
  specialInfrastructureDialogue?: string;
  dueDiligenceAcceptance: YesNo;
}

// Lot Details (for Projects with Multiple Lots)
export interface LotDetails {
  lotNumber: string;
  singleOrDual: DualOccupancy; // Yes = Dual, No = Single
  propertyDescription?: PropertyDescription;
  purchasePrice?: PurchasePrice;
  rentalAssessment?: RentalAssessment;
}

// Property Description
export interface PropertyDescription {
  bedsPrimary?: string;
  bedsSecondary?: string;
  bathPrimary?: string;
  bathSecondary?: string;
  garagePrimary?: string;
  garageSecondary?: string;
  carspacePrimary?: string;
  carspaceSecondary?: string;
  carportPrimary?: string;
  carportSecondary?: string;
  yearBuilt?: string;
  landRegistration?: string; // For H&L/Projects: "Registered" OR "Month Year approx." OR "TBC"
  landSize?: string;
  buildSize?: string; // For H&L single occupancy: Build size in sqm (e.g., "144.75" or "TBC")
  buildSizePrimary?: string; // For H&L dual occupancy: Primary build size in sqm
  buildSizeSecondary?: string; // For H&L dual occupancy: Secondary build size in sqm
  title?: TitleType;
  bodyCorpPerQuarter?: string;
  bodyCorpDescription?: string;
  doesThisPropertyHave2Dwellings?: YesNo;
  propertyDescriptionAdditionalDialogue?: string;
  projectBrief?: string; // For Projects: Project brief (shared across all lots)
}

// Purchase Price
export interface PurchasePrice {
  asking?: AskingType;
  askingText?: string;
  comparableSales?: string;
  acceptableAcquisitionFrom?: string;
  acceptableAcquisitionTo?: string;
  landPrice?: string; // For H&L (not Single Contract): Land price
  buildPrice?: string; // For H&L (not Single Contract): Build price
  totalPrice?: string; // For Single Contract (02 Single Comms): Total price
  cashbackRebateValue?: string; // For Contract Types 01, 02, 03: Cashback/Rebate value
  cashbackRebateType?: CashbackRebateType; // Type of cashback/rebate
  priceGroup?: string; // Auto-calculated price group ($300-500k, $500-700k, $700k+)
  purchasePriceAdditionalDialogue?: string;
}

// Rental Assessment
export interface RentalAssessment {
  occupancyPrimary?: OccupancyType;
  occupancySecondary?: OccupancyType;
  currentRentPrimary?: string;
  currentRentSecondary?: string;
  expiryPrimary?: string;
  expirySecondary?: string;
  rentAppraisalPrimaryFrom?: string;
  rentAppraisalPrimaryTo?: string;
  rentAppraisalSecondaryFrom?: string;
  rentAppraisalSecondaryTo?: string;
  yield?: string;
  appraisedYield?: string;
  rentalAssessmentAdditionalDialogue?: string;
}

// Market Performance
export interface MarketPerformance {
  medianPriceChange3Months?: string;
  medianPriceChange1Year?: string;
  medianPriceChange3Year?: string;
  medianPriceChange5Year?: string;
  medianYield?: string;
  medianRentChange1Year?: string;
  rentalPopulation?: string;
  vacancyRate?: string;
  marketPerformanceAdditionalDialogue?: string;
  isSaved?: boolean; // Flag to track if data has been saved to Google Sheets
  isVerified?: boolean; // Flag to track if user has verified data (clicked "Data is fine" or "Needs updating")
  daysSinceLastCheck?: number; // Age of data in days (for logging purposes)
}

// Content Sections
export interface ContentSections {
  whyThisProperty?: string;
  proximity?: string;
  investmentHighlights?: string; // Main Body
  investmentHighlightsReportName?: string;
  investmentHighlightsValidFrom?: string;
  investmentHighlightsValidTo?: string;
  investmentHighlightsExtra1?: string;
  investmentHighlightsExtra2?: string;
  investmentHighlightsExtra3?: string;
  investmentHighlightsExtra4?: string;
  investmentHighlightsExtra5?: string;
  investmentHighlightsExtra6?: string;
  investmentHighlightsExtra7?: string;
}

// Agent Information
export interface AgentInfo {
  agentName?: string;
  agentMobile?: string;
  agentEmail?: string;
}

// Complete Form Data
export interface FormData {
  // Package Info
  packager?: string;
  sourcer?: string;
  sellingAgentName?: string; // Selling agent name
  sellingAgentEmail?: string; // Selling agent email
  sellingAgentMobile?: string; // Selling agent mobile
  sellingAgent?: string; // Combined field: "Name, Email, Mobile" (computed on submit)
  status?: StatusType;
  dealType?: DealType;
  reviewDate?: string;
  
  // Pre-fetched data (loaded early for better UX)
  proximityData?: string; // Pre-fetched proximity results from Step 2
  
  // Early processing state (Step 1A)
  earlyProcessing?: {
    investmentHighlights?: {
      status: 'pending' | 'processing' | 'ready' | 'error';
      data?: any;
      dateStatus?: any;
      selectedFromDropdown?: boolean;
      uploadedPdfFileId?: string;
      uploadedPdfTimestamp?: number;
      uploadedPdfFileName?: string;
      error?: string;
    };
    proximity?: {
      status: 'pending' | 'processing' | 'ready' | 'error';
      data?: string;
      error?: string;
    };
    whyThisProperty?: {
      status: 'pending' | 'processing' | 'ready' | 'error';
      data?: string;
      error?: string;
    };
  };
  
  // Step 0
  decisionTree: DecisionTree;
  
  // Step 1
  address: AddressData;
  
  // Step 2
  riskOverlays: RiskOverlays;
  
  // Lots (for Projects - Multiple lots)
  lots?: LotDetails[];
  
  // Property Description (for H&L Individual or Established)
  propertyDescription: PropertyDescription;
  
  // Purchase Price (for H&L Individual or Established)
  purchasePrice: PurchasePrice;
  
  // Rental Assessment (for H&L Individual or Established)
  rentalAssessment: RentalAssessment;
  
  // Market Performance
  marketPerformance: MarketPerformance;
  
  // Content Sections
  contentSections: ContentSections;
  
  // Agent Info
  agentInfo: AgentInfo;
  
  // Insurance (Step 6)
  insurance?: string; // Annual insurance cost from Terri Scheer calculator
  
  // Attachments
  attachmentsAdditionalDialogue?: string;
  
  // Cashflow Spreadsheets (Google Sheets Copy URLs)
  cashflowSheetLinkHL?: string; // House & Land cashflow spreadsheet copy URL
  cashflowSheetLinkGeneral?: string; // General/Single Contract cashflow spreadsheet copy URL
  
  // Cashflow Spreadsheet Fields (rows 13-29 in Autofill data tab)
  councilWaterRates?: string; // Council/Water Rates $ (B13) - editable on Step 7
  rates?: string; // Quarterly council rates (B14)
  insuranceType?: 'Insurance' | 'Insurance + Strata'; // Insurance type dropdown (B15)
  insuranceAmount?: string; // Annual insurance amount (B16)
  pbPciReport?: 'P&B' | 'PCI'; // Report type: P&B for established, PCI for new builds (B17)
  buildWindow?: string; // Build Window dropdown: 09 mo, 12 mo, 15 mo, 18 mo (B27) - editable on Step 7, Split Contract only
  cashback1Month?: string; // Cashback 1 month dropdown: 1-18 (B28) - editable on Step 7, Split Contract only
  cashback2Month?: string; // Cashback 2 month dropdown: 1-18 (B29) - editable on Step 7, Split Contract only
  
  // Depreciation (Years 1-10) - Diminishing Value amounts (B18-B27)
  depreciation?: {
    year1?: string;
    year2?: string;
    year3?: string;
    year4?: string;
    year5?: string;
    year6?: string;
    year7?: string;
    year8?: string;
    year9?: string;
    year10?: string;
  };
  
  // Workflow
  messageForBA?: string;
  pushRecordToDealSheet?: YesNo;
}

// Form State
export interface FormState {
  currentStep: number;
  formData: FormData;
  isLoading: boolean;
  errors: Record<string, string>;
  stashData: StashResponse | null;
  stashLoading: boolean;
  stashError: string | null;
}

// Stash API Response (flexible structure)
export interface StashResponse {
  // Risk Overlays
  floodRisk?: YesNo;
  floodingRisk?: YesNo;
  flooding?: string;
  bushfireRisk?: YesNo;
  bushfire?: string;
  
  // Zoning
  zone?: string;
  zoneDesc?: string;
  zoning?: string;
  
  // Location
  lga?: string;
  lgaPid?: string;
  state?: string;
  
  // Geocoded address components (from Module 4 geocoding)
  streetNumber?: string;
  streetName?: string;
  suburbName?: string;
  suburb?: string; // Alias for suburbName
  postCode?: string;
  postcode?: string; // Alias for postCode
  
  // Coordinates
  latitude?: number;
  longitude?: number;
  coordinates?: number[];
  
  // Geocoded address (corrected/validated address from geocoding service)
  geocodedAddress?: string;
  
  // Other fields
  lotSizeMin?: string;
  lotSizeAvg?: string;
  planningLinks?: string[];
  
  // Property Info (from Stash)
  bedrooms?: string;
  bathrooms?: string;
  carSpaces?: string;
  landSize?: string;
  yearBuilt?: string;
  title?: string;
  
  // Raw data for debugging
  rawStashData?: any;
  rawHazards?: any;
  rawSources?: any[];
  
  // Error handling
  error?: boolean;
  errorMessage?: string;
}

