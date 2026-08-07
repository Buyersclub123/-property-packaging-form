'use client';

import { useEffect, useMemo, useState } from 'react';

interface Opportunity {
  id: string;
  name: string;
  registeredAddress: string;
  totalPurchasePrice: string;
  assignedBA: string;
  pipelineStageId: string;
  stageName: string;
  lastStageChangeAt: string;
}

interface DealRecord {
  id: string;
  propertyAddress: string;
  status: string;
  clientClosed: string;
  closingBA: string;
  closingPrice: string;
  priceGroup: string;
}

interface Match {
  opportunity: Opportunity;
  record: DealRecord;
  similarity: number;
}

interface Exception {
  opportunity: Opportunity;
  issue: string;
  record?: DealRecord;
  similarity?: number;
}

interface LinkedItem {
  opportunity: Opportunity;
  record: DealRecord;
  status: string;
  linkedAt: string;
}

const STATES = ['nsw', 'vic', 'qld', 'sa', 'wa', 'tas', 'act', 'nt'];
const VALID_TIERS = [1, 2, 3];

function normalizeAddress(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/\b(unit|u|lot|l|shop|suite|level|floor|apartment|apt)\s*[\d\/]+\b/g, ' ')
    .replace(new RegExp(`\\b(${STATES.join('|')})\\b`, 'g'), ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 1; j <= b.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;
  if (normA.includes(normB) || normB.includes(normA)) return 0.95;
  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - distance / maxLen;
}

function computeMatches(opportunities: Opportunity[], records: DealRecord[]) {
  const matches: Match[] = [];
  const exceptions: Exception[] = [];

  for (const opp of opportunities) {
    if (!opp.registeredAddress.trim()) {
      exceptions.push({ opportunity: opp, issue: 'Missing address' });
      continue;
    }

    const candidates = records
      .map((record) => ({ record, similarity: similarity(opp.registeredAddress, record.propertyAddress) }))
      .filter((c) => c.similarity >= 0.8)
      .sort((a, b) => b.similarity - a.similarity);

    if (candidates.length === 0) {
      exceptions.push({ opportunity: opp, issue: 'No matching property' });
    } else if (candidates.length > 1) {
      const best = candidates[0];
      exceptions.push({
        opportunity: opp,
        issue: 'Ambiguous match',
        record: best.record,
        similarity: best.similarity,
      });
    } else {
      const { record, similarity: sim } = candidates[0];
      if (record.clientClosed && record.clientClosed.trim()) {
        exceptions.push({ opportunity: opp, issue: 'Already linked', record, similarity: sim });
      } else if (!opp.assignedBA.trim()) {
        exceptions.push({ opportunity: opp, issue: 'Missing BA', record, similarity: sim });
      } else if (!opp.totalPurchasePrice.trim()) {
        exceptions.push({ opportunity: opp, issue: 'Missing price', record, similarity: sim });
      } else {
        matches.push({ opportunity: opp, record, similarity: sim });
      }
    }
  }

  return { matches, exceptions };
}

function formatPrice(value: string): string {
  if (!value) return '';
  const numeric = Number(value.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numeric)) return value;
  return `$${numeric.toLocaleString('en-AU')}`;
}

