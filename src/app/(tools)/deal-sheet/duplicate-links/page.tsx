'use client';

import { useEffect, useMemo, useState } from 'react';

// ============================================================================
// Duplicate Links view — shows properties where the same GHL opportunity is
// linked to more than one property record. Helps identify where a single
// client/opportunity has been linked to multiple properties (legitimate
// multi-property buyers or accidental duplicates).
// ============================================================================

if (typeof document !== 'undefined') document.title = 'Duplicate Opportunity Links';

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
  closingBA: string;
  closingPrice: string;
}

type Theme = 'dark' | 'light';

const THEMES: Record<Theme, { bg: string; headerBg: string; cellBorder: string; text: string; headerText: string; hoverBg: string; inputBg: string; inputBorder: string }> = {
  dark: { bg: 'bg-gray-900', headerBg: 'bg-gray-800', cellBorder: 'border-gray-800', text: 'text-gray-100', headerText: 'text-gray-300', hoverBg: 'hover:bg-gray-800/50', inputBg: 'bg-gray-900', inputBorder: 'border-gray-600' },
  light: { bg: 'bg-white', headerBg: 'bg-gray-100', cellBorder: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-700', hoverBg: 'hover:bg-gray-50', inputBg: 'bg-white', inputBorder: 'border-gray-300' },
};

function getStatusColor(status: string): string {
  if (status.startsWith('01')) return 'bg-green-700/30';
  if (status.startsWith('02')) return 'bg-[#FFFF00] text-black';
  if (status.startsWith('03')) return 'bg-[#5A9CFF] text-black';
  if (status.startsWith('05') || status.startsWith('06')) return 'bg-red-900/30';
  if (status.startsWith('07')) return 'bg-gray-600/30';
  return '';
}

export default function DuplicateLinksPage() {
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
      // Fetch all statuses that could have linked opportunities
      const res = await fetch(`/api/deal-sheet?statuses=01,02,03,05,06,07&_t=${Date.now()}`, { cache: 'no-store' });
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

  // Group by opportunity ID, find duplicates
  const { duplicateGroups, duplicatePropertyCount, duplicateOppCount } = useMemo(() => {
    const oppMap: Record<string, DealRecord[]> = {};
    for (const r of records) {
      if (!r.linkedOpportunityId) continue;
      if (!oppMap[r.linkedOpportunityId]) oppMap[r.linkedOpportunityId] = [];
      oppMap[r.linkedOpportunityId].push(r);
    }
    // Only keep groups with >1 property
    const groups: { oppId: string; client: string; records: DealRecord[] }[] = [];
    let propCount = 0;
    for (const [oppId, recs] of Object.entries(oppMap)) {
      if (recs.length > 1) {
        groups.push({
          oppId,
          client: recs[0].clientClosed || 'Unknown',
          records: recs,
        });
        propCount += recs.length;
      }
    }
    return { duplicateGroups: groups, duplicatePropertyCount: propCount, duplicateOppCount: groups.length };
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return duplicateGroups;
    return duplicateGroups.filter(
      (g) =>
        g.client.toLowerCase().includes(q) ||
        g.oppId.toLowerCase().includes(q) ||
        g.records.some(
          (r) =>
            r.propertyAddress.toLowerCase().includes(q) ||
            r.status.toLowerCase().includes(q) ||
            r.packager.toLowerCase().includes(q)
        )
    );
  }, [duplicateGroups, search]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${t.bg}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className={`${t.text} text-lg`}>Loading records...</p>
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
    <div className={`h-full flex flex-col ${t.bg} ${t.text}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${t.headerBg} border-b ${t.cellBorder}`}>
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Buyers Club" className="h-7 w-auto" />
          <h1 className="text-lg font-bold">Duplicate Opportunity Links</h1>
          <span className="text-xs opacity-60">
            {duplicateOppCount} opportunities linked to {duplicatePropertyCount} properties
          </span>
          <a
            href="/deal-sheet"
            className="px-2 py-1 text-[10px] font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
          >
            &larr; Deal Sheet
          </a>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter by address, client, opp ID..."
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
        Properties where the <span className="font-semibold">same opportunity</span> is linked to more than one property.
        This may be legitimate (client buying multiple properties) or accidental.
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-2">
        {filtered.length === 0 ? (
          <div className="py-8 text-center opacity-60">
            {duplicateGroups.length === 0 ? 'No duplicate links found — each opportunity is linked to only one property.' : 'No groups match the filter.'}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((group) => (
              <div key={group.oppId} className={`border ${t.cellBorder} rounded overflow-hidden`}>
                <div className={`${t.headerBg} px-3 py-1.5 flex flex-wrap items-center gap-2`}>
                  <span className="font-semibold text-xs break-words">{group.client}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-700/50 text-amber-200 shrink-0">{group.records.length} properties</span>
                  <span className="text-[10px] opacity-60 font-mono break-all">{group.oppId}</span>
                </div>
                <table className="border-collapse text-xs w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '35%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {['Property Address', 'Status', 'Closing BA', 'Close $', 'Type', 'Packager', 'Record ID'].map((h) => (
                        <th key={h} className={`${t.headerBg} border-t ${t.cellBorder} px-2 py-1 text-left font-medium ${t.headerText} whitespace-nowrap text-[10px]`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.records.map((r) => (
                      <tr key={r.id} className={t.hoverBg}>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 font-medium break-words`}>{r.propertyAddress}</td>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 whitespace-nowrap ${getStatusColor(r.status)}`}>{r.status}</td>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 truncate`}>{r.closingBA || '-'}</td>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 whitespace-nowrap`}>{r.closingPrice || '-'}</td>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 truncate`}>{r.type}</td>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 truncate`}>{r.packager}</td>
                        <td className={`border-t ${t.cellBorder} px-2 py-1 font-mono text-[10px] opacity-70 truncate`}>{r.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
