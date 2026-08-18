'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail, hasValidUserEmail } from '@/lib/userAuth';
import { useAutoRefreshPause } from '@/lib/useAutoRefreshPause';
import { getFieldLabel, getFieldSource, FieldSource, PROPERTY_FIELD_TYPES, PROPERTY_FIELD_OPTION_PAIRS, getPropertyOptionLabel, CO_PREFIX } from '@/app/api/contract-team-reporting/fields';

if (typeof document !== 'undefined') document.title = 'Contract Team Reporting Tool';

// ============================================================================
// USER MAP
// ============================================================================

const USER_MAP: Record<string, string> = {
  JagMfwQldvDP6W83tVGf: 'Adi Manek',
  SsghxcuMYeJkvGmysQ8a: 'Ali Hallak',
  FfsdYIF2zsNIhACa0okl: 'Bishoy Azer',
  dnHqpE4w1NkChxz02TMD: 'Brandon Lee',
  dEOydmLG3o6FFflc5vw2: 'Carlo Surace',
  gNb33F7eUFCT3HLmN7hx: 'Cooper Rigg',
  zWOSP7ToACgxvmT5DfLV: 'Ethan Willis',
  ILt7Gfsml0W44MlMRote: 'Ethan Lipovac',
  bet9EbE8K7ATiTIcrKDf: 'James Middleton',
  juIYjKKpcNJTWmABI4mL: 'Jessica Khan',
  bF4VSGTCthQ9yHVMqTLF: 'John El Hindi',
  ivq1rs3PIhzalIlnGXLr: 'John Truscott',
  zJeab2JyjwV6iJi9JnDY: 'Luke Czajka',
  JZPsmIvFNg8FDbSvHT8h: 'Mahdi Shamseddin',
  jW2P9G8d8omEDV5sUNdH: 'Mark Youssef',
  WTbTdnLlc8xUZPHo0Y4S: 'Max Yeung',
  v12BS3gcOJvoLC06Di8m: 'Nathan Fowler',
  oApontRBOU2NyNq5EdoM: 'Ninos Emmanuel',
  sHdMcNB7UEc8iA8va4xe: 'Phil H',
  MNdbAuC6atnoW1CaLISP: 'Roy Nassar',
  F8s1EEJ41qkj9nckze0B: 'Sachin Patel',
  t8jdvB8kgEGOVcFxF3OX: 'Sam Singh',
  '9TN4PVTAD0ha7XX6yhfP': 'Shayur Sumer',
};

const BA_OPTIONS = Object.entries(USER_MAP)
  .map(([id, name]) => ({ id, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// ============================================================================
// DROPDOWN OPTIONS
// ============================================================================

const BP_EXTENSION_STATUS_OPTIONS = ['', 'Requested', 'Accepted', 'Rejected'];
const BP_CONDITION_STATUS_OPTIONS = ['', 'Sent for review', 'In negotiation', 'Satisfied', 'Satisfied subject to', 'Not satisfied'];
const INSURANCE_STATUS_OPTIONS = ['', 'Quote requested', 'Strata report requested', 'Sent to client', 'Invoiced', 'Paid', 'CoC issued', 'Client organising'];
const PRE_SETTLEMENT_STATUS_OPTIONS = ['', 'Not satisfied', 'Satisfied'];
const TYPE_OF_PROPERTY_OPTIONS = ['', 'Established', 'Construction - Registered', 'Construction - Unregistered', 'SMSF Construction'];

// Map field key → dropdown options (for edit mode) — must match GHL options
const FIELD_OPTIONS: Record<string, string[]> = {
  bpExtensionStatus: BP_EXTENSION_STATUS_OPTIONS,
  bpConditionStatus: BP_CONDITION_STATUS_OPTIONS,
  insuranceStatus: INSURANCE_STATUS_OPTIONS,
  preSettlementInspectionStatus: PRE_SETTLEMENT_STATUS_OPTIONS,
  typeOfProperty: TYPE_OF_PROPERTY_OPTIONS,
  financeExtensionStatus: ['', 'Requested', 'Accepted', 'Rejected', 'Waived Finance'],
};

// Fields that are checkboxes in GHL, and the value that means "ticked"
const CHECKBOX_ON_VALUE: Record<string, string> = {
  bpRequested: 'Yes',
  financeFormalApproval: 'Yes',
  financeApprovalReceived: 'Yes',
  landDepositPaid: 'Yes',
  buildDepositIssued: 'Yes',
  buildDepositPaid: 'Yes',
  pmIntroSent: 'Yes',
  registration: 'Registered',
};
const CHECKBOX_FIELDS = new Set(Object.keys(CHECKBOX_ON_VALUE));
// Fields that are dates
// NOTE: settlementDate is TEXT in GHL (not DATE) so it is deliberately excluded
const DATE_FIELDS = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpScheduledDate', 'confirmedSettlementDate', 'preSettlementInspectionDate', 'exchangeDate', 'unconditionalDate', 'financeDueDate', 'financeRequestedExtensionDate', 'lastFinanceUpdateDate', 'lastConstructionUpdateDate', 'buildDepositIssuedDate', 'registrationDateETA', 'valuationExpectedAccessDate']);

// ----------------------------------------------------------------------------
// Type-aware helpers — cover BOTH opportunity fields and custom object (co_)
// fields. The LIVE GHL schema (refreshed hourly via /schema) takes priority;
// the baked-in static maps are the fallback if the schema fetch fails.
// ----------------------------------------------------------------------------

interface OptionPair { key: string; label: string }
interface LiveSchemaRegistry {
  fetchedAt: string;
  types: Record<string, string>;                 // field key (opp key or co_...) -> dataType
  options: Record<string, OptionPair[] | null>;  // field key -> option pairs (stored key / display label)
  newFieldCount: number;
}
let LIVE_SCHEMA: LiveSchemaRegistry | null = null;

function liveTypeOf(key: string): string | null {
  return LIVE_SCHEMA?.types[key] || null;
}

function coTypeOf(key: string): string | null {
  if (!key.startsWith(CO_PREFIX)) return null;
  return liveTypeOf(key) || PROPERTY_FIELD_TYPES[key.slice(CO_PREFIX.length)] || null;
}

function isDateField(key: string): boolean {
  const live = liveTypeOf(key);
  if (live) return live === 'DATE';
  return DATE_FIELDS.has(key) || coTypeOf(key) === 'DATE';
}

function isLargeTextField(key: string): boolean {
  return LARGE_TEXT_FIELDS.has(key) || liveTypeOf(key) === 'LARGE_TEXT' || coTypeOf(key) === 'LARGE_TEXT';
}

// Checkbox on-value (the STORED value when ticked): live schema first, then static.
function checkboxOnValue(key: string): string | null {
  const live = liveTypeOf(key);
  if (live === 'CHECKBOX') {
    return LIVE_SCHEMA?.options[key]?.[0]?.key || CHECKBOX_ON_VALUE[key] || 'Yes';
  }
  if (live && live !== 'CHECKBOX') return null;
  if (CHECKBOX_ON_VALUE[key]) return CHECKBOX_ON_VALUE[key];
  if (coTypeOf(key) === 'CHECKBOX') {
    const pairs = PROPERTY_FIELD_OPTION_PAIRS[key.slice(CO_PREFIX.length)];
    return pairs?.[0]?.key || 'Yes';
  }
  return null;
}

// Dropdown option pairs: `value` is what GHL stores, `label` is what users see.
// (GHL stores option KEYS for custom object fields, e.g. "split_contract".)
function dropdownOptions(key: string): OptionPair[] | null {
  const live = liveTypeOf(key);
  if (live === 'SINGLE_OPTIONS') {
    const opts = LIVE_SCHEMA?.options[key];
    if (opts?.length) return [{ key: '', label: '-- None --' }, ...opts];
  }
  if (live && live !== 'SINGLE_OPTIONS') return null;
  if (FIELD_OPTIONS[key]) {
    return FIELD_OPTIONS[key].map((o) => ({ key: o, label: o || '-- None --' }));
  }
  if (coTypeOf(key) === 'SINGLE_OPTIONS') {
    const pairs = PROPERTY_FIELD_OPTION_PAIRS[key.slice(CO_PREFIX.length)];
    if (pairs) return [{ key: '', label: '-- None --' }, ...pairs];
  }
  return null;
}

// Translate a stored value to its display label (co_ dropdown/checkbox fields).
function displayLabelFor(key: string, raw: string): string {
  if (!raw || !key.startsWith(CO_PREFIX)) return raw;
  const live = LIVE_SCHEMA?.options[key];
  if (live) {
    const match = live.find((o) => o.key === raw || o.label === raw);
    if (match) return match.label;
  }
  return getPropertyOptionLabel(key.slice(CO_PREFIX.length), raw);
}
// Fields that are large text (get expand button in edit mode)
const LARGE_TEXT_FIELDS = new Set(['latestStatusUpdate', 'bpNegotiationDetail', 'agentBuilderDetails', 'briefNotes']);
// ALL custom object (co_) fields are read-only for now (feedback item 31).
// Flip to false to re-enable editing — the write-back plumbing stays in place.
const CO_FIELDS_READ_ONLY = true;

// Standard across all views (feedback item 7) + contact fields (item 23)
const READ_ONLY_FIELDS = new Set(['id', 'name', 'opportunityName', 'pipelineStage', 'pipelineName', 'registeredAddress', 'assignedTo', 'assignedBA', 'owner', 'followers', 'daysSinceStageChange', 'stage', 'ghlLink', 'contactName', 'contactEmail', 'contactPhone', 'status', 'monetaryValue', 'createdAt', 'updatedAt', 'lastStageChangeAt', 'pipelineId', 'pipelineStageId', 'co_record_id', 'co_linked_opportunity_id', 'partnerName', 'partnerEmail', 'partnerPhone']);

// ============================================================================
// TYPES
// ============================================================================

// Flexible record: known opportunity fields plus any property-record fields
// (deal_type, land_size, contract_type, ...) returned by the reporting API.
interface OpportunityRecord {
  [key: string]: string;
  id: string;
  ghlLink: string;
  name: string;
  pipelineStage: string;
  registeredAddress: string;
  typeOfProperty: string;
  bpRequested: string;
  assignedTo: string;
  bpDueDate: string;
  bpRequestedExtensionDate: string;
  bpExtensionStatus: string;
  bpScheduledDate: string;
  bpConditionStatus: string;
  bpNegotiationDetail: string;
  financeFormalApproval: string;
  confirmedSettlementDate: string;
  insuranceStatus: string;
  preSettlementInspectionDate: string;
  preSettlementInspectionStatus: string;
  latestStatusUpdate: string;
}

type RecordKey = string;

interface ColumnDef {
  key: RecordKey;
  label: string;
  width: number;
  color?: string;            // per-view column colour (palette name)
  endStateValues?: string[]; // values that mark the cell green (end state)
}

interface ColumnSettings {
  color?: string;           // hex colour for the column group
  endStateValues?: string[]; // dropdown values that are "end states" (green highlight)
  isFYI?: boolean;          // mark as informational column (muted colour)
}

type SortDirection = 'asc' | 'desc' | null;

// One level of an Excel-style layered sort: "sort by A, then by D, then by G".
interface SortLevel {
  column: RecordKey;
  dir: 'asc' | 'desc';
}
type Theme = 'dark' | 'light';

// Column colour palette (translucent so they work on both themes)
const COLUMN_COLOURS = [
  { name: 'None', header: '', cell: '' },
  { name: 'Blue', header: 'rgba(59,130,246,0.25)', cell: 'rgba(59,130,246,0.1)' },
  { name: 'Green', header: 'rgba(34,197,94,0.25)', cell: 'rgba(34,197,94,0.1)' },
  { name: 'Purple', header: 'rgba(168,85,247,0.25)', cell: 'rgba(168,85,247,0.1)' },
  { name: 'Orange', header: 'rgba(249,115,22,0.25)', cell: 'rgba(249,115,22,0.1)' },
  { name: 'Pink', header: 'rgba(236,72,153,0.25)', cell: 'rgba(236,72,153,0.1)' },
  { name: 'Yellow', header: 'rgba(234,179,8,0.25)', cell: 'rgba(234,179,8,0.1)' },
];
const FYI_COLOUR = { header: 'rgba(148,163,184,0.25)', cell: 'rgba(148,163,184,0.1)' };
const END_STATE_BG = 'rgba(34,197,94,0.3)';

// Fields that have dropdown options (for end state configuration)
const DROPDOWN_FIELD_OPTIONS: Record<string, string[]> = {
  bpRequested: ['Yes'],
  bpExtensionStatus: ['Requested', 'Accepted', 'Rejected'],
  bpConditionStatus: ['Sent for review', 'In negotiation', 'Satisfied', 'Satisfied subject to', 'Not satisfied'],
  financeFormalApproval: ['Yes'],
  financeApprovalReceived: ['Yes'],
  financeExtensionStatus: ['Requested', 'Accepted', 'Rejected', 'Waived Finance'],
  insuranceStatus: ['Quote requested', 'Strata report requested', 'Sent to client', 'Invoiced', 'Paid', 'CoC issued', 'Client organising'],
  preSettlementInspectionStatus: ['Not satisfied', 'Satisfied'],
  typeOfProperty: ['Established', 'Construction - Registered', 'Construction - Unregistered', 'SMSF Construction'],
  registration: ['Registered'],
  landDepositPaid: ['Yes'],
  buildDepositIssued: ['Yes'],
  buildDepositPaid: ['Yes'],
  pmIntroSent: ['Yes'],
};

// Baked-in default column settings (colours, end states, FYI)
const DEFAULT_COLUMN_SETTINGS: Record<string, ColumnSettings> = {
  name: { isFYI: true },
  pipelineStage: { isFYI: true, endStateValues: ['Formal Approval'] },
  registeredAddress: { isFYI: true },
  assignedTo: { isFYI: true },
  assignedBA: { isFYI: true },
  owner: { isFYI: true },
  followers: { isFYI: true },
  pipelineName: { isFYI: true },
  daysSinceStageChange: { isFYI: true },
  ghlLink: { isFYI: true },
  bpRequested: { color: 'Yellow', endStateValues: ['Yes'] },
  bpDueDate: { color: 'Yellow' },
  bpRequestedExtensionDate: { color: 'Yellow' },
  bpExtensionStatus: { color: 'Yellow' },
  bpScheduledDate: { color: 'Yellow' },
  bpConditionStatus: { color: 'Yellow', endStateValues: ['Satisfied', 'Satisfied subject to'] },
  bpNegotiationDetail: { color: 'Yellow' },
  financeFormalApproval: { isFYI: true, endStateValues: ['Yes'] },
  insuranceStatus: { color: 'Pink', endStateValues: ['CoC issued'] },
  preSettlementInspectionDate: { color: 'Blue' },
  preSettlementInspectionStatus: { color: 'Blue', endStateValues: ['Satisfied'] },
  id: { isFYI: true },
};

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Opportunity Name', width: 200 },
  { key: 'pipelineStage', label: 'Pipeline Stage', width: 130 },
  { key: 'registeredAddress', label: 'Registered Address', width: 200 },
  { key: 'assignedBA', label: 'Assigned BA', width: 120 },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110 },
  { key: 'bpRequested', label: 'B&P Requested?', width: 70 },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 95 },
  { key: 'bpRequestedExtensionDate', label: 'B&P Requested Extension Date', width: 95 },
  { key: 'bpExtensionStatus', label: 'B&P Extension Status', width: 110 },
  { key: 'bpScheduledDate', label: 'B&P Scheduled Date', width: 95 },
  { key: 'bpConditionStatus', label: 'B&P Condition Status', width: 120 },
  { key: 'bpNegotiationDetail', label: 'B&P Negotiation Detail', width: 160 },
  { key: 'financeFormalApproval', label: 'Finance Formal Approval Received', width: 80 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 130 },
  { key: 'insuranceStatus', label: 'Insurance Status', width: 130 },
  { key: 'preSettlementInspectionDate', label: 'Pre-settlement Inspection Date', width: 100 },
  { key: 'preSettlementInspectionStatus', label: 'Pre-settlement Inspection Status', width: 110 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 180 },
  { key: 'id', label: 'Record ID', width: 120 },
];

