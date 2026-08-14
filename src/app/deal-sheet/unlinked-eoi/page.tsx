'use client';

import { useEffect, useMemo, useState } from 'react';

// ============================================================================
// Unlinked EOI exception view — records at status 02 EOI / 03 Contr' Exchanged
// with no linked_opportunity_id (catches GHL-side status changes and
// speculative EOIs). See docs/deal-sheet-eoi-d1-brief.md.
// Note: "Last update" is a labelled proxy for days-since-EOI — the CO has no
// status-change timestamp; a proper EOI-entered timestamp arrives with the
// D2 event store.
// ============================================================================

if (typeof document !== 'undefined') document.title = 'Unlinked EOI Records';

interface DealRecord {
  id: string;
  type: string;
  packager: string;
  sourcer: string;
  status: string;
  reviewDate: string;
  lastUpdate: string;
  propertyAddress: string;
  asking: string;
  clientClosed: string;
  linkedOpportunityId: string;
}

type Theme = 'dark' | 'light';

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

function getStatusColor(status: string): string {
  if (status.startsWith('02')) return 'bg-[#FFFF00] text-black';
  if (status.startsWith('03')) return 'bg-[#5A9CFF] text-black';
  return '';
}

export default function UnlinkedEoiPage() {
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState('');
  const [search, setSearch] = useState('');

  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dealsheet-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });
  const t = THEMES[theme];

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deal-sheet?statuses=02,03&_t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch');
      }
      const data = await res.json();
      setRecords((data.records || []) as DealRecord[]);
      setFetchedAt(data.fetchedAt || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const unlinked = useMemo(
    () => records.filter((r) => !r.linkedOpportunityId),
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return unlinked;
    return unlinked.filter(
      (r) =>
        r.propertyAddress.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.clientClosed || '').toLowerCase().includes(q) ||
        r.packager.toLowerCase().includes(q) ||
        r.sourcer.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [unlinked, search]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${t.bg}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className={`${t.text} text-lg`}>Loading unlinked EOI records...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${t.bg}`}>
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Error: {error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
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
          <img src="/logo.jpg" alt="Buyers Club" className="h-7 w-auto" />
          <h1 className="text-lg font-bold">Unlinked EOI Records</h1>
          <span className="text-xs opacity-60">
            {filtered.length} of {unlinked.length} unlinked ({records.length} total at 02/03)
          </span>
          <a
            href="/deal-sheet"
            className="px-2 py-1 text-[10px] font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          >
            ← Deal Sheet
          </a>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by address, status, packager..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`px-2 py-1 text-xs rounded border w-64 focus:outline-none ${t.inputBg} ${t.inputBorder} ${t.text} placeholder-gray-500`}
          />
          {fetchedAt && (
            <span className="text-xs opacity-50">{new Date(fetchedAt).toLocaleTimeString()}</span>
          )}
          <button
            onClick={fetchData}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
          >
            Refresh
          </button>
          <button
            onClick={() => { const v = theme === 'dark' ? 'light' : 'dark'; setTheme(v); localStorage.setItem('dealsheet-theme', v); }}
            className={`px-2 py-1 rounded text-xs ${t.inputBg} ${t.headerText} hover:opacity-80`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Explainer */}
      <div className={`px-4 py-1.5 text-[10px] ${t.headerText} border-b ${t.cellBorder}`}>
        Records at status 02 EOI / 03 Contr&apos; Exchanged with <span className="font-semibold">no linked opportunity</span> — speculative EOIs and GHL-side status changes.
        Assigning a client to these records arrives with D2; until then they can be linked via the Manual Link tool.
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse text-xs w-full">
          <thead className="sticky top-0 z-10">
            <tr>
              {['Property Address', 'Status', 'Client', 'Review Date', 'Last Update (proxy for days-since-EOI)', 'Type', 'Packager', 'Sourcer', 'Asking', 'Record ID'].map((h) => (
                <th key={h} className={`${t.headerBg} border ${t.cellBorder} px-2 py-1.5 text-left font-medium ${t.headerText} whitespace-nowrap text-[11px]`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={t.hoverBg}>
                <td className={`border ${t.cellBorder} px-2 py-1 font-medium`}>{r.propertyAddress}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap ${getStatusColor(r.status)}`}>{r.status}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap ${r.clientClosed === 'SPECULATIVE EOI' ? 'font-semibold text-amber-500' : ''}`}>{r.clientClosed || '-'}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.reviewDate || '-'}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.lastUpdate || '-'}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.type}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.packager}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.sourcer}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.asking}</td>
                <td className={`border ${t.cellBorder} px-2 py-1 font-mono text-[10px] opacity-70`}>{r.id}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center opacity-60">
                  {unlinked.length === 0 ? 'No unlinked EOI records — all 02/03 records have a linked opportunity.' : 'No records match the filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
