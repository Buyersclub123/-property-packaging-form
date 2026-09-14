'use client';

// ============================================================================
// EOI SENDING — STANDALONE DEMO (Decision #7 / #8)
//
// Proof of concept for the CEO pitch. Deliberately inert:
//   * reads real property records via the existing GET /api/deal-sheet only
//   * never writes to GHL, never sends email, never touches an opportunity
//   * "send" history lives in this browser (localStorage) and nowhere else
// The real implementation is D7, after the linking work.
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import EoiPreview, { EoiData, Purchaser } from './EoiPreview';
import FlowDemo from './FlowDemo';
import {
  AU_STATES,
  AuState,
  PropertyType,
  TYPE_LABELS,
  detectState,
  detectType,
  getTerms,
} from './templates';

if (typeof document !== 'undefined') document.title = 'EOI Sending — DEMO';

interface DealRecord {
  id: string;
  type: string;
  status: string;
  propertyAddress: string;
  // NOTE: `asking` is a dropdown (On-market / Off-market / Pre-launch / TBC),
  // NOT a price. The figure lives in acceptAcqTotal ("Accept Acq' / Total $").
  asking: string;
  acceptAcqTotal: string;
  closePrefill: string;
  closingPrice: string;
  clientClosed: string;
  closingBA: string;
  sellingAgent: string;
  linkedOpportunityId: string;
}

interface SentEoi {
  id: string;
  recordId: string;
  propertyAddress: string;
  offerPrice: string;
  offerValue: number;
  sentAt: string;
  sentBy: string;
  agentEmail: string;
  isIncrease: boolean;
  kind?: 'initial' | 'increase' | 'revision';
}

const STORAGE_KEY = 'eoi-demo-history';

function currencyRaw(v: string): string {
  return (v || '').replace(/[^0-9.]/g, '');
}

function currencyFormatted(v: string): string {
  const raw = currencyRaw(v);
  if (!raw) return '';
  const [whole, ...rest] = raw.split('.');
  const n = parseFloat(whole);
  if (isNaN(n)) return '';
  return '$' + n.toLocaleString('en-AU') + (rest.length ? '.' + rest[0] : '');
}

function emptyPurchaser(): Purchaser {
  return { name: '', email: '', phone: '', address: '' };
}

