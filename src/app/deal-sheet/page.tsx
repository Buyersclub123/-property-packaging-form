'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAutoRefreshPause } from '@/lib/useAutoRefreshPause';
import EoiLinkModal, { EoiLinkPayload, EoiUpdatePayload } from './EoiLinkModal';

// Set page title
if (typeof document !== 'undefined') document.title = 'Deal Sheet';

// ============================================================================
// TYPES
// ============================================================================

interface DealRecord {
  id: string;
  type: string;
  packager: string;
  sourcer: string;
  status: string;
  reviewDate: string;
  lastUpdate: string;
  packagerApproved: string;
  qaApproved: string;
  propertyAddress: string;
  asking: string;
  priceGroup: string;
  baMessage: string;
  acceptAcqTotal: string;
  closePrefill: string;
  config: string;
  currentRent: string;
  appraisedRent: string;
  lga: string;
  landSize: string;
  titleType: string;
  yearBuiltOrRegistration: string;
  sellingAgent: string;
  cashbackType: string;
  cashbackValue: string;
  closingBA: string;
  closingPrice: string;
  clientClosed: string;
  closingDate: string;
  linkedOpportunityId: string;
  sortKey: string;
  folderLink: string;
  pdfLink: string;
  portalLink: string;
  createdAt: string;
}

interface ColumnDef {
  key: keyof DealRecord;
  label: string;
  width: number;
}

interface SavedView {
  name: string;
  columns: ColumnDef[];
  quickFilter: string;
  filters: Partial<Record<keyof DealRecord, string>>;
  sortColumn: keyof DealRecord;
  sortDirection: SortDirection;
  sortLevels?: SortLevel[];
}

type SortDirection = 'asc' | 'desc' | null;

// One level of an Excel-style layered sort: "sort by A, then by D, then by G".
interface SortLevel {
  column: keyof DealRecord;
  dir: 'asc' | 'desc';
}

const DATE_FIELD_KEYS = new Set<keyof DealRecord>(['reviewDate', 'lastUpdate', 'closingDate']);
function isDateField(key: keyof DealRecord): boolean { return DATE_FIELD_KEYS.has(key); }

// Default sort for each quick filter — used when switching filters or resetting sort.
const DEFAULT_SORT: SortLevel[] = [{ column: 'sortKey', dir: 'asc' }];
const QUICK_FILTER_SORT: Record<string, SortLevel[]> = {
  all: DEFAULT_SORT,
  available: DEFAULT_SORT,
  eoi: DEFAULT_SORT,
  awaiting_packager: DEFAULT_SORT,
  awaiting_qa: DEFAULT_SORT,
  new_24h: DEFAULT_SORT,
};

type Theme = 'dark' | 'light';

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

// ============================================================================
// COLUMN DEFINITIONS — compact widths to match Google Sheet density
// ============================================================================

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: 'type', label: 'Type', width: 80 },
  { key: 'packager', label: 'Packager', width: 75 },
  { key: 'sourcer', label: 'Sourcer', width: 75 },
  { key: 'status', label: 'Status', width: 110 },
  { key: 'reviewDate', label: 'Review Date', width: 85 },
  { key: 'lastUpdate', label: 'Last Update', width: 85 },
  { key: 'packagerApproved', label: 'Packager Approved', width: 90 },
  { key: 'qaApproved', label: 'QA Approved', width: 70 },
  { key: 'propertyAddress', label: 'Property Address', width: 180 },
  { key: 'pdfLink', label: 'PDF', width: 45 },
  { key: 'asking', label: 'Asking', width: 80 },
  { key: 'priceGroup', label: 'Price Grp', width: 75 },
  { key: 'baMessage', label: 'BA Message', width: 120 },
  { key: 'acceptAcqTotal', label: "Accept Acq' / Total $", width: 130 },
  { key: 'config', label: 'CONFIG', width: 90 },
  { key: 'currentRent', label: 'Rent $ pw', width: 80 },
  { key: 'appraisedRent', label: 'Appr. Rent', width: 95 },
  { key: 'lga', label: 'LGA', width: 90 },
  { key: 'landSize', label: 'Land', width: 60 },
  { key: 'titleType', label: 'Title', width: 65 },
  { key: 'yearBuiltOrRegistration', label: 'Year/Reg', width: 65 },
  { key: 'sellingAgent', label: 'Selling Agent', width: 130 },
  { key: 'cashbackType', label: 'CB Type', width: 70 },
  { key: 'cashbackValue', label: 'CB $', width: 60 },
  { key: 'closingBA', label: 'Closing BA', width: 80 },
  { key: 'closingPrice', label: 'Close $', width: 75 },
  { key: 'clientClosed', label: 'Client', width: 70 },
  { key: 'closingDate', label: 'Close Date', width: 80 },
  { key: 'id', label: 'Record ID', width: 120 },
];

// Standard preset views
const PRESET_VIEWS: SavedView[] = [
  {
    name: 'Default (All Columns)',
    columns: DEFAULT_COLUMNS,
    quickFilter: 'all',
    filters: {},
    sortColumn: 'sortKey',
    sortDirection: 'asc',
  },
  {
    name: 'BA View (Key Info)',
    columns: [
      { key: 'status', label: 'Status', width: 110 },
      { key: 'propertyAddress', label: 'Property Address', width: 200 },
      { key: 'asking', label: 'Asking', width: 90 },
      { key: 'priceGroup', label: 'Price Grp', width: 75 },
      { key: 'baMessage', label: 'BA Message', width: 180 },
      { key: 'config', label: 'CONFIG', width: 90 },
      { key: 'appraisedRent', label: 'Appr. Rent', width: 95 },
      { key: 'landSize', label: 'Land', width: 60 },
      { key: 'packagerApproved', label: 'Packager Approved', width: 90 },
      { key: 'qaApproved', label: 'QA Approved', width: 70 },
    ],
    quickFilter: 'all',
    filters: {},
    sortColumn: 'sortKey',
    sortDirection: 'asc',
  },
  {
    name: 'Closing View',
    columns: [
      { key: 'status', label: 'Status', width: 110 },
      { key: 'propertyAddress', label: 'Property Address', width: 200 },
      { key: 'asking', label: 'Asking', width: 90 },
      { key: 'closingBA', label: 'Closing BA', width: 100 },
      { key: 'closingPrice', label: 'Close $', width: 90 },
      { key: 'clientClosed', label: 'Client', width: 100 },
      { key: 'closingDate', label: 'Close Date', width: 90 },
      { key: 'packager', label: 'Packager', width: 80 },
      { key: 'sourcer', label: 'Sourcer', width: 80 },
    ],
    quickFilter: 'all',
    filters: {},
    sortColumn: 'closingDate',
    sortDirection: 'desc',
  },
];

// ============================================================================
// COLOR CODING LOGIC
// ============================================================================

// Linked-client column group (Closing BA / Close $ / Client / Close Date) —
// tinted light blue to mark them as one unit (D1 F7; edit button is D2).
const LINKED_CLIENT_COLS = new Set<keyof DealRecord>(['closingBA', 'closingPrice', 'clientClosed', 'closingDate']);

function getStatusColor(status: string): string {
  if (status.startsWith('01')) return 'bg-[#C7F8CB]';
  if (status.startsWith('02')) return 'bg-[#FFFF00]';
  if (status.startsWith('03')) return 'bg-[#5A9CFF]';
  if (status.startsWith('05')) return 'bg-[#AAAAAA]';
  if (status.startsWith('06')) return 'bg-[#888888]';
  if (status.startsWith('07')) return 'bg-[#D3D3D3]';
  return '';
}

