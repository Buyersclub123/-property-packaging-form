'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail, hasValidUserEmail } from '@/lib/userAuth';

if (typeof document !== 'undefined') document.title = 'B&P & Finance Tool';

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
const TYPE_OF_PROPERTY_OPTIONS = ['', 'Established', 'House & Land', 'Land Only', 'SMSF'];

// Map field key → dropdown options (for edit mode)
const FIELD_OPTIONS: Record<string, string[]> = {
  bpExtensionStatus: BP_EXTENSION_STATUS_OPTIONS,
  bpConditionStatus: BP_CONDITION_STATUS_OPTIONS,
  insuranceStatus: INSURANCE_STATUS_OPTIONS,
  preSettlementInspectionStatus: PRE_SETTLEMENT_STATUS_OPTIONS,
  typeOfProperty: TYPE_OF_PROPERTY_OPTIONS,
};

// Fields that are checkboxes
const CHECKBOX_FIELDS = new Set(['bpRequested', 'financeFormalApproval']);
// Fields that are dates
const DATE_FIELDS = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpScheduledDate', 'confirmedSettlementDate', 'preSettlementInspectionDate']);
// Fields that are large text (get expand button in edit mode)
const LARGE_TEXT_FIELDS = new Set(['latestStatusUpdate', 'bpNegotiationDetail']);
const READ_ONLY_FIELDS = new Set(['id', 'name', 'pipelineStage', 'registeredAddress', 'assignedTo']);

// ============================================================================
// TYPES
// ============================================================================

interface OpportunityRecord {
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

interface ColumnDef {
  key: keyof OpportunityRecord;
  label: string;
  width: number;
}

interface ColumnSettings {
  color?: string;           // hex colour for the column group
  endStateValues?: string[]; // dropdown values that are "end states" (green highlight)
  isFYI?: boolean;          // mark as informational column (muted colour)
}

type SortDirection = 'asc' | 'desc' | null;
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
  insuranceStatus: ['Quote requested', 'Strata report requested', 'Sent to client', 'Invoiced', 'Paid', 'CoC issued', 'Client organising'],
  preSettlementInspectionStatus: ['Scheduled', 'Satisfied', 'Not satisfied'],
  typeOfProperty: ['Established', 'House & Land', 'Land Only', 'SMSF'],
};

