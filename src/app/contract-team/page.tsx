'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface ContractRecord {
  id: string;
  opportunityName: string;
  registeredAddress: string;
  stage: string;
  pipelineId: string;
  pipelineStageId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  monetaryValue: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastStageChangeAt: string;
  ghlLink: string;
  bpRequested: string;
  bpDueDate: string;
  bpExtensionStatus: string;
  bpScheduledDate: string;
  bpConditionStatus: string;
  bpNegotiationDetail: string;
  financeApprovalReceived: string;
  confirmedSettlementDate: string;
  insuranceStatus: string;
  preSettlementInspectionDate: string;
  preSettlementInspectionStatus: string;
  brokerName: string;
  brokerCompany: string;
  solicitorName: string;
  latestStatusUpdate: string;
  agentBuilderDetails: string;
  briefNotes: string;
  assignedBA: string;
  personalName: string;
  settlementDate: string;
  registration: string;
  registrationDateETA: string;
  buildDepositIssued: string;
  buildDepositIssuedDate: string;
  buildDepositPaid: string;
  pmIntroSent: string;
  unconditionalDate: string;
  landDepositPaid: string;
  exchangeDate: string;
  financeDueDate: string;
  financeExtensionStatus: string;
  lastConstructionUpdateDate: string;
  lastFinanceUpdateDate: string;
  daysSinceStageChange: string;
  pipelineName: string;
  bpRequestedExtensionDate: string;
  financeRequestedExtensionDate: string;
  valuationExpectedAccessDate: string;
  typeOfProperty: string;
  brokerEmail: string;
  brokerPhone: string;
  solicitorCompany: string;
  solicitorEmail: string;
  solicitorPhone: string;
  partnerName: string;
  partnerEmail: string;
  partnerPhone: string;
  owner: string;
  followers: string;
}

type FieldType = 'text' | 'date' | 'dropdown' | 'yesblank' | 'multiline' | 'readonly';

interface ColumnDef {
  key: keyof ContractRecord;
  label: string;
  width: number;
  type: FieldType;
  options?: string[];
}

type SortDirection = 'asc' | 'desc' | null;
type Theme = 'dark' | 'light';

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

// ============================================================================
// VIEW DEFINITIONS — preset filtered views (replicating Config tab logic)
// ============================================================================

interface ViewFilter {
  field: keyof ContractRecord;
  operator: 'equals' | 'not equals' | 'contains' | 'not contains' | 'in' | 'not in' | 'is blank' | 'not blank';
  value: string;
}

interface ViewDef {
  name: string;
  filters: ViewFilter[];
  columns: ColumnDef[];
  sortBy: keyof ContractRecord;
  sortDir: SortDirection;
  redirect?: string;
}

const FINANCE_PIPELINE_ID = 'zgBRaMnACpskyf1wHCEV';

// ============================================================================
// COLUMN DEFINITIONS — per-view column sets
// ============================================================================

const FULL_FC_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'owner', label: 'Owner', width: 120, type: 'readonly' },
  { key: 'followers', label: 'Followers', width: 160, type: 'readonly' },
  { key: 'assignedBA', label: 'Assigned BA', width: 120, type: 'readonly' },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110, type: 'date' },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120, type: 'date' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110, type: 'date' },
  { key: 'financeRequestedExtensionDate', label: 'Finance Ext Date', width: 120, type: 'date' },
  { key: 'financeExtensionStatus', label: 'Finance Ext Status', width: 120, type: 'text' },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update', width: 120, type: 'date' },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110, type: 'date' },
  { key: 'bpConditionStatus', label: 'B&P Condition', width: 130, type: 'dropdown', options: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'] },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'valuationExpectedAccessDate', label: 'Valuation Expected', width: 120, type: 'date' },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100, type: 'yesblank' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'personalName', label: 'PERSONAL Name', width: 160, type: 'readonly' },
  { key: 'contactEmail', label: 'Contact Email', width: 180, type: 'readonly' },
  { key: 'contactPhone', label: 'Contact Phone', width: 130, type: 'readonly' },
];

const SETTLEMENT_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'owner', label: 'Owner', width: 120, type: 'readonly' },
  { key: 'followers', label: 'Followers', width: 160, type: 'readonly' },
  { key: 'assignedBA', label: 'Assigned BA', width: 120, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'solicitorCompany', label: 'Solicitor Company', width: 140, type: 'readonly' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'settlementDate', label: 'Settlement Date', width: 120, type: 'date' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
];

const PROJECT_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100, type: 'yesblank' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'brokerEmail', label: 'Broker Email', width: 180, type: 'readonly' },
  { key: 'brokerPhone', label: 'Broker Phone', width: 130, type: 'readonly' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'solicitorCompany', label: 'Solicitor Company', width: 140, type: 'readonly' },
  { key: 'solicitorEmail', label: 'Solicitor Email', width: 180, type: 'readonly' },
  { key: 'solicitorPhone', label: 'Solicitor Phone', width: 130, type: 'readonly' },
];