export default function EoiDemoPage() {
  const [records, setRecords] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [linkedOnly, setLinkedOnly] = useState(true);
  const [selected, setSelected] = useState<DealRecord | null>(null);
  const [showFlow, setShowFlow] = useState(false);
  // The demo opens on the walkthrough ("how the BA gets here") and only moves
  // to the composer on the final click, so it can be presented as one story.
  const [view, setView] = useState<'intro' | 'compose'>('intro');

  const [state, setState] = useState<AuState>('QLD');
  const [type, setType] = useState<PropertyType>('established');
  const [offerPrice, setOfferPrice] = useState('');
  const [purchasers, setPurchasers] = useState<Purchaser[]>([emptyPurchaser()]);
  const [contractEntity, setContractEntity] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [solicitorName, setSolicitorName] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [consultantName, setConsultantName] = useState('');

  const [contactLoading, setContactLoading] = useState(false);
  const [contactNote, setContactNote] = useState('');
  const [history, setHistory] = useState<SentEoi[]>([]);
  const [sendResult, setSendResult] = useState<SentEoi | null>(null);
  const [showIncrease, setShowIncrease] = useState(false);
  const [increaseTo, setIncreaseTo] = useState('');

  // ---- real property records, read-only -----------------------------------
  function loadRecords() {
    setLoading(true);
    setLoadError('');
    fetch('/api/deal-sheet?statuses=01,02&_t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((d) => setRecords(d.records || []))
      .catch((e) => setLoadError(e.message || 'Failed to load property records'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* demo only — ignore */
    }
  }, []);

  function persist(next: SentEoi[]) {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* demo only — ignore */
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = q
      ? records.filter(
          (r) =>
            r.propertyAddress?.toLowerCase().includes(q) ||
            r.clientClosed?.toLowerCase().includes(q) ||
            r.sellingAgent?.toLowerCase().includes(q)
        )
      : records;
    if (linkedOnly) list = list.filter((r) => r.linkedOpportunityId);
    // Linked records first — they are the ones that demo the prefill properly.
    return [...list]
      .sort((a, b) => (b.linkedOpportunityId ? 1 : 0) - (a.linkedOpportunityId ? 1 : 0))
      .slice(0, 60);
  }, [records, search, linkedOnly]);

  const linkedCount = useMemo(
    () => records.filter((r) => r.linkedOpportunityId).length,
    [records]
  );

  function choose(rec: DealRecord) {
    setSelected(rec);
    setSendResult(null);
    setShowIncrease(false);
    setContactNote('');
    const detected = detectState(rec.propertyAddress);
    setState(detected || 'QLD');
    setType(detectType(rec.type));
    setOfferPrice(
      currencyRaw(rec.closingPrice || rec.closePrefill || rec.acceptAcqTotal || '')
    );
    setPurchasers([
      rec.clientClosed && rec.clientClosed !== 'SPECULATIVE EOI'
        ? { ...emptyPurchaser(), name: rec.clientClosed }
        : emptyPurchaser(),
    ]);
    loadContact(rec);
    setContractEntity('');
    setAgentName(rec.sellingAgent || '');
    setAgentEmail('');
    setAgentPhone('');
    setAgencyName('');
    setSolicitorName('');
    setBrokerName('');
    setConsultantName(rec.closingBA || '');
  }

  // Pull the purchaser's real details from the linked opportunity's contact in
  // GHL — read-only. This is the "no retyping" moment: name, email and phone
  // arrive on their own.
  async function loadContact(rec: DealRecord) {
    if (!rec.linkedOpportunityId) {
      setContactNote(
        'No linked opportunity on this record — in the real flow the EOI can still go out speculatively, and the client is attached later.'
      );
      return;
    }
    setContactLoading(true);
    try {
      const res = await fetch(
        `/api/deal-sheet/opportunities?v=2&id=${encodeURIComponent(rec.linkedOpportunityId)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('lookup failed');
      const d = await res.json();
      const opp = (d.opportunities || [])[0];
      if (!opp) throw new Error('not found');
      const name = opp.contactName || opp.name || rec.clientClosed || '';
      setPurchasers([
        {
          name,
          email: opp.contactEmail || '',
          phone: opp.contactPhone || '',
          address: '',
        },
      ]);
      if (opp.assignedBA) setConsultantName(opp.assignedBA);
      const got = [opp.contactEmail && 'email', opp.contactPhone && 'phone'].filter(Boolean);
      setContactNote(
        got.length > 0
          ? `Purchaser ${got.join(' and ')} pulled from the linked opportunity's contact in GHL — no typing.`
          : "Linked opportunity found, but its contact has no email or phone recorded in GHL."
      );
    } catch {
      setContactNote('Could not read the linked opportunity — enter the purchaser manually.');
    } finally {
      setContactLoading(false);
    }
  }

  const terms = useMemo(() => getTerms(state, type), [state, type]);

  const eoiData: EoiData = {
    propertyAddress: selected?.propertyAddress || '',
    offerPrice: currencyFormatted(offerPrice),
    state,
    type,
    purchasers,
    contractEntity,
    agentName,
    agentEmail,
    agentPhone,
    agencyName,
    solicitorName,
    solicitorEmail: '',
    solicitorPhone: '',
    brokerName,
    brokerEmail: '',
    brokerPhone: '',
    consultantName,
    terms,
  };

  const recordHistory = history.filter((h) => h.recordId === selected?.id);
  const lastSend = recordHistory[recordHistory.length - 1];

  function simulateSend(
    kind: 'initial' | 'increase' | 'revision' = 'initial',
    priceOverride?: string
  ) {
    if (!selected) return;
    const price = priceOverride ?? offerPrice;
    const entry: SentEoi = {
      id: `${Date.now()}`,
      recordId: selected.id,
      propertyAddress: selected.propertyAddress,
      offerPrice: currencyFormatted(price),
      offerValue: parseFloat(currencyRaw(price)) || 0,
      sentAt: new Date().toISOString(),
      sentBy: consultantName || 'Demo User',
      agentEmail: agentEmail || 'agent@example.com',
      isIncrease: kind === 'increase',
      kind,
    };
    persist([...history, entry]);
    setSendResult(entry);
    setShowIncrease(false);
    if (priceOverride) setOfferPrice(currencyRaw(priceOverride));
  }

  const canSend = Boolean(
    selected && offerPrice && purchasers.some((p) => p.name.trim()) && agentEmail.trim()
  );

  const uplift =
    recordHistory.length > 1
      ? ((recordHistory[recordHistory.length - 1].offerValue - recordHistory[0].offerValue) /
          recordHistory[0].offerValue) *
        100
      : 0;

  const inputCls =
    'w-full px-2 py-1 text-xs rounded border bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500';
  const labelCls = 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide';

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Demo banner — deliberately loud and always visible */}
      <div className="sticky top-0 z-50 bg-amber-500 text-black text-xs font-bold px-4 py-2 flex items-center justify-between">
        <span>
          DEMO / PROOF OF CONCEPT — nothing is sent, no emails leave the system, and nothing is
          written to GHL. Property data is read-only.
        </span>
        <span className="opacity-70">EOI sending · concept for review</span>
      </div>

      {view === 'intro' && (
        <div className="px-4 py-8 flex justify-center">
          <div className="w-[640px] max-w-full">
            <h1 className="text-xl font-bold">EOI Sending</h1>
            <p className="text-xs text-gray-600 mt-1 mb-5">
              Replaces the funnel page. The BA sets a property to EOI and links the client on the
              deal sheet as they do today — then the system offers to send the EOI, already filled
              in, and records every send so offer movement can be measured.
            </p>

            <div className="bg-white rounded border border-gray-200 p-4">
              <div className="text-sm font-semibold mb-1">
                Which property did you just set to EOI?
              </div>
              <div className="text-[11px] text-gray-500 mb-3">
                Search the live deal sheet for the client or address you used, then we&apos;ll walk
                the flow through from that status change.
              </div>

              <div className="flex items-center gap-2 mb-2">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search client, address or agent"
                  className={inputCls}
                  autoFocus
                />
                <button
                  onClick={loadRecords}
                  className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 hover:bg-gray-300 whitespace-nowrap"
                  title="Reload from the deal sheet — use this if you just made the change in another tab"
                >
                  {loading ? '…' : 'Refresh'}
                </button>
              </div>
              <label className="flex items-center gap-1.5 mb-2 text-[10px] text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkedOnly}
                  onChange={(e) => setLinkedOnly(e.target.checked)}
                />
                Only properties with a linked client ({linkedCount})
              </label>

              <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded">
                {loading && <div className="p-3 text-xs text-gray-500">Loading properties…</div>}
                {loadError && (
                  <div className="p-3 text-xs text-red-600">
                    Could not load property records: {loadError}
                  </div>
                )}
                {!loading &&
                  !loadError &&
                  filtered.map((rec) => (
                    <button
                      key={rec.id}
                      onClick={() => {
                        choose(rec);
                        setShowFlow(true);
                      }}
                      className="w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-blue-50"
                    >
                      <div className="text-xs font-medium truncate">
                        {rec.clientClosed || '(no client yet)'}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">
                        {rec.propertyAddress} · {rec.status}
                      </div>
                    </button>
                  ))}
                {!loading && !loadError && filtered.length === 0 && (
                  <div className="p-3 text-xs text-gray-500">
                    Nothing matches. If you just changed the status in the deal sheet, hit
                    Refresh.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setView('compose')}
              className="mt-3 text-[11px] underline text-gray-500"
            >
              Skip the walkthrough, go straight to the EOI composer
            </button>
          </div>
        </div>
      )}

      <div className={`px-4 py-4 ${view === 'intro' ? 'hidden' : ''}`}>
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-bold">EOI Sending</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFlow(true)}
              disabled={!selected}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40"
              title={selected ? '' : 'Pick a property first'}
            >
              ▶ Replay the flow
            </button>
            <button
              onClick={() => {
                setView('intro');
                setSearch('');
              }}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Start again
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-0.5 mb-4">
          Replaces the funnel page: pick the property, the terms load for the state and type, the
          EOI is prefilled from the deal sheet, and every send is recorded so offer movement can be
          measured.
        </p>

        <div className="grid grid-cols-[300px_1fr_460px] gap-4 items-start">
          {/* ---------------- property picker ---------------- */}
          <div className="bg-white rounded border border-gray-200 flex flex-col max-h-[78vh]">
            <div className="px-3 py-2 border-b border-gray-200">
              <div className="text-xs font-semibold mb-1.5">1. Choose the property</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search address, client, agent"
                className={inputCls}
              />
              <label className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkedOnly}
                  onChange={(e) => setLinkedOnly(e.target.checked)}
                />
                Only properties with a linked client ({linkedCount})
              </label>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading && <div className="p-3 text-xs text-gray-500">Loading properties…</div>}
              {loadError && (
                <div className="p-3 text-xs text-red-600">
                  Could not load property records: {loadError}
                </div>
              )}
              {!loading &&
                !loadError &&
                filtered.map((rec) => {
                  const sends = history.filter((h) => h.recordId === rec.id).length;
                  return (
                    <button
                      key={rec.id}
                      onClick={() => choose(rec)}
                      className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-blue-50 ${
                        selected?.id === rec.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="text-xs font-medium truncate">{rec.propertyAddress}</div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                        <span>{rec.status}</span>
                        <span>·</span>
                        <span>
                          {currencyFormatted(rec.acceptAcqTotal || rec.closePrefill) ||
                            'price TBC'}
                        </span>
                        {rec.asking && <span className="text-gray-400">{rec.asking}</span>}
                        {sends > 0 && (
                          <span className="px-1 rounded bg-emerald-100 text-emerald-700 font-semibold">
                            {sends} EOI{sends > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              {!loading && !loadError && filtered.length === 0 && (
                <div className="p-3 text-xs text-gray-500">No properties match.</div>
              )}
            </div>
          </div>

          {/* ---------------- composer ---------------- */}
          <div className="bg-white rounded border border-gray-200 p-3 max-h-[78vh] overflow-y-auto">
            <div className="text-xs font-semibold mb-2">2. Compose</div>
            {!selected ? (
              <div className="text-xs text-gray-500 py-8 text-center">
                Pick a property on the left to prefill the EOI.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className={labelCls}>State</div>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value as AuState)}
                      className={inputCls}
                    >
                      {AU_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className={labelCls}>Type</div>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as PropertyType)}
                      className={inputCls}
                    >
                      <option value="established">{TYPE_LABELS.established}</option>
                      <option value="house_and_land">{TYPE_LABELS.house_and_land}</option>
                    </select>
                  </div>
                  <div>
                    <div className={labelCls}>Offer price</div>
                    <input
                      value={currencyFormatted(offerPrice)}
                      onChange={(e) => setOfferPrice(currencyRaw(e.target.value))}
                      placeholder="$650,000"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 -mt-1">
                  Terms below load automatically from the {state} · {TYPE_LABELS[type]} template —
                  the same wording the current builder uses.
                </div>

                {(contactLoading || contactNote) && (
                  <div
                    className={`rounded px-2 py-1.5 text-[11px] border ${
                      contactNote.startsWith('Could not') || contactNote.startsWith('No linked')
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    {contactLoading ? 'Reading the linked client from GHL…' : contactNote}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className={labelCls}>Purchasers</div>
                    {purchasers.length < 4 && (
                      <button
                        onClick={() => setPurchasers([...purchasers, emptyPurchaser()])}
                        className="text-[10px] text-blue-600 underline"
                      >
                        + add purchaser ({purchasers.length}/4)
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {purchasers.map((p, i) => (
                      <div key={i} className="grid grid-cols-2 gap-1.5">
                        <input
                          value={p.name}
                          onChange={(e) => {
                            const next = [...purchasers];
                            next[i] = { ...p, name: e.target.value };
                            setPurchasers(next);
                          }}
                          placeholder={`Purchaser ${i + 1} name`}
                          className={inputCls}
                        />
                        <input
                          value={p.email}
                          onChange={(e) => {
                            const next = [...purchasers];
                            next[i] = { ...p, email: e.target.value };
                            setPurchasers(next);
                          }}
                          placeholder="Email"
                          className={inputCls}
                        />
                        <input
                          value={p.phone}
                          onChange={(e) => {
                            const next = [...purchasers];
                            next[i] = { ...p, phone: e.target.value };
                            setPurchasers(next);
                          }}
                          placeholder="Phone"
                          className={inputCls}
                        />
                        <input
                          value={p.address}
                          onChange={(e) => {
                            const next = [...purchasers];
                            next[i] = { ...p, address: e.target.value };
                            setPurchasers(next);
                          }}
                          placeholder="Address"
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className={labelCls}>Contract entity (optional)</div>
                  <input
                    value={contractEntity}
                    onChange={(e) => setContractEntity(e.target.value)}
                    placeholder="e.g. Smith Super Pty Ltd ATF Smith SF"
                    className={inputCls}
                  />
                </div>

                <div>
                  <div className={labelCls}>Selling agent (recipient)</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Agent name"
                      className={inputCls}
                    />
                    <input
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="Agent email (required)"
                      className={inputCls}
                    />
                    <input
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      placeholder="Agent phone"
                      className={inputCls}
                    />
                    <input
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="Agency"
                      className={inputCls}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    In the real build these are remembered per agent and reused across the
                    packaging form (R5 contact database).
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className={labelCls}>Solicitor</div>
                    <input
                      value={solicitorName}
                      onChange={(e) => setSolicitorName(e.target.value)}
                      placeholder="TBC"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <div className={labelCls}>Broker</div>
                    <input
                      value={brokerName}
                      onChange={(e) => setBrokerName(e.target.value)}
                      placeholder="TBC"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <div className={labelCls}>Sent by</div>
                    <input
                      value={consultantName}
                      onChange={(e) => setConsultantName(e.target.value)}
                      placeholder="Consultant / BA"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    onClick={() => simulateSend(lastSend ? 'revision' : 'initial')}
                    disabled={!canSend}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {lastSend ? 'Edit & resend EOI (simulated)' : 'Send EOI (simulated)'}
                  </button>
                  {lastSend && (
                    <button
                      onClick={() => {
                        setShowIncrease(true);
                        setIncreaseTo(currencyRaw(String(lastSend.offerValue)));
                      }}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Increase offer
                    </button>
                  )}
                  {!canSend && (
                    <span className="text-[10px] text-gray-500">
                      Needs an offer price, one purchaser and an agent email.
                    </span>
                  )}
                </div>

                {showIncrease && lastSend && (
                  <div className="rounded border border-emerald-500 bg-emerald-50 p-2">
                    <div className="text-[11px] font-semibold mb-1">
                      Increase offer — last sent at {lastSend.offerPrice}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={currencyFormatted(increaseTo)}
                        onChange={(e) => setIncreaseTo(currencyRaw(e.target.value))}
                        className={inputCls + ' w-40'}
                      />
                      <button
                        onClick={() => simulateSend('increase', increaseTo)}
                        disabled={
                          !increaseTo || parseFloat(increaseTo) <= lastSend.offerValue
                        }
                        className="px-2 py-1 rounded text-xs font-semibold bg-emerald-600 text-white disabled:opacity-40"
                      >
                        Send increase
                      </button>
                      <button
                        onClick={() => setShowIncrease(false)}
                        className="text-[11px] underline text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                    {increaseTo && parseFloat(increaseTo) > lastSend.offerValue && (
                      <div className="text-[10px] text-emerald-700 mt-1">
                        +
                        {(
                          ((parseFloat(increaseTo) - lastSend.offerValue) / lastSend.offerValue) *
                          100
                        ).toFixed(2)}
                        % on the previous offer
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- preview + history ---------------- */}
          <div className="space-y-3">
            <div className="bg-white rounded border border-gray-200 p-2 max-h-[52vh] overflow-y-auto">
              <div className="text-xs font-semibold mb-2 px-1">3. What the agent receives</div>
              {selected ? (
                <EoiPreview data={eoiData} />
              ) : (
                <div className="text-xs text-gray-500 py-8 text-center">
                  The live preview appears here.
                </div>
              )}
            </div>

            <div className="bg-white rounded border border-gray-200 p-3">
              <div className="text-xs font-semibold mb-2">
                Offer history {selected ? `— ${recordHistory.length} send(s)` : ''}
              </div>
              {recordHistory.length === 0 ? (
                <div className="text-[11px] text-gray-500">
                  Every send and every increase is recorded here. Across all properties this
                  becomes the negotiation data the business has never had: average uplift needed to
                  win, and how each BA negotiates.
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {recordHistory.map((h, i) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between text-[11px] border-b border-gray-100 pb-1"
                      >
                        <span>
                          {h.kind === 'increase' || h.isIncrease
                            ? 'Increase'
                            : h.kind === 'revision'
                              ? 'Revised / resent'
                              : 'Initial EOI'}{' '}
                          · {h.offerPrice}
                        </span>
                        <span className="text-gray-500">
                          {new Date(h.sentAt).toLocaleString('en-AU')} · {h.sentBy}
                        </span>
                      </div>
                    ))}
                  </div>
                  {uplift > 0 && (
                    <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                      Total uplift from first offer: +{uplift.toFixed(2)}%
                    </div>
                  )}
                </>
              )}
              {history.length > 0 && (
                <button
                  onClick={() => persist([])}
                  className="mt-2 text-[10px] underline text-gray-500"
                >
                  Clear demo history
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFlow && selected && (
        <FlowDemo
          address={selected.propertyAddress}
          client={selected.clientClosed}
          ba={selected.closingBA}
          price={currencyFormatted(offerPrice)}
          onSendEoi={() => {
            setShowFlow(false);
            setView('compose');
          }}
          onClose={() => setShowFlow(false)}
        />
      )}

      {/* ---------------- simulated send result ---------------- */}
      {sendResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-lg shadow-xl w-[560px] max-w-full">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="font-semibold text-sm">Simulated send — nothing left the system</div>
              <button onClick={() => setSendResult(null)} className="text-gray-500 text-xs">
                Close
              </button>
            </div>
            <div className="px-4 py-3 text-xs space-y-2">
              <div className="text-gray-600">In the real build, this single click would:</div>
              <ul className="list-disc ml-5 space-y-1">
                <li>
                  Email the EOI to <strong>{sendResult.agentEmail}</strong>, cc the consultant and
                  property@buyersclub.com.au
                </li>
                <li>
                  Record the send against <strong>{sendResult.propertyAddress}</strong> at{' '}
                  <strong>{sendResult.offerPrice}</strong>, including who sent it (
                  {sendResult.sentBy})
                </li>
                <li>
                  Move the linked opportunity to <strong>EOI / Under Negotiation</strong> in the
                  Property Team pipeline (R8)
                </li>
                <li>Store the selling agent&apos;s details for reuse across the tools (R5)</li>
              </ul>
              <div className="rounded bg-amber-50 border border-amber-300 px-2 py-1.5 text-[11px]">
                None of the above happened. This demo has no send capability and no write access —
                the entry was saved to this browser only.
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSendResult(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