// Baked-in default column settings (colours, end states, FYI)
const DEFAULT_COLUMN_SETTINGS: Record<string, ColumnSettings> = {
  name: { isFYI: true },
  pipelineStage: { isFYI: true },
  registeredAddress: { isFYI: true },
  assignedTo: { isFYI: true },
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
  { key: 'assignedTo', label: 'Assigned BA', width: 120 },
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
// MAIN COMPONENT
// ============================================================================

export default function BPFinancePage() {
  const [records, setRecords] = useState<OpportunityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Edit mode (hidden by default — Shift+double-click logo to reveal)
  const [showEditButton, setShowEditButton] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [editedRows, setEditedRows] = useState<Record<string, Partial<OpportunityRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

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

  // Sort state
  const [sortColumn, setSortColumn] = useState<keyof OpportunityRecord>('bpDueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Preset filter
  type PresetFilter = 'none' | 'blankPropertyType' | 'blankBpDueDate' | 'blankBpRequested' | 'bpDueNext5' | 'settlementNext5';
  const [activePreset, setActivePreset] = useState<PresetFilter>('none');

  // Filter state (Excel-style excluded values)
  const [excludedFilters, setExcludedFilters] = useState<Partial<Record<keyof OpportunityRecord, Set<string>>>>({});
  const [textExcludeFilters, setTextExcludeFilters] = useState<Partial<Record<keyof OpportunityRecord, string[]>>>({});
  const [filterSearch, setFilterSearch] = useState<Partial<Record<keyof OpportunityRecord, string>>>({});
  const [openFilterDropdown, setOpenFilterDropdown] = useState<keyof OpportunityRecord | null>(null);

  // Column state
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [expandedSettingsCol, setExpandedSettingsCol] = useState<keyof OpportunityRecord | null>(null);

  // Column settings — always use baked-in defaults (no localStorage)
  const columnSettings = DEFAULT_COLUMN_SETTINGS;

  function getColumnBg(colKey: string, isHeader: boolean): string {
    const s = columnSettings[colKey];
    if (!s) return '';
    if (s.isFYI) return isHeader ? FYI_COLOUR.header : FYI_COLOUR.cell;
    if (s.color) {
      const c = COLUMN_COLOURS.find((cc) => cc.name === s.color);
      if (c) return isHeader ? c.header : c.cell;
    }
    return '';
  }

  // Columns that cascade green when B&P Condition Status hits certain end states
  const BP_CASCADE_SATISFIED_SUBJECT_TO: Set<string> = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpExtensionStatus', 'bpScheduledDate']);
  const BP_CASCADE_SATISFIED: Set<string> = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpExtensionStatus', 'bpScheduledDate', 'bpNegotiationDetail']);

  function getCellBg(colKey: string, value: string, record?: OpportunityRecord): string {
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
    return getColumnBg(colKey, false);
  }

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bp-finance-theme');
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
      const saved = localStorage.getItem('bp-finance-row-height');
      if (saved === '1-line' || saved === '2-line' || saved === '3-line' || saved === 'auto') return saved;
    }
    return '1-line';
  });

  useEffect(() => {
    localStorage.setItem('bp-finance-row-height', rowHeight);
  }, [rowHeight]);

  const rowHeightStyle = rowHeight === '1-line' ? { maxHeight: '20px', overflow: 'hidden' as const }
    : rowHeight === '2-line' ? { maxHeight: '40px', overflow: 'hidden' as const }
    : rowHeight === '3-line' ? { maxHeight: '60px', overflow: 'hidden' as const }
    : {};

  // Expanded cell popup
  const [expandedCell, setExpandedCell] = useState<{ recordId: string; colKey: string; value: string; x: number; y: number } | null>(null);

  // Text editor modal (for large text fields in edit mode)
  const [textEditorModal, setTextEditorModal] = useState<{ recordId: string; colKey: keyof OpportunityRecord; label: string } | null>(null);


  // View (default = Established only, all = full pipeline)
  const [currentView, setCurrentView] = useState<'default' | 'all'>('default');
  const [showViewMenu, setShowViewMenu] = useState(false);

  // Export
  const [showExportMenu, setShowExportMenu] = useState(false);

  const t = THEMES[theme];

  // Persist theme
  useEffect(() => { localStorage.setItem('bp-finance-theme', theme); }, [theme]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setOpenFilterDropdown(null);
        setShowColumnMenu(false);
        setShowExportMenu(false);
        setShowViewMenu(false);
        setExpandedCell(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch data
  const [refreshing, setRefreshing] = useState(false);
  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setRefreshing(true);
    try {
      const url = currentView === 'all'
        ? '/api/shay-report/opportunities?view=all'
        : '/api/shay-report/opportunities';
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(data.records || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentView]);


  // Track last change check timestamp for webhook-driven updates
  const lastChangeCheck = useRef<number>(Date.now());
  // Grace period: don't remove records we just saved (prevents flicker from GHL indexing delay)
  const recentlySaved = useRef<Map<string, number>>(new Map());

  const pollChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/shay-report/changes?since=${lastChangeCheck.current}`);
      if (!res.ok) return;
      const data = await res.json();
      const changes = data.changes || [];
      if (changes.length === 0) return;

      // Update the timestamp to the latest change
      const maxTs = Math.max(...changes.map((c: any) => c.timestamp));
      lastChangeCheck.current = maxTs;

      // Fetch each changed opportunity individually (always current data)
      for (const change of changes) {
        try {
          const oppRes = await fetch(`/api/shay-report/opportunity/${change.opportunityId}`);
          if (!oppRes.ok) continue;
          const oppData = await oppRes.json();

          if (oppData.record) {
            // Merge or add this record into the list
            setRecords((prev) => {
              const idx = prev.findIndex((r) => r.id === oppData.record.id);
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = oppData.record;
                return updated;
              }
              return [...prev, oppData.record];
            });
          } else {
            // Record no longer meets criteria — but skip removal if we recently saved it (GHL indexing delay)
            const savedAt = recentlySaved.current.get(change.opportunityId);
            if (savedAt && Date.now() - savedAt < 30000) {
              // Grace period: skip removal
            } else {
              setRecords((prev) => prev.filter((r) => r.id !== change.opportunityId));
            }
          }
        } catch {}
      }
      setLastRefresh(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    // Full refresh every 60s (as fallback), webhook changes every 5s
    intervalRef.current = setInterval(() => fetchData(true), 60000);
    const changeInterval = setInterval(pollChanges, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(changeInterval);
    };
  }, [fetchData, pollChanges]);


  // ============================================================================
  // EDIT MODE
  // ============================================================================

  function getEditValue(recordId: string, key: keyof OpportunityRecord): string {
    return editedRows[recordId]?.[key] ?? records.find((r) => r.id === recordId)?.[key] ?? '';
  }

  function setEditValue(recordId: string, key: keyof OpportunityRecord, value: string) {
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
    return Object.entries(edits).some(([k, v]) => v !== original[k as keyof OpportunityRecord]);
  }

  async function saveRow(recordId: string) {
    const edits = editedRows[recordId];
    if (!edits) return;
    const original = records.find((r) => r.id === recordId);
    if (!original) return;

    const changes: Record<string, any> = {};
    const editableKeys: (keyof OpportunityRecord)[] = [
      'typeOfProperty', 'bpRequested', 'bpDueDate', 'bpRequestedExtensionDate',
      'bpExtensionStatus', 'bpScheduledDate', 'bpConditionStatus', 'bpNegotiationDetail',
      'financeFormalApproval', 'confirmedSettlementDate', 'insuranceStatus',
      'preSettlementInspectionDate', 'preSettlementInspectionStatus', 'latestStatusUpdate',
    ];

    for (const key of editableKeys) {
      const newVal = edits[key];
      if (newVal !== undefined && newVal !== original[key]) {
        if (CHECKBOX_FIELDS.has(key)) {
          changes[key] = newVal === 'Yes';
        } else {
          changes[key] = newVal;
        }
      }
    }

    const assignedTo = edits.assignedTo !== undefined && edits.assignedTo !== original.assignedTo ? edits.assignedTo : undefined;

    if (Object.keys(changes).length === 0 && assignedTo === undefined) return;

    setSavingIds((prev) => new Set(prev).add(recordId));
    try {
      const res = await fetch('/api/shay-report/update-opportunity', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: recordId, changes, assignedTo }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Save failed: ${data.error || res.status}`);
      } else {
        recentlySaved.current.set(recordId, Date.now());
        setRecords((prev) =>
          prev.map((r) => (r.id === recordId ? { ...r, ...edits } : r))
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

  const handleSort = useCallback((column: keyof OpportunityRecord) => {
    setSortColumn((prev) => {
      if (prev === column) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
        return column;
      }
      setSortDirection('asc');
      return column;
    });
  }, []);

  // ============================================================================
  // FILTERS
  // ============================================================================

  const toggleExcludeFilter = useCallback((column: keyof OpportunityRecord, value: string) => {
    setExcludedFilters((prev) => {
      const current = new Set(prev[column] || []);
      if (current.has(value)) { current.delete(value); } else { current.add(value); }
      return { ...prev, [column]: current };
    });
  }, []);

  const selectAllFilter = useCallback((column: keyof OpportunityRecord) => {
    setExcludedFilters((prev) => { const updated = { ...prev }; delete updated[column]; return updated; });
  }, []);

  const clearAllFilter = useCallback((column: keyof OpportunityRecord) => {
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

  function getDisplayValue(record: OpportunityRecord, key: keyof OpportunityRecord): string {
    const raw = record[key] || '';
    if (key === 'assignedTo') return USER_MAP[raw] || raw;
    if (DATE_FIELDS.has(key)) return formatDate(raw);
    return raw;
  }

  // Get unique values for filter dropdown
  const getUniqueValues = useCallback((column: keyof OpportunityRecord): string[] => {
    const values = new Set<string>();
    records.forEach((r) => { values.add(getDisplayValue(r, column) || '(blank)'); });
    return Array.from(values).sort();
  }, [records]);

  // Apply filters
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
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
        const displayValue = getDisplayValue(record, key as keyof OpportunityRecord) || '(blank)';
        return !(excludedSet as Set<string>).has(displayValue);
      });
      if (!passesExcluded) return false;

      // Check text exclude filters (does not contain)
      const passesTextExclude = Object.entries(textExcludeFilters).every(([key, patterns]) => {
        if (!patterns || patterns.length === 0) return true;
        const displayValue = getDisplayValue(record, key as keyof OpportunityRecord).toLowerCase();
        return patterns.every((p) => !displayValue.includes(p.toLowerCase()));
      });
      return passesTextExclude;
    });
  }, [records, excludedFilters, textExcludeFilters, activePreset]);

  // Apply sort
  const sortedRecords = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      const aVal = getDisplayValue(a, sortColumn);
      const bVal = getDisplayValue(b, sortColumn);

      // Empty values always sort to the bottom
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      let compare: number;
      if (DATE_FIELDS.has(sortColumn)) {
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
      return sortDirection === 'asc' ? compare : -compare;
    });
  }, [filteredRecords, sortColumn, sortDirection]);

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
    a.download = `bp-finance-${exportAll ? 'all' : 'filtered'}-${new Date().toISOString().slice(0, 10)}.csv`;
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
            <h1 className="text-lg font-bold text-gray-100">B&P & Finance Tool</h1>
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
          <p className="text-gray-300 text-lg">Loading B&P & Finance Tool...</p>
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
            onDoubleClick={(e) => { if (e.shiftKey) setShowEditButton((prev) => !prev); }}
          />
          <h1 className="text-lg font-bold">B&P & Finance Tool</h1>
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
          {/* Preset filter buttons */}
          {(['none', 'blankPropertyType', 'blankBpDueDate', 'blankBpRequested', 'bpDueNext5', 'settlementNext5'] as PresetFilter[]).map((preset) => {
            const labels: Record<PresetFilter, string> = {
              none: 'All',
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
                  if (preset === 'blankPropertyType' && currentView !== 'all') {
                    setCurrentView('all');
                  } else if (preset !== 'blankPropertyType' && preset !== 'none' && currentView !== 'default') {
                    setCurrentView('default');
                  }
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

          {/* Other Records */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className={`px-2 py-1 rounded text-xs ${
                currentView !== 'default' ? 'bg-purple-600 text-white' : `${t.inputBg} ${t.headerText} hover:opacity-80`
              }`}
            >
              {currentView === 'all' ? 'All Records' : 'Other Records'} ▼
            </button>
            {showViewMenu && (
              <div className={`absolute top-full left-0 mt-1 w-52 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                <button
                  onClick={() => { setCurrentView('default'); setShowViewMenu(false); setLoading(true); }}
                  className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg} ${currentView === 'default' ? 'font-bold' : ''}`}
                >
                  Established Only (Default)
                </button>
                <button
                  onClick={() => { setCurrentView('all'); setShowViewMenu(false); setLoading(true); }}
                  className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg} ${currentView === 'all' ? 'font-bold' : ''}`}
                >
                  All Finance Pipeline Records
                </button>
              </div>
            )}
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => { setExcludedFilters({}); setTextExcludeFilters({}); setFilterSearch({}); setActivePreset('none'); }}
            className={`px-2 py-1 rounded text-xs hover:opacity-80 border ${
              Object.keys(excludedFilters).length > 0 || Object.keys(textExcludeFilters).length > 0 || activePreset !== 'none'
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

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs" style={{ userSelect: resizingCol !== null ? 'none' : 'auto' }}>
          <thead className="sticky top-0 z-10">
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
                  className={`relative ${t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} cursor-move select-none`}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: getColumnBg(col.key, true) || undefined }}
                >
                  <div className="flex items-center gap-0.5 cursor-pointer overflow-hidden" onClick={() => handleSort(col.key)}>
                    <span className="text-[11px] leading-tight">{col.label}</span>
                    {sortColumn === col.key && (
                      <span className="text-blue-400 text-[10px]">
                        {sortDirection === 'asc' ? '▲' : sortDirection === 'desc' ? '▼' : ''}
                      </span>
                    )}
                  </div>

                  {/* Filter dropdown */}
                  <div className="mt-0.5 relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenFilterDropdown(openFilterDropdown === col.key ? null : col.key); }}
                      className={`w-full px-1 py-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} text-left truncate ${
                        (excludedFilters[col.key] && excludedFilters[col.key]!.size > 0) || (textExcludeFilters[col.key] && textExcludeFilters[col.key]!.length > 0) ? 'border-blue-500 text-blue-400' : ''
                      }`}
                    >
                      {(excludedFilters[col.key] && excludedFilters[col.key]!.size > 0) || (textExcludeFilters[col.key] && textExcludeFilters[col.key]!.length > 0)
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
                          <button onClick={() => { handleSort(col.key); setSortDirection('asc'); }} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>A→Z</button>
                          <button onClick={() => { handleSort(col.key); setSortDirection('desc'); }} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>Z→A</button>
                        </div>

                        {/* Text exclude (does not contain) */}
                        <div className={`mb-1 px-1 border-b ${t.inputBorder} pb-1`}>
                          <div className={`text-[9px] ${t.headerText} mb-0.5 font-medium`}>Exclude text containing:</div>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="e.g. Lot"
                              id={`text-exclude-${col.key}`}
                              className={`flex-1 px-1.5 py-0.5 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.text} placeholder-gray-500 focus:outline-none`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const input = e.target as HTMLInputElement;
                                  const val = input.value.trim();
                                  if (val) {
                                    setTextExcludeFilters((prev) => ({
                                      ...prev,
                                      [col.key]: [...(prev[col.key] || []), val],
                                    }));
                                    input.value = '';
                                  }
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`text-exclude-${col.key}`) as HTMLInputElement;
                                const val = input?.value.trim();
                                if (val) {
                                  setTextExcludeFilters((prev) => ({
                                    ...prev,
                                    [col.key]: [...(prev[col.key] || []), val],
                                  }));
                                  input.value = '';
                                }
                              }}
                              className="text-[9px] px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Add
                            </button>
                          </div>
                          {(textExcludeFilters[col.key] || []).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(textExcludeFilters[col.key] || []).map((pattern, i) => (
                                <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] bg-red-900/40 text-red-300 rounded">
                                  &ldquo;{pattern}&rdquo;
                                  <button
                                    onClick={() => setTextExcludeFilters((prev) => ({
                                      ...prev,
                                      [col.key]: (prev[col.key] || []).filter((_, idx) => idx !== i),
                                    }))}
                                    className="ml-0.5 text-red-400 hover:text-red-200"
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
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
                <tr key={record.id} className={`${t.hoverBg} ${isSelected ? (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50') : ''} ${rowEdited ? (theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50') : ''}`}>
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


                  {columns.map((col) => {
                    const rawValue = record[col.key] || '';
                    const displayValue = getDisplayValue(record, col.key);
                    const isEditable = editMode && isSelected && !READ_ONLY_FIELDS.has(col.key);
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
                      } else if (FIELD_OPTIONS[col.key]) {
                        cellContent = (
                          <select
                            value={currentValue}
                            onChange={(e) => setEditValue(record.id, col.key, e.target.value)}
                            className={`w-full text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-0.5 py-0 ${t.text}`}
                          >
                            {FIELD_OPTIONS[col.key].map((opt) => (
                              <option key={opt} value={opt}>{opt || '-- None --'}</option>
                            ))}
                          </select>
                        );
                      } else if (CHECKBOX_FIELDS.has(col.key)) {
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
                      cellContent = displayValue;
                    }

                    return (
                      <td
                        key={col.key}
                        className={`${cellClass} ${!isEditable ? 'cursor-pointer' : ''}`}
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: getCellBg(col.key, rawValue, record) || undefined }}
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
