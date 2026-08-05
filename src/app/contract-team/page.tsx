'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
}

const FINANCE_PIPELINE_ID = 'zgBRaMnACpskyf1wHCEV';

// ============================================================================
// COLUMN DEFINITIONS — per-view column sets
// ============================================================================

const SHAY_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'bpRequested', label: 'B&P Requested?', width: 90, type: 'yesblank' },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110, type: 'date' },
  { key: 'bpExtensionStatus', label: 'B&P Extension', width: 110, type: 'dropdown', options: ['', 'Requested', 'Accepted', 'Declined'] },
  { key: 'bpScheduledDate', label: 'B&P Scheduled', width: 110, type: 'date' },
  { key: 'bpConditionStatus', label: 'B&P Condition', width: 130, type: 'dropdown', options: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'] },
  { key: 'bpNegotiationDetail', label: 'B&P Negotiation Detail', width: 200, type: 'multiline' },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval', width: 100, type: 'yesblank' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement', width: 120, type: 'date' },
  { key: 'insuranceStatus', label: 'Insurance Status', width: 120, type: 'dropdown', options: ['', 'Quote requested', 'Sent to client', 'Client organising', 'CoC issued'] },
  { key: 'preSettlementInspectionDate', label: 'Pre-settlement Date', width: 120, type: 'date' },
  { key: 'preSettlementInspectionStatus', label: 'Pre-settlement Status', width: 120, type: 'dropdown', options: ['', 'Scheduled', 'Satisfied', 'Not satisfied'] },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
];

const FULL_FC_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days Since Stage Change', width: 80, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'settlementDate', label: 'Settlement Date', width: 120, type: 'date' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100, type: 'yesblank' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'personalName', label: 'PERSONAL Name', width: 160, type: 'readonly' },
  { key: 'status', label: 'Status', width: 80, type: 'readonly' },
  { key: 'contactEmail', label: 'Contact Email', width: 180, type: 'readonly' },
  { key: 'contactPhone', label: 'Contact Phone', width: 130, type: 'readonly' },
];

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'ghlLink', label: 'GHL', width: 50, type: 'readonly' },
  { key: 'opportunityName', label: 'Opportunity Name', width: 220, type: 'readonly' },
  { key: 'registeredAddress', label: 'Registered Address', width: 220, type: 'readonly' },
  { key: 'stage', label: 'Stage', width: 140, type: 'readonly' },
  { key: 'pipelineName', label: 'Pipeline', width: 100, type: 'readonly' },
  { key: 'daysSinceStageChange', label: 'Days Since Stage Change', width: 80, type: 'readonly' },
  { key: 'bpRequested', label: 'B&P Requested?', width: 90, type: 'yesblank' },
  { key: 'bpDueDate', label: 'B&P Due Date', width: 110, type: 'date' },
  { key: 'bpExtensionStatus', label: 'B&P Extension Status', width: 110, type: 'dropdown', options: ['', 'Requested', 'Accepted', 'Declined'] },
  { key: 'bpScheduledDate', label: 'B&P Scheduled Date', width: 110, type: 'date' },
  { key: 'bpConditionStatus', label: 'B&P Condition Status', width: 130, type: 'dropdown', options: ['', 'Sent for review', 'In negotiation', 'Satisfied subject to', 'Satisfied', 'Not satisfied'] },
  { key: 'bpNegotiationDetail', label: 'B&P Negotiation Detail', width: 200, type: 'multiline' },
  { key: 'bpRequestedExtensionDate', label: 'B&P Requested Extension Date', width: 120, type: 'date' },
  { key: 'financeApprovalReceived', label: 'Finance Formal Approval', width: 100, type: 'yesblank' },
  { key: 'financeDueDate', label: 'Finance Due Date', width: 110, type: 'date' },
  { key: 'financeExtensionStatus', label: 'Finance Extension Status', width: 120, type: 'text' },
  { key: 'financeRequestedExtensionDate', label: 'Finance Requested Extension Date', width: 130, type: 'date' },
  { key: 'confirmedSettlementDate', label: 'Confirmed Settlement Date', width: 120, type: 'date' },
  { key: 'settlementDate', label: 'Settlement Date', width: 120, type: 'date' },
  { key: 'unconditionalDate', label: 'Unconditional Date', width: 120, type: 'date' },
  { key: 'exchangeDate', label: 'Exchange Date', width: 110, type: 'date' },
  { key: 'insuranceStatus', label: 'Insurance Status', width: 120, type: 'dropdown', options: ['', 'Quote requested', 'Sent to client', 'Client organising', 'CoC issued'] },
  { key: 'preSettlementInspectionDate', label: 'Pre-settlement Inspection Date', width: 120, type: 'date' },
  { key: 'preSettlementInspectionStatus', label: 'Pre-settlement Inspection Status', width: 130, type: 'dropdown', options: ['', 'Scheduled', 'Satisfied', 'Not satisfied'] },
  { key: 'registration', label: 'Registration', width: 100, type: 'text' },
  { key: 'registrationDateETA', label: 'Registration Date (ETA)', width: 120, type: 'date' },
  { key: 'buildDepositIssued', label: 'Build Deposit Issued', width: 100, type: 'yesblank' },
  { key: 'buildDepositIssuedDate', label: 'Build Deposit Issued Date', width: 120, type: 'date' },
  { key: 'buildDepositPaid', label: 'Build Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'landDepositPaid', label: 'Land Deposit Paid', width: 100, type: 'yesblank' },
  { key: 'pmIntroSent', label: 'PM Intro Sent', width: 100, type: 'yesblank' },
  { key: 'latestStatusUpdate', label: 'Latest Status Update', width: 250, type: 'multiline' },
  { key: 'agentBuilderDetails', label: 'Agent/Builder Details', width: 200, type: 'multiline' },
  { key: 'lastFinanceUpdateDate', label: 'Last Finance Update Date', width: 120, type: 'date' },
  { key: 'lastConstructionUpdateDate', label: 'Last Construction Update Date', width: 130, type: 'date' },
  { key: 'briefNotes', label: 'Brief Notes', width: 250, type: 'multiline' },
  { key: 'personalName', label: 'PERSONAL Name', width: 160, type: 'readonly' },
  { key: 'brokerName', label: 'Broker Name', width: 140, type: 'readonly' },
  { key: 'brokerCompany', label: 'Broker Company', width: 140, type: 'readonly' },
  { key: 'solicitorName', label: 'Solicitor Name', width: 140, type: 'readonly' },
  { key: 'status', label: 'Status', width: 80, type: 'readonly' },
  { key: 'contactEmail', label: 'Contact Email', width: 180, type: 'readonly' },
  { key: 'contactPhone', label: 'Contact Phone', width: 130, type: 'readonly' },
];