export default function MatchingPage() {
  const [tier, setTier] = useState(1);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [closingDates, setClosingDates] = useState<Record<string, string>>({});
  const [linked, setLinked] = useState<LinkedItem[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('matching_skipped') || '{}'); } catch { return {}; }
  });
  const [comments, setComments] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try { return JSON.parse(localStorage.getItem('matching_comments') || '{}'); } catch { return {}; }
  });
  const [showLinked, setShowLinked] = useState(false);
  const [manualOpportunity, setManualOpportunity] = useState<Opportunity | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [matchPage, setMatchPage] = useState(0);
  const [exceptionPage, setExceptionPage] = useState(0);
  const PAGE_SIZE = 100;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Opportunity Matching';
    }
  }, []);

  async function loadData(selectedTier: number) {
    setLoading(true);
    setError(null);
    try {
      const [oppRes, recRes] = await Promise.all([
        fetch(`/api/deal-sheet/opportunities?tier=${selectedTier}`, { cache: 'no-store' }),
        fetch('/api/deal-sheet?statuses=01,02', { cache: 'no-store' }),
      ]);

      if (!oppRes.ok) {
        const text = await oppRes.text();
        throw new Error(`Opportunities API error: ${oppRes.status} ${text}`);
      }
      if (!recRes.ok) {
        const text = await recRes.text();
        throw new Error(`Deal sheet API error: ${recRes.status} ${text}`);
      }

      const oppData = await oppRes.json();
      const recData = await recRes.json();

      setOpportunities(oppData.opportunities || []);
      setRecords(recData.records || []);
      setStatuses({});
      setClosingDates({});
      setLinkedIds(new Set());
      // Keep skipped & comments from localStorage — don't reset on tier change
      setMatchPage(0);
      setExceptionPage(0);
      setLinked([]);
    } catch (err) {
      console.error('Load data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(tier);
  }, [tier]);

  const activeOpportunities = useMemo(
    () => opportunities.filter((o) => !linkedIds.has(o.id) && !(o.id in skipped)),
    [opportunities, linkedIds, skipped]
  );

  const { matches, exceptions } = useMemo(
    () => computeMatches(activeOpportunities, records),
    [activeOpportunities, records]
  );

  useEffect(() => {
    setStatuses((prev) => {
      const next = { ...prev };
      [...matches, ...exceptions].forEach(({ opportunity }) => {
        if (!next[opportunity.id]) {
          next[opportunity.id] = '02_eoi';
        }
      });
      return next;
    });
    setClosingDates((prev) => {
      const next = { ...prev };
      [...matches, ...exceptions].forEach(({ opportunity }) => {
        if (!next[opportunity.id]) {
          next[opportunity.id] = tier === 2 ? (opportunity.lastStageChangeAt || '') : '';
        }
      });
      return next;
    });
  }, [matches, exceptions]);

  async function handleLink(opportunity: Opportunity, record: DealRecord) {
    const status = statuses[opportunity.id] || '02_eoi';
    try {
      const response = await fetch('/api/deal-sheet/link-opportunity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          opportunityId: opportunity.id,
          opportunityName: opportunity.name,
          assignedBA: opportunity.assignedBA,
          totalPurchasePrice: opportunity.totalPurchasePrice,
          closingDate: closingDates[opportunity.id] || '',
          status,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Link failed: ${response.status} ${text}`);
      }

      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, clientClosed: opportunity.name, status } : r))
      );
      setLinkedIds((prev) => new Set([...prev, opportunity.id]));
      setLinked((prev) => [...prev, { opportunity, record, status, linkedAt: new Date().toISOString() }]);
      setManualOpportunity(null);
      setManualSearch('');
    } catch (err) {
      console.error('Link opportunity error:', err);
      setError(err instanceof Error ? err.message : 'Failed to link opportunity');
    }
  }

  function handleSkip(opportunity: Opportunity) {
    setSkipped((prev) => {
      const next = { ...prev, [opportunity.id]: comments[opportunity.id] || '' };
      localStorage.setItem('matching_skipped', JSON.stringify(next));
      return next;
    });
    setComments((prev) => {
      const next = { ...prev };
      localStorage.setItem('matching_comments', JSON.stringify(next));
      return next;
    });
  }

  const filteredRecordsForManual = useMemo(() => {
    if (!manualOpportunity) return [];
    const term = normalizeAddress(manualSearch);
    return records.filter((r) => {
      if (term) {
        const normProperty = normalizeAddress(r.propertyAddress);
        return normProperty.includes(term) || term.includes(normProperty);
      }
      return true;
    });
  }, [manualOpportunity, manualSearch, records]);

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-4 text-2xl font-bold">Opportunity Matching</h1>

        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {VALID_TIERS.map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`rounded px-4 py-2 text-sm font-medium ${
                  tier === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tier {t}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-600">
            {opportunities.length} opportunities loaded | {matches.length} auto-matched | {exceptions.length} exceptions
          </div>
        </div>

        {loading && <p className="text-gray-500">Loading...</p>}
        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {!loading && (
          <>
            <section className="mb-8">
              <h2 className="mb-2 text-lg font-semibold">Clean Matches ({matches.length})</h2>
              {matches.length === 0 ? (
                <p className="text-gray-500">No clean matches found.</p>
              ) : (
                <>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="border p-2">Opportunity Name</th>
                      <th className="border p-2">Opp Address</th>
                      <th className="border p-2">Property Address</th>
                      <th className="border p-2">Stage</th>
                      <th className="border p-2">BA</th>
                      <th className="border p-2">Price</th>
                      <th className="border p-2">Price Group</th>
                      <th className="border p-2">Closing Date</th>
                      <th className="border p-2">Current Status</th>
                      <th className="border p-2">New Status</th>
                      <th className="border p-2">Comment</th>
                      <th className="border p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.slice(matchPage * PAGE_SIZE, (matchPage + 1) * PAGE_SIZE).map(({ opportunity, record, similarity }) => (
                      <tr key={opportunity.id} className="border-b hover:bg-gray-50">
                        <td className="border p-2">{opportunity.name}</td>
                        <td className="border p-2">{opportunity.registeredAddress}</td>
                        <td className="border p-2">{record.propertyAddress}</td>
                        <td className="border p-2">{opportunity.stageName}</td>
                        <td className="border p-2">{opportunity.assignedBA}</td>
                        <td className="border p-2">{formatPrice(opportunity.totalPurchasePrice)}</td>
                        <td className="border p-2 text-gray-500">{record.priceGroup}</td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={closingDates[opportunity.id] || ''}
                            onChange={(e) =>
                              setClosingDates((prev) => ({ ...prev, [opportunity.id]: e.target.value }))
                            }
                            placeholder="DD/MM/YYYY"
                            className="w-28 rounded border p-1"
                          />
                        </td>
                        <td className="border p-2 text-gray-600">{record.status}</td>
                        <td className="border p-2">
                          <select
                            value={statuses[opportunity.id] || '02_eoi'}
                            onChange={(e) =>
                              setStatuses((prev) => ({ ...prev, [opportunity.id]: e.target.value }))
                            }
                            className="rounded border p-1"
                          >
                            <option value="02_eoi">02_eoi</option>
                            <option value="03_contr_exchanged">03_contr_exchanged</option>
                          </select>
                        </td>
                        <td className="border p-2">
                          <textarea
                            value={comments[opportunity.id] || ''}
                            onChange={(e) => {
                              setComments((prev) => ({ ...prev, [opportunity.id]: e.target.value }));
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder="Note..."
                            rows={1}
                            className="w-40 resize-none overflow-hidden rounded border p-1 text-sm"
                          />
                        </td>
                        <td className="border p-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSkip(opportunity)}
                              className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
                            >
                              Skip
                            </button>
                            <button
                              onClick={() => handleLink(opportunity, record)}
                              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                            >
                              Confirm Link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {matches.length > PAGE_SIZE && (
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <button
                      onClick={() => setMatchPage((p) => Math.max(0, p - 1))}
                      disabled={matchPage === 0}
                      className="rounded bg-gray-200 px-3 py-1 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <span>Page {matchPage + 1} of {Math.ceil(matches.length / PAGE_SIZE)}</span>
                    <button
                      onClick={() => setMatchPage((p) => Math.min(Math.ceil(matches.length / PAGE_SIZE) - 1, p + 1))}
                      disabled={(matchPage + 1) * PAGE_SIZE >= matches.length}
                      className="rounded bg-gray-200 px-3 py-1 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                )}
                </>
              )}
            </section>

            <section className="mb-8">
              <h2 className="mb-2 text-lg font-semibold">Exceptions ({exceptions.length})</h2>
              {exceptions.length === 0 ? (
                <p className="text-gray-500">No exceptions.</p>
              ) : (
                <>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="border p-2">Opportunity Name</th>
                      <th className="border p-2">Opp Address</th>
                      <th className="border p-2">Issue</th>
                      <th className="border p-2">Stage</th>
                      <th className="border p-2">BA</th>
                      <th className="border p-2">Price</th>
                      <th className="border p-2">Closing Date</th>
                      <th className="border p-2">Comment</th>
                      <th className="border p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exceptions.slice(exceptionPage * PAGE_SIZE, (exceptionPage + 1) * PAGE_SIZE).map(({ opportunity, issue, record, similarity }) => (
                      <tr key={opportunity.id} className="border-b hover:bg-gray-50">
                        <td className="border p-2">{opportunity.name}</td>
                        <td className="border p-2">{opportunity.registeredAddress || '(empty)'}</td>
                        <td className="border p-2">
                          {issue}
                          {record && similarity !== undefined && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({(similarity * 100).toFixed(0)}% match: {record.propertyAddress})
                            </span>
                          )}
                        </td>
                        <td className="border p-2">{opportunity.stageName}</td>
                        <td className="border p-2">{opportunity.assignedBA || '(empty)'}</td>
                        <td className="border p-2">
                          {opportunity.totalPurchasePrice ? formatPrice(opportunity.totalPurchasePrice) : '(empty)'}
                        </td>
                        <td className="border p-2">
                          <input
                            type="text"
                            value={closingDates[opportunity.id] || ''}
                            onChange={(e) =>
                              setClosingDates((prev) => ({ ...prev, [opportunity.id]: e.target.value }))
                            }
                            placeholder="DD/MM/YYYY"
                            className="w-28 rounded border p-1"
                          />
                        </td>
                        <td className="border p-2">
                          <textarea
                            value={comments[opportunity.id] || ''}
                            onChange={(e) => {
                              setComments((prev) => ({ ...prev, [opportunity.id]: e.target.value }));
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            placeholder="Note..."
                            rows={1}
                            className="w-40 resize-none overflow-hidden rounded border p-1 text-sm"
                          />
                        </td>
                        <td className="border p-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSkip(opportunity)}
                              className="rounded bg-gray-200 px-3 py-1 hover:bg-gray-300"
                            >
                              Skip
                            </button>
                            <button
                              onClick={() => {
                                setManualOpportunity(opportunity);
                                setManualSearch('');
                              }}
                              className="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
                            >
                              Manual Link
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {exceptions.length > PAGE_SIZE && (
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <button
                      onClick={() => setExceptionPage((p) => Math.max(0, p - 1))}
                      disabled={exceptionPage === 0}
                      className="rounded bg-gray-200 px-3 py-1 disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <span>Page {exceptionPage + 1} of {Math.ceil(exceptions.length / PAGE_SIZE)}</span>
                    <button
                      onClick={() => setExceptionPage((p) => Math.min(Math.ceil(exceptions.length / PAGE_SIZE) - 1, p + 1))}
                      disabled={(exceptionPage + 1) * PAGE_SIZE >= exceptions.length}
                      className="rounded bg-gray-200 px-3 py-1 disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                )}
                </>
              )}
            </section>
          </>
        )}

        {Object.keys(skipped).length > 0 && (
          <section className="mb-8">
            <h2 className="mb-2 text-lg font-semibold text-gray-500">Skipped ({Object.keys(skipped).length})</h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border p-2">Opportunity Name</th>
                  <th className="border p-2">Address</th>
                  <th className="border p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(skipped).map(([id, reason]) => {
                  const opp = opportunities.find((o) => o.id === id);
                  return opp ? (
                    <tr key={id} className="border-b text-gray-400">
                      <td className="border p-2">{opp.name}</td>
                      <td className="border p-2">{opp.registeredAddress || '(empty)'}</td>
                      <td className="border p-2">{reason || '(no reason)'}</td>
                    </tr>
                  ) : null;
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="mb-8">
          <button
            onClick={() => setShowLinked((s) => !s)}
            className="mb-2 flex items-center gap-2 text-lg font-semibold text-blue-700 hover:underline"
          >
            Linked ({linked.length}) {showLinked ? '−' : '+'}
          </button>
          {showLinked && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border p-2">Opportunity Name</th>
                  <th className="border p-2">Property Address</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Linked At</th>
                </tr>
              </thead>
              <tbody>
                {linked.map((item) => (
                  <tr key={item.opportunity.id} className="border-b">
                    <td className="border p-2">{item.opportunity.name}</td>
                    <td className="border p-2">{item.record.propertyAddress}</td>
                    <td className="border p-2">{item.status}</td>
                    <td className="border p-2">{new Date(item.linkedAt).toLocaleString('en-AU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {manualOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded bg-white p-6 shadow-lg">
              <h3 className="mb-4 text-lg font-semibold">Manual Link — {manualOpportunity.name}</h3>
              <p className="mb-2 text-sm text-gray-600">Opportunity address: {manualOpportunity.registeredAddress || '(empty)'}</p>

              <div className="mb-4 flex gap-4">
                <input
                  type="text"
                  placeholder="Search property address..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="flex-1 rounded border p-2"
                />
                <select
                  value={statuses[manualOpportunity.id] || '02_eoi'}
                  onChange={(e) =>
                    setStatuses((prev) => ({ ...prev, [manualOpportunity.id]: e.target.value }))
                  }
                  className="rounded border p-2"
                >
                  <option value="02_eoi">02_eoi</option>
                  <option value="03_contr_exchanged">03_contr_exchanged</option>
                </select>
              </div>

              <div className="mb-4 max-h-60 overflow-auto rounded border">
                {filteredRecordsForManual.length === 0 ? (
                  <p className="p-3 text-gray-500">No records found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 text-left">
                      <tr>
                        <th className="p-2">Property Address</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecordsForManual.map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="p-2">{record.propertyAddress}</td>
                          <td className="p-2">{record.status}</td>
                          <td className="p-2">
                            <button
                              onClick={() => handleLink(manualOpportunity, record)}
                              className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <button
                onClick={() => {
                  setManualOpportunity(null);
                  setManualSearch('');
                }}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