function getTypeColor(type: string): string {
  if (type.startsWith('01')) return 'bg-[#00FF00]';
  if (type.startsWith('02')) return 'bg-[#00FFFF]';
  if (type.startsWith('03')) return 'bg-[#FFFF00]';
  if (type.startsWith('04')) return 'bg-[#FF9999]';
  if (type.startsWith('05')) return 'bg-[#FFA500]';
  return '';
}

function getAskingColor(asking: string): string {
  if (asking.toLowerCase() === 'off-market') return 'bg-[#FF00FF] text-white';
  return '';
}

function getApprovedColor(value: string): string {
  if (value.toLowerCase() === 'approved') return 'bg-[#90EE90]';
  return '';
}

function isTBC(value: string): boolean {
  return value.toUpperCase().includes('TBC');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DealSheetPage() {
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');
  // Time of the last successful sync with GHL — updated by the full load AND by
  // each successful 15s poll, so it means the same thing as the timestamp in
  // the Contract Team Reporting tool.
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Sort state — layered, level 1 first (Excel-style "sort by A, then D, then G").
  const [sortLevels, setSortLevels] = useState<SortLevel[]>([{ column: 'sortKey', dir: 'asc' }]);
  // Derived for backward compat (column header indicators, dropdown A→Z/Z→A)
  const sortColumn: keyof DealRecord | null = sortLevels[0]?.column ?? null;
  const sortDirection: SortDirection = sortLevels[0]?.dir ?? null;

  // Filter state — Excel-style: stores EXCLUDED values per column (all shown by default)
  const [filters, setFilters] = useState<Partial<Record<keyof DealRecord, string>>>({});
  const [excludedFilters, setExcludedFilters] = useState<Partial<Record<keyof DealRecord, Set<string>>>>({});
  const [openFilterDropdown, setOpenFilterDropdown] = useState<keyof DealRecord | null>(null);
  const [idFilter, setIdFilter] = useState<string>('');

  // Column order (stored in localStorage)
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null);

  // Quick filter (view presets)
  const [quickFilter, setQuickFilter] = useState<string>('all');

  // Saved views
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Column resize state
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  // Theme (persisted to localStorage)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dealsheet-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });


  // Row height setting
  type RowHeight = '1-line' | '2-line' | '3-line' | 'auto';
  const [rowHeight, setRowHeight] = useState<RowHeight>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dealsheet-row-height');
      if (saved === '1-line' || saved === '2-line' || saved === '3-line' || saved === 'auto') return saved;
    }
    return '3-line';
  });
  const [showSettings, setShowSettings] = useState(false);

  const maxCellHeight = rowHeight === '1-line' ? 20 : rowHeight === '2-line' ? 40 : rowHeight === '3-line' ? 60 : 0;

  useEffect(() => {
    localStorage.setItem('dealsheet-row-height', rowHeight);
  }, [rowHeight]);

  // Expanded cell popup
  const [expandedCell, setExpandedCell] = useState<{ recordId: string; colKey: string; value: string; x: number; y: number } | null>(null);

  // Per-row status editing
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Polling state
  const lastPollTimestamp = useRef<number>(0);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const recentlyUpdatedIds = useRef<Map<string, number>>(new Map());

  // Valid status values
  const STATUS_OPTIONS = [
    { value: '01_available', label: '01 Available' },
    { value: '02_eoi', label: '02 EOI' },
    { value: '03_contr_exchanged', label: "03 Contr' Exchanged" },
    { value: '05_remove_no_interest', label: '05 Remove no interest' },
    { value: '06_remove_lost', label: '06 Remove lost' },
    { value: '07_test_record', label: '07 Test Record' },
  ];

  // Load saved state from localStorage
  useEffect(() => {
    // Always use DEFAULT_COLUMNS - no localStorage caching of columns
    const savedViewsStr = localStorage.getItem('dealsheet-saved-views');
    if (savedViewsStr) {
      try { setSavedViews(JSON.parse(savedViewsStr)); } catch { /* use defaults */ }
    }
    const savedTheme = localStorage.getItem('dealsheet-theme') as Theme;
    if (savedTheme && THEMES[savedTheme]) setTheme(savedTheme);
  }, []);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('dealsheet-theme', theme);
  }, [theme]);



  // Save custom views to localStorage
  useEffect(() => {
    localStorage.setItem('dealsheet-saved-views', JSON.stringify(savedViews));
  }, [savedViews]);

  // Click outside to close all dropdowns and filters
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowOtherRecords(false);
        setShowExportMenu(false);
        setShowViewMenu(false);
        setShowNewMenu(false);
        setShowColumnMenu(false);
        setShowSettings(false);
        setExpandedCell(null);
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  // Pause polling when the tab is hidden or the user is idle 30+ min
  // (saves Vercel compute / GHL rate limit from tabs left open overnight).
  // On resume the poll uses its old timestamp, so it naturally catches up on
  // any changes that happened while paused.
  const { isPaused: pollPaused, pausedByIdle } = useAutoRefreshPause(() => {});
  const pollPausedRef = useRef(pollPaused);
  pollPausedRef.current = pollPaused;

  // Polling for real-time sync (every 15s after initial load)
  useEffect(() => {
    if (loading || error) return;

    // Set baseline timestamp once initial load completes
    if (lastPollTimestamp.current === 0) {
      lastPollTimestamp.current = Date.now();
    }

    const interval = setInterval(async () => {
      if (pollPausedRef.current) return;
      try {
        const res = await fetch(`/api/deal-sheet/changes?since=${lastPollTimestamp.current}`);
        if (!res.ok) return;
        // Successful round-trip to GHL's change feed, changes or not.
        setLastRefresh(new Date());
        const data = await res.json();
        const changes: { recordId: string; timestamp: number }[] = data.changes || [];
        if (changes.length === 0) return;

        // Update timestamp to highest received
        const maxTs = Math.max(...changes.map((c) => c.timestamp));
        lastPollTimestamp.current = maxTs;

        // Fetch each changed record and merge into state
        const updated: DealRecord[] = [];
        for (const change of changes) {
          try {
            const rRes = await fetch(`/api/deal-sheet/record/${change.recordId}`);
            if (rRes.ok) {
              const rData = await rRes.json();
              if (rData.record) updated.push(rData.record as DealRecord);
            }
          } catch {
            // skip individual failures
          }
        }

        if (updated.length > 0) {
          const now = Date.now();
          // Skip records the user updated in the last 30s
          const safeUpdated = updated.filter((rec) => {
            const ts = recentlyUpdatedIds.current.get(rec.id);
            return !ts || now - ts > 30000;
          });
          if (safeUpdated.length === 0) return;
          setRecords((prev) => {
            const map = new Map(prev.map((r) => [r.id, r]));
            for (const rec of safeUpdated) {
              map.set(rec.id, rec);
            }
            return Array.from(map.values());
          });
          setSyncMessage(`${updated.length} record${updated.length > 1 ? 's' : ''} updated`);
          setTimeout(() => setSyncMessage(''), 4000);
        }
      } catch {
        // silent — polling failures are non-critical
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [loading, error]);

  // Active statuses param for API fetches
  const [activeStatuses, setActiveStatuses] = useState<string>('01,02');

  const fetchData = async (statuses?: string) => {
    setLoading(true);
    setRefreshing(true);
    setError(null);
    const statusParam = statuses ?? activeStatuses;
    try {
      const params = new URLSearchParams();
      params.set('statuses', statusParam);
      const res = await fetch(`/api/deal-sheet?${params.toString()}&_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await res.json();
      setRecords(data.records);
      setFetchedAt(data.fetchedAt);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sort handler — plain click sets primary sort, shift-click adds a level
  const handleSort = useCallback((column: keyof DealRecord, additive = false) => {
    setSortLevels((prev) => {
      const at = prev.findIndex((l) => l.column === column);
      if (additive) {
        if (at === -1) return [...prev, { column, dir: 'asc' as const }];
        const next = [...prev];
        if (next[at].dir === 'asc') { next[at] = { column, dir: 'desc' }; return next; }
        next.splice(at, 1);
        return next;
      }
      if (at === 0 && prev.length === 1) {
        if (prev[0].dir === 'asc') return [{ column, dir: 'desc' as const }];
        return [];
      }
      return [{ column, dir: 'asc' as const }];
    });
  }, []);

  const setPrimarySort = useCallback((column: keyof DealRecord, dir: 'asc' | 'desc') => {
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

  // Filter handler (text search - kept as fallback)
  const handleFilterChange = useCallback((column: keyof DealRecord, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
  }, []);

  // Toggle a value in the excluded filter (Excel-style: untick = exclude)
  const toggleExcludeFilter = useCallback((column: keyof DealRecord, value: string) => {
    setExcludedFilters((prev) => {
      const current = new Set(prev[column] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [column]: current };
    });
  }, []);

  // Select all (clear exclusions) for a column
  const selectAllFilter = useCallback((column: keyof DealRecord) => {
    setExcludedFilters((prev) => {
      const updated = { ...prev };
      delete updated[column];
      return updated;
    });
  }, []);

  // Clear all (exclude everything) for a column
  const clearAllFilter = useCallback((column: keyof DealRecord) => {
    const allValues = new Set<string>();
    records.forEach((r) => {
      allValues.add(r[column] || '(blank)');
    });
    setExcludedFilters((prev) => ({ ...prev, [column]: allValues }));
  }, [records]);

  // Column drag handlers
  const handleDragStart = (index: number) => {
    setDraggedColumn(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumn === null || draggedColumn === index) return;
    const newColumns = [...columns];
    const dragged = newColumns[draggedColumn];
    newColumns.splice(draggedColumn, 1);
    newColumns.splice(index, 0, dragged);
    setDraggedColumn(index);
    setColumns(newColumns);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(index);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = columns[index].width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - resizeStartX.current;
      const newWidth = Math.max(40, resizeStartWidth.current + diff);
      setColumns((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], width: newWidth };
        return updated;
      });
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // View management
  const saveCurrentView = () => {
    if (!newViewName.trim()) return;
    const view: SavedView = {
      name: newViewName.trim(),
      columns: [...columns],
      quickFilter,
      filters: { ...filters },
      sortColumn: sortLevels[0]?.column ?? 'sortKey',
      sortDirection: sortLevels[0]?.dir ?? 'asc',
      sortLevels: [...sortLevels],
    };
    setSavedViews((prev) => [...prev, view]);
    setNewViewName('');
    setShowViewMenu(false);
  };

  const loadView = (view: SavedView) => {
    setColumns(view.columns);
    setQuickFilter(view.quickFilter);
    setFilters(view.filters);
    // Load multi-level sort if available, else fall back to legacy single-column
    setSortLevels((view as any).sortLevels?.length ? (view as any).sortLevels : (view.sortDirection ? [{ column: view.sortColumn, dir: view.sortDirection }] : []));
    setShowViewMenu(false);
  };

  const deleteView = (index: number) => {
    setSavedViews((prev) => prev.filter((_, i) => i !== index));
  };

  const resetToDefault = () => {
    setColumns(DEFAULT_COLUMNS);
    setQuickFilter('all');
    setFilters({});
    setExcludedFilters({});
    setIdFilter('');
    setSortLevels([{ column: 'sortKey', dir: 'asc' }]);
    setShowViewMenu(false);
  };

  const SAFE_EOI_STATUSES = ['02_eoi', '03_contr_exchanged'];

  function hasLinkedData(record: DealRecord): boolean {
    return !!(
      record.linkedOpportunityId ||
      record.clientClosed ||
      record.closingBA ||
      record.closingPrice ||
      record.closingDate
    );
  }

  function rawStatus(display: string): string {
    return display.toLowerCase().replace(/ /g, '_').replace(/'/g, '');
  }

  // Archive and clear linked fields when moving away from a linked/speculative EOI record.
  // Safe transitions: 02 EOI <-> 03 Contr Exchanged retain the data (F11/F12 Option B).
  const clearAndArchiveStatus = async (recordId: string, newStatus: string): Promise<boolean> => {
    setUpdatingStatusId(recordId);
    try {
      const res = await fetch('/api/deal-sheet/clear-and-archive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, toStatus: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to update: ${data.error}`);
        return false;
      }
      const data = await res.json();
      recentlyUpdatedIds.current.set(recordId, Date.now());
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                status: newStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                clientClosed: '',
                closingBA: '',
                closingPrice: '',
                closingDate: '',
                linkedOpportunityId: '',
              }
            : r
        )
      );
      setEditingStatusId(null);
      if (data.warning) alert(data.warning);
      return true;
    } catch {
      alert('Failed to archive and clear linked fields');
      return false;
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Update a single record's status in GHL
  const updateRecordStatus = async (recordId: string, newStatus: string): Promise<boolean> => {
    setUpdatingStatusId(recordId);
    try {
      const res = await fetch('/api/deal-sheet/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Failed to update: ${data.error}`);
        return false;
      }
      // Protect this record from poller overwrites for 30s
      recentlyUpdatedIds.current.set(recordId, Date.now());
      // Update local state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? { ...r, status: newStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) }
            : r
        )
      );
      setEditingStatusId(null);
      return true;
    } catch {
      alert('Failed to update status');
      return false;
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // ---- EOI link / edit modal ----
  const [eoiModalRecord, setEoiModalRecord] = useState<DealRecord | null>(null);
  const [eoiModalMode, setEoiModalMode] = useState<'create' | 'edit'>('create');

  const handleEoiLink = async (payload: EoiLinkPayload): Promise<boolean> => {
    if (!eoiModalRecord) return false;
    const recordId = eoiModalRecord.id;
    try {
      const res = await fetch('/api/deal-sheet/link-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          opportunityId: payload.opportunityId,
          opportunityName: payload.opportunityName,
          assignedBA: payload.assignedBA,
          totalPurchasePrice: payload.totalPurchasePrice,
          closingDate: payload.closingDate,
          status: '02_eoi',
          writeBaToOpportunity: payload.writeBaToOpportunity,
        }),
      });
      if (!res.ok) return false;
      const resData = await res.json();
      if (resData.baWriteBackOk !== true) {
        alert('Linked OK, but writing the Assigned BA back to the opportunity failed — update it in GHL manually.');
      }
      // Protect this record from poller overwrites for 30s
      recentlyUpdatedIds.current.set(recordId, Date.now());
      const priceNum = parseFloat(payload.totalPurchasePrice);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                status: '02 Eoi',
                clientClosed: payload.opportunityName,
                closingBA: payload.assignedBA,
                closingPrice: isNaN(priceNum) ? payload.totalPurchasePrice : '$' + priceNum.toLocaleString('en-AU'),
                closingDate: payload.closingDate,
                linkedOpportunityId: payload.opportunityId,
              }
            : r
        )
      );
      setEoiModalRecord(null);
      return true;
    } catch {
      return false;
    }
  };

  // Speculative EOI (F4): sets the status AND flags the Client field with
  // "SPECULATIVE EOI" so the sheet and the unlinked-EOI view both show it.
  const handleEoiSpeculative = async (): Promise<boolean> => {
    if (!eoiModalRecord) return false;
    const recordId = eoiModalRecord.id;
    try {
      if (eoiModalMode === 'edit') {
        // F13 — linked/speculative record being removed to speculative (status unchanged)
        const res = await fetch('/api/deal-sheet/update-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId,
            transitionType: eoiModalRecord.linkedOpportunityId ? 'reverted_to_speculative' : 'client_removed',
            opportunityId: '',
            opportunityName: '',
            assignedBA: '',
            totalPurchasePrice: '',
            closingDate: '',
          }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        recentlyUpdatedIds.current.set(recordId, Date.now());
        setRecords((prev) =>
          prev.map((r) =>
            r.id === recordId
              ? {
                  ...r,
                  clientClosed: 'SPECULATIVE EOI',
                  closingBA: '',
                  closingPrice: '',
                  closingDate: '',
                  linkedOpportunityId: '',
                }
              : r
          )
        );
        if (data.baWriteBackOk === false || data.archiveOk === false) {
          alert('Client removed, but the opportunity/archive write-back reported a non-fatal issue.');
        }
        setEoiModalRecord(null);
        return true;
      }
      const res = await fetch('/api/deal-sheet/update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, status: '02_eoi', clientClosed: 'SPECULATIVE EOI' }),
      });
      if (!res.ok) return false;
      recentlyUpdatedIds.current.set(recordId, Date.now());
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, status: '02 Eoi', clientClosed: 'SPECULATIVE EOI' } : r
        )
      );
      setEoiModalRecord(null);
      return true;
    } catch {
      return false;
    }
  };

  // F13 — update an existing link (edit, reassign, remove client)
  const handleEoiUpdate = async (payload: EoiUpdatePayload): Promise<boolean> => {
    if (!eoiModalRecord) return false;
    const recordId = eoiModalRecord.id;
    try {
      const res = await fetch('/api/deal-sheet/update-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          ...payload,
        }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      recentlyUpdatedIds.current.set(recordId, Date.now());
      const priceNum = parseFloat(payload.totalPurchasePrice);
      const priceDisplay = isNaN(priceNum) ? payload.totalPurchasePrice : '$' + priceNum.toLocaleString('en-AU');
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                clientClosed: payload.opportunityName,
                closingBA: payload.assignedBA,
                closingPrice: priceDisplay,
                closingDate: payload.closingDate,
                linkedOpportunityId: payload.opportunityId,
              }
            : r
        )
      );
      if (data.baWriteBackOk === false) {
        alert('Updated the property record, but writing the Assigned BA back to the opportunity failed.');
      }
      if (data.archiveOk === false) {
        alert('Updated the property record, but the client-change archive could not be saved.');
      }
      setEoiModalRecord(null);
      return true;
    } catch {
      return false;
    }
  };


  // Get current theme
  const t = THEMES[theme];

  // New records time window
  const [newHoursWindow, setNewHoursWindow] = useState(24);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Check if record is new (created within selected time window)
  const isNewRecord = useCallback((createdAt: string) => {
    if (!createdAt) return false;
    const created = new Date(createdAt).getTime();
    return Date.now() - created < newHoursWindow * 60 * 60 * 1000;
  }, [newHoursWindow]);

  // Apply quick filter
  const quickFilteredRecords = useMemo(() => {
    if (quickFilter === 'all') return records;
    if (quickFilter === 'available')
      return records.filter((r) => r.status.startsWith('01') && r.packagerApproved.toLowerCase() === 'approved');
    if (quickFilter === 'eoi')
      return records.filter((r) => r.status.startsWith('02'));
    if (quickFilter === 'awaiting_packager')
      return records.filter((r) => r.packagerApproved.toLowerCase() !== 'approved' && !r.status.startsWith('05') && !r.status.startsWith('06') && !r.status.startsWith('07'));
    if (quickFilter === 'awaiting_qa')
      return records.filter((r) => r.packagerApproved.toLowerCase() === 'approved' && r.qaApproved.toLowerCase() !== 'approved' && !r.status.startsWith('05') && !r.status.startsWith('06') && !r.status.startsWith('07'));
    if (quickFilter === 'new_24h')
      return records.filter((r) => isNewRecord(r.createdAt));
    return records;
  }, [records, quickFilter, isNewRecord]);

  // Multi-select filter: get unique values for a column (from current quick-filtered view)
  const getUniqueValues = useCallback((column: keyof DealRecord): string[] => {
    const values = new Set<string>();
    quickFilteredRecords.forEach((r) => {
      const val = r[column];
      values.add(val || '(blank)');
    });
    return Array.from(values).sort();
  }, [quickFilteredRecords]);

  // Parse ID filter into a set of trimmed IDs
  const idFilterSet = useMemo(() => {
    if (!idFilter.trim()) return null;
    const ids = idFilter.split(/[,\s\n]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    return new Set(ids);
  }, [idFilter]);

  // opportunityId -> property records already linked to it. Built from all
  // loaded records (not the filtered view) so the EOI modal can warn when an
  // opportunity is about to be linked to a second property.
  const existingOpportunityLinks = useMemo(() => {
    const map: Record<string, { id: string; address: string; status: string }[]> = {};
    for (const rec of records) {
      const oppId = rec.linkedOpportunityId;
      if (!oppId) continue;
      if (!map[oppId]) map[oppId] = [];
      map[oppId].push({ id: rec.id, address: rec.propertyAddress || '', status: rec.status || '' });
    }
    return map;
  }, [records]);

  // Apply column filters (text + multi-select + ID list)
  const filteredRecords = useMemo(() => {
    return quickFilteredRecords.filter((record) => {
      // ID list filter
      if (idFilterSet && !idFilterSet.has(record.id.toLowerCase())) return false;

      // Text filters
      const passesText = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const cellValue = record[key as keyof DealRecord] || '';
        return cellValue.toLowerCase().includes(value.toLowerCase());
      });
      if (!passesText) return false;

      // Excluded filters (Excel-style)
      const passesExcluded = Object.entries(excludedFilters).every(([key, excludedSet]) => {
        if (!excludedSet || (excludedSet as Set<string>).size === 0) return true;
        const cellValue = record[key as keyof DealRecord] || '';
        const displayValue = cellValue || '(blank)';
        return !(excludedSet as Set<string>).has(displayValue);
      });
      return passesExcluded;
    });
  }, [quickFilteredRecords, filters, excludedFilters, idFilterSet]);

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

    function compareOnColumn(a: DealRecord, b: DealRecord, level: SortLevel): number {
      const col = level.column;
      const aVal = a[col] || '';
      const bVal = b[col] || '';
      // Empty values always sort to the bottom
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;
      let compare: number;
      if (isDateField(col)) {
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

  // Sort dialog (Excel-style, reachable from toolbar — matches Contract Team Reporting)
  const [showSortDialog, setShowSortDialog] = useState(false);
  const SORT_DIALOG_WIDTH = 520;
  const [sortDialogPos, setSortDialogPos] = useState<{ x: number; y: number } | null>(null);
  const sortBtnRef = useRef<HTMLButtonElement | null>(null);
  const sortDragOffset = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ds-sort-dialog-pos');
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === 'number' && typeof p?.y === 'number') setSortDialogPos(p);
      }
    } catch { /* ignore */ }
  }, []);

  const clampToViewport = useCallback((x: number, y: number) => ({
    x: Math.max(4, Math.min(x, window.innerWidth - SORT_DIALOG_WIDTH - 4)),
    y: Math.max(4, Math.min(y, window.innerHeight - 40)),
  }), []);

  const openSortDialog = useCallback(() => {
    setShowSortDialog((open) => {
      if (open) return false;
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
        if (pos) localStorage.setItem('ds-sort-dialog-pos', JSON.stringify(pos));
        return pos;
      });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [clampToViewport]);

  function orderLabels(column: keyof DealRecord): { asc: string; desc: string } {
    if (isDateField(column)) return { asc: 'Oldest to Newest', desc: 'Newest to Oldest' };
    return { asc: 'A to Z', desc: 'Z to A' };
  }

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
            No sort — records appear in the default order.
          </div>
        )}
        {sortLevels.map((level, i) => {
          const labels = orderLabels(level.column);
          return (
            <div key={`sort-level-${i}`} className="grid grid-cols-[auto_1fr_auto_auto] gap-1 items-center mb-1">
              <span className={`text-[9px] ${t.headerText} w-12 shrink-0`}>{i === 0 ? 'Sort by' : 'Then by'}</span>
              <select
                value={level.column}
                onChange={(e) => setSortLevels((prev) => prev.map((l, idx) => (idx === i ? { ...l, column: e.target.value as keyof DealRecord } : l)))}
                className={`min-w-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded px-1 py-0.5 ${t.headerText}`}
              >
                {columns.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
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
            { column: (columns.find((c) => !prev.some((l) => l.column === c.key))?.key || columns[0]?.key || 'sortKey') as keyof DealRecord, dir: 'asc' },
          ])}
          className={`text-[10px] ${t.headerText} hover:text-blue-400 mt-0.5`}
        >
          + Add level
        </button>
      </>
    );
  }

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Export to CSV
  const exportToCSV = (exportAll: boolean) => {
    const sourceRecords = exportAll ? records : sortedRecords;
    const headers = columns.map((col) => col.label);
    const rows = sourceRecords.map((record) =>
      columns.map((col) => {
        const val = record[col.key] || '';
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      })
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-sheet-${exportAll ? 'all' : 'filtered'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Other Records dropdown state
  const [showOtherRecords, setShowOtherRecords] = useState(false);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Loading Deal Sheet...</p>
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
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${t.headerBg} border-b ${t.cellBorder}`}>
        <div className="flex items-center gap-4">
          <img
            src="/logo.jpg"
            alt="Buyers Club"
            className="h-7 w-auto"
          />
          <h1 className="text-lg font-bold">Deal Sheet</h1>
          <span className="text-xs opacity-60">
            {sortedRecords.length} records
          </span>
          <a
            href="/deal-sheet/reports"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 text-[10px] font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          >
            Reports
          </a>
          <a
            href="/deal-sheet/unlinked-eoi"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 text-[10px] font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
            title="EOI/Exchanged records with no linked opportunity"
          >
            Unlinked EOI
          </a>
        </div>

        {/* Live Records */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] opacity-50 mr-1">Live Records</span>
          <button
            onClick={() => { if (activeStatuses !== '01,02') { setActiveStatuses('01,02'); fetchData('01,02'); } setQuickFilter('all'); setSortLevels(QUICK_FILTER_SORT.all); }}
            className={`px-2 py-1 rounded text-xs ${
              quickFilter === 'all' && activeStatuses === '01,02'
                ? 'bg-blue-600 text-white'
                : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            All*
          </button>
          <button
            onClick={() => { if (activeStatuses !== '01,02') { setActiveStatuses('01,02'); fetchData('01,02'); } setQuickFilter('available'); setSortLevels(QUICK_FILTER_SORT.available); }}
            className={`px-2 py-1 rounded text-xs ${
              quickFilter === 'available'
                ? 'bg-blue-600 text-white'
                : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            Available
          </button>
          <button
            onClick={() => { if (activeStatuses !== '01,02') { setActiveStatuses('01,02'); fetchData('01,02'); } setQuickFilter('eoi'); setSortLevels(QUICK_FILTER_SORT.eoi); }}
            className={`px-2 py-1 rounded text-xs ${
              quickFilter === 'eoi'
                ? 'bg-blue-600 text-white'
                : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            EOI
          </button>
        </div>

        {/* Housekeeping */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] opacity-50 mr-1">Housekeeping</span>
          <button
            onClick={() => { if (activeStatuses !== '01,02') { setActiveStatuses('01,02'); fetchData('01,02'); } setQuickFilter('awaiting_packager'); setSortLevels(QUICK_FILTER_SORT.awaiting_packager); }}
            className={`px-2 py-1 rounded text-xs ${
              quickFilter === 'awaiting_packager'
                ? 'bg-amber-600 text-white'
                : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            Awaiting Packager
          </button>
          <button
            onClick={() => { if (activeStatuses !== '01,02') { setActiveStatuses('01,02'); fetchData('01,02'); } setQuickFilter('awaiting_qa'); setSortLevels(QUICK_FILTER_SORT.awaiting_qa); }}
            className={`px-2 py-1 rounded text-xs ${
              quickFilter === 'awaiting_qa'
                ? 'bg-amber-600 text-white'
                : `${t.inputBg} ${t.headerText} hover:opacity-80`
            }`}
          >
            Awaiting QA
          </button>
        </div>

        {/* Clear Filters */}
        <button
          onClick={() => {
            setActiveStatuses('01,02');
            setQuickFilter('all');
            setFilters({});
            setExcludedFilters({});
            setIdFilter('');
            setSortLevels(QUICK_FILTER_SORT.all);
            fetchData('01,02');
          }}
          className={`px-2 py-1 rounded text-xs hover:opacity-80 border ${
            quickFilter !== 'all' || Object.keys(excludedFilters).length > 0 || idFilter.trim() !== '' || Object.values(filters).some(v => v && v.trim() !== '')
              ? 'bg-amber-600 text-white border-amber-700'
              : `${t.inputBg} ${t.headerText} ${t.inputBorder}`
          }`}
        >
          Clear Filters
        </button>

        {/* Sort dialog trigger */}
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
        {/* Clear Sort — resets to active filter's default sort */}
        {JSON.stringify(sortLevels) !== JSON.stringify(QUICK_FILTER_SORT[quickFilter] || DEFAULT_SORT) && (
          <button
            onClick={() => setSortLevels(QUICK_FILTER_SORT[quickFilter] || DEFAULT_SORT)}
            className="px-2 py-1 rounded text-xs hover:opacity-80 border bg-amber-600 text-white border-amber-700"
            title="Reset sort to this view's default"
          >
            Clear Sort
          </button>
        )}

        {/* Other Records dropdown */}
        <div className="relative dropdown-container">
          <button
            onClick={() => setShowOtherRecords(!showOtherRecords)}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80 border ${t.inputBorder}`}
          >
            Other Records ▼
          </button>
          {showOtherRecords && (
            <div className={`absolute top-full right-0 mt-1 w-48 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
              <button
                onClick={() => { setActiveStatuses('all'); setQuickFilter('all'); fetchData('all'); setShowOtherRecords(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
              >
                All (all statuses)
              </button>
              <button
                onClick={() => { setActiveStatuses('03'); setQuickFilter('all'); fetchData('03'); setShowOtherRecords(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
              >
                Exchanged Contract
              </button>
              <button
                onClick={() => { setActiveStatuses('05'); setQuickFilter('all'); fetchData('05'); setShowOtherRecords(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
              >
                Remove No Interest
              </button>
              <button
                onClick={() => { setActiveStatuses('06'); setQuickFilter('all'); fetchData('06'); setShowOtherRecords(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
              >
                Remove Lost
              </button>
              <button
                onClick={() => { setActiveStatuses('07'); setQuickFilter('all'); fetchData('07'); setShowOtherRecords(false); }}
                className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
              >
                Test Records
              </button>
            </div>
          )}
        </div>

        {/* Export + Views + Time + Refresh + Theme */}
        <div className="flex items-center gap-2 relative">
          {/* Export dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-2 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-600"
            >
              Export ▼
            </button>
            {showExportMenu && (
              <div className={`absolute top-full right-0 mt-1 w-40 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                <button
                  onClick={() => exportToCSV(false)}
                  className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
                >
                  Export Filtered ({sortedRecords.length})
                </button>
                <button
                  onClick={() => exportToCSV(true)}
                  className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg}`}
                >
                  Export All ({records.length})
                </button>
              </div>
            )}
          </div>

          <div className="relative dropdown-container">
          <button
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
          >
            Views
          </button>

          {/* Views dropdown */}
          {showViewMenu && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 p-3">
              <div className="text-xs font-bold text-gray-400 mb-2">PRESET VIEWS</div>
              {PRESET_VIEWS.map((view, i) => (
                <button
                  key={i}
                  onClick={() => loadView(view)}
                  className="block w-full text-left px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded"
                >
                  {view.name}
                </button>
              ))}

              {savedViews.length > 0 && (
                <>
                  <div className="text-xs font-bold text-gray-400 mt-3 mb-2">MY VIEWS</div>
                  {savedViews.map((view, i) => (
                    <div key={i} className="flex items-center justify-between px-2 py-1 hover:bg-gray-700 rounded">
                      <button
                        onClick={() => loadView(view)}
                        className="text-xs text-gray-300 text-left flex-1"
                      >
                        {view.name}
                      </button>
                      <button
                        onClick={() => deleteView(i)}
                        className="text-xs text-red-400 hover:text-red-300 ml-2"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </>
              )}

              <div className="border-t border-gray-600 mt-3 pt-3">
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="View name..."
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveCurrentView()}
                    className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-600 rounded text-gray-300 placeholder-gray-600"
                  />
                  <button
                    onClick={saveCurrentView}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
                <button
                  onClick={resetToDefault}
                  className="mt-2 w-full px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                >
                  Reset to Default
                </button>
              </div>
            </div>
          )}

          </div>

          {/* Column toggle */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
            >
              Columns
            </button>
            {showColumnMenu && (
              <div className="absolute top-full right-0 mt-1 w-52 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 p-2 max-h-80 overflow-y-auto">
                <div className="text-xs font-bold text-gray-400 mb-2">SHOW / HIDE COLUMNS</div>
                {DEFAULT_COLUMNS.map((col) => {
                  const isVisible = columns.some((c) => c.key === col.key);
                  return (
                    <label key={col.key} className="flex items-center gap-2 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => {
                          if (isVisible) {
                            setColumns((prev) => prev.filter((c) => c.key !== col.key));
                          } else {
                            const defaultIndex = DEFAULT_COLUMNS.findIndex((c) => c.key === col.key);
                            setColumns((prev) => {
                              const next = [...prev];
                              let insertAt = next.length;
                              for (let i = defaultIndex + 1; i < DEFAULT_COLUMNS.length; i++) {
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
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <button
                    onClick={() => { setColumns([...DEFAULT_COLUMNS]); }}
                    className="block w-full text-left px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  >
                    Show All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New records button with time window dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowNewMenu(!showNewMenu)}
              className={`px-2 py-1 rounded text-xs ${
                quickFilter === 'new_24h'
                  ? 'bg-green-600 text-white'
                  : `${t.inputBg} ${t.headerText} hover:opacity-80`
              }`}
            >
              New ({newHoursWindow}h) ▼
            </button>
            {showNewMenu && (
              <div className={`absolute top-full right-0 mt-1 w-32 ${t.bg} border ${t.inputBorder} rounded shadow-lg z-50 py-1`}>
                {[24, 36, 48, 72].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => { setNewHoursWindow(hours); setShowNewMenu(false); if (activeStatuses !== '01,02') { setActiveStatuses('01,02'); fetchData('01,02'); } setQuickFilter('new_24h'); setSortLevels(QUICK_FILTER_SORT.new_24h); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs ${t.text} ${t.hoverBg} ${newHoursWindow === hours ? 'font-bold' : ''}`}
                  >
                    Last {hours} hours
                  </button>
                ))}
                <div className={`border-t ${t.inputBorder} mt-1 pt-1`}>
                  <button
                    onClick={() => { setQuickFilter('all'); setShowNewMenu(false); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs text-red-400 ${t.hoverBg}`}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>

          {syncMessage && (
            <span className="text-xs text-green-400 animate-pulse">
              {syncMessage}
            </span>
          )}
          {pausedByIdle && (
            <span className="px-2 py-1 rounded text-xs bg-amber-600 text-white" title="No activity for 30 minutes. Move the mouse or press a key to resume.">
              Auto-refresh paused — click to resume
            </span>
          )}
          {(lastRefresh || fetchedAt) && (
            <span
              className="text-xs opacity-50"
              title="Last successful sync with GHL (polls every 15s)"
            >
              {(lastRefresh || new Date(fetchedAt)).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData()}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
          >
            {refreshing ? '...' : 'Refresh'}
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => { const v = theme === 'dark' ? 'light' : 'dark'; setTheme(v); localStorage.setItem('dealsheet-theme', v); }}
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
                <div className="mb-2">
                  <label className={`text-[10px] ${t.headerText} font-medium`}>Row Height</label>
                  <div className="flex flex-col gap-1 mt-1">
                    {([['1-line', '1 Line (compact)'], ['2-line', '2 Lines'], ['3-line', '3 Lines (default)'], ['auto', 'Auto (wrap all)']] as const).map(([value, label]) => (
                      <label key={value} className={`flex items-center gap-2 px-1 py-0.5 text-[10px] ${t.headerText} cursor-pointer rounded ${t.hoverBg}`}>
                        <input
                          type="radio"
                          name="dealsheetRowHeight"
                          checked={rowHeight === value}
                          onChange={() => setRowHeight(value)}
                          className="w-3 h-3 accent-blue-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
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
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  draggable={resizingCol === null}
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`relative ${LINKED_CLIENT_COLS.has(col.key) ? (theme === 'dark' ? 'bg-blue-950' : 'bg-blue-100') : t.headerBg} border ${t.cellBorder} px-1.5 py-1.5 text-left font-medium ${t.headerText} cursor-move select-none whitespace-nowrap`}
                  style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                >
                  <div
                    className="flex items-center gap-0.5 cursor-pointer overflow-hidden"
                    onClick={(e) => handleSort(col.key, e.shiftKey)}
                  >
                    <span className="truncate text-[11px]">{col.label}</span>
                    {(() => {
                      const levelIdx = sortLevels.findIndex((l) => l.column === col.key);
                      if (levelIdx === -1) return null;
                      const dir = sortLevels[levelIdx].dir;
                      return (
                        <span className="text-blue-400 text-[10px] whitespace-nowrap">
                          {dir === 'asc' ? '▲' : '▼'}{sortLevels.length > 1 ? `${levelIdx + 1}` : ''}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Column filter */}
                  <div className="mt-0.5 relative">
                    {col.key === 'id' ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenFilterDropdown(openFilterDropdown === col.key ? null : col.key);
                          }}
                          className={`w-full px-1 py-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} text-left truncate ${
                            idFilter.trim() ? 'border-blue-500 text-blue-400' : ''
                          }`}
                        >
                          {idFilter.trim()
                            ? `${idFilter.split(/[,\s\n]+/).filter(Boolean).length} IDs`
                            : '▼ Paste IDs'}
                        </button>
                        {openFilterDropdown === col.key && (
                          <div
                            className={`absolute top-full left-0 mt-1 w-72 ${t.headerBg} border ${t.inputBorder} rounded shadow-lg z-50 p-2`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="text-[9px] text-gray-400 mb-1">Paste Record IDs (comma, space, or newline separated)</div>
                            <textarea
                              value={idFilter}
                              onChange={(e) => setIdFilter(e.target.value)}
                              placeholder="Paste IDs here..."
                              rows={6}
                              className={`w-full px-1.5 py-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none font-mono`}
                            />
                            <div className="flex justify-between mt-1">
                              <span className="text-[9px] text-gray-400">
                                {idFilter.trim() ? `${idFilter.split(/[,\s\n]+/).filter(Boolean).length} IDs` : 'No filter'}
                              </span>
                              <button
                                onClick={() => setIdFilter('')}
                                className="text-[9px] text-red-400 hover:underline"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterDropdown(openFilterDropdown === col.key ? null : col.key);
                      }}
                      className={`w-full px-1 py-0 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} text-left truncate ${
                        excludedFilters[col.key] && excludedFilters[col.key]!.size > 0
                          ? 'border-blue-500 text-blue-400'
                          : ''
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
                        {/* Sort options */}
                        <div className="flex gap-1 mb-1 px-1 border-b border-gray-600 pb-1">
                          <button
                            onClick={() => setPrimarySort(col.key, 'asc')}
                            className="text-[9px] text-gray-400 hover:text-white"
                          >
                            {isDateField(col.key) ? 'Old→New' : 'A→Z'}
                          </button>
                          <button
                            onClick={() => setPrimarySort(col.key, 'desc')}
                            className="text-[9px] text-gray-400 hover:text-white"
                          >
                            {isDateField(col.key) ? 'New→Old' : 'Z→A'}
                          </button>
                        </div>
                        {/* Month/Year quick select for date columns */}
                        {(col.key === 'reviewDate' || col.key === 'closingDate' || col.key === 'lastUpdate') && (() => {
                          const allVals = getUniqueValues(col.key);
                          const monthSet = new Set<string>();
                          const parseDateYM = (v: string): { y: string; m: string } => {
                            if (/^\d{4}-\d{2}/.test(v)) return { y: v.slice(0, 4), m: v.slice(5, 7) };
                            if (/^\d{2}\/\d{2}\/\d{4}/.test(v)) return { y: v.slice(6, 10), m: v.slice(3, 5) };
                            if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(v)) {
                              const parts = v.split('/');
                              return { y: parts[2], m: parts[1].padStart(2, '0') };
                            }
                            return { y: '', m: '' };
                          };
                          allVals.forEach((v) => {
                            if (v === '(blank)') return;
                            const { y, m } = parseDateYM(v);
                            if (y && m) monthSet.add(`${y}-${m}`);
                          });
                          const monthOptions = Array.from(monthSet).sort().reverse();
                          if (monthOptions.length === 0) return null;
                          return (
                            <div className="mb-1 px-1 border-b border-gray-600 pb-1">
                              <select
                                className={`w-full px-1 py-0.5 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText}`}
                                defaultValue=""
                                onChange={(e) => {
                                  const selected = e.target.value;
                                  if (!selected) { selectAllFilter(col.key); return; }
                                  const [sy, sm] = selected.split('-');
                                  const toExclude = new Set<string>();
                                  allVals.forEach((v) => {
                                    const { y: vy, m: vm } = parseDateYM(v);
                                    if (vy !== sy || vm !== sm) toExclude.add(v);
                                  });
                                  setExcludedFilters((prev) => ({ ...prev, [col.key]: toExclude }));
                                }}
                              >
                                <option value="">— Select Month —</option>
                                {monthOptions.map((mo) => {
                                  const [yy, mm] = mo.split('-');
                                  const label = new Date(parseInt(yy), parseInt(mm) - 1, 1).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
                                  return <option key={mo} value={mo}>{label}</option>;
                                })}
                              </select>
                            </div>
                          );
                        })()}
                        {/* Text search within dropdown */}
                        <input
                          type="text"
                          placeholder="Search..."
                          value={filters[col.key] || ''}
                          onChange={(e) => handleFilterChange(col.key, e.target.value)}
                          className={`w-full px-1.5 py-0.5 mb-1 text-[10px] ${t.inputBg} border ${t.inputBorder} rounded ${t.headerText} placeholder-gray-500 focus:outline-none`}
                        />
                        {/* Select All / Only / Clear */}
                        <div className="flex gap-1 mb-1 px-1">
                          <button
                            onClick={() => selectAllFilter(col.key)}
                            className="text-[9px] text-blue-400 hover:underline"
                          >
                            Select All
                          </button>
                          {filters[col.key] && (
                            <button
                              onClick={() => {
                                const search = (filters[col.key] || '').toLowerCase();
                                const toExclude = new Set<string>();
                                getUniqueValues(col.key).forEach((v) => {
                                  if (!v.toLowerCase().includes(search)) {
                                    toExclude.add(v);
                                  }
                                });
                                setExcludedFilters((prev) => ({ ...prev, [col.key]: toExclude }));
                              }}
                              className="text-[9px] text-green-400 hover:underline font-medium"
                            >
                              Only
                            </button>
                          )}
                          <button
                            onClick={() => clearAllFilter(col.key)}
                            className="text-[9px] text-red-400 hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                        {/* Value checkboxes — all ticked by default, untick to exclude */}
                        {getUniqueValues(col.key)
                          .filter((v) => !filters[col.key] || v.toLowerCase().includes(filters[col.key]!.toLowerCase()))
                          .map((value) => (
                            <label
                              key={value}
                              className={`flex items-center gap-1 px-1 py-0.5 text-[10px] ${t.headerText} cursor-pointer rounded hover:bg-gray-700`}
                            >
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
                      </>
                    )}
                  </div>

                  {/* Resize handle */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, idx)}
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/50"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRecords.map((record) => (
              <tr
                key={record.id}
                className={`${t.hoverBg} ${isNewRecord(record.createdAt) ? 'border-l-2 border-l-green-400' : ''}`}
              >
                {columns.map((col) => {
                  const value = record[col.key] || '';
                  let cellClass = `border ${t.cellBorder} px-1.5 py-1 overflow-hidden break-words`;

                  // Apply color coding
                  if (col.key === 'status') cellClass += ` ${getStatusColor(value)}`;
                  if (col.key === 'type') cellClass += ` ${getTypeColor(value)}`;
                  if (col.key === 'asking') cellClass += ` ${getAskingColor(value)}`;
                  if (col.key === 'packagerApproved' || col.key === 'qaApproved') cellClass += ` ${getApprovedColor(value)}`;
                  if (LINKED_CLIENT_COLS.has(col.key)) cellClass += theme === 'dark' ? ' bg-blue-900/30' : ' bg-blue-50';

                  // TBC red highlighting
                  const tbcStyle = isTBC(value) ? { backgroundColor: '#FFCCCC', color: '#000000' } : undefined;

                  // Override text color for colored backgrounds
                  if (
                    col.key === 'status' ||
                    col.key === 'type' ||
                    ((col.key === 'packagerApproved' || col.key === 'qaApproved') && value.toLowerCase() === 'approved')
                  ) {
                    cellClass += ' text-black';
                  }

                  // Render cell content with links where applicable
                  let cellContent: React.ReactNode = value;

                  // Status — editable dropdown on double-click
                  if (col.key === 'status') {
                    if (editingStatusId === record.id) {
                      cellContent = (
                        <select
                          autoFocus
                          defaultValue={value.toLowerCase().replace(/ /g, '_').replace(/'/g, '')}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            const fromStatus = rawStatus(record.status);
                            const linked = hasLinkedData(record);
                            const safe = SAFE_EOI_STATUSES.includes(fromStatus) && SAFE_EOI_STATUSES.includes(newStatus);

                            // Moving to 02 EOI on an unlinked record → open the
                            // opportunity picker instead of saving immediately.
                            if (newStatus === '02_eoi' && !record.linkedOpportunityId) {
                              setEditingStatusId(null);
                              setEoiModalMode('create');
                              setEoiModalRecord(record);
                              return;
                            }

                            // Moving away from a linked/speculative record:
                            // warn, archive the stripped data, and clear fields (F11/F12).
                            if (!safe && linked && fromStatus !== newStatus) {
                              const label = newStatus.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
                              const confirmed = window.confirm(
                                `Changing this record to ${label} will remove the linked opportunity information. Do you want to continue?`
                              );
                              if (confirmed) {
                                clearAndArchiveStatus(record.id, newStatus);
                              } else {
                                setEditingStatusId(null);
                              }
                              return;
                            }

                            updateRecordStatus(record.id, newStatus);
                          }}
                          onBlur={() => setEditingStatusId(null)}
                          className="w-full text-[10px] bg-white text-black border rounded px-0.5"
                          disabled={updatingStatusId === record.id}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      );
                    } else if (updatingStatusId === record.id) {
                      cellContent = <span className="text-[10px] opacity-50">Saving...</span>;
                    } else {
                      cellContent = (
                        <span
                          onDoubleClick={() => setEditingStatusId(record.id)}
                          className="cursor-pointer"
                          title="Double-click to edit status"
                        >
                          {value}
                        </span>
                      );
                    }
                  }

                  // F13 — Client / Close $ / Closing BA cells on linked/speculative
                  // rows: permanently visible pencil icon, double-click opens the
                  // edit/reassign modal.
                  if (
                    (col.key === 'clientClosed' || col.key === 'closingPrice' || col.key === 'closingBA') &&
                    (record.linkedOpportunityId || record.clientClosed)
                  ) {
                    const canEdit = !updatingStatusId;
                    cellContent = (
                      <div
                        className="flex items-center justify-between gap-1 min-w-0 cursor-pointer"
                        title="Double-click to change client, price, BA or make speculative"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={() => {
                          if (!canEdit) return;
                          setEoiModalMode('edit');
                          setEoiModalRecord(record);
                        }}
                      >
                        <span className="truncate">{value}</span>
                        <span className="shrink-0 text-[10px] select-none">✎</span>
                      </div>
                    );
                  }

                  // Property Address → Portal link (when QA approved)
                  if (col.key === 'propertyAddress' && record.portalLink) {
                    cellContent = (
                      <a
                        href={record.portalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline"
                        title="Open portal to send this deal"
                      >
                        {value}
                      </a>
                    );
                  }

                  // QA Status — small text, green bg is the indicator
                  if ((col.key === 'packagerApproved' || col.key === 'qaApproved') && value.toLowerCase() === 'approved') {
                    cellContent = (
                      <span className="text-[2px]" title="PDF available">
                        {value}
                      </span>
                    );
                  }

                  // PDF link — clickable icon
                  if (col.key === 'pdfLink' && value) {
                    cellContent = (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300"
                        title="Open PDF"
                        onClick={(e) => e.stopPropagation()}
                      >
                        PDF
                      </a>
                    );
                  }

                  // Folder link — show folder icon if available
                  if (col.key === 'propertyAddress' && record.folderLink) {
                    cellContent = (
                      <div className="flex items-center gap-1">
                        <a
                          href={record.folderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-400 hover:text-yellow-300 flex-shrink-0"
                          title="Open property folder"
                        >
                          📁
                        </a>
                        {record.portalLink ? (
                          <a
                            href={record.portalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                            title="Open portal to send this deal"
                          >
                            {value}
                          </a>
                        ) : (
                          <span>{value}</span>
                        )}
                      </div>
                    );
                  }

                  return (
                    <td
                      key={col.key}
                      className={`${cellClass} cursor-pointer`}
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        ...tbcStyle,
                      }}
                      title={value}
                      onClick={(e) => {
                        // Status cells are edit-only (double-click) — no text popup (F2)
                        if (value && col.key !== 'status') {
                          setExpandedCell({ recordId: record.id, colKey: col.key, value, x: e.clientX, y: e.clientY });
                        }
                      }}
                    >
                      <div style={{ maxHeight: maxCellHeight > 0 ? maxCellHeight : undefined, overflow: maxCellHeight > 0 ? 'hidden' : undefined }}>
                        {cellContent}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {sortedRecords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No records match the current filters.
          </div>
        )}
      </div>

      {/* Expanded cell popup */}
      {expandedCell && (
        <div
          className="fixed z-[100] max-w-md max-h-64 overflow-auto rounded shadow-xl border p-3 text-xs whitespace-pre-wrap bg-gray-900 text-gray-100 border-gray-600 dropdown-container"
          style={{
            left: Math.min(expandedCell.x, window.innerWidth - 420),
            top: Math.min(expandedCell.y + 10, window.innerHeight - 270),
          }}
        >
          <div className="flex justify-between items-start gap-2 mb-1">
            <span className="font-bold text-gray-400 text-[10px] uppercase">{columns.find(c => c.key === expandedCell.colKey)?.label}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { navigator.clipboard.writeText(expandedCell.value); }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-500"
                title="Copy to clipboard"
              >
                Copy
              </button>
              <button onClick={() => setExpandedCell(null)} className="text-gray-500 hover:text-white text-sm leading-none">✕</button>
            </div>
          </div>
          <div>{expandedCell.value}</div>
        </div>
      )}

      {/* Floating Sort panel — draggable, matches Contract Team Reporting */}
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
                onClick={() => setSortLevels(QUICK_FILTER_SORT[quickFilter] || DEFAULT_SORT)}
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

      {/* EOI link / edit modal */}
      {eoiModalRecord && (
        <EoiLinkModal
          record={eoiModalRecord}
          mode={eoiModalMode}
          theme={theme}
          existingLinks={existingOpportunityLinks}
          onLink={handleEoiLink}
          onUpdate={handleEoiUpdate}
          onSpeculative={handleEoiSpeculative}
          onCancel={() => { setEoiModalRecord(null); setEoiModalMode('create'); }}
        />
      )}
    </div>
  );
}
