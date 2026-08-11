'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

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

// Map field key → dropdown options (for edit mode)
const FIELD_OPTIONS: Record<string, string[]> = {
  bpExtensionStatus: BP_EXTENSION_STATUS_OPTIONS,
  bpConditionStatus: BP_CONDITION_STATUS_OPTIONS,
  insuranceStatus: INSURANCE_STATUS_OPTIONS,
  preSettlementInspectionStatus: PRE_SETTLEMENT_STATUS_OPTIONS,
};

// Fields that are checkboxes
const CHECKBOX_FIELDS = new Set(['bpRequested', 'financeFormalApproval']);
// Fields that are dates
const DATE_FIELDS = new Set(['bpDueDate', 'bpRequestedExtensionDate', 'bpScheduledDate', 'confirmedSettlementDate', 'preSettlementInspectionDate']);

// ============================================================================
// TYPES
// ============================================================================

interface OpportunityRecord {
  id: string;
  ghlLink: string;
  name: string;
  registeredAddress: string;
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

type SortDirection = 'asc' | 'desc' | null;
type Theme = 'dark' | 'light';

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Opportunity Name', width: 200 },
  { key: 'registeredAddress', label: 'Registered Address', width: 200 },
  { key: 'bpRequested', label: 'B&P Req?', width: 70 },
  { key: 'assignedTo', label: 'Assigned BA', width: 120 },
  { key: 'bpDueDate', label: 'B&P Due', width: 95 },
  { key: 'bpRequestedExtensionDate', label: 'B&P Ext Date', width: 95 },
  { key: 'bpExtensionStatus', label: 'B&P Ext Status', width: 110 },
  { key: 'bpScheduledDate', label: 'B&P Scheduled', width: 95 },
  { key: 'bpConditionStatus', label: 'B&P Condition', width: 120 },
  { key: 'bpNegotiationDetail', label: 'B&P Negotiation', width: 160 },
  { key: 'financeFormalApproval', label: 'Finance Approved', width: 80 },
  { key: 'confirmedSettlementDate', label: 'Settlement Date', width: 100 },
  { key: 'insuranceStatus', label: 'Insurance', width: 130 },
  { key: 'preSettlementInspectionDate', label: 'Pre-settle Date', width: 100 },
  { key: 'preSettlementInspectionStatus', label: 'Pre-settle Status', width: 110 },
  { key: 'latestStatusUpdate', label: 'Latest Update', width: 180 },
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

  // Edit mode (global toggle)
  const [editMode, setEditMode] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, Partial<OpportunityRecord>>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  // Sort state
  const [sortColumn, setSortColumn] = useState<keyof OpportunityRecord>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter state (Excel-style excluded values)
  const [excludedFilters, setExcludedFilters] = useState<Partial<Record<keyof OpportunityRecord, Set<string>>>>({});
  const [filterSearch, setFilterSearch] = useState<Partial<Record<keyof OpportunityRecord, string>>>({});
  const [openFilterDropdown, setOpenFilterDropdown] = useState<keyof OpportunityRecord | null>(null);