// ============================================================================
// PRESET VIEWS — ported from Contract Team Reports Tool
// ============================================================================

interface ViewFilter {
  field: RecordKey;
  operator: 'equals' | 'not equals' | 'contains' | 'not contains' | 'in' | 'not in' | 'is blank' | 'not blank';
  value: string;
}

type ViewSection = 'Standard' | 'Custom' | 'Exception';
const VIEW_SECTIONS: ViewSection[] = ['Standard', 'Custom', 'Exception'];

interface ViewDef {
  id: string;
  name: string;
  section: ViewSection;
  filters: ViewFilter[];
  columns: ColumnDef[];
  // sortBy/sortDir are the level-1 sort. They stay for backwards compatibility:
  // views saved before layered sorting existed only have these two.
  sortBy: RecordKey;
  sortDir: SortDirection;
  // Full layered sort, level 1 first. When present this wins over sortBy/sortDir.
  sorts?: SortLevel[];
  builtin?: boolean;
}

// Read a view's sort as levels, falling back to the legacy single-column pair.
function viewSortLevels(v: ViewDef): SortLevel[] {
  if (v.sorts && v.sorts.length > 0) return v.sorts;
  return v.sortDir ? [{ column: v.sortBy, dir: v.sortDir }] : [];
}

const FINANCE_PIPELINE_ID = 'zgBRaMnACpskyf1wHCEV';
const CONSTRUCTION_PIPELINE_ID = 'XMKCHlqekS7IU87PNLKB';

const FULL_FC_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'smsfName', label: 'SMSF Name', width: 140 },
  { key: 'owner', label: 'Owner', width: 120 },
  { key: 'followers', label: 'Followers', width: 160 },
  { key: 'assignedBA', label: 'Assigned BA', width: 120 },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250 },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110 },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120 },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110 },
  { key: 'financeRequestedExtensionDate', label: 'Finance Requested Extension Date', width: 120 },
  { key: 'financeExtensionStatus', label: 'Finance Extension Status', width: 120 },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update', width: 120 },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110 },
  { key: 'bpConditionStatus', label: 'B&P Condition Status', width: 130 },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100 },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100 },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120 },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100 },
  { key: 'registrationDateETA', label: 'Registration Date ETA', width: 120 },
  { key: 'registration', label: 'Registration', width: 100 },
  { key: 'valuationExpectedAccessDate', label: 'Valuation Expected Access Date', width: 120 },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140 },
  { key: 'brokerName', label: 'Broker Name', width: 140 },
  { key: 'brokerCompany', label: 'Broker Company', width: 140 },
  { key: 'personalName', label: 'Personal Name', width: 160 },
  { key: 'contactEmail', label: 'Contact Email', width: 180 },
  { key: 'contactPhone', label: 'Contact Phone', width: 130 },
];

const SETTLEMENT_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'smsfName', label: 'SMSF Name', width: 140 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120 },
  { key: 'owner', label: 'Owner', width: 120 },
  { key: 'followers', label: 'Followers', width: 160 },
  { key: 'assignedBA', label: 'Assigned BA', width: 120 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250 },
  { key: 'solicitorCompany', label: 'Solicitor Company', width: 140 },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140 },
  { key: 'settlementDate', label: 'Settlement Date', width: 120 },
  { key: 'brokerName', label: 'Broker Name', width: 140 },
  { key: 'brokerCompany', label: 'Broker Company', width: 140 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
];

const PROJECT_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100 },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100 },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'registrationDateETA', label: 'Registration Date ETA', width: 120 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250 },
  { key: 'registration', label: 'Registration', width: 100 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120 },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100 },
  { key: 'brokerName', label: 'Broker Name', width: 140 },
  { key: 'brokerCompany', label: 'Broker Company', width: 140 },
  { key: 'brokerEmail', label: 'Broker Email', width: 180 },
  { key: 'brokerPhone', label: 'Broker Phone', width: 130 },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140 },
  { key: 'solicitorCompany', label: 'Solicitor Company', width: 140 },
  { key: 'solicitorEmail', label: 'Solicitor Email', width: 180 },
  { key: 'solicitorPhone', label: 'Solicitor Phone', width: 130 },
];

const BUILD_DEPOSIT_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'registrationDateETA', label: 'Registration Date ETA', width: 120 },
  { key: 'registration', label: 'Registration', width: 100 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120 },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100 },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120 },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
];

const UNCON_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'owner', label: 'Owner', width: 120 },
  { key: 'followers', label: 'Followers', width: 160 },
  { key: 'assignedBA', label: 'Assigned BA', width: 120 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250 },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110 },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120 },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110 },
  { key: 'financeRequestedExtensionDate', label: 'Finance Requested Extension Date', width: 120 },
  { key: 'financeExtensionStatus', label: 'Finance Extension Status', width: 120 },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update', width: 120 },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110 },
  { key: 'bpConditionStatus', label: 'B&P Condition Status', width: 130 },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100 },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100 },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120 },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100 },
  { key: 'registrationDateETA', label: 'Registration Date ETA', width: 120 },
  { key: 'registration', label: 'Registration', width: 100 },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval Received', width: 100 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140 },
  { key: 'brokerName', label: 'Broker Name', width: 140 },
  { key: 'brokerCompany', label: 'Broker Company', width: 140 },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110 },
];

const PM_INTRO_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'contactEmail', label: 'Contact Email', width: 180 },
  { key: 'contactPhone', label: 'Contact Phone', width: 130 },
  { key: 'partnerName', label: 'Partner Name', width: 140 },
  { key: 'partnerEmail', label: 'Partner Email', width: 180 },
  { key: 'partnerPhone', label: 'Partner Phone', width: 130 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250 },
];

const FINANCE_TRACKING_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50 },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80 },
  { key: 'pipelineName', label: 'Pipeline', width: 100 },
  { key: 'registeredAddress', label: 'Registered Address', width: 220 },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110 },
  { key: 'name', label: 'Opportunity Name', width: 220 },
  { key: 'pipelineStage', label: 'Stage', width: 140 },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110 },
  { key: 'registrationDateETA', label: 'Registration Date ETA', width: 120 },
  { key: 'registration', label: 'Registration', width: 100 },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120 },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110 },
  { key: 'financeRequestedExtensionDate', label: 'Finance Requested Extension Date', width: 120 },
  { key: 'financeExtensionStatus', label: 'Finance Extension Status', width: 120 },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update', width: 120 },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval Received', width: 100 },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120 },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250 },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200 },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140 },
  { key: 'brokerName', label: 'Broker Name', width: 140 },
  { key: 'brokerCompany', label: 'Broker Company', width: 140 },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100 },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100 },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120 },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100 },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110 },
  { key: 'bpConditionStatus', label: 'B&P Condition Status', width: 130 },
  { key: 'owner', label: 'Owner', width: 120 },
  { key: 'followers', label: 'Followers', width: 160 },
  { key: 'assignedBA', label: 'Assigned BA', width: 120 },
];

const PRESET_VIEWS: ViewDef[] = [
  {
    // Replicates the real B&P & Finance tool default view:
    // Finance pipeline | Type: Established | Stage ≠ Settled
    id: 'builtin-bp',
    name: 'B&P',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: DEFAULT_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
      { field: 'typeOfProperty', operator: 'equals', value: 'Established' },
      { field: 'pipelineStage', operator: 'not equals', value: 'Settled' },
    ],
    // Sorted by B&P Due Date at the contract team's request. This deliberately
    // differs from the old config sheet, which sorted by Confirmed Settlement Date.
    sortBy: 'bpDueDate',
    sortDir: 'asc',
  },
  {
    id: 'builtin-full-fc',
    name: 'Full F&C',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: FULL_FC_COLUMNS,
    // Full F&C = Finance + Construction. Matches the old extract: Settled is
    // dropped API-side, HANDOVER is included.
    filters: [
      { field: 'pipelineId', operator: 'in', value: `${CONSTRUCTION_PIPELINE_ID},${FINANCE_PIPELINE_ID}` },
    ],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    id: 'builtin-settlement',
    name: 'Settlement Tracking',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: SETTLEMENT_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    // Two-level sort, as per the original config sheet.
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
    sorts: [
      { column: 'confirmedSettlementDate', dir: 'asc' },
      { column: 'daysSinceStageChange', dir: 'asc' },
    ],
  },
  {
    id: 'builtin-ocean-rise',
    name: 'Ocean Rise',
    section: 'Custom' as ViewSection,
    builtin: true,
    columns: PROJECT_COLUMNS,
    filters: [
      { field: 'registeredAddress', operator: 'contains', value: 'ocean rise' },
    ],
    sortBy: 'registeredAddress',
    sortDir: 'asc',
  },
  {
    id: 'builtin-build-deposit',
    name: 'Build Deposit Status',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: BUILD_DEPOSIT_COLUMNS,
    // Original report = Construction (incl. HANDOVER) + Finance (excl. Settled).
    filters: [
      { field: 'pipelineId', operator: 'in', value: `${CONSTRUCTION_PIPELINE_ID},${FINANCE_PIPELINE_ID}` },
    ],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    id: 'builtin-uncon',
    name: 'Uncon Tracking',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: UNCON_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    sortBy: 'daysSinceStageChange',
    sortDir: 'asc',
  },
  {
    id: 'builtin-pm-intro',
    name: 'PM Intro Tracking',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: PM_INTRO_COLUMNS,
    // Per the original config sheet: Construction pipeline, minus HANDOVER.
    filters: [
      { field: 'pipelineId', operator: 'equals', value: CONSTRUCTION_PIPELINE_ID },
      { field: 'pipelineStage', operator: 'not contains', value: 'Handover' },
    ],
    // Two-level sort, as per the original config sheet.
    sortBy: 'pipelineStage',
    sortDir: 'desc',
    sorts: [
      { column: 'pipelineStage', dir: 'desc' },
      { column: 'daysSinceStageChange', dir: 'desc' },
    ],
  },
  {
    id: 'builtin-huntly',
    name: 'Huntly VIC',
    section: 'Custom' as ViewSection,
    builtin: true,
    columns: PROJECT_COLUMNS,
    filters: [
      { field: 'registeredAddress', operator: 'contains', value: 'huntly' },
      { field: 'name', operator: 'not contains', value: 'Bilal Darwich' },
      { field: 'name', operator: 'not contains', value: 'Cooper Rigg' },
    ],
    sortBy: 'registeredAddress',
    sortDir: 'asc',
  },
  {
    id: 'builtin-golden-horizon',
    name: 'Golden Horizon Bundaberg',
    section: 'Custom' as ViewSection,
    builtin: true,
    columns: PROJECT_COLUMNS,
    filters: [
      { field: 'registeredAddress', operator: 'contains', value: 'Golden Horizon' },
    ],
    sortBy: 'registeredAddress',
    sortDir: 'asc',
  },
  {
    id: 'builtin-finance-tracking',
    name: 'Finance Tracking',
    section: 'Standard' as ViewSection,
    builtin: true,
    columns: FINANCE_TRACKING_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    sortBy: 'financeDueDate',
    sortDir: 'asc',
  },
];

// Label helper for the report builder — prefers explicit column labels, then
// the API field label map (opportunity + property fields), then title-case.
const KNOWN_COLUMN_LABELS: Record<string, string> = {};
for (const col of [...DEFAULT_COLUMNS, ...FULL_FC_COLUMNS, ...SETTLEMENT_COLUMNS, ...PROJECT_COLUMNS, ...BUILD_DEPOSIT_COLUMNS, ...UNCON_COLUMNS, ...PM_INTRO_COLUMNS, ...FINANCE_TRACKING_COLUMNS]) {
  if (!KNOWN_COLUMN_LABELS[col.key]) KNOWN_COLUMN_LABELS[col.key] = col.label;
}

function getReportFieldLabel(key: string): string {
  return KNOWN_COLUMN_LABELS[key] || getFieldLabel(key);
}

// ----------------------------------------------------------------------------
// Automated view description (feedback items 2 + 3).
// Derived ENTIRELY from the view's filter config plus the API-level rules, so
// it can never drift from what the view actually does.
// ----------------------------------------------------------------------------

const ALL_PIPELINES: { id: string; name: string }[] = [
  { id: FINANCE_PIPELINE_ID, name: 'Finance' },
  { id: CONSTRUCTION_PIPELINE_ID, name: 'Construction' },
  { id: 'RDd4Kczt5mEuUhHfRr7C', name: 'Contracts' },
  { id: 'zrb34FRmPnbIyAGFDeXJ', name: 'Property Team' },
];

