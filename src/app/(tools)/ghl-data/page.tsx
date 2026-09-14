'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';

if (typeof document !== 'undefined') document.title = 'GHL & Custom Object Data';

// ============================================================================
// TYPES
// ============================================================================

type FieldType = 'readonly' | 'text' | 'date' | 'dropdown' | 'yesblank';
type Theme = 'dark' | 'light';
type SortDirection = 'asc' | 'desc' | null;

interface UnifiedRecord {
  [key: string]: string;
}

interface ColumnDef {
  key: string;
  label: string;
  width: number;
  type: FieldType;
  source: 'co' | 'opp';
}

type FilterOperator = 'equals' | 'contains' | 'in' | 'is blank' | 'not blank';

interface ViewFilter {
  field: string;
  operator: FilterOperator;
  value: string;
}

interface ViewDef {
  name: string;
  columns: ColumnDef[];
  filters: ViewFilter[];
  sortBy: string;
  sortDir: SortDirection;
}

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

const FILTER_OPERATORS: FilterOperator[] = ['equals', 'contains', 'in', 'is blank', 'not blank'];

const SOURCE_COLOUR: Record<'co' | 'opp', { header: string; cell: string }> = {
  co: { header: 'rgba(148,163,184,0.35)', cell: 'rgba(148,163,184,0.12)' },
  opp: { header: 'rgba(59,130,246,0.35)', cell: 'rgba(59,130,246,0.12)' },
};

const SELECTED_COLOUR: Record<Theme, string> = {
  dark: '#1e3a8a',
  light: '#bfdbfe',
};

// ============================================================================
// HELPERS
// ============================================================================

const DATE_RE = /^\d{4}-\d{2}-\d{2}/;

function isLikelyDate(value: string): boolean {
  if (!value) return false;
  return DATE_RE.test(value);
}