const BUILD_DEPOSIT_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
];

const UNCON_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'owner', label: 'Owner', width: 120, type: 'readonly' },
  { key: 'followers', label: 'Followers', width: 160, type: 'readonly' },
  { key: 'assignedBA', label: 'Assigned BA', width: 120, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110, type: 'date' },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120, type: 'date' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110, type: 'date' },
  { key: 'financeRequestedExtensionDate', label: 'Finance Ext Date', width: 120, type: 'date' },
  { key: 'financeExtensionStatus', label: 'Finance Ext Status', width: 120, type: 'text' },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update', width: 120, type: 'date' },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110, type: 'date' },
  { key: 'bpConditionStatus', label: 'B&P Condition', width: 130, type: 'dropdown', options: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'] },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval', width: 100, type: 'yesblank' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110, type: 'readonly' },
];

const PM_INTRO_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'contactEmail', label: 'Contact Email', width: 180, type: 'readonly' },
  { key: 'contactPhone', label: 'Contact Phone', width: 130, type: 'readonly' },
  { key: 'partnerName', label: 'Partner Name', width: 140, type: 'readonly' },
  { key: 'partnerEmail', label: 'Partner Email', width: 180, type: 'readonly' },
  { key: 'partnerPhone', label: 'Partner Phone', width: 130, type: 'readonly' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100, type: 'yesblank' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
];

const SHAY_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'bpRequested', label: 'B&P Requested?', width: 90, type: 'yesblank' },
  { key: 'assignedBA', label: 'Assigned BA', width: 120, type: 'readonly' },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110, type: 'date' },
  { key: 'bpExtensionStatus', label: 'B&P Extension', width: 110, type: 'dropdown', options: ['', 'Requested', 'Accepted', 'Rejected'] },
  { key: 'bpScheduledDate', label: 'B&P Scheduled', width: 110, type: 'date' },
  { key: 'bpConditionStatus', label: 'B&P Condition', width: 130, type: 'dropdown', options: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'] },
  { key: 'bpNegotiationDetail', label: 'B&P Negotiation Detail', width: 200, type: 'multiline' },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval', width: 100, type: 'yesblank' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement', width: 120, type: 'date' },
  { key: 'insuranceStatus', label: 'Insurance Status', width: 120, type: 'dropdown', options: ['', 'Quote requested', 'Strata report requested', 'Sent to client', 'Invoiced', 'Paid', 'CoC issued', 'Client organising'] },
  { key: 'preSettlementInspectionDate', label: 'Pre-settlement Date', width: 120, type: 'date' },
  { key: 'preSettlementInspectionStatus', label: 'Pre-settlement Status', width: 120, type: 'dropdown', options: ['', 'Scheduled', 'Satisfied', 'Not satisfied'] },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
];

const FATHIMA_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days since stage change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'typeOfProperty', label: 'Type of Property', width: 110, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110, type: 'date' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120, type: 'date' },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110, type: 'date' },
  { key: 'financeRequestedExtensionDate', label: 'Finance Ext Date', width: 120, type: 'date' },
  { key: 'financeExtensionStatus', label: 'Finance Ext Status', width: 120, type: 'text' },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update', width: 120, type: 'date' },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval', width: 100, type: 'yesblank' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110, type: 'date' },
  { key: 'bpConditionStatus', label: 'B&P Condition', width: 130, type: 'dropdown', options: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'] },
  { key: 'owner', label: 'Owner', width: 120, type: 'readonly' },
  { key: 'followers', label: 'Followers', width: 160, type: 'readonly' },
  { key: 'assignedBA', label: 'Assigned BA', width: 120, type: 'readonly' },
];

const CONSTRUCTION_PIPELINE_ID = 'XMKCHlqekS7IU87PNLKB';

// ============================================================================
// PRESET VIEWS
// ============================================================================