// ============================================================================
// PRESET VIEWS
// ============================================================================

const PRESET_VIEWS: ViewDef[] = [
  {
    name: 'Shay Report',
    columns: SHAY_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
      { field: 'stage', operator: 'not equals', value: 'Settled' },
      {
        field: 'opportunityName',
        operator: 'not in',
        value: 'ndrew Youssef PERS IP1, (DUPLICATE) Frances Obsequio CADIZ and Derek Buaya SMSF IP1, (SMSF DUPLICATE) Brett and Jane Funch SMSF IP1, Robert & Samathana Cannone PERS IP1, Anantha Reddy Vantedhu SMSF IP2, Maria & Ricky',
      },
      { field: 'registeredAddress', operator: 'not contains', value: 'Lot' },
    ],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'Full F&C',
    columns: FULL_FC_COLUMNS,
    filters: [],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'Finance Only',
    columns: FULL_FC_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: FINANCE_PIPELINE_ID },
    ],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'Construction Only',
    columns: FULL_FC_COLUMNS,
    filters: [
      { field: 'pipelineId', operator: 'equals', value: 'XMKCHlqekS7IU87PNLKB' },
    ],
    sortBy: 'confirmedSettlementDate',
    sortDir: 'asc',
  },
  {
    name: 'ZZZ Test Records',
    columns: ALL_COLUMNS,
    filters: [
      { field: 'opportunityName', operator: 'contains', value: 'zzz' },
    ],
    sortBy: 'opportunityName',
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
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}


// ============================================================================
// CELL COMPONENTS
// ============================================================================