  // Column state
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);
  const [showColumnMenu, setShowColumnMenu] = useState(false);

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bp-finance-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });

  // Max cell height
  const [maxCellHeight, setMaxCellHeight] = useState(60);

  // Expanded cell popup
  const [expandedCell, setExpandedCell] = useState<{ recordId: string; colKey: string; value: string; x: number; y: number } | null>(null);

  // Exclusions
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [showExclusions, setShowExclusions] = useState(false);
  const [newExclusion, setNewExclusion] = useState('');

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
        setExpandedCell(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/shay-report/opportunities');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(data.records || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExclusions = useCallback(async () => {
    try {
      const res = await fetch('/api/shay-report/exclusions');
      if (res.ok) {
        const data = await res.json();
        setExclusions(data.exclusions || []);
      }
    } catch {}
  }, []);

  // Track last change check timestamp for webhook-driven updates
  const lastChangeCheck = useRef<number>(Date.now());

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
            // Record no longer meets criteria — remove it
            setRecords((prev) => prev.filter((r) => r.id !== change.opportunityId));
          }
        } catch {}
      }
      setLastRefresh(new Date());
    } catch {}
  }, []);

  useEffect(() => {
    fetchData();
    fetchExclusions();
    // Full refresh every 60s (as fallback), webhook changes every 5s
    intervalRef.current = setInterval(fetchData, 60000);
    const changeInterval = setInterval(pollChanges, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(changeInterval);
    };
  }, [fetchData, fetchExclusions, pollChanges]);

  // ============================================================================
  // EXCLUSIONS
  // ============================================================================

  async function excludeRecord(name: string) {
    if (!confirm(`Exclude "${name}" from this report?`)) return;
    const res = await fetch('/api/shay-report/exclusions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setExclusions(data.exclusions);
      setRecords((prev) => prev.filter((r) => r.name !== name));
    }
  }

  async function removeExclusion(name: string) {
    const res = await fetch('/api/shay-report/exclusions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setExclusions(data.exclusions);
      fetchData();
    }
  }

  async function addManualExclusion() {
    if (!newExclusion.trim()) return;
    const res = await fetch('/api/shay-report/exclusions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newExclusion.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setExclusions(data.exclusions);
      setNewExclusion('');
      fetchData();
    }
  }

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
      'registeredAddress', 'bpRequested', 'bpDueDate', 'bpRequestedExtensionDate',
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
      return Object.entries(excludedFilters).every(([key, excludedSet]) => {
        if (!excludedSet || (excludedSet as Set<string>).size === 0) return true;
        const displayValue = getDisplayValue(record, key as keyof OpportunityRecord) || '(blank)';
        return !(excludedSet as Set<string>).has(displayValue);
      });
    });
  }, [records, excludedFilters]);

  // Apply sort
  const sortedRecords = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      const aVal = getDisplayValue(a, sortColumn);
      const bVal = getDisplayValue(b, sortColumn);
      const compare = aVal.localeCompare(bVal);
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
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Retry</button>
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
          <img src="/logo.jpg" alt="Buyers Club" className="h-7 w-auto" />
          <h1 className="text-lg font-bold">B&P & Finance Tool</h1>
          <span className="text-xs opacity-60">{sortedRecords.length} records</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Mode toggle */}
          <button
            onClick={() => {
              if (editMode && editedCount > 0) {
                if (!confirm(`You have ${editedCount} unsaved changes. Discard?`)) return;
                discardAllEdits();
              }
              setEditMode(!editMode);
            }}
            className={`px-2 py-1 rounded text-xs font-medium ${
              editMode ? 'bg-yellow-500 text-black' : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
          </button>

          {/* Save All (visible in edit mode with changes) */}
          {editMode && editedCount > 0 && (
            <button
              onClick={saveAllEdits}
              className="px-2 py-1 rounded text-xs bg-green-600 text-white hover:bg-green-700"
            >
              Save All ({editedCount})
            </button>
          )}

          {/* Exclusions */}
          <button
            onClick={() => setShowExclusions(!showExclusions)}
            className={`px-2 py-1 rounded text-xs ${
              showExclusions ? 'bg-orange-600 text-white' : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            Exclusions ({exclusions.length})
          </button>

          {/* Clear Filters */}
          <button
            onClick={() => { setExcludedFilters({}); setFilterSearch({}); }}
            className={`px-2 py-1 rounded text-xs hover:opacity-80 border ${
              Object.keys(excludedFilters).length > 0
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

          {/* Column toggle */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
            >
              Columns
            </button>
            {showColumnMenu && (
              <div className={`absolute top-full right-0 mt-1 w-52 ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-2 max-h-80 overflow-y-auto`}>
                <div className={`text-xs font-bold ${t.headerText} mb-2`}>SHOW / HIDE COLUMNS</div>
                {DEFAULT_COLUMNS.map((col) => {
                  const isVisible = columns.some((c) => c.key === col.key);
                  return (
                    <label key={col.key} className={`flex items-center gap-2 px-2 py-1 text-xs ${t.headerText} ${t.hoverBg} rounded cursor-pointer`}>
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {
                          if (isVisible) { setColumns((prev) => prev.filter((c) => c.key !== col.key)); }
                          else {
                            const defIdx = DEFAULT_COLUMNS.findIndex((c) => c.key === col.key);
                            setColumns((prev) => {
                              const next = [...prev];
                              let insertAt = next.length;
                              for (let i = defIdx + 1; i < DEFAULT_COLUMNS.length; i++) {
                                const idx = next.findIndex((c) => c.key === DEFAULT_COLUMNS[i].key);
                                if (idx !== -1) { insertAt = idx; break; }
                              }
                              next.splice(insertAt, 0, col);
                              return next;
                            });
                          }
                        }}
                        className="accent-blue-500"
                      />
                      {col.label}
                    </label>
                  );
                })}
                <div className={`border-t ${t.inputBorder} mt-2 pt-2`}>
                  <button onClick={() => setColumns([...DEFAULT_COLUMNS])} className={`block w-full text-left px-2 py-1 text-xs ${t.headerText} ${t.hoverBg} rounded`}>
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>

          {lastRefresh && <span className="text-xs opacity-50">{lastRefresh.toLocaleTimeString()}</span>}

          <button onClick={fetchData} className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}>
            Refresh
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Exclusions panel */}
      {showExclusions && (
        <div className={`px-4 py-3 border-b ${t.cellBorder} ${t.headerBg}`}>
          <h3 className={`text-xs font-semibold mb-2 ${t.headerText}`}>Excluded Opportunities</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newExclusion}
              onChange={(e) => setNewExclusion(e.target.value)}
              placeholder="Add opportunity name to exclude..."
              className={`flex-1 text-xs ${t.inputBg} border ${t.inputBorder} rounded px-2 py-1 ${t.text}`}
              onKeyDown={(e) => e.key === 'Enter' && addManualExclusion()}
            />
            <button onClick={addManualExclusion} className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">Add</button>
          </div>
          {exclusions.length === 0 ? (
            <p className={`text-xs ${t.headerText}`}>No exclusions set</p>
          ) : (
            <ul className="space-y-1 max-h-[200px] overflow-y-auto">
              {exclusions.map((name) => (
                <li key={name} className={`flex items-center justify-between px-2 py-1 text-xs rounded border ${t.inputBorder} ${t.inputBg}`}>
                  <span>{name}</span>
                  <button
                    onClick={() => removeExclusion(name)}
                    className="text-red-400 hover:text-red-300 ml-2 text-xs whitespace-nowrap"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs" style={{ userSelect: resizingCol !== null ? 'none' : 'auto' }}>
          <thead className="sticky top-0 z-10">
            <tr>
              {/* GHL Link column (fixed) */}
              <th className={`${t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} whitespace-nowrap`} style={{ width: 40, minWidth: 40 }}>
                <span className="text-[11px]">Link</span>
              </th>

              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  draggable={resizingCol === null}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} cursor-move select-none whitespace-nowrap`}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                >
                  <div className="flex items-center gap-0.5 cursor-pointer overflow-hidden" onClick={() => handleSort(col.key)}>
                    <span className="truncate text-[11px]">{col.label}</span>
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
                        excludedFilters[col.key] && excludedFilters[col.key]!.size > 0 ? 'border-blue-500 text-blue-400' : ''
                      }`}
                    >
                      {excludedFilters[col.key] && excludedFilters[col.key]!.size > 0
                        ? `▼ ${excludedFilters[col.key]!.size} hidden`
                        : '▼ Filter'}
                    </button>

                    {openFilterDropdown === col.key && (
                      <div
                        className={`absolute top-full left-0 mt-1 w-48 max-h-64 overflow-y-auto ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-1 dropdown-container`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Sort A-Z / Z-A */}
                        <div className={`flex gap-1 mb-1 px-1 border-b ${t.inputBorder} pb-1`}>
                          <button onClick={() => { handleSort(col.key); setSortDirection('asc'); }} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>A→Z</button>
                          <button onClick={() => { handleSort(col.key); setSortDirection('desc'); }} className={`text-[9px] ${t.headerText} hover:text-blue-400`}>Z→A</button>
                        </div>
                        {/* Search */}
                        <input
                          type="text"
                          placeholder="Search..."
                          value={filterSearch[col.key] || ''}
                          onChange={(e) => setFilterSearch((prev) => ({ ...prev, [col.key]: e.target.value }))}
                          className={`w-full px-1.5 py-0.5 mb-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                        />
                        {/* Select All / Clear */}
                        <div className="flex gap-1 mb-1 px-1">
                          <button onClick={() => selectAllFilter(col.key)} className="text-[9px] text-blue-400 hover:underline">Select All</button>
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

              {/* Hide column (in edit mode) */}
              {editMode && (
                <th className={`${t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} whitespace-nowrap`} style={{ width: 50, minWidth: 50 }}>
                  <span className="text-[11px]">Hide</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => {
              const rowEdited = hasEdits(record.id);
              const rowSaving = savingIds.has(record.id);

              return (
                <tr key={record.id} className={`${t.hoverBg} ${rowEdited ? (theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-50') : ''}`}>
                  {/* GHL Link */}
                  <td className={`border ${t.cellBorder} px-1.5 py-1 text-center`} style={{ width: 40 }}>
                    <a href={record.ghlLink} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-[10px]">
                      Open
                    </a>
                  </td>

                  {columns.map((col) => {
                    const rawValue = record[col.key] || '';
                    const displayValue = getDisplayValue(record, col.key);
                    const isEditable = editMode && col.key !== 'id' && col.key !== 'name';
                    const currentValue = editMode ? getEditValue(record.id, col.key) : rawValue;
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
                        style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                        title={displayValue}
                        onClick={(e) => {
                          if (!isEditable && displayValue && displayValue.length > 30) {
                            setExpandedCell({ recordId: record.id, colKey: col.key, value: displayValue, x: e.clientX, y: e.clientY });
                          }
                        }}
                      >
                        <div style={{ maxHeight: maxCellHeight > 0 ? maxCellHeight : undefined, overflow: maxCellHeight > 0 ? 'hidden' : undefined }}>
                          {cellContent}
                        </div>
                      </td>
                    );
                  })}

                  {/* Hide button (edit mode) */}
                  {editMode && (
                    <td className={`border ${t.cellBorder} px-1 py-1 text-center`} style={{ width: 50 }}>
                      {rowSaving ? (
                        <span className="text-[10px] opacity-50">...</span>
                      ) : rowEdited ? (
                        <button onClick={() => saveRow(record.id)} className="px-1.5 py-0.5 text-[10px] bg-green-600 text-white rounded hover:bg-green-700">Save</button>
                      ) : (
                        <button onClick={() => excludeRecord(record.name)} className="text-orange-400 hover:text-orange-300 text-[10px]" title="Hide from report">x</button>
                      )}
                    </td>
                  )}
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
            <button onClick={() => setExpandedCell(null)} className={`${t.headerText} hover:${t.text} text-sm leading-none`}>x</button>
          </div>
          <div>{expandedCell.value}</div>
        </div>
      )}
    </div>
  );
}