const PRESET_VIEWS: ViewDef[] = [
  {
    name: 'Full F&C',
    columns: FULL_FC_COLUMNS,
    filters: [],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'Settlement Tracking',
    columns: SETTLEMENT_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'Ocean Rise',
    columns: PROJECT_COLUMNS,
    filters: [
      { field: 'registeredAddress', operator: 'contains', value: 'ocean rise' },
    ],
    sortBy: 'registeredAddress',
    sortDir: 'asc',
  },
  {
    name: 'Build Deposit Status',
    columns: BUILD_DEPOSIT_COLUMNS,
    filters: [],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'Uncon Tracking',
    columns: UNCON_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    sortBy: 'daysSinceStageChange',
    sortDir: 'asc',
  },
  {
    name: 'PM Intro Tracking',
    columns: PM_INTRO_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: CONSTRUCTION_PIPELINE_ID },
      { field: 'stage', operator: 'in', value: 'TILING, PLASTERING, PRACTICAL COMPLETION' },
    ],
    sortBy: 'stage',
    sortDir: 'desc',
  },
  {
    name: 'B&P & Finance',
    columns: [],
    filters: [],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
    redirect: 'https://property-packaging-form.vercel.app/bp-finance',
  },
  {
    name: 'Huntly VIC',
    columns: PROJECT_COLUMNS,
    filters: [
      { field: 'registeredAddress', operator: 'contains', value: 'huntly' },
      { field: 'opportunityName', operator: 'not contains', value: 'Bilal Darwich' },
      { field: 'opportunityName', operator: 'not contains', value: 'Cooper Rigg' },
    ],
    sortBy: 'registeredAddress',
    sortDir: 'asc',
  },
  {
    name: 'Golden Horizon Bundaberg',
    columns: PROJECT_COLUMNS,
    filters: [
      { field: 'registeredAddress', operator: 'contains', value: 'Golden Horizon' },
    ],
    sortBy: 'registeredAddress',
    sortDir: 'asc',
  },
  {
    name: 'Finance Tracking',
    columns: FATHIMA_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    sortBy: 'financeDueDate',
    sortDir: 'asc',
  },
];

