'use client';

import { useState, useEffect, useMemo } from 'react';

interface MatchedItem {
  propertyAddress: string;
  recordId: string;
  oppName: string;
  oppId: string;
  regAddr: string;
  score: number;
  ba: string;
  price: string;
  pipeline: string;
}

interface DealRecord {
  id: string;
  propertyAddress: string;
  status: string;
  clientClosed: string;
}

interface UnlinkedProperty {
  id: string;
  propertyAddress: string;
  status: string;
  type: string;
  packager: string;
  sourcer: string;
  createdAt: string;
  isNew: boolean;
  recordId?: string;
}

interface Opportunity {
  id: string;
  name: string;
  registeredAddress: string;
  assignedBA: string;
  totalPurchasePrice: string;
  pipeline: string;
}

interface StagedLink {
  recordId: string;
  propertyAddress: string;
  oppId: string;
  oppName: string;
  regAddr: string;
  ba: string;
  price: string;
  pipeline: string;
}

type Tab = 'review' | 'manual';

export default function ManualLinkPage() {
  const [tab, setTab] = useState<Tab>('review');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Review tab state
  const [matches, setMatches] = useState<MatchedItem[]>([]);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [rejected, setRejected] = useState<Set<string>>(new Set());

  // Manual tab state
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [unlinkedProps, setUnlinkedProps] = useState<UnlinkedProperty[]>([]);
  const [oppFilter, setOppFilter] = useState('');
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [selectedRecord, setSelectedRecord] = useState<Record<string, DealRecord | null>>({});
  const [selectedOpp, setSelectedOpp] = useState<Record<string, Opportunity | null>>({});
  const [oppSearches, setOppSearches] = useState<Record<string, string>>({});

  // Shared staging & submission
  const [staged, setStaged] = useState<StagedLink[]>([]);
  const [submitted, setSubmitted] = useState<StagedLink[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const stagedKeys = useMemo(() => new Set(staged.map((s) => `${s.oppId}:${s.recordId}`)), [staged]);
  const submittedKeys = useMemo(() => new Set(submitted.map((s) => `${s.oppId}:${s.recordId}`)), [submitted]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [matchRes, oppRes, recRes, propsRes] = await Promise.all([
        fetch('/api/deal-sheet/match-results'),
        fetch('/api/deal-sheet/cached-opportunities'),
        fetch('/api/deal-sheet/cached-records'),
        fetch('/api/deal-sheet/unlinked-properties'),
      ]);

      if (!matchRes.ok || !oppRes.ok || !recRes.ok) {
        throw new Error('Run "node scripts/match-unlinked.js" and "node scripts/cache-eoi-records.js" first.');
      }

      const [matchData, oppData, recData, propsData] = await Promise.all([
        matchRes.json(),
        oppRes.json(),
        recRes.json(),
        propsRes.ok ? propsRes.json() : { properties: [] },
      ]);

      // Deduplicate by oppId — keep highest score per opportunity
      const seen = new Map<string, MatchedItem>();
      for (const m of (matchData.matched || []) as MatchedItem[]) {
        const existing = seen.get(m.oppId);
        if (!existing || m.score > existing.score) seen.set(m.oppId, m);
      }
      setMatches(Array.from(seen.values()));
      setOpportunities(oppData.opportunities || []);
      setRecords(recData.records || []);
      setUnlinkedProps(propsData.properties || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  // ---- Review tab helpers ----
  const pendingMatches = useMemo(
    () => matches.filter((m) => !approved.has(m.oppId) && !rejected.has(m.oppId)),
    [matches, approved, rejected]
  );

  function handleApprove(m: MatchedItem) {
    setApproved((prev) => new Set([...prev, m.oppId]));
    setStaged((prev) => [
      ...prev,
      {
        recordId: m.recordId,
        propertyAddress: m.propertyAddress,
        oppId: m.oppId,
        oppName: m.oppName,
        regAddr: m.regAddr,
        ba: m.ba,
        price: m.price,
        pipeline: m.pipeline,
      },
    ]);
  }

  function handleReject(oppId: string) {
    setRejected((prev) => new Set([...prev, oppId]));
  }

  function handleApproveAll() {
    const toApprove = pendingMatches.filter((m) => !rejected.has(m.oppId));
    const newStaged: StagedLink[] = toApprove.map((m) => ({
      recordId: m.recordId,
      propertyAddress: m.propertyAddress,
      oppId: m.oppId,
      oppName: m.oppName,
      regAddr: m.regAddr,
      ba: m.ba,
      price: m.price,
      pipeline: m.pipeline,
    }));
    setApproved((prev) => {
      const n = new Set(prev);
      toApprove.forEach((m) => n.add(m.oppId));
      return n;
    });
    setStaged((prev) => [...prev, ...newStaged]);
  }

  // ---- Manual tab helpers ----
  // Filter unlinked properties (exclude already staged/submitted)
  const pendingProps = useMemo(() => {
    const stagedRecordIds = new Set(staged.map((s) => s.recordId));
    const submittedRecordIds = new Set(submitted.map((s) => s.recordId));
    return unlinkedProps.filter(
      (p) => !stagedRecordIds.has(p.id) && !submittedRecordIds.has(p.id)
    );
  }, [unlinkedProps, staged, submitted]);

  // Search opportunities by name or registered address for a given property row
  function getFilteredOpps(propId: string): Opportunity[] {
    const q = (oppSearches[propId] || '').toLowerCase().trim();
    if (!q || q.length < 2) return [];
    return opportunities
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.registeredAddress && o.registeredAddress.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }

  function handlePropertyStage(prop: UnlinkedProperty, opp: Opportunity) {
    setStaged((prev) => [
      ...prev,
      {
        recordId: prop.id,
        propertyAddress: prop.propertyAddress,
        oppId: opp.id,
        oppName: opp.name,
        regAddr: opp.registeredAddress,
        ba: opp.assignedBA,
        price: opp.totalPurchasePrice,
        pipeline: opp.pipeline,
      },
    ]);
    setOppSearches((prev) => { const n = { ...prev }; delete n[prop.id]; return n; });
    setSelectedOpp((prev) => { const n = { ...prev }; delete n[prop.id]; return n; });
  }

  // ---- Shared submit ----
  function handleUnstage(oppId: string) {
    setStaged((prev) => prev.filter((s) => s.oppId !== oppId));
    setApproved((prev) => { const n = new Set(prev); n.delete(oppId); return n; });
  }

  async function handleSubmitAll() {
    if (staged.length === 0) return;
    setSubmitting(true);
    const results: StagedLink[] = [];

    for (const item of staged) {
      try {
        const res = await fetch('/api/deal-sheet/link-opportunity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: item.recordId,
            opportunityId: item.oppId,
            opportunityName: item.oppName,
            assignedBA: item.ba,
            totalPurchasePrice: item.price,
            closingDate: '',
            status: '02_eoi',
          }),
        });
        if (res.ok) {
          results.push(item);
        } else {
          console.error(`Failed to link ${item.oppName}:`, await res.text());
        }
      } catch (err) {
        console.error(`Error linking ${item.oppName}:`, err);
      }
    }

    setSubmitted((prev) => [...prev, ...results]);
    setStaged((prev) => prev.filter((s) => !results.some((r) => r.oppId === s.oppId)));
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">Deal Sheet Linking</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab('review')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'review' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Review Matches ({pendingMatches.length} pending)
        </button>
        <button
          onClick={() => setTab('manual')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === 'manual' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Search {'&'} Link ({pendingProps.length})
        </button>
      </div>

      {/* ==================== REVIEW TAB ==================== */}
      {tab === 'review' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-600">
              {matches.length} auto-matched pairs | {approved.size} approved | {rejected.size} rejected | {pendingMatches.length} pending
            </p>
            {pendingMatches.length > 0 && (
              <button
                onClick={handleApproveAll}
                className="px-4 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Approve All Remaining
              </button>
            )}
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto border rounded">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Score</th>
                  <th className="px-3 py-2 text-left border-b">Opportunity</th>
                  <th className="px-3 py-2 text-left border-b">Pipeline</th>
                  <th className="px-3 py-2 text-left border-b">Opp Registered Address</th>
                  <th className="px-3 py-2 text-left border-b">Deal Sheet Property</th>
                  <th className="px-3 py-2 text-left border-b">BA</th>
                  <th className="px-3 py-2 text-left border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingMatches.map((m) => (
                  <tr key={m.oppId} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{m.score}</td>
                    <td className="px-3 py-2 font-medium text-xs">{m.oppName}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{m.pipeline}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[250px] whitespace-pre-wrap">
                      {m.regAddr}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[250px]">{m.propertyAddress}</td>
                    <td className="px-3 py-2 text-xs">{m.ba || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <button
                        onClick={() => handleApprove(m)}
                        className="px-2 py-1 rounded text-xs bg-green-100 text-green-800 hover:bg-green-200 mr-1"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(m.oppId)}
                        className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingMatches.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                      All matches reviewed. Switch to Manual Search for remaining items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {rejected.size > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              Rejected: {Array.from(rejected).length} items (will not be linked)
            </p>
          )}
        </div>
      )}

      {/* ==================== MANUAL TAB ==================== */}
      {tab === 'manual' && (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            {pendingProps.length} unlinked EOI properties (no client).
            {pendingProps.filter((p) => p.isNew).length > 0 && (
              <span className="ml-2 text-yellow-700 font-medium">
                {pendingProps.filter((p) => p.isNew).length} NEW since CSV (highlighted)
              </span>
            )}
          </p>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto border rounded">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Deal Sheet Property</th>
                  <th className="px-3 py-2 text-left border-b">Status</th>
                  <th className="px-3 py-2 text-left border-b">Type</th>
                  <th className="px-3 py-2 text-left border-b">Packager</th>
                  <th className="px-3 py-2 text-left border-b">Sourcer</th>
                  <th className="px-3 py-2 text-left border-b">Date Packaged</th>
                  <th className="px-3 py-2 text-left border-b min-w-[350px]">Search Opportunity</th>
                  <th className="px-3 py-2 text-left border-b">Registered Address</th>
                  <th className="px-3 py-2 text-left border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingProps.map((prop) => {
                  const searchResults = getFilteredOpps(prop.id);
                  const selected = selectedOpp[prop.id];
                  return (
                    <tr key={prop.id} className={`border-b hover:bg-gray-50 ${prop.isNew ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-2 text-xs font-medium max-w-[250px]">
                        {prop.propertyAddress}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{prop.status}</td>
                      <td className="px-3 py-2 text-xs">{prop.type}</td>
                      <td className="px-3 py-2 text-xs">{prop.packager}</td>
                      <td className="px-3 py-2 text-xs">{prop.sourcer}</td>
                      <td className="px-3 py-2 text-xs">
                        {prop.createdAt ? new Date(prop.createdAt).toLocaleDateString('en-AU') : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by client name, address..."
                            value={oppSearches[prop.id] || ''}
                            onChange={(e) => {
                              setOppSearches((prev) => ({ ...prev, [prop.id]: e.target.value }));
                              setSelectedOpp((prev) => ({ ...prev, [prop.id]: null }));
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                          {oppSearches[prop.id] && searchResults.length > 0 && !selected && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-[200px] overflow-y-auto">
                              {searchResults.map((opp) => (
                                <div
                                  key={opp.id}
                                  onClick={() => {
                                    setSelectedOpp((prev) => ({ ...prev, [prop.id]: opp }));
                                    setOppSearches((prev) => ({ ...prev, [prop.id]: opp.name }));
                                  }}
                                  className="px-2 py-1 text-xs cursor-pointer hover:bg-blue-50 border-b last:border-b-0"
                                >
                                  <span className="font-medium">{opp.name}</span>
                                  <span className="text-gray-400 ml-2">[{opp.pipeline}]</span>
                                  {opp.registeredAddress && (
                                    <span className="text-gray-500 ml-1">| {opp.registeredAddress.substring(0, 60)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {selected && (
                            <div className="mt-1 text-xs text-green-700 font-medium">
                              {selected.name} [{selected.pipeline}]
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px] whitespace-pre-wrap">
                        {selected?.registeredAddress || '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => selected && handlePropertyStage(prop, selected)}
                          disabled={!selected}
                          className={`px-3 py-1 rounded text-xs font-medium ${
                            selected
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Link
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== STAGED ==================== */}
      {staged.length > 0 && (
        <div className="mt-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Staged for Linking ({staged.length})</h2>
          <div className="border rounded overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-yellow-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Opportunity</th>
                  <th className="px-3 py-2 text-left border-b">Property Address</th>
                  <th className="px-3 py-2 text-left border-b">BA</th>
                  <th className="px-3 py-2 text-left border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {staged.map((s) => (
                  <tr key={s.oppId} className="border-b">
                    <td className="px-3 py-2 text-xs font-medium">{s.oppName}</td>
                    <td className="px-3 py-2 text-xs">{s.propertyAddress}</td>
                    <td className="px-3 py-2 text-xs">{s.ba || '-'}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleUnstage(s.oppId)}
                        className="px-2 py-1 rounded text-xs bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="mt-3 px-6 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {submitting ? 'Submitting...' : `Submit All (${staged.length})`}
          </button>
        </div>
      )}

      {/* ==================== SUBMITTED ==================== */}
      {submitted.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2 text-green-700">
            Successfully Linked ({submitted.length})
          </h2>
          <div className="border rounded overflow-x-auto max-h-[200px] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-green-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Opportunity</th>
                  <th className="px-3 py-2 text-left border-b">Property Address</th>
                </tr>
              </thead>
              <tbody>
                {submitted.map((s) => (
                  <tr key={s.oppId} className="border-b">
                    <td className="px-3 py-2 text-xs">{s.oppName}</td>
                    <td className="px-3 py-2 text-xs">{s.propertyAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