// Stage exclusions baked into the API (route.ts) — keyed by pipeline id.
const API_STAGE_EXCLUSIONS: Record<string, string> = {
  [FINANCE_PIPELINE_ID]: 'Settled',
};

function describeView(view: ViewDef): string {
  // 1. Which pipelines does this view actually include?
  let pipelines = [...ALL_PIPELINES];
  for (const f of view.filters) {
    if (f.field !== 'pipelineId') continue;
    if (f.operator === 'equals') pipelines = pipelines.filter((p) => p.id.toLowerCase() === f.value.toLowerCase());
    if (f.operator === 'not equals') pipelines = pipelines.filter((p) => p.id.toLowerCase() !== f.value.toLowerCase());
    if (f.operator === 'in') {
      const ids = f.value.toLowerCase().split(',').map((s) => s.trim());
      pipelines = pipelines.filter((p) => ids.includes(p.id.toLowerCase()));
    }
    if (f.operator === 'not in') {
      const ids = f.value.toLowerCase().split(',').map((s) => s.trim());
      pipelines = pipelines.filter((p) => !ids.includes(p.id.toLowerCase()));
    }
  }

  const parts: string[] = [];
  parts.push(`Pipelines: ${pipelines.map((p) => p.name).join(', ') || 'none'}`);
  parts.push('Status: open only');

  // 2. API-level stage exclusions — only mention those relevant to the included pipelines
  const stageExclusions = pipelines
    .filter((p) => API_STAGE_EXCLUSIONS[p.id])
    .map((p) => `${API_STAGE_EXCLUSIONS[p.id]} (${p.name})`);
  if (stageExclusions.length > 0) parts.push(`Stages excluded: ${stageExclusions.join(', ')}`);

  // 3. Remaining view filters (everything except pipelineId, already covered)
  const OPERATOR_TEXT: Record<ViewFilter['operator'], string> = {
    'equals': '=',
    'not equals': '≠',
    'contains': 'contains',
    'not contains': 'does not contain',
    'in': 'is one of',
    'not in': 'is not one of',
    'is blank': 'is blank',
    'not blank': 'is not blank',
  };
  const fieldFilters = view.filters
    .filter((f) => f.field !== 'pipelineId')
    .map((f) => {
      const label = getReportFieldLabel(f.field);
      const op = OPERATOR_TEXT[f.operator];
      return f.operator === 'is blank' || f.operator === 'not blank'
        ? `${label} ${op}`
        : `${label} ${op} "${f.value}"`;
    });
  if (fieldFilters.length > 0) parts.push(`Filters: ${fieldFilters.join(', ')}`);

  return parts.join(' | ');
}

// Only the original Standard/Exception reports are locked. The project views in
// the Custom section are meant to be maintained by the team, so a built-in one
// can be overwritten — which saves a public view under the same id. Deleting that
// override brings the code version back.
function isViewProtected(view: ViewDef): boolean {
  return !!view.builtin && view.section !== 'Custom';
}

