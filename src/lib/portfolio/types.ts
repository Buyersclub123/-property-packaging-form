export type SourceKind = 'inflight' | 'historical';

export interface SourceTab { tab: string; rows: number; included: boolean; note?: string }

export interface SourceFileInfo {
  kind: SourceKind | 'opportunities' | 'propertyRecords';
  name: string;
  modifiedAt: string;
  takenAt?: string;
  count?: number;
  tabs?: SourceTab[];
}

export interface PortfolioProperty {
  key: string;
  source: SourceKind;
  file: string;
  tab: string;
  rowNumber: number;
  opportunityId: string | null;
  address: string;
  dealType: string;
  contractType: string;
  landPrice: number | null;
  buildPrice: number | null;
  totalPrice: number | null;
  priceSource: string;
  contractDate: string;
  settlementDate: string;
  settlementSource: string;
  settlementBeforeContract: boolean;
  entity: string;
  entityName: string;
  entitySource: string;
  builder: string;
  grade: string;
  gradeFacts: string[];
  flag: string;
  action: string;
  status: string;
  notes: string;
  fellOver: boolean;
  fileRecordRef: string;
  linkedRecordId: string | null;
  linkedRecordAddress: string;
}

export interface PortfolioOpportunity {
  key: string;
  id: string | null;
  name: string;
  pipeline: string;
  stage: string;
  status: string;
  properties: PortfolioProperty[];
}

export interface PortfolioRollup {
  properties: number;
  priced: number;
  totalCost: number;
  firstPurchase: string;
  lastPurchase: string;
  undated: number;
  inFlight: number;
  historical: number;
  fellOver: number;
}

export interface PortfolioClient {
  key: string;
  contactId: string | null;
  name: string;
  email: string;
  hasGhlContact: boolean;
  opportunities: PortfolioOpportunity[];
  rollup: PortfolioRollup;
}

export type DataIssueKind =
  | 'settlement_before_contract'
  | 'duplicate_opportunity'
  | 'opportunity_not_in_snapshot'
  | 'unparsed_date'
  | 'unparsed_price';

export interface DataIssue {
  kind: DataIssueKind;
  message: string;
  client: string;
  opportunityId: string | null;
  address: string;
  file: string;
  tab: string;
  rowNumber: number;
}

export interface PortfolioData {
  builtAt: string;
  sourceDir: string;
  sources: SourceFileInfo[];
  clients: PortfolioClient[];
  issues: DataIssue[];
  totals: { clients: number; properties: number; priced: number; totalCost: number; fellOver: number };
}
