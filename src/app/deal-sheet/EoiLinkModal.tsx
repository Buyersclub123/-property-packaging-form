'use client';

import { useEffect, useMemo, useState } from 'react';

// ============================================================================
// EOI Link Modal — create or edit a client link on a Deal Sheet record.
// Create mode: opens from status → 02 EOI. Edit mode: opens from the Edit
// button on already-linked or speculative records.
// See docs/deal-sheet-eoi-d1-brief.md (F13).
// ============================================================================

interface DealRecord {
  id: string;
  status: string;
  type: string;
  propertyAddress: string;
  closePrefill: string;
  linkedOpportunityId: string;
  clientClosed: string;
  closingBA: string;
  closingPrice: string;
  closingDate: string;
}

export interface EoiOpportunity {
  id: string;
  name: string;
  registeredAddress: string;
  totalPurchasePrice: string;
  assignedBA: string;
  pipelineStageId: string;
  stageName: string;
  lastStageChangeAt: string;
}

export interface EoiLinkPayload {
  opportunityId: string;
  opportunityName: string;
  assignedBA: string;
  totalPurchasePrice: string;
  closingDate: string;
  writeBaToOpportunity: boolean;
}

export interface EoiUpdatePayload {
  opportunityId: string;
  opportunityName: string;
  assignedBA: string;
  totalPurchasePrice: string;
  closingDate: string;
  transitionType: 'client_edited' | 'reassigned' | 'reverted_to_speculative' | 'client_removed';
  writeBaToOpportunity: boolean;
}

type ModalMode = 'create' | 'edit';

interface EoiLinkModalProps {
  record: DealRecord;
  mode: ModalMode;
  theme: 'dark' | 'light';
  onLink: (payload: EoiLinkPayload) => Promise<boolean>;
  onUpdate: (payload: EoiUpdatePayload) => Promise<boolean>;
  onSpeculative: () => Promise<boolean>;
  onCancel: () => void;
}

const ASSIGNED_BA_FIELD_ID = 'NXqFwEzo28k6lOkbyT5N';

// F1 — stage-likelihood ordering: monetary (price-bracket) stages first,
// then other stages, Exchanged-type near the bottom, "On Hold" always last.
function stageRank(stageName: string): number {
  const s = (stageName || '').toLowerCase();
  if (s.includes('on hold')) return 3;
  if (s.includes('exchang')) return 2;
  if (stageName.includes('$')) return 0;
  return 1;
}

const TIER_LABELS: Record<number, string> = {
  1: 'Property Team pipeline',
  2: '+ Contracts pipeline',
  3: '+ Finance & Construction',
};