function applyViewFilters(records: OpportunityRecord[], filters: ViewFilter[]): OpportunityRecord[] {
  return records.filter((record) =>
    filters.every((f) => {
      const cellValue = (record[f.field] || '').toLowerCase().trim();
      const filterValue = f.value.toLowerCase().trim();
      switch (f.operator) {
        case 'equals':
          return cellValue === filterValue;
        case 'not equals':
          return cellValue !== filterValue;
        case 'contains':
          return cellValue.includes(filterValue);
        case 'not contains':
          return !cellValue.includes(filterValue);
        case 'in': {
          const list = filterValue.split(',').map((s) => s.trim());
          return list.some((item) => cellValue === item || cellValue.includes(item));
        }
        case 'not in': {
          const list = filterValue.split(',').map((s) => s.trim());
          return !list.some((item) => cellValue === item || cellValue.includes(item));
        }
        case 'is blank':
          return cellValue === '';
        case 'not blank':
          return cellValue !== '';
        default:
          return true;
      }
    })
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContractTeamReportingPage() {
  const [records, setRecords] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Edit mode (hidden by default — Shift+double-click logo to reveal)
  const [showEditButton, setShowEditButton] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ctr-edit-visible') === 'true';
    return false;
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editedRows, setEditedRows] = useState<Record<string, Partial<OpportunityRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // User identity (email-based)
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailChecked, setEmailChecked] = useState(false);

  useEffect(() => {
    const stored = getUserEmail();
    if (stored && hasValidUserEmail()) {
      setUserEmail(stored);
    }
    setEmailChecked(true);
  }, []);

  const userInitials = useMemo(() => {
    if (!userEmail) return '';
    const username = userEmail.split('@')[0] || '';
    return username.split('.').map(w => w[0]?.toUpperCase() || '').join('');
  }, [userEmail]);

  // Sort state — layered, level 1 first (Excel-style "sort by A, then D, then G").
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([{ column: 'bpDueDate', dir: 'asc' }]);
  // Level 1, for the places that only care about the primary sort.
  const sortColumn: RecordKey | null = sortLevels[0]?.column ?? null;
  const sortDirection: SortDirection = sortLevels[0]?.dir ?? null;

  // Preset filter
  type PresetFilter = 'none' | 'blankPropertyType' | 'blankBpDueDate' | 'blankBpRequested' | 'bpDueNext5' | 'settlementNext5';
  const [activePreset, setActivePreset] = useState<PresetFilter>('none');

  // Filter state (Excel-style excluded values)
  const [excludedFilters, setExcludedFilters] = useState<Partial<Record<RecordKey, Set<string>>>>({});
  const [textExcludeFilters, setTextExcludeFilters] = useState<Partial<Record<RecordKey, string[]>>>({});
  // "Show only rows containing" per column. Unlike the checkbox exclusions this
  // states an intent rather than a list of values, so it survives new data and
  // can be saved into a view.
  const [textIncludeFilters, setTextIncludeFilters] = useState<Partial<Record<RecordKey, string>>>({});
  const [filterSearch, setFilterSearch] = useState<Partial<Record<RecordKey, string>>>({});
  const [openFilterDropdown, setOpenFilterDropdown] = useState<RecordKey | null>(null);

  // Column state (persisted so custom report layouts survive refresh)
  const [columns, setColumns] = useState<ColumnDef[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ctr-columns');
        if (saved) {
          const parsed = JSON.parse(saved) as ColumnDef[];
          if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((c) => c.key && c.label)) return parsed;
        }
      } catch { /* corrupt localStorage — fall through */ }
    }
    return DEFAULT_COLUMNS;
  });
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  // Columns dropdown is hidden — Shift+double-click the Settings (⚙) button to reveal
  const [showColumnBuilder, setShowColumnBuilder] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('ctr-builder-visible') === 'true';
    return false;
  });
  const [expandedSettingsCol, setExpandedSettingsCol] = useState<RecordKey | null>(null);

  // Column settings — baked-in defaults (used by the B&P view)
  const columnSettings = DEFAULT_COLUMN_SETTINGS;

  // Ref so colour helpers (defined above the view state) can read the active
  // view at render time without declaration-order issues.
  const activeViewRef = useRef<{ name: string }>({ name: 'B&P' });

  function getColumnBg(colKey: string, isHeader: boolean): string {
    const s = columnSettings[colKey];
    // Grey (FYI/read-only) colouring applies on every view
    if (s?.isFYI) return isHeader ? FYI_COLOUR.header : FYI_COLOUR.cell;
    // Per-column colour chosen in the view builder (any view)
    const colDef = columns.find((c) => c.key === colKey);
    if (colDef?.color && colDef.color !== 'None') {
      const c = COLUMN_COLOURS.find((cc) => cc.name === colDef.color);
      if (c) return isHeader ? c.header : c.cell;
    }
    // Baked-in coloured column groups only apply on the B&P view (feedback item 18)
    if (activeViewRef.current.name !== 'B&P') return '';
    if (s?.color) {
      const c = COLUMN_COLOURS.find((cc) => cc.name === s.color);
      if (c) return isHeader ? c.header : c.cell;
    }
    return '';
  }

  // Columns that cascade green when B&P Condition Status hits certain end states
  const BP_CASCADE_SATISFIED_SUBJECT_TO: Set<string> = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpExtensionStatus', 'bpScheduledDate']);
  const BP_CASCADE_SATISFIED: Set<string> = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpExtensionStatus', 'bpScheduledDate', 'bpNegotiationDetail']);

  function getCellBg(colKey: string, value: string, record?: OpportunityRecord): string {
    // Per-column end states chosen in the view builder (any view)
    const colDef = columns.find((c) => c.key === colKey);
    if (colDef?.endStateValues?.length && colDef.endStateValues.includes(value)) return END_STATE_BG;
    // Baked-in green end-state / cascade colouring only applies on the B&P view (feedback item 18)
    if (activeViewRef.current.name === 'B&P') {
      const s = columnSettings[colKey];
      // Direct end state match
      if (s?.endStateValues?.length && s.endStateValues.includes(value)) return END_STATE_BG;
      // Cross-column cascade: B&P Condition Status → related B&P columns
      if (record) {
        const bpStatus = record.bpConditionStatus || '';
        if (bpStatus === 'Satisfied' && BP_CASCADE_SATISFIED.has(colKey)) return END_STATE_BG;
        if (bpStatus === 'Satisfied subject to' && BP_CASCADE_SATISFIED_SUBJECT_TO.has(colKey)) return END_STATE_BG;
        // Pre-settlement Inspection Status → Pre-settlement Inspection Date + B&P Negotiation Detail
        if (record.preSettlementInspectionStatus === 'Satisfied' && (colKey === 'preSettlementInspectionDate' || colKey === 'bpNegotiationDetail')) return END_STATE_BG;
      }
    }
    return getColumnBg(colKey, false);
  }

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ctr-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);

  // Row height: '1-line' | '2-line' | '3-line' | 'auto'
  type RowHeight = '1-line' | '2-line' | '3-line' | 'auto';
  const [rowHeight, setRowHeight] = useState<RowHeight>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ctr-row-height');
      if (saved === '1-line' || saved === '2-line' || saved === '3-line' || saved === 'auto') return saved;
    }
    return '1-line';
  });

  useEffect(() => {
    localStorage.setItem('ctr-row-height', rowHeight);
  }, [rowHeight]);

  const rowHeightStyle = rowHeight === '1-line' ? { maxHeight: '20px', overflow: 'hidden' as const }
    : rowHeight === '2-line' ? { maxHeight: '40px', overflow: 'hidden' as const }
    : rowHeight === '3-line' ? { maxHeight: '60px', overflow: 'hidden' as const }
    : {};

  // Expanded cell popup
  const [expandedCell, setExpandedCell] = useState<{ recordId: string; colKey: string; value: string; x: number; y: number } | null>(null);

  // Text editor modal (for large text fields in edit mode)
  const [textEditorModal, setTextEditorModal] = useState<{ recordId: string; colKey: RecordKey; label: string } | null>(null);


  // Views: built-in presets + saved public (Redis) + saved personal (localStorage)
  const [publicViews, setPublicViews] = useState<ViewDef[]>([]);
  const [personalViews, setPersonalViews] = useState<ViewDef[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ctr-personal-views');
        if (saved) {
          const parsed = JSON.parse(saved) as ViewDef[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [];
  });
  const allViews = useMemo(() => {
    // A saved public view with the same id as a preset replaces it.
    const overridden = new Set(publicViews.map((v) => v.id));
    return [...PRESET_VIEWS.filter((p) => !overridden.has(p.id)), ...publicViews, ...personalViews];
  }, [publicViews, personalViews]);

  const [activeViewId, setActiveViewId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ctr-view-id');
      if (saved) return saved;
    }
    return 'builtin-bp';
  });
  const activeView = allViews.find((v) => v.id === activeViewId) ?? PRESET_VIEWS[0];
  activeViewRef.current = activeView;
  const [showViewMenu, setShowViewMenu] = useState(false);

  // --------------------------------------------------------------------------
  // VIEW BUILDER (hidden — Shift+double-click ⚙ to reveal)
  // --------------------------------------------------------------------------
  const [showViewBuilder, setShowViewBuilder] = useState(false);
  const [ghlPipelines, setGhlPipelines] = useState<{ id: string; name: string; stages: { id: string; name: string }[] }[]>([]);
  const [builderPipelines, setBuilderPipelines] = useState<Set<string>>(new Set());
  const [builderStages, setBuilderStages] = useState<Set<string>>(new Set()); // stage NAMES
  const [builderName, setBuilderName] = useState('');
  const [builderSection, setBuilderSection] = useState<ViewSection>('Custom');
  const [builderScope, setBuilderScope] = useState<'public' | 'personal'>('personal');
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderColorCol, setBuilderColorCol] = useState<string | null>(null);
  // Field filters inherited from the view you started from (e.g. Type of
  // Property = Established on the B&P view). Shown in the builder so they can
  // be removed — otherwise they'd silently carry over into the new view.
  const [builderExtraFilters, setBuilderExtraFilters] = useState<ViewFilter[]>([]);
  // Draft mode: started from "+ New Report" — a clean slate not tied to any view
  const [builderDraft, setBuilderDraft] = useState(false);

  // Start a brand-new report from scratch: minimal columns, nothing inherited
  const startNewReport = useCallback(() => {
    setBuilderDraft(true);
    setColumns([
      { key: 'name', label: 'Opportunity Name', width: 200 },
      { key: 'pipelineName', label: 'Pipeline', width: 100 },
      { key: 'pipelineStage', label: 'Pipeline Stage', width: 130 },
      { key: 'registeredAddress', label: 'Registered Address', width: 200 },
      { key: 'assignedBA', label: 'Assigned BA', width: 120 },
    ]);
    setBuilderPipelines(new Set());
    setBuilderStages(new Set());
    setBuilderExtraFilters([]);
    setBuilderName('');
    setBuilderSection('Custom');
    setExcludedFilters({});
    setTextExcludeFilters({});
    setTextIncludeFilters({});
    setFilterSearch({});
    setActivePreset('none');
    setSortLevels([{ column: 'name', dir: 'asc' }]);
    setShowViewBuilder(true);
  }, []);

  // Fetch pipelines + live stages when the builder opens
  useEffect(() => {
    if (!showViewBuilder || ghlPipelines.length > 0) return;
    fetch('/api/contract-team-reporting/pipelines')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.pipelines)) setGhlPipelines(data.pipelines); })
      .catch(() => {});
  }, [showViewBuilder, ghlPipelines.length]);

  // Turn the ad-hoc grid filters into view filters, so filtering from the column
  // headers can be saved. Note: excluded-value lists are snapshots of the values
  // present today, and a '(blank)' exclusion can't be expressed as a filter, so
  // 'contains' is the more durable way to narrow a view.
  const gridFiltersToViewFilters = useCallback((): ViewFilter[] => {
    const out: ViewFilter[] = [];
    for (const [key, pattern] of Object.entries(textIncludeFilters)) {
      if (pattern && pattern.trim()) out.push({ field: key as RecordKey, operator: 'contains', value: pattern.trim() });
    }
    for (const [key, patterns] of Object.entries(textExcludeFilters)) {
      for (const p of patterns || []) {
        if (p && p.trim()) out.push({ field: key as RecordKey, operator: 'not contains', value: p.trim() });
      }
    }
    for (const [key, set] of Object.entries(excludedFilters)) {
      const values = Array.from((set as Set<string>) || []).filter((v) => v && v !== '(blank)');
      if (values.length > 0) out.push({ field: key as RecordKey, operator: 'not in', value: values.join(', ') });
    }
    return out;
  }, [textIncludeFilters, textExcludeFilters, excludedFilters]);

  // Initialise builder selections from the active view when opened
  // (skipped in draft mode — "+ New Report" already set a clean slate)
  useEffect(() => {
    if (!showViewBuilder || builderDraft) return;
    setBuilderName(activeView.builtin ? '' : activeView.name);
    setBuilderSection(activeView.builtin ? 'Custom' : activeView.section);
    const pipelineFilter = activeView.filters.find((f) => f.field === 'pipelineId');
    if (pipelineFilter) {
      setBuilderPipelines(new Set(pipelineFilter.value.split(',').map((s) => s.trim())));
    } else {
      setBuilderPipelines(new Set());
    }
    const stageFilter = activeView.filters.find((f) => f.field === 'pipelineStage' && f.operator === 'in');
    setBuilderStages(stageFilter ? new Set(stageFilter.value.split(',').map((s) => s.trim()).filter(Boolean)) : new Set());
    // Inherited field filters (everything that isn't pipeline/stage selection),
    // plus anything the user filtered on the grid — promoted here so it can be
    // reviewed, edited and saved. The grid state is then cleared to avoid
    // filtering twice by two different mechanisms.
    const inherited = activeView.filters.filter((f) => f.field !== 'pipelineId' && !(f.field === 'pipelineStage' && f.operator === 'in'));
    const promoted = gridFiltersToViewFilters();
    setBuilderExtraFilters([...inherited, ...promoted]);
    if (promoted.length > 0) {
      setExcludedFilters({});
      setTextExcludeFilters({});
      setTextIncludeFilters({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showViewBuilder, activeViewId]);

  function buildFiltersFromBuilder(): ViewFilter[] {
    // Field filters: inherited, promoted from the grid, or added in the builder.
    // Rows with no value are dropped so a half-finished row can't filter anything out.
    const filters: ViewFilter[] = builderExtraFilters.filter(
      (f) => f.operator === 'is blank' || f.operator === 'not blank' || f.value.trim() !== ''
    );
    const pipelineIds = Array.from(builderPipelines);
    if (pipelineIds.length > 0 && pipelineIds.length < 4) {
      filters.push(
        pipelineIds.length === 1
          ? { field: 'pipelineId', operator: 'equals', value: pipelineIds[0] }
          : { field: 'pipelineId', operator: 'in', value: pipelineIds.join(', ') }
      );
    }
    // Trim + dedupe stage names (some GHL stage names carry trailing spaces)
    const stages = Array.from(new Set(Array.from(builderStages).map((s) => s.trim()).filter(Boolean)));
    if (stages.length > 0) {
      filters.push({ field: 'pipelineStage', operator: 'in', value: stages.join(', ') });
    }
    return filters;
  }

  // LIVE PREVIEW: while the builder is open (or building a new report from
  // scratch) the grid reflects the builder's selections immediately — you see
  // exactly what the view will show before saving it.
  const effectiveView: ViewDef = useMemo(() => {
    if (!showViewBuilder && !builderDraft) return activeView;
    return {
      ...activeView,
      name: builderDraft ? (builderName.trim() || 'New Report (unsaved)') : activeView.name,
      filters: buildFiltersFromBuilder(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showViewBuilder, builderDraft, activeView, builderName, builderPipelines, builderStages, builderExtraFilters]);

  // Persist a view definition to the right store (public = Redis, personal = localStorage)
  async function persistView(view: ViewDef, scope: 'public' | 'personal'): Promise<boolean> {
    if (scope === 'public') {
      const res = await fetch('/api/contract-team-reporting/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ view: { ...view, updatedBy: userEmail || '' } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(`Save failed: ${data.error || res.status}`);
        return false;
      }
      await fetchPublicViews();
      return true;
    }
    setPersonalViews((prev) => {
      const idx = prev.findIndex((v) => v.id === view.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = view; return next; }
      return [...prev, view];
    });
    return true;
  }

  // "Save as NEW view" — always creates a new view with the entered name
  async function saveAsNewView() {
    const name = builderName.trim();
    if (!name) { alert('Please enter a view name.'); return; }
    const clash = allViews.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (clash && !confirm(`A view called "${clash.name}" already exists. Create another view with the same name?`)) return;
    setBuilderSaving(true);
    try {
      const view: ViewDef = {
        id: `${builderScope}-${Date.now()}`,
        name,
        section: builderSection,
        filters: buildFiltersFromBuilder(),
        columns,
        sortBy: sortLevels[0]?.column ?? 'name',
        sortDir: sortLevels[0]?.dir ?? null,
        sorts: sortLevels,
      };
      if (await persistView(view, builderScope)) {
        setBuilderDraft(false);
        setActiveViewId(view.id);
        localStorage.setItem('ctr-view-id', view.id);
        setShowViewBuilder(false);
      }
    } finally {
      setBuilderSaving(false);
    }
  }

  // "Update <current view>" — overwrites the active saved view in place
  async function updateActiveView() {
    if (isViewProtected(activeView)) return; // Standard reports are locked
    setBuilderSaving(true);
    try {
      // Overriding a built-in Custom view saves it publicly, since those views are shared.
      const scope: 'public' | 'personal' = activeView.builtin || activeView.id.startsWith('public-') ? 'public' : 'personal';
      const view: ViewDef = {
        ...activeView,
        builtin: false,
        name: builderName.trim() || activeView.name,
        section: builderSection,
        filters: buildFiltersFromBuilder(),
        columns,
        sortBy: sortLevels[0]?.column ?? 'name',
        sortDir: sortLevels[0]?.dir ?? null,
        sorts: sortLevels,
      };
      if (await persistView(view, scope)) {
        setShowViewBuilder(false);
      }
    } finally {
      setBuilderSaving(false);
    }
  }

  // Unsaved-changes indicator: does the current layout differ from the active view?
  const hasUnsavedViewChanges = useMemo(() => {
    const stripWidths = (cols: ColumnDef[]) => cols.map((c) => ({ key: c.key, color: c.color || '', end: (c.endStateValues || []).join('|') }));
    return JSON.stringify(stripWidths(columns)) !== JSON.stringify(stripWidths(activeView.columns))
      || JSON.stringify(sortLevels) !== JSON.stringify(viewSortLevels(activeView));
  }, [columns, sortLevels, activeView]);

  async function deleteSavedView(view: ViewDef) {
    if (view.builtin) return;
    if (!confirm(`Delete view "${view.name}"?`)) return;
    if (view.id.startsWith('public-')) {
      const res = await fetch('/api/contract-team-reporting/views', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: view.id }),
      });
      if (res.ok) await fetchPublicViews();
    } else {
      setPersonalViews((prev) => prev.filter((v) => v.id !== view.id));
    }
    if (activeViewId === view.id) {
      setActiveViewId('builtin-bp');
      localStorage.setItem('ctr-view-id', 'builtin-bp');
    }
  }

  function setColumnSetting(key: string, patch: Partial<Pick<ColumnDef, 'color' | 'endStateValues'>>) {
    setColumns((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  // Persist personal views
  useEffect(() => {
    localStorage.setItem('ctr-personal-views', JSON.stringify(personalViews));
  }, [personalViews]);

  // Load public views from the server
  const fetchPublicViews = useCallback(async () => {
    try {
      const res = await fetch('/api/contract-team-reporting/views');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.views)) setPublicViews(data.views);
    } catch { /* server views unavailable — personal + builtin still work */ }
  }, []);
  useEffect(() => { fetchPublicViews(); }, [fetchPublicViews]);

  // View menu drag-sort order (per browser)
  const [viewOrder, setViewOrder] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ctr-view-order');
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return {};
  });
  useEffect(() => {
    localStorage.setItem('ctr-view-order', JSON.stringify(viewOrder));
  }, [viewOrder]);
  const [draggedViewId, setDraggedViewId] = useState<string | null>(null);

  const selectView = useCallback((view: ViewDef) => {
    setBuilderDraft(false);
    setActiveViewId(view.id);
    localStorage.setItem('ctr-view-id', view.id);
    setColumns(view.columns);
    setSortLevels(viewSortLevels(view));
    setExcludedFilters({});
    setTextExcludeFilters({});
    setTextIncludeFilters({});
    setFilterSearch({});
    setActivePreset('none');
    setShowViewMenu(false);
  }, []);


  // Export
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Sort dialog (Excel-style, reachable any time from the toolbar).
  // It floats and can be dragged anywhere, so it never covers the column
  // headers you are trying to read while building the sort.
  const [showSortDialog, setShowSortDialog] = useState(false);
  const SORT_DIALOG_WIDTH = 520;
  const [sortDialogPos, setSortDialogPos] = useState<{ x: number; y: number } | null>(null);
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const sortDragOffset = useRef<{ dx: number; dy: number } | null>(null);

  // Restore the last position the user dragged it to
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ctr-sort-dialog-pos');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') setSortDialogPos(p);
      }
    } catch { /* ignore */ }
  }, []);

  const clampToViewport = useCallback((x: number, y: number) => ({
    x: Math.max(4, Math.min(x, window.innerWidth - SORT_DIALOG_WIDTH - 4)),
    // Keep at least the drag bar on screen
    y: Math.max(4, Math.min(y, window.innerHeight - 40)),
  }), []);

  const openSortDialog = useCallback(() => {
    setShowSortDialog((open) => {
      if (open) return false;
      // First open: drop it just under the Sort button, then it stays where the
      // user last dragged it.
      setSortDialogPos((pos) => {
        if (pos) return pos;
        const r = sortBtnRef.current?.getBoundingClientRect();
        return clampToViewport(r ? r.left : 100, r ? r.bottom + 6 : 100);
      });
      return true;
    });
  }, [clampToViewport]);

  const startSortDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const panel = (e.currentTarget.closest('[data-sort-dialog]') as HTMLElement | null);
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    sortDragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };

    const onMove = (ev: PointerEvent) => {
      const off = sortDragOffset.current;
      if (!off) return;
      setSortDialogPos(clampToViewport(ev.clientX - off.dx, ev.clientY - off.dy));
    };
    const onUp = () => {
      sortDragOffset.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setSortDialogPos((pos) => {
        if (pos) localStorage.setItem('ctr-sort-dialog-pos', JSON.stringify(pos));
        return pos;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [clampToViewport]);

  const t = THEMES[theme];

  // Persist theme
  useEffect(() => { localStorage.setItem('ctr-theme', theme); }, [theme]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenFilterDropdown(null);
        setShowColumnMenu(false);
        setShowExportMenu(false);
        setShowViewMenu(false);
        setShowViewBuilder(false);
        setExpandedCell(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Grace period: GHL's search API is eventually consistent, so a background
  // refresh shortly after a save can return STALE values and visually revert
  // the change (even though the write succeeded). We remember what was saved
  // per record and overlay it on refreshed data for a grace window.
  const SAVE_GRACE_MS = 120000; // 2 minutes
  const recentlySaved = useRef<Map<string, { at: number; values: Partial<OpportunityRecord> }>>(new Map());

  // Fetch data
  const [refreshing, setRefreshing] = useState(false);
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch('/api/contract-team-reporting');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let incoming: OpportunityRecord[] = Array.isArray(data) ? data : [];
      // Overlay recently saved values so stale GHL search results can't revert them
      const now = Date.now();
      for (const [id, entry] of Array.from(recentlySaved.current.entries())) {
        if (now - entry.at > SAVE_GRACE_MS) {
          recentlySaved.current.delete(id);
        }
      }
      if (recentlySaved.current.size > 0) {
        incoming = incoming.map((r) => {
          const entry = recentlySaved.current.get(r.id);
          return entry ? ({ ...r, ...entry.values } as OpportunityRecord) : r;
        });
      }
      setRecords(incoming);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Pause auto-refresh when the tab is hidden or the user is idle 30+ min
  // (saves Vercel compute / GHL rate limit overnight). Resuming triggers a
  // fresh load so nobody works from stale data.
  const { isPaused, pausedByIdle } = useAutoRefreshPause(() => fetchData(true));
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  useEffect(() => {
    fetchData();
    // Full refresh every 60s (skipped while paused)
    intervalRef.current = setInterval(() => {
      if (!isPausedRef.current) fetchData(true);
    }, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Live GHL schema — fetched on load and re-checked hourly, so new dropdown
  // values / field types picked up in GHL flow into the tool automatically.
  const [schemaInfo, setSchemaInfo] = useState<{ fetchedAt: string; newFieldCount: number } | null>(null);
  const fetchSchema = useCallback(async () => {
    try {
      const res = await fetch('/api/contract-team-reporting/schema');
      if (!res.ok) return;
      const data = await res.json();
      const types: Record<string, string> = {};
      const options: Record<string, OptionPair[] | null> = {};
      for (const f of data.opportunityFields || []) {
        if (!f.key) continue;
        types[f.key] = f.dataType;
        options[f.key] = f.options;
      }
      for (const f of data.propertyFields || []) {
        if (!f.key) continue;
        types[`co_${f.key}`] = f.dataType;
        options[`co_${f.key}`] = f.options;
      }
      const newFieldCount = (data.newOpportunityFields?.length || 0) + (data.newPropertyFields?.length || 0);
      LIVE_SCHEMA = { fetchedAt: data.fetchedAt, types, options, newFieldCount };
      setSchemaInfo({ fetchedAt: data.fetchedAt, newFieldCount });
    } catch { /* fall back to baked-in maps */ }
  }, []);

  useEffect(() => {
    fetchSchema();
    const schemaInterval = setInterval(() => {
      if (!isPausedRef.current) fetchSchema();
    }, 60 * 60 * 1000);
    return () => clearInterval(schemaInterval);
  }, [fetchSchema]);

  // Persist column layout (keys, order, widths)
  useEffect(() => {
    localStorage.setItem('ctr-columns', JSON.stringify(columns));
  }, [columns]);

  // Internal duplicate keys hidden from the column chooser (the API returns
  // these twice under different names for backwards compatibility):
  //   opportunityName = duplicate of name ("Opportunity Name")
  //   stage           = duplicate of pipelineStage
  //   assignedTo      = duplicate of owner (both resolve to the opportunity owner)
  const CHOOSER_HIDDEN_KEYS = new Set(['opportunityName', 'stage', 'assignedTo']);

  // All available fields for the report builder (union of record keys)
  const allAvailableKeys = useMemo(() => {
    const keys = new Set<string>();
    records.forEach((r) => Object.keys(r).forEach((k) => keys.add(k)));
    CHOOSER_HIDDEN_KEYS.forEach((k) => keys.delete(k));
    return Array.from(keys).sort((a, b) => getReportFieldLabel(a).localeCompare(getReportFieldLabel(b)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  const [columnMenuSearch, setColumnMenuSearch] = useState('');

  const toggleColumn = useCallback((key: string) => {
    setColumns((prev) => {
      const exists = prev.some((c) => c.key === key);
      if (exists) return prev.filter((c) => c.key !== key);
      return [...prev, { key, label: getReportFieldLabel(key), width: 120 }];
    });
  }, []);


  // ============================================================================
  // EDIT MODE
  // ============================================================================

  function getEditValue(recordId: string, key: RecordKey): string {
    return editedRows[recordId]?.[key] ?? records.find((r) => r.id === recordId)?.[key] ?? '';
  }

  function setEditValue(recordId: string, key: RecordKey, value: string) {
    setEditedRows((prev) => ({
      ...prev,
      [recordId]: { ...prev[recordId], [key]: value },
    }));
  }

  function hasEdits(recordId: string): boolean {
    const edits = editedRows[recordId];
    if (!edits) return false;
    const original = records.find((r) => r.id === recordId);
    if (!original) return false;
    return Object.entries(edits).some(([k, v]) => v !== original[k as RecordKey]);
  }

  async function saveRow(recordId: string) {
    const edits = editedRows[recordId];
    if (!edits) return;
    const original = records.find((r) => r.id === recordId);
    if (!original) return;

    const changes: Record<string, any> = {};
    // Send every edited field that isn't read-only; the update API maps
    // friendly names to GHL field IDs and safely ignores anything unwritable.
    for (const [key, newVal] of Object.entries(edits)) {
      if (READ_ONLY_FIELDS.has(key) || key === 'assignedTo') continue;
      if (CO_FIELDS_READ_ONLY && key.startsWith(CO_PREFIX)) continue;
      if (newVal !== undefined && newVal !== original[key]) {
        changes[key] = newVal;
      }
    }

    const assignedTo = edits.assignedTo !== undefined && edits.assignedTo !== original.assignedTo ? edits.assignedTo : undefined;

    if (Object.keys(changes).length === 0 && assignedTo === undefined) return;

    setSavingIds((prev) => new Set(prev).add(recordId));
    try {
      const res = await fetch('/api/contract-team-reporting/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityId: recordId,
          changes,
          assignedTo,
          propertyRecordId: original['co_record_id'] || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Save failed: ${data.error || res.status}`);
      } else {
        // Remember what was saved so background refreshes can't visually revert
        // it while GHL's search index catches up (merge with any prior saves)
        const prior = recentlySaved.current.get(recordId);
        recentlySaved.current.set(recordId, {
          at: Date.now(),
          values: { ...(prior?.values || {}), ...edits },
        });
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? ({ ...r, ...edits } as OpportunityRecord) : r))
        );
        setEditedRows((prev) => {
          const next = { ...prev };
          delete next[recordId];
          return next;
        });
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(recordId); return s; });
    }
  }

  async function saveAllEdits() {
    const idsToSave = Object.keys(editedRows).filter(hasEdits);
    for (const id of idsToSave) {
      await saveRow(id);
    }
  }

  function discardAllEdits() {
    setEditedRows({});
  }

  // ============================================================================
  // SORT
  // ============================================================================

  // Plain click = set/cycle the primary sort and drop the other levels.
  // Shift-click = add the column as the next level, or flip/remove it if it is
  // already one. Mirrors Excel's "sort by A, then by D".
  const handleSort = useCallback((column: RecordKey, additive = false) => {
    setSortLevels((prev) => {
      const at = prev.findIndex((l) => l.column === column);

      if (additive) {
        if (at === -1) return [...prev, { column, dir: 'asc' }];
        const next = [...prev];
        // asc -> desc -> remove this level
        if (next[at].dir === 'asc') { next[at] = { column, dir: 'desc' }; return next; }
        next.splice(at, 1);
        return next;
      }

      // asc -> desc -> unsorted, same as before layered sorting existed
      if (at === 0 && prev.length === 1) {
        if (prev[0].dir === 'asc') return [{ column, dir: 'desc' }];
        return [];
      }
      return [{ column, dir: 'asc' }];
    });
  }, []);

  const setPrimarySort = useCallback((column: RecordKey, dir: 'asc' | 'desc') => {
    setSortLevels([{ column, dir }]);
  }, []);

  const moveSortLevel = useCallback((from: number, to: number) => {
    setSortLevels((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // Order labels follow the column type, the way Excel's Sort dialog does.
  function orderLabels(column: RecordKey): { asc: string; desc: string } {
    if (isDateField(column)) return { asc: 'Oldest to Newest', desc: 'Newest to Oldest' };
    return { asc: 'A to Z', desc: 'Z to A' };
  }

  // Excel's Sort dialog, minus the parts that don't apply to us: there is no
  // "Sort On" (we only ever sort on the value) and no "My data has headers".
  // Add / copy / delete / reorder sit on each row instead of acting on a
  // selected row, which removes a hidden bit of state.
  function renderSortLevelEditor() {
    const btn = `text-[11px] px-1 ${t.headerText} hover:text-blue-400 disabled:opacity-25 disabled:hover:text-current`;
    return (
      <>
        <div className={`grid grid-cols-[auto_1fr_auto_auto] gap-1 items-center text-[9px] ${t.headerText} opacity-60 mb-0.5`}>
          <span />
          <span>Column</span>
          <span>Order</span>
          <span />
        </div>

        {sortLevels.length === 0 && (
          <div className={`text-[10px] ${t.headerText} opacity-60 mb-1`}>
            No sort — records appear in the order GHL returns them.
          </div>
        )}

        {sortLevels.map((level, i) => {
          const labels = orderLabels(level.column);
          return (
            <div key={`sort-level-${i}`} className="grid grid-cols-[auto_1fr_auto_auto] gap-1 items-center mb-1">
              <span className={`text-[9px] ${t.headerText} w-12 shrink-0`}>{i === 0 ? 'Sort by' : 'Then by'}</span>

              <select
                value={level.column}
                onChange={(e) => setSortLevels((prev) => prev.map((l, idx) => (idx === i ? { ...l, column: e.target.value as RecordKey } : l)))}
                className={`min-w-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText}`}
              >
                {allAvailableKeys.map((k) => (
                  <option key={k} value={k}>{getReportFieldLabel(k)}</option>
                ))}
              </select>

              <select
                value={level.dir}
                onChange={(e) => setSortLevels((prev) => prev.map((l, idx) => (idx === i ? { ...l, dir: e.target.value as 'asc' | 'desc' } : l)))}
                className={`text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText}`}
              >
                <option value="asc">{labels.asc}</option>
                <option value="desc">{labels.desc}</option>
              </select>

              <span className="flex items-center">
                <button onClick={() => moveSortLevel(i, i - 1)} disabled={i === 0} title="Move level up" className={btn}>↑</button>
                <button onClick={() => moveSortLevel(i, i + 1)} disabled={i === sortLevels.length - 1} title="Move level down" className={btn}>↓</button>
                <button
                  onClick={() => setSortLevels((prev) => [...prev.slice(0, i + 1), { ...prev[i] }, ...prev.slice(i + 1)])}
                  title="Copy level"
                  className={btn}
                >
                  ⧉
                </button>
                <button
                  onClick={() => setSortLevels((prev) => prev.filter((_, idx) => idx !== i))}
                  title="Delete level"
                  className="text-[11px] px-1 text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </span>
            </div>
          );
        })}

        <button
          onClick={() => setSortLevels((prev) => [
            ...prev,
            { column: (columns.find((c) => !prev.some((l) => l.column === c.key))?.key || columns[0]?.key || 'name') as RecordKey, dir: 'asc' },
          ])}
          className={`text-[10px] ${t.headerText} hover:text-blue-400 mt-0.5`}
        >
          + Add level
        </button>
      </>
    );
  }

  // ============================================================================
  // FILTERS
  // ============================================================================

  const toggleExcludeFilter = useCallback((column: RecordKey, value: string) => {
    setExcludedFilters((prev) => {
      const current = new Set(prev[column] || []);
      if (current.has(value)) { current.delete(value); } else { current.add(value); }
      return { ...prev, [column]: current };
    });
  }, []);

  const selectAllFilter = useCallback((column: RecordKey) => {
    setExcludedFilters((prev) => { const updated = { ...prev }; delete updated[column]; return updated; });
  }, []);

  const clearAllFilter = useCallback((column: RecordKey) => {
    const allValues = new Set<string>();
    records.forEach((r) => { allValues.add(getDisplayValue(r, column) || '(blank)'); });
    setExcludedFilters((prev) => ({ ...prev, [column]: allValues }));
  }, [records]);

  // ============================================================================
  // COLUMN DRAG & RESIZE
  // ============================================================================

  const handleDragStart = (index: number) => { setDraggedColumn(index); };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === index) return;
    const newCols = [...columns];
    const dragged = newCols[draggedColumn];
    newCols.splice(draggedColumn, 1);
    newCols.splice(index, 0, dragged);
    setDraggedColumn(index);
    setColumns(newCols);
  };
  const handleDragEnd = () => { setDraggedColumn(null); };

  const handleResizeStart = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(index);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columns[index].width;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - resizeStartX.current;
      const newWidth = Math.max(40, resizeStartWidth.current + diff);
      setColumns((prev) => { const u = [...prev]; u[index] = { ...u[index], width: newWidth }; return u; });
    };
    const handleMouseUp = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // ============================================================================
  // DISPLAY HELPERS
  // ============================================================================

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  }

  function getDisplayValue(record: OpportunityRecord, key: RecordKey): string {
    const raw = record[key] || '';
    if (key === 'assignedTo' || key === 'assignedBA') return USER_MAP[raw] || raw;
    if (isDateField(key)) return formatDate(raw);
    // Custom object dropdowns store keys (e.g. "split_contract") — show labels
    if (key.startsWith(CO_PREFIX)) return displayLabelFor(key, raw);
    return raw;
  }

  // Records the active view actually shows, before any ad-hoc grid filtering.
  const viewScopedRecords = useMemo(
    () => applyViewFilters(records, effectiveView.filters),
    [records, effectiveView]
  );

  // Values offered in a column's filter dropdown. Scoped to the view's own data —
  // Full F&C only lists Construction/Finance stages, not every stage in GHL — and
  // narrowed further by filters on OTHER columns, but never by this column's own
  // filter, so you can still widen your selection (same as Excel).
  const getUniqueValues = useCallback((column: RecordKey): string[] => {
    const values = new Set<string>();
    for (const r of viewScopedRecords) {
      let passesOthers = true;
      for (const [key, set] of Object.entries(excludedFilters)) {
        if (key === column || !set || (set as Set<string>).size === 0) continue;
        if ((set as Set<string>).has(getDisplayValue(r, key as RecordKey) || '(blank)')) { passesOthers = false; break; }
      }
      if (passesOthers) {
        for (const [key, patterns] of Object.entries(textExcludeFilters)) {
          if (key === column || !patterns || patterns.length === 0) continue;
          const dv = getDisplayValue(r, key as RecordKey).toLowerCase();
          if (patterns.some((p) => p && dv.includes(p.toLowerCase()))) { passesOthers = false; break; }
        }
      }
      if (passesOthers) {
        for (const [key, pattern] of Object.entries(textIncludeFilters)) {
          if (key === column || !pattern || !pattern.trim()) continue;
          if (!getDisplayValue(r, key as RecordKey).toLowerCase().includes(pattern.toLowerCase().trim())) { passesOthers = false; break; }
        }
      }
      if (passesOthers) values.add(getDisplayValue(r, column) || '(blank)');
    }
    return Array.from(values).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewScopedRecords, excludedFilters, textExcludeFilters, textIncludeFilters]);

  // Apply filters (effectiveView = live builder preview when it's open)
  const filteredRecords = useMemo(() => {
    return viewScopedRecords.filter((record) => {
      // Preset filter logic
      if (activePreset === 'blankPropertyType') {
        if (record.pipelineStage === 'Settled') return false;
        if ((record.typeOfProperty || '').trim() !== '') return false;
      } else if (activePreset === 'blankBpDueDate') {
        if ((record.bpDueDate || '').trim() !== '') return false;
      } else if (activePreset === 'blankBpRequested') {
        if ((record.bpRequested || '').trim() !== '') return false;
      } else if (activePreset === 'bpDueNext5') {
        const raw = record.bpDueDate;
        if (!raw) return false;
        const d = new Date(raw);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in5 = new Date(now);
        in5.setDate(in5.getDate() + 5);
        if (d < now || d > in5) return false;
      } else if (activePreset === 'settlementNext5') {
        const raw = record.confirmedSettlementDate;
        if (!raw) return false;
        const d = new Date(raw);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const in5 = new Date(now);
        in5.setDate(in5.getDate() + 5);
        if (d < now || d > in5) return false;
      }

      // Check excluded value filters
      const passesExcluded = Object.entries(excludedFilters).every(([key, excludedSet]) => {
        if (!excludedSet || (excludedSet as Set<string>).size === 0) return true;
        const displayValue = getDisplayValue(record, key as RecordKey) || '(blank)';
        return !(excludedSet as Set<string>).has(displayValue);
      });
      if (!passesExcluded) return false;

      // Check text exclude filters (does not contain)
      const passesTextExclude = Object.entries(textExcludeFilters).every(([key, patterns]) => {
        if (!patterns || patterns.length === 0) return true;
        const displayValue = getDisplayValue(record, key as RecordKey).toLowerCase();
        return patterns.every((p) => !displayValue.includes(p.toLowerCase()));
      });
      if (!passesTextExclude) return false;

      // Check text include filters (contains)
      return Object.entries(textIncludeFilters).every(([key, pattern]) => {
        if (!pattern || !pattern.trim()) return true;
        return getDisplayValue(record, key as RecordKey).toLowerCase().includes(pattern.toLowerCase().trim());
      });
    });
  }, [viewScopedRecords, excludedFilters, textExcludeFilters, textIncludeFilters, activePreset]);

  // Apply sort — every level in turn, so level 2 breaks ties on level 1, etc.
  const sortedRecords = useMemo(() => {
    if (sortLevels.length === 0) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      for (const level of sortLevels) {
        const result = compareOnColumn(a, b, level);
        if (result !== 0) return result;
      }
      return 0;
    });

    function compareOnColumn(a: Record<string, unknown>, b: Record<string, unknown>, level: SortLevel): number {
      const sortColumn = level.column;
      const aVal = getDisplayValue(a as never, sortColumn);
      const bVal = getDisplayValue(b as never, sortColumn);

      // Empty values always sort to the bottom
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      let compare: number;
      if (isDateField(sortColumn)) {
        // Parse DD/MM/YYYY or YYYY-MM-DD
        const parseDate = (v: string) => {
          if (v.includes('/')) {
            const [d, m, y] = v.split('/');
            return new Date(`${y}-${m}-${d}`).getTime() || 0;
          }
          return new Date(v).getTime() || 0;
        };
        compare = parseDate(aVal) - parseDate(bVal);
      } else {
        compare = aVal.localeCompare(bVal);
      }
      return level.dir === 'asc' ? compare : -compare;
    }
  }, [filteredRecords, sortLevels]);

  // ============================================================================
  // EXPORT
  // ============================================================================

  const exportToCSV = (exportAll: boolean) => {
    const source = exportAll ? records : sortedRecords;
    const headers = columns.map((c) => c.label);
    const rows = source.map((r) =>
      columns.map((c) => {
        const val = getDisplayValue(r, c.key);
        if (val.includes(',') || val.includes('"') || val.includes('\n')) return `"${val.replace(/"/g, '""')}"`;
        return val;
      })
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract-team-reporting-${exportAll ? 'all' : 'filtered'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Email gate — must verify before using the tool
  if (emailChecked && !userEmail) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="w-[400px] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <img src="/logo.jpg" alt="Buyers Club" className="h-8 w-auto" />
            <h1 className="text-lg font-bold text-gray-100">Contract Team Reporting Tool</h1>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Please enter your individual @buyersclub.com.au email address to continue.
            Shared email accounts (Properties@, Packaging@) are not allowed.
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            setEmailError(null);
            const validation = validateUserEmail(emailInput);
            if (!validation.isValid) {
              setEmailError(validation.error || 'Invalid email');
              return;
            }
            if (saveUserEmail(validation.email!)) {
              setUserEmail(validation.email!);
            } else {
              setEmailError('Failed to save email');
            }
          }}>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailError(null); }}
              placeholder="your.name@buyersclub.com.au"
              className="w-full px-3 py-2 mb-2 text-sm bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
              required
            />
            {emailError && <p className="text-red-400 text-xs mb-2">{emailError}</p>}
            <button type="submit" className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm font-medium">
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading Contract Team Reporting Tool...</p>
        </div>
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error: {error}</p>
          <button onClick={() => fetchData()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
        </div>
      </div>
    );
  }

  const editedCount = Object.keys(editedRows).filter(hasEdits).length;

  return (
    <div className={`h-screen flex flex-col ${t.bg} ${t.text}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${t.headerBg} border-b ${t.cellBorder}`}>
        <div className="flex items-center gap-4">
          <img
            src="/logo.jpg"
            alt="Buyers Club"
            className="h-7 w-auto cursor-default select-none"
            onDoubleClick={(e) => { if (e.shiftKey) setShowEditButton((prev) => { const next = !prev; localStorage.setItem('ctr-edit-visible', String(next)); return next; }); }}
          />
          <h1 className="text-lg font-bold">Contract Team Reporting Tool</h1>
          <span className="text-xs opacity-60">{sortedRecords.length} records</span>

          {/* Edit Mode toggle (hidden — Shift+double-click logo to reveal) */}
          {showEditButton && (
            <>
              <button
                onClick={() => {
                  if (editMode) {
                    if (editedCount > 0) {
                      if (!confirm(`You have ${editedCount} unsaved changes. Discard?`)) return;
                      discardAllEdits();
                    }
                    setEditMode(false);
                    setSelectedRowId(null);
                    setMultiSelectMode(false);
                    setSelectedRowIds(new Set());
                  } else {
                    setEditMode(true);
                  }
                }}
                onDoubleClick={(e) => {
                  if (e.shiftKey && editMode) {
                    setMultiSelectMode((prev) => !prev);
                    if (!multiSelectMode) {
                      if (selectedRowId) {
                        setSelectedRowIds(new Set([selectedRowId]));
                        setSelectedRowId(null);
                      }
                    } else {
                      setSelectedRowIds(new Set());
                    }
                  }
                }}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  editMode ? 'bg-yellow-500 text-black' : `${t.inputBg} ${t.headerText} hover:opacity-80`
                }`}
              >
                {editMode ? (multiSelectMode ? '⚡ Multi-Edit' : 'Exit Edit Mode') : 'Edit Mode'}
              </button>

              {/* Save (visible when selected row(s) have edits) */}
              {editMode && !multiSelectMode && selectedRowId && hasEdits(selectedRowId) && (
                <button
                  onClick={() => saveRow(selectedRowId)}
                  className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
                >
                  Save
                </button>
              )}
              {editMode && multiSelectMode && Array.from(selectedRowIds).some(id => hasEdits(id)) && (
                <button
                  onClick={() => {
                    const toSave = Array.from(selectedRowIds).filter(id => hasEdits(id));
                    toSave.forEach(id => saveRow(id));
                  }}
                  className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
                >
                  Save All ({Array.from(selectedRowIds).filter(id => hasEdits(id)).length})
                </button>
              )}
            </>
          )}
          {/* Preset filter buttons — only relevant to the B&P & Finance view */}
          {activeView.name === 'B&P' && (['none', 'blankPropertyType', 'blankBpDueDate', 'blankBpRequested', 'bpDueNext5', 'settlementNext5'] as PresetFilter[]).map((preset) => {
            const labels: Record<PresetFilter, string> = {
              none: 'All *',
              blankPropertyType: 'Blank P-type',
              blankBpDueDate: 'No B&P Date',
              blankBpRequested: 'No B&P Req',
              bpDueNext5: 'B&P Due 5d',
              settlementNext5: 'Settle 5d',
            };
            const isActive = activePreset === preset;
            return (
              <button
                key={preset}
                onClick={() => {
                  setActivePreset(preset);
                }}
                className={`px-2 py-1 rounded text-xs ${
                  isActive ? 'bg-blue-600 text-white' : `${t.inputBg} ${t.headerText} hover:opacity-80`
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">

          {/* Preset Views (from Contract Team Reports Tool) */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
            >
              View: {activeView.name}
              {showColumnBuilder && hasUnsavedViewChanges && (
                <span className="ml-1 text-amber-400" title="This view has unsaved layout changes — open the View Builder to save or update">●</span>
              )}
              {' '}▼
            </button>
            {showViewMenu && (
              <div className={`absolute top-full left-0 mt-1 w-64 max-h-[70vh] overflow-y-auto ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                {VIEW_SECTIONS.map((section) => {
                  const sectionViews = allViews
                    .filter((v) => v.section === section)
                    .sort((a, b) => (viewOrder[a.id] ?? 999) - (viewOrder[b.id] ?? 999));
                  if (sectionViews.length === 0) return null;
                  return (
                    <div key={section}>
                      <div className={`px-3 pt-1.5 pb-0.5 text-[9px] font-bold uppercase opacity-60 ${t.headerText}`}>
                        {section} reports
                      </div>
                      {sectionViews.map((view) => (
                        <div
                          key={view.id}
                          draggable
                          onDragStart={() => setDraggedViewId(view.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (!draggedViewId || draggedViewId === view.id) return;
                            const ordered = sectionViews.map((v) => v.id).filter((id) => id !== draggedViewId);
                            const targetIdx = ordered.indexOf(view.id);
                            ordered.splice(targetIdx, 0, draggedViewId);
                            setViewOrder((prev) => {
                              const next = { ...prev };
                              ordered.forEach((id, i) => { next[id] = i; });
                              return next;
                            });
                          }}
                          onDragEnd={() => setDraggedViewId(null)}
                          className={`flex items-center group ${t.hoverBg}`}
                        >
                          <button
                            onClick={() => selectView(view)}
                            className={`flex-1 text-left px-3 py-1.5 text-xs ${t.text} ${activeViewId === view.id ? 'font-bold' : ''}`}
                          >
                            <span className="opacity-40 mr-1.5 cursor-grab">⠿</span>
                            {view.name}
                            {view.id.startsWith('personal-') && <span className="ml-1 text-[8px] opacity-50">(personal)</span>}
                          </button>
                          {!view.builtin && showColumnBuilder && (
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteSavedView(view); }}
                              className="px-2 text-[10px] text-red-400 opacity-0 group-hover:opacity-100 hover:underline"
                              title="Delete view"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* New Report — clean slate, nothing inherited */}
          {showColumnBuilder && (
            <button
              onClick={startNewReport}
              className={`px-2 py-1 rounded text-xs ${builderDraft ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
              title="Start a brand-new report from scratch — no columns, filters or pipelines inherited from the current view"
            >
              + New Report
            </button>
          )}

          {/* View Builder (single panel: columns, pipelines, colours, save)
              — hidden; Shift+double-click ⚙ to reveal */}
          {showColumnBuilder && (
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowViewBuilder(!showViewBuilder)}
              className={`px-2 py-1 rounded text-xs ${showViewBuilder ? 'bg-blue-600 text-white' : `${t.inputBg} ${t.headerText} hover:opacity-80`}`}
            >
              View Builder{hasUnsavedViewChanges ? ' ●' : ''} ▼
            </button>
            {showViewBuilder && (
              <div className={`absolute top-full left-0 mt-1 w-[420px] max-h-[80vh] overflow-y-auto ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-3`}>
                <div className={`text-[9px] ${t.headerText} opacity-70 mb-2`}>
                  {builderDraft
                    ? <span className="font-bold text-amber-400">Building a NEW report (not saved yet)</span>
                    : <>Editing layout of: <span className="font-bold">{activeView.name}</span>
                      {hasUnsavedViewChanges && <span className="text-amber-400 font-bold"> — unsaved changes</span>}</>}
                </div>

                {/* 1. Columns */}
                <div className={`text-[10px] font-bold ${t.headerText} mb-1`}>1. REPORT COLUMNS ({columns.length} shown)</div>
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={columnMenuSearch}
                  onChange={(e) => setColumnMenuSearch(e.target.value)}
                  className={`w-full px-1.5 py-0.5 mb-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                />
                <div className="flex gap-2 mb-1 px-1">
                  <button
                    onClick={() => setColumns(activeView.columns)}
                    className="text-[9px] text-blue-400 hover:underline"
                  >
                    Reset to view default
                  </button>
                  <button
                    onClick={() => setColumns([])}
                    className="text-[9px] text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto mb-1 border-b border-gray-600/40 pb-1">
                {([
                  ['opportunity', 'OPPORTUNITY FIELDS', 'text-blue-400'],
                  ['custom-object', 'CUSTOM OBJECT FIELDS', 'text-green-400'],
                  ['custom-object-other', 'OTHER CUSTOM OBJECT FIELDS', 'text-gray-400'],
                ] as [FieldSource, string, string][]).map(([source, heading, colour]) => {
                  const sectionKeys = allAvailableKeys
                    .filter((k) => getFieldSource(k) === source)
                    .filter((k) => {
                      if (!columnMenuSearch) return true;
                      const q = columnMenuSearch.toLowerCase();
                      return k.toLowerCase().includes(q) || getReportFieldLabel(k).toLowerCase().includes(q);
                    })
                    .sort((a, b) => getReportFieldLabel(a).localeCompare(getReportFieldLabel(b)));
                  if (sectionKeys.length === 0) return null;
                  return (
                    <div key={source} className="mb-1">
                      <div className={`text-[9px] font-bold ${colour} px-1 pt-1 pb-0.5 border-b ${t.inputBorder} mb-0.5`}>{heading}</div>
                      {sectionKeys.map((key) => {
                        const isShown = columns.some((c) => c.key === key);
                        return (
                          <label key={key} className={`flex items-center gap-1.5 px-1 py-0.5 text-[10px] ${colour} cursor-pointer rounded ${t.hoverBg}`}>
                            <input
                              type="checkbox"
                              checked={isShown}
                              onChange={() => toggleColumn(key)}
                              className="w-2.5 h-2.5"
                            />
                            <span className="truncate">{getReportFieldLabel(key)}</span>
                          </label>
                        );
                      })}
                    </div>
                  );
                })}
                </div>

                {/* 2. Pipelines & stages */}
                <div className={`text-[10px] font-bold ${t.headerText} mb-1`}>2. PIPELINES & STAGES</div>
                <div className={`text-[9px] ${t.headerText} opacity-60 mb-1`}>Nothing ticked = all pipelines / all stages</div>
                {ghlPipelines.length === 0 && <div className={`text-[10px] ${t.headerText}`}>Loading pipelines…</div>}
                {ghlPipelines.map((p) => (
                  <div key={p.id} className="mb-1">
                    <label className={`flex items-center gap-1.5 text-[10px] font-medium ${t.headerText} cursor-pointer`}>
                      <input
                        type="checkbox"
                        checked={builderPipelines.has(p.id)}
                        onChange={() => {
                          const adding = !builderPipelines.has(p.id);
                          setBuilderPipelines((prev) => {
                            const next = new Set(prev);
                            if (adding) { next.add(p.id); } else { next.delete(p.id); }
                            return next;
                          });
                          // Ticking a pipeline ticks all its stages (then untick the ones
                          // you don't want); unticking clears its stages.
                          setBuilderStages((prev) => {
                            const next = new Set(prev);
                            for (const s of p.stages) {
                              if (adding) { next.add(s.name); } else { next.delete(s.name); }
                            }
                            return next;
                          });
                        }}
                        className="w-2.5 h-2.5"
                      />
                      {p.name}
                    </label>
                    <div className="pl-5 flex flex-wrap gap-x-3">
                      {p.stages.map((s) => (
                        <label key={s.id} className={`flex items-center gap-1 text-[9px] ${t.headerText} cursor-pointer`}>
                          <input
                            type="checkbox"
                            checked={builderStages.has(s.name)}
                            onChange={() => {
                              setBuilderStages((prev) => {
                                const next = new Set(prev);
                                if (next.has(s.name)) { next.delete(s.name); } else { next.add(s.name); }
                                return next;
                              });
                            }}
                            className="w-2 h-2"
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 3. Field filters — inherited, promoted from the grid, or added here */}
                <div className={`text-[10px] font-bold ${t.headerText} mt-3 mb-1 border-t ${t.inputBorder} pt-2`}>3. FIELD FILTERS</div>
                <div className={`text-[9px] ${t.headerText} opacity-60 mb-1`}>
                  Anything you filtered from the column headers appears here and is saved with the view.
                  Filters inherited from &quot;{activeView.name}&quot; are listed too — remove what doesn&apos;t belong.
                </div>
                {builderExtraFilters.length === 0 && (
                  <div className={`text-[10px] ${t.headerText} opacity-60 mb-1`}>No field filters.</div>
                )}
                {builderExtraFilters.map((f, idx) => (
                  <div key={`filter-${idx}`} className="flex items-center gap-1 mb-1">
                    <select
                      value={f.field}
                      onChange={(e) => setBuilderExtraFilters((prev) => prev.map((x, i) => (i === idx ? { ...x, field: e.target.value as RecordKey } : x)))}
                      className={`flex-1 min-w-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText}`}
                    >
                      {allAvailableKeys.map((k) => (
                        <option key={k} value={k}>{getReportFieldLabel(k)}</option>
                      ))}
                    </select>
                    <select
                      value={f.operator}
                      onChange={(e) => setBuilderExtraFilters((prev) => prev.map((x, i) => (i === idx ? { ...x, operator: e.target.value as ViewFilter['operator'] } : x)))}
                      className={`text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText}`}
                    >
                      {(['contains', 'not contains', 'equals', 'not equals', 'in', 'not in', 'is blank', 'not blank'] as ViewFilter['operator'][]).map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    {f.operator !== 'is blank' && f.operator !== 'not blank' && (
                      <input
                        type="text"
                        value={f.value}
                        placeholder={f.operator === 'in' || f.operator === 'not in' ? 'a, b, c' : 'value'}
                        onChange={(e) => setBuilderExtraFilters((prev) => prev.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))}
                        className={`w-28 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText} placeholder-gray-500 focus:outline-none`}
                      />
                    )}
                    <button
                      onClick={() => setBuilderExtraFilters((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-[11px] px-1 text-red-400 hover:text-red-300"
                      title="Remove this filter"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setBuilderExtraFilters((prev) => [...prev, { field: (columns[0]?.key || 'name') as RecordKey, operator: 'contains', value: '' }])}
                  className={`text-[10px] ${t.headerText} hover:text-blue-400 mt-0.5`}
                >
                  + Add filter
                </button>

                {/* Column colours & end states */}
                <div className={`text-[10px] font-bold ${t.headerText} mt-3 mb-1 border-t ${t.inputBorder} pt-2`}>4. COLUMN COLOURS & END STATES</div>
                {columns.map((col) => (
                  <div key={col.key} className="mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setBuilderColorCol(builderColorCol === col.key ? null : col.key)}
                        className={`flex-1 text-left text-[10px] ${t.headerText} hover:opacity-80 truncate`}
                      >
                        {col.label} {col.color && col.color !== 'None' ? `— ${col.color}` : ''}{col.endStateValues?.length ? ` — ${col.endStateValues.length} end state(s)` : ''}
                      </button>
                    </div>
                    {builderColorCol === col.key && (
                      <div className={`pl-2 py-1 border-l-2 ${t.inputBorder}`}>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {COLUMN_COLOURS.map((c) => (
                            <button
                              key={c.name}
                              onClick={() => setColumnSetting(col.key, { color: c.name })}
                              className={`px-1.5 py-0.5 text-[9px] rounded border ${col.color === c.name || (!col.color && c.name === 'None') ? 'border-blue-500 font-bold' : t.inputBorder} ${t.headerText}`}
                              style={{ backgroundColor: c.cell || undefined }}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                        <div className={`text-[9px] ${t.headerText} mb-0.5`}>End state values (cell goes green):</div>
                        {(DROPDOWN_FIELD_OPTIONS[col.key] || getUniqueValues(col.key).slice(0, 15)).map((val) => (
                          <label key={val} className={`flex items-center gap-1 text-[9px] ${t.headerText} cursor-pointer`}>
                            <input
                              type="checkbox"
                              checked={col.endStateValues?.includes(val) || false}
                              onChange={() => {
                                const current = new Set(col.endStateValues || []);
                                if (current.has(val)) { current.delete(val); } else { current.add(val); }
                                setColumnSetting(col.key, { endStateValues: Array.from(current) });
                              }}
                              className="w-2 h-2"
                            />
                            {val || '(blank)'}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* 5. Sort — layered, like Excel's Sort dialog */}
                <div className={`text-[10px] font-bold ${t.headerText} mt-3 mb-1 border-t ${t.inputBorder} pt-2`}>5. SORT</div>
                <div className={`text-[9px] ${t.headerText} opacity-60 mb-1`}>
                  Sorted by the first row, then ties broken by the next, and so on. You can also
                  shift-click a column header in the grid to add a level.
                </div>
                {renderSortLevelEditor()}

                {/* 6. Save — explicit choice: new view vs overwrite current */}
                <div className={`mt-3 border-t ${t.inputBorder} pt-2`}>
                  <div className={`text-[10px] font-bold ${t.headerText} mb-1`}>6. SAVE (captures current columns, pipelines/stages, filters, colours & sort)</div>
                  <input
                    type="text"
                    placeholder="View name..."
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    className={`w-full px-1.5 py-0.5 mb-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                  />
                  <div className="flex items-center gap-3 mb-2">
                    <select
                      value={builderSection}
                      onChange={(e) => setBuilderSection(e.target.value as ViewSection)}
                      className={`text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText}`}
                    >
                      {VIEW_SECTIONS.map((s) => <option key={s} value={s}>{s} reports</option>)}
                    </select>
                    <label className={`flex items-center gap-1 text-[10px] ${t.headerText} cursor-pointer`}>
                      <input type="radio" name="builderScope" checked={builderScope === 'personal'} onChange={() => setBuilderScope('personal')} className="w-2.5 h-2.5" />
                      Personal
                    </label>
                    <label className={`flex items-center gap-1 text-[10px] ${t.headerText} cursor-pointer`}>
                      <input type="radio" name="builderScope" checked={builderScope === 'public'} onChange={() => setBuilderScope('public')} className="w-2.5 h-2.5" />
                      Public (everyone)
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveAsNewView}
                      disabled={builderSaving}
                      className="flex-1 px-2 py-1.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 font-medium"
                    >
                      {builderSaving ? 'Saving…' : '+ Save as NEW view'}
                    </button>
                    <button
                      onClick={updateActiveView}
                      disabled={builderSaving || isViewProtected(activeView) || builderDraft}
                      title={builderDraft ? 'This is a new report — use Save as NEW view' : isViewProtected(activeView) ? 'Standard reports cannot be overwritten — use Save as NEW view instead' : `Overwrite "${activeView.name}" with the current layout`}
                      className="flex-1 px-2 py-1.5 text-[10px] bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-40 font-medium"
                    >
                      {builderSaving ? 'Saving…' : builderDraft ? 'Update (n/a — new report)' : `Update "${activeView.name}"`}
                    </button>
                  </div>
                  {isViewProtected(activeView) && (
                    <div className={`text-[9px] ${t.headerText} opacity-60 mt-1`}>
                      &quot;{activeView.name}&quot; is a Standard report and cannot be overwritten — save your changes as a new view.
                    </div>
                  )}
                  {activeView.builtin && !isViewProtected(activeView) && (
                    <div className={`text-[9px] ${t.headerText} opacity-60 mt-1`}>
                      &quot;{activeView.name}&quot; is a built-in Custom view. Updating it saves a shared copy that everyone sees;
                      deleting that copy restores the original.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Sort — same editor as the view builder, available without opening it.
              The panel itself is rendered outside the toolbar so it can float. */}
          <button
            ref={sortBtnRef}
            onClick={openSortDialog}
            className={`px-2 py-1 rounded text-xs hover:opacity-80 border ${
              sortLevels.length > 1
                ? 'bg-blue-600 text-white border-blue-700'
                : `${t.inputBg} ${t.headerText} ${t.inputBorder}`
            }`}
            title="Sort by one or more columns"
          >
            Sort{sortLevels.length > 1 ? ` (${sortLevels.length})` : ''} ▼
          </button>

          {/* Clear Filters */}
          <button
            onClick={() => { setExcludedFilters({}); setTextExcludeFilters({}); setTextIncludeFilters({}); setFilterSearch({}); setActivePreset('none'); }}
            className={`px-2 py-1 rounded text-xs hover:opacity-80 border ${
              Object.keys(excludedFilters).length > 0 || Object.keys(textExcludeFilters).length > 0 || Object.values(textIncludeFilters).some((v) => v && v.trim()) || activePreset !== 'none'
                ? 'bg-amber-600 text-white border-amber-700'
                : `${t.inputBg} ${t.headerText} ${t.inputBorder}`
            }`}
          >
            Clear Filters
          </button>

          {/* Export */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-2 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-600"
            >
              Export ▼
            </button>
            {showExportMenu && (
              <div className={`absolute top-full right-0 mt-1 w-40 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                <button onClick={() => exportToCSV(false)} className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}>
                  Export Filtered ({sortedRecords.length})
                </button>
                <button onClick={() => exportToCSV(true)} className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}>
                  Export All ({records.length})
                </button>
              </div>
            )}
          </div>


          {pausedByIdle && (
            <span className="px-2 py-1 rounded text-xs bg-amber-600 text-white" title="No activity for 30 minutes. Move the mouse or press a key to resume.">
              Auto-refresh paused — click to resume
            </span>
          )}
          {lastRefresh && <span className="text-xs opacity-50">{lastRefresh.toLocaleTimeString()}</span>}

          <button onClick={() => fetchData()} className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}>
            {refreshing ? '...' : 'Refresh'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          {/* Settings */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowSettings(!showSettings)}
              onDoubleClick={(e) => {
                if (e.shiftKey) {
                  setShowColumnBuilder((prev) => {
                    const next = !prev;
                    localStorage.setItem('ctr-builder-visible', String(next));
                    return next;
                  });
                  setShowSettings(false);
                }
              }}
              className={`px-2 py-1 rounded text-xs ${showSettings ? 'bg-blue-600 text-white' : `${t.inputBg} ${t.headerText} hover:opacity-80`}`}
            >
              ⚙
            </button>
            {showSettings && (
              <div className={`absolute top-full right-0 mt-1 w-56 ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-3`}>
                <div className={`text-xs font-bold ${t.headerText} mb-2`}>SETTINGS</div>

                {/* Row Height */}
                <div className="mb-2">
                  <label className={`text-[10px] ${t.headerText} font-medium`}>Row Height</label>
                  <div className="flex flex-col gap-1 mt-1">
                    {([['1-line', '1 Line (compact)'], ['2-line', '2 Lines'], ['3-line', '3 Lines'], ['auto', 'Auto (wrap all)']] as const).map(([value, label]) => (
                      <label key={value} className={`flex items-center gap-2 px-1 py-0.5 text-[10px] ${t.headerText} cursor-pointer rounded ${t.hoverBg}`}>
                        <input
                          type="radio"
                          name="rowHeight"
                          checked={rowHeight === value}
                          onChange={() => setRowHeight(value)}
                          className="w-3 h-3 accent-blue-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* GHL schema status */}
                <div className={`border-t ${t.inputBorder} pt-2 mt-2`}>
                  <div className={`text-[10px] ${t.headerText}`}>
                    GHL schema:{' '}
                    {schemaInfo ? (
                      <>
                        <span className="font-medium">refreshed {new Date(schemaInfo.fetchedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
                        {schemaInfo.newFieldCount > 0 && (
                          <span className="ml-1 px-1 rounded bg-amber-600 text-white font-medium">
                            {schemaInfo.newFieldCount} unmapped field{schemaInfo.newFieldCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="opacity-60">using baked-in config (live fetch unavailable)</span>
                    )}
                  </div>
                </div>

                {/* Logged in as */}
                {userEmail && (
                  <div className={`border-t ${t.inputBorder} pt-2 mt-2`}>
                    <div className={`text-[10px] ${t.headerText}`}>
                      Logged in as: <span className="font-medium">{userEmail}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* View description — computed 100% from the view config + API rules (never hardcoded per view).
          Shows the LIVE builder preview while building. */}
      <div className={`px-4 py-0.5 text-[10px] ${t.headerText} opacity-70 border-b ${t.cellBorder}`}>
        <span className="font-medium">
          View: {effectiveView.name}
          {(showViewBuilder || builderDraft) && <span className="text-amber-400"> (live preview)</span>}
        </span>
        {' | '}{describeView(effectiveView)}
        {activePreset !== 'none' && (
          <span>
            {' | Quick filter: '}
            {activePreset === 'blankPropertyType' ? 'Type of Property blank (≠ Settled)'
              : activePreset === 'blankBpDueDate' ? 'B&P Due Date blank'
              : activePreset === 'blankBpRequested' ? 'B&P Requested blank'
              : activePreset === 'bpDueNext5' ? 'B&P Due Date within 5 days'
              : 'Settlement Date within 5 days'}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs" style={{ userSelect: resizingCol !== null ? 'none' : 'auto' }}>
          <thead className="sticky top-0 z-10" style={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#f3f4f6' }}>
            <tr>
              {/* Select column (in edit mode) */}
              {editMode && (
                <th className={`${t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-center font-medium ${t.headerText} whitespace-nowrap`} style={{ width: 40, minWidth: 40 }}>
                  <span className="text-[11px]">Edit</span>
                </th>
              )}


              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  draggable={resizingCol === null}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`relative border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} cursor-move select-none`}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: getColumnBg(col.key, true) || (theme === 'dark' ? '#1f2937' : '#f3f4f6') }}
                >
                  {/* Source tag: opp (blue) / co (green) — tiny, corner, no real estate cost */}
                  <span
                    className="absolute top-0 right-2 text-[7px] font-bold leading-none pointer-events-none"
                    style={{ color: getFieldSource(col.key) === 'opportunity' ? '#60a5fa' : '#4ade80' }}
                  >
                    {getFieldSource(col.key) === 'opportunity' ? 'opp' : 'co'}
                  </span>
                  <div
                    className="flex items-center gap-0.5 cursor-pointer overflow-hidden"
                    title="Click to sort. Shift-click to add this column as another sort level."
                    onClick={(e) => handleSort(col.key, e.shiftKey)}
                  >
                    <span className="text-[11px] leading-tight">{col.label}</span>
                    {(() => {
                      const at = sortLevels.findIndex((l) => l.column === col.key);
                      if (at === -1) return null;
                      return (
                        <span className="text-blue-400 text-[10px] whitespace-nowrap">
                          {sortLevels[at].dir === 'asc' ? '▲' : '▼'}
                          {sortLevels.length > 1 && (
                            <span className="text-[8px] align-super">{at + 1}</span>
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Filter dropdown */}
                  <div className="mt-0.5 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenFilterDropdown(openFilterDropdown === col.key ? null : col.key); }}
                      className={`w-full px-1 py-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} text-left truncate ${
                        (excludedFilters[col.key] && excludedFilters[col.key]!.size > 0) ? 'border-blue-500 text-blue-400' : ''
                      }`}
                    >
                      {(excludedFilters[col.key] && excludedFilters[col.key]!.size > 0)
                        ? `▼ Filtered`
                        : '▼ Filter'}
                    </button>

                    {openFilterDropdown === col.key && (
                      <div
                        className={`absolute top-full left-0 mt-1 w-56 max-h-80 overflow-y-auto ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-1 dropdown-container`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Sort A-Z / Z-A */}
                        <div className={`flex gap-1 mb-1 px-1 border-b ${t.inputBorder} pb-1`}>
                          <button onClick={() => setPrimarySort(col.key, 'asc')} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>A→Z</button>
                          <button onClick={() => setPrimarySort(col.key, 'desc')} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>Z→A</button>
                          <button onClick={() => handleSort(col.key, true)} title="Add this column as another sort level (same as shift-clicking the header)" className={`text-[9px] ${t.headerText} hover:text-blue-400 ml-auto`}>+ sort level</button>
                        </div>


                        {/* Contains — the filter that can be saved into a view */}
                        <div className={`mb-1 px-1 pb-1 border-b ${t.inputBorder}`}>
                          <input
                            type="text"
                            placeholder="Contains... (saveable)"
                            value={textIncludeFilters[col.key] || ''}
                            onChange={(e) => setTextIncludeFilters((prev) => ({ ...prev, [col.key]: e.target.value }))}
                            className={`w-full px-1.5 py-0.5 text-[10px] ${t.inputBg} border ${
                              textIncludeFilters[col.key] ? 'border-blue-500' : t.inputBorder
                            } rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                          />
                        </div>

                        {/* Search */}
                        <input
                          type="text"
                          placeholder="Search values..."
                          value={filterSearch[col.key] || ''}
                          onChange={(e) => setFilterSearch((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          className={`w-full px-1.5 py-0.5 mb-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                        />
                        {/* Select All / Only (search match) / Clear */}
                        <div className="flex gap-1 mb-1 px-1">
                          <button onClick={() => selectAllFilter(col.key)} className="text-[9px] text-blue-400 hover:underline">Select All</button>
                          {filterSearch[col.key] && (
                            <button
                              onClick={() => {
                                const search = (filterSearch[col.key] || '').toLowerCase();
                                const toExclude = new Set(
                                  getUniqueValues(col.key).filter((val) => !val.toLowerCase().includes(search))
                                );
                                setExcludedFilters((prev) => ({ ...prev, [col.key]: toExclude }));
                              }}
                              className="text-[9px] text-green-400 hover:underline font-medium"
                            >
                              Only
                            </button>
                          )}
                          <button onClick={() => clearAllFilter(col.key)} className="text-[9px] text-red-400 hover:underline">Clear</button>
                        </div>
                        {/* Checkboxes */}
                        {getUniqueValues(col.key)
                          .filter((v) => !filterSearch[col.key] || v.toLowerCase().includes(filterSearch[col.key]!.toLowerCase()))
                          .map((value) => (
                            <label key={value} className={`flex items-center gap-1 px-1 py-0.5 text-[10px] ${t.headerText} cursor-pointer rounded ${t.hoverBg}`}>
                              <input
                                type="checkbox"
                                checked={!excludedFilters[col.key] || !excludedFilters[col.key]!.has(value)}
                                onChange={() => toggleExcludeFilter(col.key, value)}
                                className="w-2.5 h-2.5"
                              />
                              <span className="truncate">{value}</span>
                            </label>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Resize handle */}
                  <div onMouseDown={(e) => handleResizeStart(e, idx)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50" />
                </th>
              ))}

            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => {
              const isSelected = multiSelectMode
                ? selectedRowIds.has(record.id)
                : selectedRowId === record.id;
              const rowEdited = hasEdits(record.id);
              const rowSaving = savingIds.has(record.id);

              return (
                <tr
                  key={record.id}
                  className={`${t.hoverBg} ${isSelected ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50') : ''} ${rowEdited ? (theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50') : ''}`}
                  style={!editMode && highlightedRowId === record.id ? { backgroundColor: theme === 'dark' ? 'rgba(67, 56, 202, 0.35)' : 'rgba(199, 210, 254, 0.8)' } : undefined}
                  onClick={() => { if (!editMode) setHighlightedRowId(highlightedRowId === record.id ? null : record.id); }}
                >
                  {/* Select checkbox (edit mode) */}
                  {editMode && (
                    <td className={`border ${t.cellBorder} px-1 py-1 text-center`} style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (multiSelectMode) {
                            setSelectedRowIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(record.id)) { next.delete(record.id); } else { next.add(record.id); }
                              return next;
                            });
                          } else {
                            if (isSelected) {
                              setSelectedRowId(null);
                            } else {
                              if (selectedRowId && hasEdits(selectedRowId)) {
                                if (!confirm('You have unsaved changes on the current row. Discard?')) return;
                                setEditedRows((prev) => { const n = { ...prev }; delete n[selectedRowId!]; return n; });
                              }
                              setSelectedRowId(record.id);
                            }
                          }
                        }}
                        className="w-3.5 h-3.5 accent-blue-500"
                      />
                    </td>
                  )}


                  {columns.map((col, colIdx) => {
                    const rawValue = record[col.key] || '';
                    const displayValue = getDisplayValue(record, col.key);
                    const isEditable = editMode && isSelected && !READ_ONLY_FIELDS.has(col.key) && !(CO_FIELDS_READ_ONLY && col.key.startsWith(CO_PREFIX));
                    const currentValue = isEditable ? getEditValue(record.id, col.key) : rawValue;
                    let cellClass = `border ${t.cellBorder} px-1.5 py-1 overflow-hidden break-words`;

                    // Render cell
                    let cellContent: React.ReactNode;

                    if (isEditable) {
                      if (col.key === 'assignedTo') {
                        cellContent = (
                          <select
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          >
                            <option value="">-- Select --</option>
                            {BA_OPTIONS.map((ba) => (
                              <option key={ba.id} value={ba.id}>{ba.name}</option>
                            ))}
                          </select>
                        );
                      } else if (dropdownOptions(col.key)) {
                        cellContent = (
                          <select
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          >
                            {dropdownOptions(col.key)!.map((opt) => (
                              <option key={opt.key} value={opt.key}>{opt.label}</option>
                            ))}
                          </select>
                        );
                      } else if (checkboxOnValue(col.key)) {
                        const onValue = checkboxOnValue(col.key)!;
                        cellContent = (
                          <input
                            type="checkbox"
                            checked={currentValue === onValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.checked ? onValue : '')}
                            className="w-3.5 h-3.5"
                          />
                        );
                      } else if (isDateField(col.key)) {
                        cellContent = (
                          <input
                            type="date"
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          />
                        );
                      } else if (isLargeTextField(col.key)) {
                        cellContent = (
                          <div className="flex items-center gap-0.5">
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                              className={`flex-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                            />
                            <button
                              onClick={() => setTextEditorModal({ recordId: record.id, colKey: col.key, label: col.label })}
                              className="px-1 py-0 text-[9px] bg-blue-600 text-white rounded hover:bg-blue-500 shrink-0"
                              title="Expand editor"
                            >
                              ↗
                            </button>
                          </div>
                        );
                      } else {
                        cellContent = (
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          />
                        );
                      }
                    } else if (col.key === 'ghlLink' && rawValue) {
                      cellContent = (
                        <a
                          href={rawValue}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Open
                        </a>
                      );
                    } else {
                      cellContent = displayValue;
                    }

                    return (
                      <td
                        key={col.key}
                        className={`${cellClass} ${!isEditable ? 'cursor-pointer' : ''}`}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: getCellBg(col.key, displayValue, record) || undefined }}
                        title={displayValue}
                        onClick={(e) => {
                          if (!isEditable && displayValue && displayValue.length > 15) {
                            setExpandedCell({ recordId: record.id, colKey: col.key, value: displayValue, x: e.clientX, y: e.clientY });
                          }
                        }}
                      >
                        <div style={rowHeightStyle}>
                          {cellContent}
                        </div>
                      </td>
                    );
                  })}

                </tr>
              );
            })}
          </tbody>
        </table>

        {sortedRecords.length === 0 && (
          <div className={`text-center py-12 ${t.headerText}`}>No records match the current filters.</div>
        )}
      </div>

      {/* Floating Sort panel — draggable, so it can be parked away from the
          column headers you are reading while setting the levels up. */}
      {showSortDialog && sortDialogPos && (
        <div
          data-sort-dialog
          className={`fixed z-[90] ${t.bg} border ${t.inputBorder} rounded shadow-2xl dropdown-container`}
          style={{ left: sortDialogPos.x, top: sortDialogPos.y, width: SORT_DIALOG_WIDTH }}
        >
          {/* Drag bar */}
          <div
            onPointerDown={startSortDrag}
            className={`flex items-center justify-between px-2 py-1 border-b ${t.inputBorder} cursor-move select-none rounded-t ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}
            title="Drag to move"
          >
            <span className={`text-[11px] font-bold ${t.text}`}>∷ Sort</span>
            <button
              onClick={() => setShowSortDialog(false)}
              className={`text-[11px] ${t.headerText} hover:text-red-400 px-1`}
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-2">
            <div className={`text-[9px] ${t.headerText} opacity-60 mb-1.5`}>
              Records are ordered by the first row, then ties are broken by the next, and so on.
              Shift-click a column header to add a level without opening this.
            </div>
            {renderSortLevelEditor()}
            <div className={`flex justify-between items-center mt-2 pt-1.5 border-t ${t.inputBorder}`}>
              <button
                onClick={() => setSortLevels([])}
                className={`text-[10px] ${t.headerText} hover:text-blue-400`}
              >
                Clear sort
              </button>
              <button
                onClick={() => setShowSortDialog(false)}
                className="px-3 py-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded cell popup */}
      {expandedCell && (
        <div
          className={`fixed z-[100] max-w-md max-h-64 overflow-auto rounded shadow-xl border p-3 text-xs whitespace-pre-wrap ${
            theme === 'dark' ? 'bg-gray-900 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'
          } dropdown-container`}
          style={{
            left: Math.min(expandedCell.x, window.innerWidth - 420),
            top: Math.min(expandedCell.y + 10, window.innerHeight - 270),
          }}
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className={`font-bold text-[10px] uppercase ${t.headerText}`}>
              {columns.find((c) => c.key === expandedCell.colKey)?.label || expandedCell.colKey}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(expandedCell.value);
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500"
                title="Copy to clipboard"
              >
                Copy
              </button>
              <button onClick={() => setExpandedCell(null)} className={`${t.headerText} hover:${t.text} text-sm leading-none`}>x</button>
            </div>
          </div>
          <div>{expandedCell.value}</div>
        </div>
      )}

      {/* Text editor modal (for large text fields) */}
      {textEditorModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" onClick={() => setTextEditorModal(null)}>
          <div
            className={`w-[700px] max-w-[90vw] rounded-lg shadow-2xl border ${
              theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
            } p-5`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className={`text-sm font-bold ${t.text}`}>{textEditorModal.label}</h3>
              <button onClick={() => setTextEditorModal(null)} className={`${t.headerText} hover:${t.text} text-lg leading-none px-1`}>x</button>
            </div>
            <textarea
              id="text-editor-textarea"
              value={getEditValue(textEditorModal.recordId, textEditorModal.colKey)}
              onChange={(e) => setEditValue(textEditorModal.recordId, textEditorModal.colKey, e.target.value)}
              className={`w-full h-80 text-sm ${t.inputBg} border ${t.inputBorder} rounded p-3 ${t.text} resize-y focus:outline-none focus:border-blue-500`}
              autoFocus
            />
            <div className="flex justify-between items-center mt-2">
              <button
                onClick={() => {
                  const now = new Date();
                  const dd = String(now.getDate()).padStart(2, '0');
                  const mm = String(now.getMonth() + 1).padStart(2, '0');
                  const prefix = `${dd}/${mm} ${userInitials} - `;
                  const current = getEditValue(textEditorModal.recordId, textEditorModal.colKey);
                  const newVal = current ? `${prefix}\n${current}` : prefix;
                  setEditValue(textEditorModal.recordId, textEditorModal.colKey, newVal);
                  setTimeout(() => {
                    const ta = document.getElementById('text-editor-textarea') as HTMLTextAreaElement;
                    if (ta) { ta.focus(); ta.setSelectionRange(prefix.length, prefix.length); }
                  }, 50);
                }}
                className={`px-3 py-1.5 text-xs ${theme === 'dark' ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded`}
              >
                + Next Comment ({userInitials})
              </button>
              <button
                onClick={() => setTextEditorModal(null)}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