function applyViewFilters(records: ContractRecord[], filters: ViewFilter[]): ContractRecord[] {
  return records.filter((record) =>
    filters.every((f) => {
      const cellValue = (record[f.field] || '').toLowerCase();
      const filterValue = f.value.toLowerCase();
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
// HELPERS
// ============================================================================

function formatDateDisplay(value: string): string {
  if (!value) return '';
  // Try to parse various date formats
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}


// ============================================================================
// CELL COMPONENTS
// ============================================================================

// Field type sets for edit rendering
const DATE_FIELDS = new Set<string>(['exchangeDate', 'unconditionalDate', 'confirmedSettlementDate', 'financeDueDate', 'financeRequestedExtensionDate', 'lastFinanceUpdateDate', 'bpDueDate', 'bpScheduledDate', 'bpRequestedExtensionDate', 'registrationDateETA', 'valuationExpectedAccessDate', 'buildDepositIssuedDate', 'preSettlementInspectionDate']);
const YESBLANK_FIELDS = new Set<string>(['landDepositPaid', 'buildDepositIssued', 'buildDepositPaid', 'pmIntroSent', 'bpRequested', 'financeApprovalReceived']);
const LARGE_TEXT_FIELDS = new Set<string>(['latestStatusUpdate', 'agentBuilderDetails', 'bpNegotiationDetail']);
const DROPDOWN_FIELDS: Record<string, string[]> = {
  bpConditionStatus: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'],
  financeExtensionStatus: ['', 'Requested', 'Accepted', 'Rejected'],
  bpExtensionStatus: ['', 'Requested', 'Accepted', 'Rejected'],
  insuranceStatus: ['', 'Quote requested', 'Strata report requested', 'Sent to client', 'Invoiced', 'Paid', 'CoC issued', 'Client organising'],
  preSettlementInspectionStatus: ['', 'Scheduled', 'Not satisfied', 'Satisfied'],
  typeOfProperty: ['', 'Established', 'New Build', 'House & Land', 'Land Only', 'Off the Plan'],
};

// READ_ONLY_FIELDS — only truly non-editable fields (matching B&P Finance pattern)
const READ_ONLY_FIELDS = new Set<string>(['ghlLink', 'daysSinceStageChange', 'pipelineName', 'registeredAddress', 'opportunityName', 'owner', 'followers', 'assignedBA', 'stage', 'contactName']);

// FYI colour for read-only columns (muted grey background)
const FYI_COLOUR = { header: 'rgba(148,163,184,0.25)', cell: 'rgba(148,163,184,0.1)' };

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContractTeamPage() {
  const [records, setRecords] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contract-team-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });
  useEffect(() => { localStorage.setItem('contract-team-theme', theme); }, [theme]);
  const t = THEMES[theme];

  // Edit mode (hidden by default — Shift+double-click logo to reveal)
  const [showEditButton, setShowEditButton] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // Row selection for editing (B&P Finance pattern)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editedRows, setEditedRows] = useState<Record<string, Partial<ContractRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Expanded cell popup (positioned at click)
  const [expandedCell, setExpandedCell] = useState<{ recordId: string; colKey: string; value: string; x: number; y: number } | null>(null);

  // Text editor modal (for large text fields)
  const [textEditorModal, setTextEditorModal] = useState<{ recordId: string; colKey: keyof ContractRecord; label: string } | null>(null);

  // Refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Active view
  const [activeView, setActiveView] = useState<ViewDef>(PRESET_VIEWS[0]);
  const [showViewDesc, setShowViewDesc] = useState(true);

  // Auto-show view description when view changes
  useEffect(() => { setShowViewDesc(true); }, [activeView]);

  // Sort
  const [sortColumn, setSortColumn] = useState<keyof ContractRecord>(PRESET_VIEWS[0].sortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(PRESET_VIEWS[0].sortDir);

  // Filter
  const [searchText, setSearchText] = useState('');

  // Per-column filter state (B&P Finance pattern)
  const [excludedFilters, setExcludedFilters] = useState<Partial<Record<keyof ContractRecord, Set<string>>>>({});
  const [textExcludeFilters, setTextExcludeFilters] = useState<Partial<Record<keyof ContractRecord, string[]>>>({});
  const [filterSearch, setFilterSearch] = useState<Partial<Record<keyof ContractRecord, string>>>({});
  const [openFilterDropdown, setOpenFilterDropdown] = useState<keyof ContractRecord | null>(null);

  // UI dropdowns
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Row height
  type RowHeight = '1-line' | '2-line' | '3-line' | 'auto';
  const [rowHeight, setRowHeight] = useState<RowHeight>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('contract-team-rowHeight');
      if (saved === '1-line' || saved === '2-line' || saved === '3-line' || saved === 'auto') return saved as RowHeight;
    }
    return '1-line';
  });
  useEffect(() => { localStorage.setItem('contract-team-rowHeight', rowHeight); }, [rowHeight]);

  const rowHeightStyle = rowHeight === '1-line' ? { maxHeight: '20px', overflow: 'hidden' as const }
    : rowHeight === '2-line' ? { maxHeight: '40px', overflow: 'hidden' as const }
    : rowHeight === '3-line' ? { maxHeight: '60px', overflow: 'hidden' as const }
    : {};

  // Hidden columns (per session)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Close dropdowns on click outside
  const headerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (headerRef.current && !headerRef.current.contains(target)) {
        setShowViewMenu(false);
        setShowColumnsMenu(false);
        setShowExportMenu(false);
        setShowSettings(false);
      }
      if (!target.closest('.dropdown-container') && !target.closest('.expanded-cell-popup')) {
        setExpandedCell(null);
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load username from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('contract-team-username');
    if (savedName) setUserName(savedName);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/contract-team');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await res.json();
      setRecords(data.records);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Toggle edit mode
  const handleToggleEdit = () => {
    if (!editMode) {
      if (!userName) {
        setShowNamePrompt(true);
        return;
      }
      setEditMode(true);
    } else {
      const editedCount = Object.keys(editedRows).filter(hasEdits).length;
      if (editedCount > 0) {
        if (!confirm(`You have ${editedCount} unsaved changes. Discard?`)) return;
        discardAllEdits();
      }
      setEditMode(false);
      setSelectedRowId(null);
      setMultiSelectMode(false);
      setSelectedRowIds(new Set());
    }
  };

  const handleNameSubmit = (name: string) => {
    if (name.trim()) {
      setUserName(name.trim());
      localStorage.setItem('contract-team-username', name.trim());
      setShowNamePrompt(false);
      setEditMode(true);
    }
  };

  // Row edit helpers (B&P Finance pattern)
  function getEditValue(recordId: string, key: keyof ContractRecord): string {
    return editedRows[recordId]?.[key] ?? records.find((r) => r.id === recordId)?.[key] ?? '';
  }

  function setEditValue(recordId: string, key: keyof ContractRecord, value: string) {
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
    return Object.entries(edits).some(([k, v]) => v !== original[k as keyof ContractRecord]);
  }

  async function saveRow(recordId: string) {
    const edits = editedRows[recordId];
    if (!edits) return;
    const original = records.find((r) => r.id === recordId);
    if (!original) return;

    const changes: Record<string, string> = {};
    for (const [key, val] of Object.entries(edits)) {
      if (val !== undefined && val !== original[key as keyof ContractRecord]) {
        if (YESBLANK_FIELDS.has(key)) {
          changes[key] = val === 'Yes' ? 'Yes' : '';
        } else {
          changes[key] = val;
        }
      }
    }

    if (Object.keys(changes).length === 0) return;

    setSavingIds((prev) => new Set(prev).add(recordId));
    try {
      // Save each changed field individually via the existing update API
      for (const [field, value] of Object.entries(changes)) {
        const res = await fetch('/api/contract-team/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opportunityId: recordId, field, value }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(`Save failed for ${field}: ${data.error || res.status}`);
          return;
        }
      }
      // Update local state
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, ...edits } : r))
      );
      setEditedRows((prev) => {
        const next = { ...prev };
        delete next[recordId];
        return next;
      });
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSavingIds((prev) => { const s = new Set(prev); s.delete(recordId); return s; });
    }
  }

  function discardAllEdits() {
    setEditedRows({});
  }

  // Sort handler
  const handleSort = useCallback((column: keyof ContractRecord) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return column;
      }
      setSortDirection('asc');
      return column;
    });
  }, []);

  // Display value helper (for filters)
  function getDisplayValue(record: ContractRecord, key: keyof ContractRecord): string {
    const raw = record[key] || '';
    if (DATE_FIELDS.has(key)) return formatDateDisplay(raw);
    return raw;
  }

  // Get unique values for filter dropdown
  const getUniqueValues = useCallback((column: keyof ContractRecord): string[] => {
    const values = new Set<string>();
    records.forEach((r) => { values.add(getDisplayValue(r, column) || '(blank)'); });
    return Array.from(values).sort();
  }, [records]);

  // Per-column filter helpers
  const toggleExcludeFilter = useCallback((column: keyof ContractRecord, value: string) => {
    setExcludedFilters((prev) => {
      const current = new Set(prev[column] || []);
      if (current.has(value)) { current.delete(value); } else { current.add(value); }
      return { ...prev, [column]: current };
    });
  }, []);

  const selectAllFilter = useCallback((column: keyof ContractRecord) => {
    setExcludedFilters((prev) => { const updated = { ...prev }; delete updated[column]; return updated; });
  }, []);

  const clearAllFilter = useCallback((column: keyof ContractRecord) => {
    const allValues = new Set<string>();
    records.forEach((r) => { allValues.add(getDisplayValue(r, column) || '(blank)'); });
    setExcludedFilters((prev) => ({ ...prev, [column]: allValues }));
  }, [records]);

  // Switch view handler
  const handleViewChange = useCallback((view: ViewDef) => {
    setActiveView(view);
    setSortColumn(view.sortBy);
    setSortDirection(view.sortDir);
    setHiddenColumns(new Set());
    setExcludedFilters({});
    setTextExcludeFilters({});
    setFilterSearch({});
    setShowViewMenu(false);
  }, []);

  // Visible columns (filtered by hidden set)
  const visibleColumns = useMemo(() => {
    return activeView.columns.filter((col) => !hiddenColumns.has(col.key));
  }, [activeView, hiddenColumns]);

  // Filtered + sorted records
  const displayRecords = useMemo(() => {
    // 1. Apply view filters
    let filtered = applyViewFilters(records, activeView.filters);

    // 2. Apply search text
    if (searchText.trim()) {
      const term = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.opportunityName.toLowerCase().includes(term) ||
          r.registeredAddress.toLowerCase().includes(term) ||
          r.contactName.toLowerCase().includes(term)
      );
    }

    // 3. Apply per-column excluded value filters
    filtered = filtered.filter((record) => {
      const passesExcluded = Object.entries(excludedFilters).every(([key, excludedSet]) => {
        if (!excludedSet || (excludedSet as Set<string>).size === 0) return true;
        const displayValue = getDisplayValue(record, key as keyof ContractRecord) || '(blank)';
        return !(excludedSet as Set<string>).has(displayValue);
      });
      if (!passesExcluded) return false;

      const passesTextExclude = Object.entries(textExcludeFilters).every(([key, patterns]) => {
        if (!patterns || patterns.length === 0) return true;
        const displayValue = getDisplayValue(record, key as keyof ContractRecord).toLowerCase();
        return patterns.every((p) => !displayValue.includes(p.toLowerCase()));
      });
      return passesTextExclude;
    });

    // 4. Apply sort
    if (!sortColumn || !sortDirection) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;
      const aDate = new Date(aVal).getTime();
      const bDate = new Date(bVal).getTime();
      if (!isNaN(aDate) && !isNaN(bDate)) {
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      const compare = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [records, activeView, searchText, sortColumn, sortDirection, excludedFilters, textExcludeFilters]);

  // Export to CSV
  const exportToCSV = useCallback((exportAll: boolean) => {
    const data = exportAll ? records : displayRecords;
    const cols = visibleColumns;
    const header = cols.map((c) => c.label).join(',');
    const rows = data.map((r) =>
      cols.map((c) => {
        const val = r[c.key] || '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeView.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [records, displayRecords, visibleColumns, activeView]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${t.bg}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className={`${t.text} text-lg`}>Loading Contract Team Data...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching opportunities from GHL</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${t.bg}`}>
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error: {error}</p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${t.bg} ${t.text}`}>
      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className={`${t.headerBg} rounded-lg p-6 w-80 border ${t.inputBorder}`}>
            <h3 className={`${t.text} font-bold mb-3`}>Enter your name</h3>
            <p className="text-gray-400 text-sm mb-4">This identifies who is editing records.</p>
            <input
              autoFocus
              type="text"
              placeholder="Your name..."
              className={`w-full px-3 py-2 ${t.inputBg} border ${t.inputBorder} rounded ${t.text} placeholder-gray-500 focus:outline-none focus:border-blue-500`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNameSubmit((e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setShowNamePrompt(false);
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Your name..."]') as HTMLInputElement;
                  if (input) handleNameSubmit(input.value);
                }}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Continue
              </button>
              <button
                onClick={() => setShowNamePrompt(false)}
                className={`px-3 py-2 ${t.inputBg} ${t.headerText} rounded hover:opacity-80 text-sm`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div ref={headerRef} className={`flex items-center justify-between px-4 py-2 ${t.headerBg} border-b ${t.cellBorder}`}>
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Buyers Club"
            className="h-7 w-auto cursor-default select-none"
            onDoubleClick={(e) => { if (e.shiftKey) setShowEditButton((prev) => !prev); }}
          />
          <h1 className="text-lg font-bold">Contract Team Reports Tool</h1>
          <span className="text-xs opacity-60">
            {displayRecords.length} of {records.length} records
          </span>

          {/* View selector dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="px-2 py-1 rounded text-xs bg-blue-600 text-white hover:bg-blue-700"
            >
              {activeView.name} ▼
            </button>
            {showViewMenu && (
              <div className={`absolute top-full left-0 mt-1 w-56 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                {PRESET_VIEWS.map((view) => (
                  <button
                    key={view.name}
                    onClick={() => handleViewChange(view)}
                    className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg} ${
                      activeView.name === view.name ? 'font-bold' : ''
                    }`}
                  >
                    {view.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Edit Mode toggle (hidden — Shift+double-click logo to reveal) */}
          {showEditButton && (
            <>
              <button
                onClick={handleToggleEdit}
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

              {/* Save button (visible when selected row has edits) */}
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
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search name or address..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className={`px-3 py-1 text-xs ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56`}
          />

          {/* Columns menu */}
          <div className="relative">
            <button
              onClick={() => setShowColumnsMenu(!showColumnsMenu)}
              className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
            >
              Columns ▼
            </button>
            {showColumnsMenu && (
              <div className={`absolute top-full right-0 mt-1 w-56 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1 max-h-80 overflow-y-auto`}>
                {activeView.columns.map((col) => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 px-3 py-1 text-xs ${t.text} ${t.hoverBg} cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      checked={!hiddenColumns.has(col.key)}
                      onChange={() => {
                        setHiddenColumns((prev) => {
                          const next = new Set(prev);
                          if (next.has(col.key)) next.delete(col.key);
                          else next.add(col.key);
                          return next;
                        });
                      }}
                      className="rounded"
                    />
                    {col.label}
                  </label>
                ))}
                <div className={`border-t ${t.cellBorder} mt-1 pt-1 px-3`}>
                  <button
                    onClick={() => setHiddenColumns(new Set())}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => { setSearchText(''); setExcludedFilters({}); setTextExcludeFilters({}); setFilterSearch({}); }}
            className={`px-2 py-1 rounded text-xs border ${
              searchText || Object.keys(excludedFilters).length > 0
                ? 'bg-amber-600 text-white border-amber-700'
                : `${t.inputBg} ${t.headerText} ${t.inputBorder}`
            }`}
          >
            Clear Filters
          </button>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-2 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-600"
            >
              Export ▼
            </button>
            {showExportMenu && (
              <div className={`absolute top-full right-0 mt-1 w-44 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                <button onClick={() => exportToCSV(false)} className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}>
                  Export Filtered ({displayRecords.length})
                </button>
                <button onClick={() => exportToCSV(true)} className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}>
                  Export All ({records.length})
                </button>
              </div>
            )}
          </div>

          {/* Refresh */}
          {fetchedAt && (
            <span className="text-xs opacity-50">
              {new Date(fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
          >
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
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
              title="Settings"
            >
              ⚙
            </button>
            {showSettings && (
              <div className={`absolute top-full right-0 mt-1 w-52 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 p-3`}>
                <h4 className={`text-xs font-bold ${t.text} mb-2`}>SETTINGS</h4>
                <p className={`text-[10px] ${t.headerText} mb-1`}>Row Height</p>
                {([['1-line', '1 Line (compact)'], ['2-line', '2 Lines'], ['3-line', '3 Lines'], ['auto', 'Auto (wrap all)']] as const).map(([value, label]) => (
                  <label key={value} className={`flex items-center gap-2 py-0.5 text-xs ${t.text} cursor-pointer`}>
                    <input
                      type="radio"
                      name="rowHeight"
                      checked={rowHeight === value}
                      onChange={() => setRowHeight(value)}
                      className="accent-blue-500"
                    />
                    {label}
                  </label>
                ))}
                {userName && (
                  <p className={`text-[10px] ${t.headerText} mt-3 pt-2 border-t ${t.cellBorder}`}>
                    Logged in as: {userName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Redirect banner for views that link elsewhere */}
      {activeView.redirect && (
        <div className="flex-1 flex items-center justify-center">
          <div className={`text-center p-8 rounded-lg border ${t.inputBorder} ${t.bg}`}>
            <p className={`text-lg font-medium ${t.text} mb-4`}>
              For the B&P & Finance report, visit:
            </p>
            <a
              href={activeView.redirect}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline text-lg"
            >
              {activeView.redirect}
            </a>
          </div>
        </div>
      )}

      {/* View description */}
      {!activeView.redirect && showViewDesc && (
        <div className={`px-4 py-0.5 text-[10px] ${t.headerText} opacity-70 border-b ${t.cellBorder} flex items-center gap-2 cursor-pointer select-none`} onClick={() => setShowViewDesc(false)}>
          <span className="text-[9px]">▲</span>
          <span className="font-medium">View: </span>
          {activeView.name}
          {activeView.filters.length === 0 ? ' | Pipelines: Finance & Construction' : activeView.filters.map((f, i) => {
            const PIPELINE_NAMES: Record<string, string> = { zgBRaMnACpskyf1wHCEV: 'Finance', XMKCHlqekS7IU87PNLKB: 'Construction', RDd4Kczt5mEuUhHfRr7C: 'Contracts', zrb34FRmPnbIyAGFDeXJ: 'Property Team' };
            const displayValue = f.field === 'pipelineId' ? (PIPELINE_NAMES[f.value] || f.value) : f.value;
            const displayField = f.field === 'pipelineId' ? 'Pipeline' : f.field;
            return ` | ${displayField}: ${f.operator} "${displayValue}"`;
          }).join('')}
          {Object.keys(excludedFilters).filter(k => excludedFilters[k as keyof ContractRecord]?.size).length > 0 && ' | Column filters active'}
        </div>
      )}

      {/* Table */}
      {!activeView.redirect && (
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs w-full" style={{ minWidth: visibleColumns.reduce((sum, c) => sum + c.width, 0) }}>
          <thead className="sticky top-0 z-10" style={{ backgroundColor: theme === 'dark' ? '#1f2937' : '#f3f4f6' }}>
            <tr>
              {/* Edit checkbox column */}
              {editMode && (
                <th className={`${t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-center font-medium ${t.headerText} whitespace-nowrap`} style={{ width: 40, minWidth: 40 }}>
                  <span className="text-[11px]">Edit</span>
                </th>
              )}
              {visibleColumns.map((col, colIdx) => (
                <th
                  key={`${col.key}-${colIdx}`}
                  className={`relative border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} select-none`}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: READ_ONLY_FIELDS.has(col.key) ? FYI_COLOUR.header : (theme === 'dark' ? '#1f2937' : '#f3f4f6') }}
                >
                  <div className="flex items-center gap-0.5 cursor-pointer overflow-hidden" onClick={() => handleSort(col.key)}>
                    <span className="text-[11px] leading-tight">{col.label}</span>
                    {sortColumn === col.key && sortDirection && (
                      <span className="text-blue-400 text-[10px]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </div>

                  {/* Filter dropdown trigger */}
                  <div className="mt-0.5 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenFilterDropdown(openFilterDropdown === col.key ? null : col.key); }}
                      className={`w-full px-1 py-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} text-left truncate ${
                        (excludedFilters[col.key] && excludedFilters[col.key]!.size > 0) ? 'border-blue-500 text-blue-400' : ''
                      }`}
                    >
                      {(excludedFilters[col.key] && excludedFilters[col.key]!.size > 0)
                        ? '▼ Filtered'
                        : '▼ Filter'}
                    </button>

                    {openFilterDropdown === col.key && (
                      <div
                        className={`absolute top-full left-0 mt-1 w-56 max-h-80 overflow-y-auto ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-1 dropdown-container`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Sort A-Z / Z-A */}
                        <div className={`flex gap-1 mb-1 px-1 border-b ${t.inputBorder} pb-1`}>
                          <button onClick={() => { handleSort(col.key); setSortDirection('asc'); }} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>A→Z</button>
                          <button onClick={() => { handleSort(col.key); setSortDirection('desc'); }} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>Z→A</button>
                        </div>


                        {/* Search values */}
                        <input
                          type="text"
                          placeholder="Search values..."
                          value={filterSearch[col.key] || ''}
                          onChange={(e) => setFilterSearch((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          className={`w-full px-1.5 py-0.5 mb-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                        />
                        {/* Select All / Only / Clear */}
                        <div className="flex gap-1 mb-1 px-1">
                          <button onClick={() => selectAllFilter(col.key)} className="text-[9px] text-blue-400 hover:underline">Select All</button>
                          {filterSearch[col.key] && (
                            <button
                              onClick={() => {
                                const search = (filterSearch[col.key] || '').toLowerCase();
                                const toExclude = new Set<string>();
                                records.forEach((r) => {
                                  const val = getDisplayValue(r, col.key) || '(blank)';
                                  if (!val.toLowerCase().includes(search)) {
                                    toExclude.add(val);
                                  }
                                });
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRecords.map((record) => {
              const isSelected = multiSelectMode
                ? selectedRowIds.has(record.id)
                : selectedRowId === record.id;
              const rowEdited = hasEdits(record.id);
              const rowSaving = savingIds.has(record.id);

              return (
                <tr key={record.id} className={`${t.hoverBg} ${isSelected ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50') : ''} ${rowEdited ? (theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50') : ''}`}>
                  {/* Edit checkbox */}
                  {editMode && (
                    <td className={`border ${t.cellBorder} px-1 py-1 text-center`} style={{ width: 40 }}>
                      {rowSaving ? (
                        <span className="text-amber-400 text-[10px]">...</span>
                      ) : (
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
                      )}
                    </td>
                  )}

                  {visibleColumns.map((col, colIdx) => {
                    const value = record[col.key] || '';
                    const displayValue = col.type === 'date' ? formatDateDisplay(value) : value;
                    const isEditable = editMode && isSelected && !READ_ONLY_FIELDS.has(col.key);
                    const currentValue = isEditable ? getEditValue(record.id, col.key) : value;

                    let cellClass = `border ${t.cellBorder} px-1.5 py-1 overflow-hidden break-words`;

                    // Highlight cells with conditional status colors
                    if (col.key === 'bpConditionStatus') {
                      if (value === 'Satisfied') cellClass += ' bg-green-900/30';
                      else if (value === 'Satisfied subject to') cellClass += ' bg-yellow-900/30';
                      else if (value === 'In negotiation') cellClass += ' bg-orange-900/30';
                      else if (value === 'Not satisfied') cellClass += ' bg-red-900/30';
                    }
                    if (col.key === 'insuranceStatus') {
                      if (value === 'CoC issued') cellClass += ' bg-green-900/30';
                      else if (value === 'Sent to client') cellClass += ' bg-blue-900/30';
                    }
                    if (col.key === 'preSettlementInspectionStatus') {
                      if (value === 'Satisfied') cellClass += ' bg-green-900/30';
                      else if (value === 'Not satisfied') cellClass += ' bg-red-900/30';
                    }
                    if ((col.key === 'bpRequested' || col.key === 'financeApprovalReceived') && value.toLowerCase() === 'yes') {
                      cellClass += ' bg-green-900/20';
                    }

                    // Render cell content
                    let cellContent: React.ReactNode;

                    if (isEditable) {
                      if (DROPDOWN_FIELDS[col.key]) {
                        cellContent = (
                          <select
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          >
                            {DROPDOWN_FIELDS[col.key].map((opt) => (
                              <option key={opt} value={opt}>{opt || '-- None --'}</option>
                            ))}
                          </select>
                        );
                      } else if (YESBLANK_FIELDS.has(col.key)) {
                        cellContent = (
                          <input
                            type="checkbox"
                            checked={currentValue === 'Yes'}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.checked ? 'Yes' : '')}
                            className="w-3.5 h-3.5"
                          />
                        );
                      } else if (DATE_FIELDS.has(col.key)) {
                        cellContent = (
                          <input
                            type="date"
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          />
                        );
                      } else if (LARGE_TEXT_FIELDS.has(col.key)) {
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
                    } else {
                      // GHL link special case
                      if (col.key === 'ghlLink' && value) {
                        cellContent = <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-[10px]">Open</a>;
                      } else {
                        cellContent = displayValue;
                      }
                    }

                    return (
                      <td
                        key={`${col.key}-${colIdx}`}
                        className={`${cellClass} ${!isEditable ? 'cursor-pointer' : ''}`}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, background: READ_ONLY_FIELDS.has(col.key) ? FYI_COLOUR.cell : undefined }}
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

        {displayRecords.length === 0 && (
          <div className="text-center py-12 opacity-50">
            No records match the current search.
          </div>
        )}
      </div>
      )}

      {/* Expanded cell popup (positioned at click coordinates) */}
      {expandedCell && (
        <div
          className={`expanded-cell-popup fixed z-[100] max-w-md max-h-64 overflow-auto rounded shadow-xl border p-3 text-xs whitespace-pre-wrap ${
            theme === 'dark' ? 'bg-gray-900 text-gray-100 border-gray-600' : 'bg-white text-gray-900 border-gray-300'
          }`}
          style={{
            left: Math.min(expandedCell.x, window.innerWidth - 420),
            top: Math.min(expandedCell.y + 10, window.innerHeight - 270),
          }}
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className={`font-bold text-[10px] uppercase ${t.headerText}`}>
              {visibleColumns.find((c) => c.key === expandedCell.colKey)?.label || expandedCell.colKey}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { navigator.clipboard.writeText(expandedCell.value); }}
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

      {/* Text editor modal (for large text fields in edit mode) */}
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
            <div className="flex justify-end mt-2">
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
