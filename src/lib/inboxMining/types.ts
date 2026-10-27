export const INBOX_CLASSES = [
  'registration_titles_issued',
  'contract_received_unsigned',
  'contract_executed_exchanged',
  'deposit_receipt',
  'bp_report',
  'build_update_progress_claim',
  'finance_update',
  'other',
] as const;

export type InboxClass = (typeof INBOX_CLASSES)[number];

export type Grade = 'A' | 'B' | 'C' | 'HOLD' | 'UNMATCHED';

export type FactKey =
  | 'lot'
  | 'planType'
  | 'planNumber'
  | 'state'
  | 'landPrice'
  | 'buildPrice'
  | 'totalPrice'
  | 'contractDate'
  | 'purchaser'
  | 'vendorBuilder'
  | 'registration'
  | 'titleReference'
  | 'deposit'
  | 'constructionStage'
  | 'finance'
  | 'bp';

export interface Fact {
  value: string;
  source: string;
  quote: string;
}

export type Facts = Partial<Record<FactKey, Fact>>;

export interface DocRead {
  name: string;
  source: 'attachment' | 'zip' | 'link';
  zipEntry?: string;
  url?: string;
  status: 'read' | 'not_read' | 'zip_not_opened';
  reason?: string;
  pages?: number;
  chars?: number;
  isDocuSign?: boolean;
  needsVisualRead?: boolean;
}

export interface LinkRead {
  url: string;
  status: 'read' | 'not_read';
  reason?: string;
}

export interface GeoscapeCheck {
  status: 'found' | 'not_found' | 'not_checked' | 'error';
  parcelId?: string;
  address?: string;
  reason?: string;
}

export interface MatchResult {
  grade: Grade;
  source: 'thread_memory' | 'rules' | 'none';
  opportunityId?: string;
  opportunityName?: string;
  pipelineName?: string;
  stageName?: string;
  propertyRecordId?: string;
  fact1?: string;
  fact2?: string;
  reason?: string;
  geoscape: GeoscapeCheck;
  flags: string[];
  trackerEvidence: string[];
}

export interface Suggestion {
  target: 'opportunity' | 'property_record';
  fieldKey: string;
  fieldLabel: string;
  fieldId?: string;
  proposed: string | string[];
  source: string;
  notInGhl?: boolean;
  note?: string;
}

export const FEEDBACK_OUTCOMES = ['accept', 'wrong_field', 'wrong_value', 'wrong_opportunity', 'not_needed'] as const;
export type FeedbackOutcome = (typeof FEEDBACK_OUTCOMES)[number];

export interface FeedbackEntry {
  outcome: FeedbackOutcome;
  note: string;
  by: string;
  at: string;
}

export const suggestionKey = (s: Pick<Suggestion, 'target' | 'fieldKey'>) => `${s.target}:${s.fieldKey}`;

export interface ThreadMemoryRow {
  mailbox: string;
  thread_id: string;
  first_subject: string | null;
  first_message_at: string | null;
  first_sender: string | null;
  opportunity_id: string | null;
  property_record_id: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  active: boolean;
}