function formatDateDisplay(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function labelForKey(key: string): string {
  if (key === 'coRecordId') return 'CO Record ID';
  if (key === 'coCreatedAt') return 'CO Created At';
  if (key === 'coUpdatedAt') return 'CO Updated At';
  if (key === 'coLinkedOpportunityId') return 'CO Linked Opportunity ID';
  if (key.startsWith('co_')) {
    const base = key.slice(3).replace(/_/g, ' ');
    return base.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (key.startsWith('opp_')) {
    return `Opp ${key.slice(4)}`;
  }
  // Insert spaces before capitals
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();
}

function widthForKey(key: string): number {
  if (key === 'ghlLink') return 60;
  if (key.toLowerCase().includes('address')) return 220;
  if (key.toLowerCase().includes('name')) return 180;
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) return 110;
  if (key.toLowerCase().includes('status') || key.toLowerCase().includes('stage')) return 140;
  if (key.toLowerCase().includes('id')) return 120;
  return 140;
}

function getSource(key: string): 'co' | 'opp' {
  if (key === 'coRecordId' || key === 'coCreatedAt' || key === 'coUpdatedAt' || key === 'coLinkedOpportunityId') return 'co';
  return key.startsWith('co_') ? 'co' : 'opp';
}

function baseColumnForKey(key: string): ColumnDef {
  return { key, label: labelForKey(key), width: widthForKey(key), type: 'readonly', source: getSource(key) };
}

function applyFilters(records: UnifiedRecord[], filters: ViewFilter[]): UnifiedRecord[] {
  if (filters.length === 0) return records;
  return records.filter((record) =>
    filters.every((f) => {
      const raw = record[f.field] || '';
      const cell = raw.toLowerCase();
      const value = f.value.toLowerCase();
      switch (f.operator) {
        case 'equals':
          return cell === value;
        case 'contains':
          return cell.includes(value);
        case 'in': {
          const list = value.split(',').map((s) => s.trim());
          return list.some((item) => cell === item || cell.includes(item));
        }
        case 'is blank':
          return raw === '';
        case 'not blank':
          return raw !== '';
        default:
          return true;
      }
    })
  );
}

function applySearch(records: UnifiedRecord[], query: string): UnifiedRecord[] {
  if (!query) return records;
  const q = query.toLowerCase();
  return records.filter((record) =>
    Object.values(record).some((v) => (v || '').toLowerCase().includes(q))
  );
}

function sortRecords(records: UnifiedRecord[], sortBy: string, sortDir: SortDirection): UnifiedRecord[] {
  if (!sortBy || !sortDir) return records;
  return [...records].sort((a, b) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (isLikelyDate(aVal) && isLikelyDate(bVal)) {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function GhlDataPage() {
  const [records, setRecords] = useState<UnifiedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

  // Theme
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ghl-data-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });
  useEffect(() => { localStorage.setItem('ghl-data-theme', theme); }, [theme]);
  const t = THEMES[theme];

  // Edit mode (name-gated)
  const [editMode, setEditMode] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [userName, setUserName] = useState<string>('');

  // Search and sort
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  // Views
  const allColumns = useMemo<ColumnDef[]>(() => {
    if (records.length === 0) return [];
    const keys = new Set<string>();
    for (const record of records) {
      for (const key of Object.keys(record)) {
        if (record[key] !== '' || !key.startsWith('opp_')) {
          keys.add(key);
        }
      }
    }
    const priority = new Set([
      'coRecordId',
      'coLinkedOpportunityId',
      'opportunityName',
      'registeredAddress',
      'co_property_address',
      'co_deal_type',
      'co_status',
      'pipelineName',
      'stage',
      'assignedBA',
      'typeOfProperty',
      'owner',
    ]);
    const priorityList = [...priority];
    const sorted = Array.from(keys).sort((a, b) => {
      const pa = priority.has(a) ? priorityList.indexOf(a) : 999;
      const pb = priority.has(b) ? priorityList.indexOf(b) : 999;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
    return sorted.map(baseColumnForKey);
  }, [records]);

  const [savedViews, setSavedViews] = useState<ViewDef[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('ghl-data-views');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [activeView, setActiveView] = useState<ViewDef | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showFilterBuilder, setShowFilterBuilder] = useState(false);

  useEffect(() => {
    if (allColumns.length > 0 && !activeView) {
      const firstCols = allColumns.slice(0, 12);
      setActiveView({
        name: 'Default',
        columns: firstCols,
        filters: [],
        sortBy: firstCols[0]?.key || '',
        sortDir: 'asc',
      });
      setSortBy(firstCols[0]?.key || '');
      setSortDir('asc');
    }
  }, [allColumns, activeView]);

  useEffect(() => {
    localStorage.setItem('ghl-data-views', JSON.stringify(savedViews));
  }, [savedViews]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ghl-data?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setRecords(data.records || []);
      setFetchedAt(data.fetchedAt ? new Date(data.fetchedAt).toLocaleString('en-AU') : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close dropdowns on click outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setShowViewMenu(false);
        setShowFilterBuilder(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayedRecords = useMemo(() => {
    const filtered = applyFilters(records, activeView?.filters || []);
    const searched = applySearch(filtered, searchText);
    return sortRecords(searched, sortBy, sortDir);
  }, [records, activeView, searchText, sortBy, sortDir]);

  const toggleColumn = useCallback((key: string) => {
    setActiveView((prev) => {
      if (!prev) return prev;
      const exists = prev.columns.some((c) => c.key === key);
      const nextColumns = exists
        ? prev.columns.filter((c) => c.key !== key)
        : [...prev.columns, baseColumnForKey(key)];
      return { ...prev, columns: nextColumns };
    });
  }, []);

  const [draftFilter, setDraftFilter] = useState<ViewFilter>({ field: '', operator: 'equals', value: '' });

  const addFilter = useCallback(() => {
    if (!draftFilter.field) return;
    setActiveView((prev) => {
      if (!prev) return prev;
      return { ...prev, filters: [...prev.filters, { ...draftFilter }] };
    });
    setDraftFilter({ field: '', operator: 'equals', value: '' });
  }, [draftFilter]);

  const removeFilter = useCallback((index: number) => {
    setActiveView((prev) => {
      if (!prev) return prev;
      const next = [...prev.filters];
      next.splice(index, 1);
      return { ...prev, filters: next };
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveView((prev) => (prev ? { ...prev, filters: [] } : prev));
  }, []);

  const saveView = useCallback(() => {
    if (!newViewName.trim() || !activeView) return;
    const view: ViewDef = { ...activeView, name: newViewName.trim() };
    setSavedViews((prev) => {
      const next = prev.filter((v) => v.name !== view.name);
      return [...next, view];
    });
    setActiveView(view);
    setNewViewName('');
    setShowViewMenu(false);
  }, [newViewName, activeView]);

  const loadView = useCallback((view: ViewDef) => {
    setActiveView(view);
    setSortBy(view.sortBy);
    setSortDir(view.sortDir);
    setShowViewMenu(false);
  }, []);

  const deleteView = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedViews((prev) => prev.filter((v) => v.name !== name));
  }, []);

  const handleHeaderClick = useCallback((key: string) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  }, [sortBy]);

  const handleNameSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    setEditMode(true);
    setShowNamePrompt(false);
  }, [userName]);

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const visibleKeys = useMemo(() => new Set(activeView?.columns.map((c) => c.key) || []), [activeView]);
  const filtersActive = (activeView?.filters.length || 0) > 0;

  const headerBg = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const selectedBg = theme === 'dark' ? 'bg-blue-900' : 'bg-blue-200';

  return (
    <div className={`${t.bg} ${t.text} min-h-screen p-4`}>
      <div className="mb-4 flex flex-wrap items-center gap-3" ref={menuRef}>
        <h1 className="text-xl font-semibold">GHL & Custom Object Data</h1>
        <div className="flex-1" />
        <div className="text-xs opacity-70">{fetchedAt ? `Fetched ${fetchedAt}` : ''}</div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className={`px-3 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg}`}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
          className={`px-3 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg}`}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <button
          onClick={() => setShowNamePrompt((prev) => !prev)}
          className={`px-3 py-1 text-sm rounded border ${editMode ? 'border-green-500 text-green-600' : t.inputBorder} ${t.inputBg}`}
        >
          {editMode ? 'Edit On' : 'Edit'}
        </button>
      </div>

      {showNamePrompt && (
        <form onSubmit={handleNameSubmit} className="mb-4 flex gap-2">
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name to enable edit"
            className={`px-2 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
          />
          <button type="submit" className={`px-3 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg}`}>
            Enable
          </button>
        </form>
      )}

      {editMode && (
        <div className="mb-4 text-sm opacity-80">
          Edit mode enabled (read-only field decisions are pending — no fields are editable yet).
        </div>
      )}

      <div className={`mb-3 p-3 rounded border ${t.cellBorder} ${t.inputBg}`}>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative">
            <button
              onClick={() => setShowViewMenu((prev) => !prev)}
              className={`px-3 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg}`}
            >
              View: {activeView?.name || 'Default'} ▾
            </button>
            {showViewMenu && (
              <div className={`absolute z-20 mt-1 w-64 max-h-80 overflow-auto rounded border shadow-lg ${t.inputBorder} ${t.inputBg}`}>
                <div className="p-2 border-b border-gray-500/20">
                  <input
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="New view name"
                    className={`w-full px-2 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
                  />
                  <button
                    onClick={saveView}
                    disabled={!newViewName.trim() || !activeView}
                    className="mt-2 w-full px-2 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-50"
                  >
                    Save current as view
                  </button>
                </div>
                {savedViews.length > 0 && (
                  <div className="p-1">
                    {savedViews.map((view) => (
                      <div
                        key={view.name}
                        onClick={() => loadView(view)}
                        className={`flex items-center justify-between px-2 py-1 text-sm cursor-pointer rounded ${t.hoverBg}`}
                      >
                        <span>{view.name}</span>
                        <button
                          onClick={(e) => deleteView(view.name, e)}
                          className="text-red-500 hover:text-red-700 px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilterBuilder((prev) => !prev)}
              className={`px-3 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg}`}
            >
              Filters {filtersActive ? `(${activeView?.filters.length})` : ''} ▾
            </button>
            {showFilterBuilder && (
              <div className={`absolute z-20 mt-1 w-80 rounded border shadow-lg ${t.inputBorder} ${t.inputBg}`}>
                <div className="p-3 space-y-2 max-h-80 overflow-auto">
                  {activeView?.filters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{labelForKey(filter.field)}</span>
                      <span className="text-xs opacity-70">{filter.operator}</span>
                      <span className="flex-1 truncate text-xs opacity-70">{filter.value}</span>
                      <button onClick={() => removeFilter(index)} className="text-red-500">×</button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-500/20">
                    <select
                      value={draftFilter.field}
                      onChange={(e) => setDraftFilter((prev) => ({ ...prev, field: e.target.value }))}
                      className={`px-2 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
                    >
                      <option value="">Select field</option>
                      {allColumns.map((col) => (
                        <option key={col.key} value={col.key}>{col.label}</option>
                      ))}
                    </select>
                    <select
                      value={draftFilter.operator}
                      onChange={(e) => setDraftFilter((prev) => ({ ...prev, operator: e.target.value as FilterOperator }))}
                      className={`px-2 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
                    >
                      {FILTER_OPERATORS.map((op) => (
                        <option key={op} value={op}>{op}</option>
                      ))}
                    </select>
                    {draftFilter.operator !== 'is blank' && draftFilter.operator !== 'not blank' && (
                      <input
                        value={draftFilter.value}
                        onChange={(e) => setDraftFilter((prev) => ({ ...prev, value: e.target.value }))}
                        placeholder="Value (comma = OR)"
                        className={`flex-1 min-w-[120px] px-2 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
                      />
                    )}
                    <button onClick={addFilter} className="px-2 py-1 text-sm rounded bg-blue-600 text-white">Add</button>
                  </div>
                  <button
                    onClick={clearFilters}
                    className={`w-full px-2 py-1 text-sm rounded ${filtersActive ? 'bg-amber-500 text-black' : `border ${t.inputBorder} ${t.inputBg}`}`}
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search…"
            className={`px-3 py-1 text-sm rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
          />

          <div className="flex items-center gap-2 text-sm">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setSortDir('asc'); }}
              className={`px-2 py-1 rounded border ${t.inputBorder} ${t.inputBg} ${t.text}`}
            >
              <option value="">None</option>
              {allColumns.map((col) => (
                <option key={col.key} value={col.key}>{col.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className={`px-2 py-1 rounded border ${t.inputBorder} ${t.inputBg}`}
            >
              {sortDir === 'asc' ? '↑' : sortDir === 'desc' ? '↓' : '—'}
            </button>
          </div>
        </div>

        <div className="text-sm opacity-80">
          <strong>{activeView?.name || 'Default'}</strong>
          {activeView?.columns.length ? ` — ${activeView.columns.length} columns` : ''}
          {records.length ? ` — ${displayedRecords.length} of ${records.length} records` : ''}
          {records.length ? ` — Pipelines: Finance, Construction, Contracts, Property Team` : ''}
        </div>

        <div className={`mt-3 p-2 rounded border ${t.cellBorder} max-h-40 overflow-auto`}>
          <div className="text-sm font-medium mb-1">Column selector</div>
          <div className="flex flex-wrap gap-2">
            {allColumns.map((col) => {
              const checked = visibleKeys.has(col.key);
              return (
                <label
                  key={col.key}
                  style={{ borderColor: SOURCE_COLOUR[col.source].header, backgroundColor: checked ? SOURCE_COLOUR[col.source].cell : undefined }}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded border cursor-pointer ${checked ? 'font-semibold' : `border ${t.inputBorder} ${t.inputBg}`}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleColumn(col.key)}
                    className="cursor-pointer"
                  />
                  {col.label}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className="p-8 text-center">Loading…</div>
      )}

      {error && (
        <div className="p-4 mb-4 text-red-200 bg-red-900/30 rounded border border-red-800">
          {error}
        </div>
      )}

      {!loading && !error && activeView && (
        <div className={`overflow-auto rounded border ${t.cellBorder}`}>
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className={`sticky top-0 z-10 ${headerBg}`}>
              <tr>
                {activeView.columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleHeaderClick(col.key)}
                    style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: SOURCE_COLOUR[col.source].header }}
                    className={`sticky top-0 px-2 py-2 text-left text-xs font-medium ${t.headerText} border-b ${t.cellBorder} cursor-pointer select-none overflow-hidden whitespace-nowrap`}
                    title={col.label}
                  >
                    {col.label}
                    {sortBy === col.key ? (sortDir === 'asc' ? ' ↑' : sortDir === 'desc' ? ' ↓' : '') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRecords.map((record, index) => {
                const rowId = record.coRecordId || record.id || `row-${index}`;
                const selected = selectedRowId === rowId;
                return (
                  <tr
                    key={rowId}
                    onClick={() => setSelectedRowId(rowId)}
                    className={`border-b ${t.cellBorder} ${t.hoverBg} ${selected ? selectedBg : ''} cursor-pointer`}
                  >
                    {activeView.columns.map((col) => {
                      const value = record[col.key] || '';
                      const display = isLikelyDate(value) ? formatDateDisplay(value) : value;
                      return (
                        <td
                          key={col.key}
                          style={{ width: col.width, minWidth: col.width, maxWidth: col.width, backgroundColor: selected ? SELECTED_COLOUR[theme] : SOURCE_COLOUR[col.source].cell }}
                          className={`px-2 py-1 border-r ${t.cellBorder} overflow-hidden whitespace-nowrap`}
                          title={value}
                        >
                          {col.key === 'ghlLink' && value ? (
                            <a href={value} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                              GHL
                            </a>
                          ) : (
                            <span className="block truncate">{display}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && displayedRecords.length === 0 && (
        <div className="p-8 text-center opacity-70">No records match the current filters.</div>
      )}
    </div>
  );
}
