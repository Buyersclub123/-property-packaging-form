// Form field types and interfaces

export type PropertyType = 'New' | 'Established';
export type ContractType = '01 H&L Comms' | '02 Single Comms' | '03 Internal with Comms' | '04 Internal No-Comms' | '05 Established';
export type LotType = 'Individual' | 'Multiple';
export type DualOccupancy = 'Yes' | 'No' | 'Mixed' | 'TBC' | '';

export type YesNo = 'Yes' | 'No' | '';
export type AskingType = 'On-market' | 'Off-market' | 'Pre-launch' | 'Coming Soon' | 'N/A' | 'TBC';
export type OccupancyType = 'Owner Occupied' | 'Tenanted' | 'Vacant';
export type TitleType = 'Individual' | 'Green' | 'Torrens' | 'Strata' | 'Owners Corp (Community)' | 'Survey Strata' | 'Built Strata' | 'TBC';
export type CashbackRebateType = 'Cashback' | 'Rebate on Land' | 'Rebate on Build';
export type DealType = '01 H&L Comms' | '02 Single Comms' | '03 Internal with Comms' | '04 Internal No-Comms' | '05 Established';
export type StatusType = '01 Available' | '02 EOI' | '03 Contr\' Exchanged' | '05 Remove no interest' | '06 Remove lost';

// Step 0: Decision Tree (now Step 1 after reordering)
export interface DecisionTree {
  propertyType: PropertyType | null;
  contractType: ContractType | null;
  lotType: LotType | null;
  dualOccupancy: DualOccupancy | null;
  status: StatusType | null;
}

// Step 1: Address
export interface AddressData {
  propertyAddress: string; // Overlay/Google Maps address (can be approximate)
  unitLotPrimary?: string;
  unitLotSecondary?: string;
  lotNumber?: string; // Lot number for new developments
  streetNumber?: string; // Project Address components (for validation/LGA lookup)
  streetName?: string; // Project Address components
  suburbName?: string; // Project Address components
  state?: string; // Project Address components
  postCode?: string; // Project Address components
  projectAddress?: string; // Combined Project Address (used in email template)
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
  projectOverview?: string; // For Projects: Project overview (shared across all lots)
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
  purchasePriceAdditionalDialogue?: string;
}

// Rental Assessment
export interface RentalAssessment {
  occupancy?: OccupancyType;
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
  rentDialoguePrimary?: string;
  rentDialogueSecondary?: string;
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
  investmentHighlights?: string;
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
  
  // Attachments
  attachmentsAdditionalDialogue?: string;
  
  // Cashflow Spreadsheets (Google Sheets Copy URLs)
  cashflowSheetLinkHL?: string; // House & Land cashflow spreadsheet copy URL
  cashflowSheetLinkGeneral?: string; // General/Single Contract cashflow spreadsheet copy URL
  
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