function ReadOnlyCell({ value, column }: { value: string; column: ColumnDef }) {
  if (column.key === 'ghlLink' && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
        Open
      </a>
    );
  }

  if (column.type === 'date') {
    return <span title={value}>{formatDateDisplay(value)}</span>;
  }

  if (column.type === 'multiline') {
    return <span className="whitespace-pre-wrap" title={value}>{value}</span>;
  }

  return <span title={value}>{value}</span>;
}

function EditableCell({
  value,
  column,
  recordId,
  onSave,
}: {
  value: string;
  column: ColumnDef;
  recordId: string;
  onSave: (recordId: string, field: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const save = async (newValue: string) => {
    if (newValue === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(recordId, column.key, newValue);
      setLocalValue(newValue);
    } catch {
      setLocalValue(value); // revert on failure
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (saving) {
    return <span className="text-xs text-amber-400 italic">Saving...</span>;
  }

  // Yes/blank toggle
  if (column.type === 'yesblank') {
    const isYes = localValue.toLowerCase() === 'yes';
    return (
      <button
        onClick={() => save(isYes ? '' : 'Yes')}
        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
          isYes
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
      >
        {isYes ? 'Yes' : '—'}
      </button>
    );
  }

  // Date — react-datepicker calendar popup
  if (column.type === 'date') {
    const dateObj = localValue ? new Date(localValue) : null;
    return (
      <DatePicker
        selected={dateObj && !isNaN(dateObj.getTime()) ? dateObj : null}
        onChange={async (date: Date | null) => {
          const newVal = date ? date.toISOString().split('T')[0] : '';
          setLocalValue(newVal);
          setSaving(true);
          try {
            await onSave(recordId, column.key, newVal);
          } catch {
            setLocalValue(value);
          } finally {
            setSaving(false);
          }
        }}
        dateFormat="d/MM/yyyy"
        placeholderText="Select date"
        isClearable
        className="w-full px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500 cursor-pointer"
        calendarClassName="dark-calendar"
        popperPlacement="bottom-start"
      />
    );
  }

  // Dropdown
  if (column.type === 'dropdown') {
    return (
      <select
        value={localValue}
        onChange={(e) => save(e.target.value)}
        className="w-full px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-gray-200 focus:outline-none focus:border-blue-500"
      >
        {column.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt || '(blank)'}
          </option>
        ))}
      </select>
    );
  }

  // Multiline text
  if (column.type === 'multiline') {
    if (!editing) {
      return (
        <div
          onClick={() => setEditing(true)}
          className="cursor-pointer min-h-[24px] whitespace-pre-wrap text-xs hover:bg-gray-800 rounded px-1 py-0.5"
          title="Click to edit"
        >
          {localValue || <span className="text-gray-600 italic">Click to edit</span>}
        </div>
      );
    }
    return (
      <textarea
        autoFocus
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => save(localValue)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setLocalValue(value); setEditing(false); }
        }}
        rows={3}
        className="w-full px-1 py-0.5 text-xs bg-gray-800 border border-blue-500 rounded text-gray-200 focus:outline-none resize-y"
      />
    );
  }

  // Default text
  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className="cursor-pointer min-h-[20px] text-xs hover:bg-gray-800 rounded px-1 py-0.5"
        title="Click to edit"
      >
        {localValue || <span className="text-gray-600 italic">—</span>}
      </div>
    );
  }
  return (
    <input
      autoFocus
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => save(localValue)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save(localValue);
        if (e.key === 'Escape') { setLocalValue(value); setEditing(false); }
      }}
      className="w-full px-1 py-0.5 text-xs bg-gray-800 border border-blue-500 rounded text-gray-200 focus:outline-none"
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContractTeamPage() {
  const [records, setRecords] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  // Active view
  const [activeView, setActiveView] = useState<ViewDef>(PRESET_VIEWS[0]);

  // Sort
  const [sortColumn, setSortColumn] = useState<keyof ContractRecord>(PRESET_VIEWS[0].sortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(PRESET_VIEWS[0].sortDir);

  // Filter
  const [searchText, setSearchText] = useState('');

  // Load username from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('contract-team-username');
    if (savedName) setUserName(savedName);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
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
      setEditMode(false);
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

  // Save field to GHL
  const handleSave = useCallback(async (recordId: string, field: string, value: string) => {
    const res = await fetch('/api/contract-team/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: recordId, field, value }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Update failed');
    }
    // Update local state
    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, [field]: value } : r))
    );
  }, []);

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

  // Switch view handler
  const handleViewChange = useCallback((view: ViewDef) => {
    setActiveView(view);
    setSortColumn(view.sortBy);
    setSortDirection(view.sortDir);
  }, []);

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

    // 3. Apply sort
    if (!sortColumn || !sortDirection) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortColumn] || '';
      const bVal = b[sortColumn] || '';
      // Try date comparison
      const aDate = new Date(aVal).getTime();
      const bDate = new Date(bVal).getTime();
      if (!isNaN(aDate) && !isNaN(bDate)) {
        // Blanks go last
        if (!aVal) return 1;
        if (!bVal) return -1;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }
      const compare = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [records, activeView, searchText, sortColumn, sortDirection]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading Contract Team Data...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching opportunities from GHL</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error: {error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 w-80 border border-gray-600">
            <h3 className="text-white font-bold mb-3">Enter your name</h3>
            <p className="text-gray-400 text-sm mb-4">This identifies who is editing records.</p>
            <input
              autoFocus
              type="text"
              placeholder="Your name..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
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
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Buyers Club" className="h-7 w-auto" />
          <h1 className="text-lg font-bold">Contract Team</h1>
          <span className="text-xs text-gray-400">
            {displayRecords.length} of {records.length} records
          </span>

          {/* View selector */}
          <div className="flex items-center gap-1 ml-2">
            {PRESET_VIEWS.map((view) => (
              <button
                key={view.name}
                onClick={() => handleViewChange(view)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  activeView.name === view.name
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                }`}
              >
                {view.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search name or address..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="px-3 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56"
          />

          {/* Edit Toggle */}
          <div className="flex items-center gap-2">
            {userName && editMode && (
              <span className="text-xs text-green-400">
                Editing as: {userName}
              </span>
            )}
            <button
              onClick={handleToggleEdit}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                editMode
                  ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-400/50'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {editMode ? '🔓 Editing ON' : '🔒 Read Only'}
            </button>
            {userName && !editMode && (
              <button
                onClick={() => {
                  setUserName('');
                  localStorage.removeItem('contract-team-username');
                }}
                className="text-xs text-gray-500 hover:text-gray-400"
                title="Change user"
              >
                ({userName})
              </button>
            )}
          </div>

          {/* Refresh */}
          {fetchedAt && (
            <span className="text-xs text-gray-500">
              {new Date(fetchedAt).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchData}
            className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Edit mode banner */}
      {editMode && (
        <div className="px-4 py-1.5 bg-amber-900/30 border-b border-amber-700/50 text-xs text-amber-300">
          ✏️ Edit mode active — click any editable cell to modify. Changes save immediately to GHL.
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs w-full" style={{ minWidth: activeView.columns.reduce((sum, c) => sum + c.width, 0) }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {activeView.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="bg-gray-800 border border-gray-700 px-2 py-2 text-left font-medium text-gray-300 cursor-pointer select-none whitespace-nowrap hover:bg-gray-750"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">{col.label}</span>
                    {sortColumn === col.key && sortDirection && (
                      <span className="text-blue-400 text-[10px]">
                        {sortDirection === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                    {col.type !== 'readonly' && editMode && (
                      <span className="text-amber-500 text-[9px]">✎</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-800/50">
                {activeView.columns.map((col) => {
                  const value = record[col.key] || '';
                  const isEditable = editMode && col.type !== 'readonly';

                  // Cell styling — read-only columns darker, editable columns light green tint
                  let cellClass = 'border border-gray-800 px-2 py-1.5 align-top';
                  if (col.type === 'readonly') {
                    cellClass += ' bg-gray-900/60 text-gray-400';
                  } else if (editMode) {
                    cellClass += ' bg-green-950/40';
                  }

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

                  return (
                    <td
                      key={col.key}
                      className={cellClass}
                      style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                    >
                      {isEditable ? (
                        <EditableCell
                          value={value}
                          column={col}
                          recordId={record.id}
                          onSave={handleSave}
                        />
                      ) : (
                        <ReadOnlyCell value={value} column={col} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {displayRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No records match the current search.
          </div>
        )}
      </div>
    </div>
  );
}