function getTodayAESTIso(): string {
  const now = new Date();
  const aest = new Date(now.getTime() + 10 * 60 * 60 * 1000);
  const y = aest.getUTCFullYear();
  const m = String(aest.getUTCMonth() + 1).padStart(2, '0');
  const d = String(aest.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function ddmmyyyyToIso(v: string): string {
  const parts = v.split('/');
  if (parts.length !== 3) return '';
  const [d, m, y] = parts;
  if (!y || !m || !d) return '';
  return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function currencyRaw(value: string): string {
  if (!value) return '';
  const cleaned = value.replace(/[^0-9.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) return cleaned;
  return cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, '');
}

function currencyFormatted(value: string): string {
  const raw = currencyRaw(value);
  if (!raw) return '';
  const parts = raw.split('.');
  const num = parseFloat(parts[0] || '');
  if (isNaN(num)) return raw;
  const dec = parts.length > 1 ? '.' + parts[1] : '';
  return '$' + num.toLocaleString('en-AU') + dec;
}

export default function EoiLinkModal({
  record,
  mode,
  theme,
  onLink,
  onUpdate,
  onSpeculative,
  onCancel,
}: EoiLinkModalProps) {
  const dark = theme === 'dark';
  const cls = {
    overlay: 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60',
    panel: `w-[720px] max-w-[95vw] max-h-[85vh] flex flex-col rounded-lg border shadow-xl ${
      dark ? 'bg-gray-900 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
    }`,
    header: `px-4 py-3 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`,
    sub: dark ? 'text-gray-400' : 'text-gray-500',
    input: `px-2 py-1 text-xs rounded border focus:outline-none ${
      dark ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
    }`,
    row: `border-b cursor-pointer ${dark ? 'border-gray-800 hover:bg-gray-800' : 'border-gray-100 hover:bg-blue-50'}`,
    btn: `px-3 py-1.5 rounded text-xs font-medium ${
      dark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`,
    btnPrimary: 'px-3 py-1.5 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
    label: `text-[10px] font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`,
  };

  const isEdit = mode === 'edit';
  const isSpeculative = record.clientClosed === 'SPECULATIVE EOI' && !record.linkedOpportunityId;

  // ---- Step 1 state ----
  const [step, setStep] = useState<'pick' | 'confirm'>(isEdit ? 'confirm' : 'pick');
  const [tierResults, setTierResults] = useState<Record<number, EoiOpportunity[]>>({});
  const [loadedTiers, setLoadedTiers] = useState<number[]>([]);
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EoiOpportunity | null>(null);

  // ---- Step 2 state ----
  const [editBA, setEditBA] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDateIso, setEditDateIso] = useState(getTodayAESTIso());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // ---- Assigned BA options (F6/F9) — live from the GHL schema, never hardcoded.
  const [baOptions, setBaOptions] = useState<string[]>([]);
  const [baOptionsFailed, setBaOptionsFailed] = useState(false);

  useEffect(() => {
    fetch('/api/contract-team-reporting/schema')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const field = (d.opportunityFields || []).find(
          (f: { id: string }) => f.id === ASSIGNED_BA_FIELD_ID
        );
        const opts = (field?.options || []).map((o: { label: string }) => o.label).filter(Boolean);
        if (opts.length > 0) setBaOptions(opts);
        else setBaOptionsFailed(true);
      })
      .catch(() => setBaOptionsFailed(true));
  }, []);

  // In edit mode: fetch the current linked opportunity to prefill confirm step.
  useEffect(() => {
    if (!isEdit) return;
    if (isSpeculative) {
      // Nothing to load — user can pick a new opportunity or confirm to stay speculative.
      setSelected(null);
      setEditBA('');
      setEditPrice('');
      setEditDateIso(getTodayAESTIso());
      return;
    }
    if (!record.linkedOpportunityId) return;
    fetch(`/api/deal-sheet/opportunities?v=2&tier=1&_t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        const opp = (d.opportunities || [] as EoiOpportunity[]).find(
          (o: EoiOpportunity) => o.id === record.linkedOpportunityId
        );
        if (opp) {
          setSelected(opp);
          setEditBA(record.closingBA || opp.assignedBA || '');
          setEditPrice(currencyRaw(record.closingPrice));
          setEditDateIso(ddmmyyyyToIso(record.closingDate) || getTodayAESTIso());
        }
      })
      .catch(() => setSubmitError('Failed to load the current opportunity.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create-mode price prefill from record type
  useEffect(() => {
    if (isEdit) return;
    const typePrefix = (record.type || '').slice(0, 2);
    const prefillTypes = ['01', '02', '03'];
    setEditPrice(
      prefillTypes.includes(typePrefix) && record.closePrefill
        ? currencyRaw(record.closePrefill)
        : ''
    );
  }, [isEdit, record.type, record.closePrefill]);

  async function loadTier(tier: number) {
    setLoadingTier(tier);
    setLoadError('');
    try {
      const res = await fetch(`/api/deal-sheet/opportunities?v=2&tier=${tier}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load opportunities (tier ${tier})`);
      const data = await res.json();
      setTierResults((prev) => ({ ...prev, [tier]: data.opportunities || [] }));
      setLoadedTiers((prev) => (prev.includes(tier) ? prev : [...prev, tier]));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoadingTier(null);
    }
  }

  // F15 — load Tier 1 whenever the picker step is entered (create or reassign).
  useEffect(() => {
    if (step === 'pick' && loadedTiers.length === 0) loadTier(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const allOpps = useMemo(
    () => loadedTiers.slice().sort().flatMap((tier) => tierResults[tier] || []),
    [loadedTiers, tierResults]
  );

  const filteredOpps = useMemo(() => {
    const q = search.toLowerCase().trim();
    const matched = !q
      ? allOpps
      : allOpps.filter(
          (o) =>
            o.name.toLowerCase().includes(q) ||
            (o.registeredAddress && o.registeredAddress.toLowerCase().includes(q))
        );
    return matched
      .map((o, i) => ({ o, i, rank: stageRank(o.stageName) }))
      .sort((a, b) => a.rank - b.rank || a.i - b.i)
      .map(({ o }) => o);
  }, [allOpps, search]);

  const maxLoadedTier = loadedTiers.length > 0 ? Math.max(...loadedTiers) : 0;
  const nextTier = maxLoadedTier < 3 ? maxLoadedTier + 1 : null;

  function handleSelect(opp: EoiOpportunity) {
    setSelected(opp);
    setEditBA(opp.assignedBA || '');
    const typePrefix = (record.type || '').slice(0, 2);
    const prefillTypes = ['01', '02', '03'];
    setEditPrice(
      prefillTypes.includes(typePrefix) && record.closePrefill
        ? currencyRaw(record.closePrefill)
        : ''
    );
    setEditDateIso(getTodayAESTIso());
    setSubmitError('');
    setStep('confirm');
  }

  async function handleConfirm() {
    if (editBA.trim() === '') return;
    if (!selected && !isSpeculative) return;
    setSubmitting(true);
    setSubmitError('');

    const opp = selected!;
    const isSameOpp = isEdit && record.linkedOpportunityId === opp.id;
    const changedBA = editBA.trim() !== (opp.assignedBA || '').trim();

    if (isEdit) {
      const ok = await onUpdate({
        opportunityId: opp.id,
        opportunityName: opp.name,
        assignedBA: editBA.trim(),
        totalPurchasePrice: editPrice.trim(),
        closingDate: isoToDDMMYYYY(editDateIso),
        transitionType: isSameOpp ? 'client_edited' : 'reassigned',
        writeBaToOpportunity: changedBA,
      });
      setSubmitting(false);
      if (!ok) setSubmitError('Failed to update the link. Try again or cancel.');
    } else {
      const ok = await onLink({
        opportunityId: opp.id,
        opportunityName: opp.name,
        assignedBA: editBA.trim(),
        totalPurchasePrice: editPrice.trim(),
        closingDate: isoToDDMMYYYY(editDateIso),
        writeBaToOpportunity: changedBA,
      });
      setSubmitting(false);
      if (!ok) setSubmitError('Failed to link — the status has NOT been changed. Try again or cancel.');
    }
  }

  async function handleSpeculative() {
    setSubmitting(true);
    setSubmitError('');
    const ok = await onSpeculative();
    setSubmitting(false);
    if (!ok) setSubmitError('Failed to set status. Try again or cancel.');
  }

  async function handleRemoveClient() {
    setSubmitting(true);
    setSubmitError('');
    const ok = await onUpdate({
      opportunityId: '',
      opportunityName: '',
      assignedBA: '',
      totalPurchasePrice: '',
      closingDate: '',
      transitionType: isSpeculative ? 'client_removed' : 'reverted_to_speculative',
      writeBaToOpportunity: false,
    });
    setSubmitting(false);
    if (!ok) setSubmitError('Failed to remove client. Try again or cancel.');
  }

  const baEmpty = editBA.trim() === '';

  return (
    <div className={cls.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className={cls.panel}>
        {/* Header */}
        <div className={cls.header}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">
              {isEdit ? 'Edit linked client details' : "Move to 02 EOI — link the client's opportunity"}
            </h2>
            <button onClick={onCancel} className={`text-xs ${cls.sub} hover:opacity-70`}>✕ Cancel</button>
          </div>
          <div className={`text-xs mt-0.5 ${cls.sub}`}>{record.propertyAddress}</div>
          <div className={`text-[10px] mt-0.5 ${cls.sub}`}>
            {isEdit
              ? 'Confirm changes to the linked client. Reassign via ← Reassign, or remove the client to speculative.'
              : 'The status is not saved until you link an opportunity or choose speculative. Cancelling leaves the status unchanged.'}
          </div>
        </div>

        {step === 'pick' && (
          <>
            <div className={`px-4 py-2 flex items-center gap-2 border-b ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <input
                autoFocus
                type="text"
                placeholder="Filter by client name or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`flex-1 ${cls.input}`}
              />
              <span className={`text-[10px] whitespace-nowrap ${cls.sub}`}>
                {loadedTiers.slice().sort().map((tier) => `T${tier}: ${(tierResults[tier] || []).length}`).join(' | ')}
                {loadedTiers.length > 0 && ` — ${TIER_LABELS[maxLoadedTier]}`}
              </span>
              {nextTier && (
                <button onClick={() => loadTier(nextTier)} disabled={loadingTier !== null} className={cls.btn}>
                  {loadingTier === nextTier ? 'Loading...' : `Widen search (${TIER_LABELS[nextTier]})`}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[240px]">
              {loadingTier === 1 && loadedTiers.length === 0 ? (
                <div className={`p-6 text-center text-xs ${cls.sub}`}>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
                  Loading Property Team opportunities...
                </div>
              ) : loadError ? (
                <div className="p-6 text-center text-xs text-red-400">
                  {loadError}{' '}
                  <button onClick={() => loadTier(loadingTier === null && loadedTiers.length === 0 ? 1 : (nextTier || 1))} className="underline">Retry</button>
                </div>
              ) : (
                <table className="w-full text-[11px] border-collapse">
                  <thead className={`sticky top-0 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium">Opportunity</th>
                      <th className="px-3 py-1.5 text-left font-medium">Stage</th>
                      <th className="px-3 py-1.5 text-left font-medium">Assigned BA</th>
                      <th className="px-3 py-1.5 text-left font-medium">Total Purchase $</th>
                      <th className="px-3 py-1.5 text-left font-medium">Registered Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpps.map((opp) => (
                      <tr key={opp.id} className={cls.row} onClick={() => handleSelect(opp)}>
                        <td className="px-3 py-1.5 font-medium">{opp.name}</td>
                        <td className={`px-3 py-1.5 ${cls.sub}`}>{opp.stageName || '-'}</td>
                        <td className="px-3 py-1.5">{opp.assignedBA || '-'}</td>
                        <td className="px-3 py-1.5">{opp.totalPurchasePrice || '-'}</td>
                        <td className={`px-3 py-1.5 max-w-[220px] truncate ${cls.sub}`}>{opp.registeredAddress || '-'}</td>
                      </tr>
                    ))}
                    {filteredOpps.length === 0 && (
                      <tr>
                        <td colSpan={5} className={`px-3 py-4 text-center ${cls.sub}`}>
                          No opportunities match{nextTier ? ' — try widening the search' : ''}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {!isEdit && (
                  <button onClick={handleSpeculative} disabled={submitting} className={cls.btn} title="Set 02 EOI with no linked opportunity — it will appear in the Unlinked EOI exception view">
                    {submitting ? 'Saving...' : 'Speculative — no client yet'}
                  </button>
                )}
                {isEdit && (
                  <button onClick={() => setStep('confirm')} disabled={submitting} className={cls.btn}>
                    ← Back to confirm
                  </button>
                )}
              </div>
              {submitError && <span className="text-[10px] text-red-400">{submitError}</span>}
              <button onClick={onCancel} className={cls.btn}>Cancel</button>
            </div>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs mb-3 ${cls.sub}`}>
                {isEdit
                  ? 'Update the linked client details. Reassign to a different opportunity, confirm the current one, or remove the client.'
                  : 'Confirm the closing details written to the property record. The values below are prefilled from the opportunity — edited values win.'}
              </div>
              <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 items-center text-xs">
                <span className={cls.label}>Client (opportunity)</span>
                <span className="font-medium">{selected?.name || record.clientClosed || '-'}</span>

                <span className={cls.label}>Opportunity stage</span>
                <span className={cls.sub}>{selected?.stageName || '-'}</span>

                <span className={cls.label}>Assigned BA *</span>
                <div>
                  {baOptionsFailed && baOptions.length === 0 ? (
                    <input
                      type="text"
                      value={editBA}
                      onChange={(e) => setEditBA(e.target.value)}
                      placeholder="Required — BA list failed to load, type the BA name"
                      className={`w-full ${cls.input} ${baEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    />
                  ) : (
                    <select
                      value={editBA}
                      onChange={(e) => setEditBA(e.target.value)}
                      className={`w-full ${cls.input} ${baEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    >
                      <option value="">— Select a BA (required) —</option>
                      {editBA && !baOptions.includes(editBA) && (
                        <option value={editBA}>{editBA} (not in current list)</option>
                      )}
                      {baOptions.map((ba) => (
                        <option key={ba} value={ba}>{ba}</option>
                      ))}
                    </select>
                  )}
                  <div className={`text-[10px] mt-0.5 ${baEmpty ? 'text-red-500' : cls.sub}`}>
                    {baEmpty
                      ? 'Required — select a BA to continue.'
                      : 'Stored on the property record as Closing BA. Edits are written back to the opportunity\u2019s Assigned BA.'}
                  </div>
                </div>

                <span className={cls.label}>Close $</span>
                <div>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={currencyFormatted(editPrice)}
                    onChange={(e) => setEditPrice(currencyRaw(e.target.value))}
                    placeholder="e.g. $650,000"
                    className={`w-full ${cls.input}`}
                  />
                  <div className={`text-[10px] mt-0.5 ${cls.sub}`}>
                    {isEdit
                      ? `Current: ${record.closingPrice || '-'}; opportunity reference: ${selected?.totalPurchasePrice || '-'}`
                      : `Prefilled from the property record (${record.type || 'unknown type'}). Opportunity Total Purchase Price for reference: ${selected?.totalPurchasePrice || '-'}`}
                  </div>
                </div>

                <span className={cls.label}>Close Date</span>
                <input
                  type="date"
                  value={editDateIso}
                  onChange={(e) => setEditDateIso(e.target.value)}
                  className={`w-fit ${cls.input}`}
                />

                {selected && (
                  <>
                    <span className={cls.label}>Linked opportunity ID</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(selected.id);
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 1500);
                        } catch { /* ignore */ }
                      }}
                      className={`font-mono text-[10px] text-left ${cls.sub} hover:opacity-70`}
                      title="Click to copy"
                    >
                      {copiedId ? 'Copied!' : selected.id}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {isEdit ? (
                  <button onClick={() => { setStep('pick'); setSelected(null); setSubmitError(''); }} disabled={submitting} className={cls.btn}>
                    ← Reassign
                  </button>
                ) : (
                  <button onClick={() => { setStep('pick'); setSelected(null); setSubmitError(''); }} disabled={submitting} className={cls.btn}>
                    ← Back
                  </button>
                )}
                {isEdit && (
                  <button onClick={handleRemoveClient} disabled={submitting} className="px-3 py-1.5 rounded text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Saving...' : 'Remove client / Speculative'}
                  </button>
                )}
              </div>
              {submitError && <span className="text-[10px] text-red-400">{submitError}</span>}
              <button onClick={handleConfirm} disabled={submitting || !editDateIso || baEmpty || (!selected && !isSpeculative)} className={cls.btnPrimary}>
                {submitting ? 'Saving...' : (isEdit ? 'Confirm changes' : 'Confirm & Link')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
