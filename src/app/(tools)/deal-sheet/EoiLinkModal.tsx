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
  landPricePrefill: string;
  buildPricePrefill: string;
  linkedOpportunityId: string;
  clientClosed: string;
  closingBA: string;
  closingPrice: string;
  closingDate: string;
  propertyTypeCO: string;
  contractTypeCO: string;
  stateCO: string;
  agentNameCO: string;
  agentEmailCO: string;
  agentMobileCO: string;
  offerPrice: string;
  acceptAcqTotal: string;
  packager: string;
  sourcer: string;
}

export interface EoiOpportunity {
  id: string;
  name: string;
  contactName?: string;
  registeredAddress: string;
  totalPurchasePrice: string;
  assignedBA: string;
  pipelineStageId: string;
  stageName: string;
  pipelineName: string;
  lastStageChangeAt: string;
}

export interface EoiLinkPayload {
  opportunityId: string;
  opportunityName: string;
  assignedBA: string;
  totalPurchasePrice: string;
  offerPriceLand: string;
  offerPriceBuild: string;
  closingDate: string;
  writeBaToOpportunity: boolean;
}

export interface EoiUpdatePayload {
  opportunityId: string;
  opportunityName: string;
  assignedBA: string;
  totalPurchasePrice: string;
  offerPriceLand?: string;
  offerPriceBuild?: string;
  closingDate: string;
  transitionType: 'client_edited' | 'reassigned' | 'reverted_to_speculative' | 'client_removed';
  writeBaToOpportunity: boolean;
  revertStatus?: string;
  offerStatus?: string;
  offerPrice?: string;
}

type ModalMode = 'create' | 'edit';

interface EoiLinkModalProps {
  record: DealRecord;
  mode: ModalMode;
  theme: 'dark' | 'light';
  // opportunityId -> other property records already linked to it. Used to stop
  // the same opportunity being linked to two properties by accident.
  existingLinks?: Record<string, { id: string; address: string; status: string }[]>;
  onLink: (payload: EoiLinkPayload) => Promise<boolean>;
  onUpdate: (payload: EoiUpdatePayload) => Promise<boolean>;
  onSpeculative: (prices?: { totalPrice: string; landPrice?: string; buildPrice?: string }) => Promise<boolean>;
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
  existingLinks = {},
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
  const [step, setStep] = useState<'pick' | 'confirm' | 'actions' | 'increase' | 'mark_accepted' | 'reassign' | 'unlink_test' | 'unlink_lost' | 'unlink_available'>(isEdit ? 'actions' : 'pick');
  const [tierResults, setTierResults] = useState<Record<number, EoiOpportunity[]>>({});
  const [loadedTiers, setLoadedTiers] = useState<number[]>([]);
  const [loadingTier, setLoadingTier] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EoiOpportunity | null>(null);

  // ---- Step 2 state ----
  const [editBA, setEditBA] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editPriceLand, setEditPriceLand] = useState('');
  const [editPriceBuild, setEditPriceBuild] = useState('');
  const [editDateIso, setEditDateIso] = useState(getTodayAESTIso());

  // Detect split contract (01 H&L) — show separate Land/Build offer fields
  const isSplitContract = (record.type || '').slice(0, 2) === '01';
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Speculative price dialog state
  const [showSpeculativePrice, setShowSpeculativePrice] = useState(false);

  // Remove-client confirmation state
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeAction, setRemoveAction] = useState<'speculative' | 'remove'>('speculative');
  const [revertStatus, setRevertStatus] = useState('01_available');
  // Explicit acknowledgement when the chosen opportunity is already linked
  // to a different property record.
  const [dupeAcknowledged, setDupeAcknowledged] = useState(false);
  // D23: skip opening the EOI composer after linking
  const [skipComposer, setSkipComposer] = useState(false);
  // D27: which edit action was picked from the action menu
  const [editAction, setEditAction] = useState<string | null>(null);
  // D35/D37: delink reason for unlink flows
  const [delinkReason, setDelinkReason] = useState('');
  // D28: new price fields for Increase Offer flow
  const [newPrice, setNewPrice] = useState('');
  const [keepPriceAsIs, setKeepPriceAsIs] = useState(false);
  const [newPriceLand, setNewPriceLand] = useState('');
  const [newPriceBuild, setNewPriceBuild] = useState('');
  // D32-34: reassign variant ('keep' = loadFrom=lastSend, 'refresh' = fresh Template Admin)
  const [reassignVariant, setReassignVariant] = useState<'keep' | 'refresh'>('keep');
  // D32-34: selected opportunity in reassign step (null = speculative)
  const [reassignSelected, setReassignSelected] = useState<EoiOpportunity | null>(null);
  const [reassignIsSpeculative, setReassignIsSpeculative] = useState(false);
  // D31: agreed price fields + confirmation tick-box for Mark Accepted
  const [agreedPrice, setAgreedPrice] = useState('');
  const [agreedPriceLand, setAgreedPriceLand] = useState('');
  const [agreedPriceBuild, setAgreedPriceBuild] = useState('');
  const [acceptedConfirmed, setAcceptedConfirmed] = useState(false);

  // Edit-mode load outcome for the linked opportunity.
  //   ok      = loaded from GHL, safe to confirm
  //   missing = GHL says it does not exist -> the link is broken, block confirm
  //   error   = could not reach GHL -> offer retry, allow record-only edits
  const [linkLoad, setLinkLoad] = useState<'loading' | 'ok' | 'missing' | 'error'>(
    mode === 'edit' ? 'loading' : 'ok'
  );

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
      setLinkLoad('ok');
      return;
    }
    if (!record.linkedOpportunityId) {
      setLinkLoad('ok');
      return;
    }
    loadLinkedOpportunity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Look the opportunity up by id — it may sit in any pipeline, so searching a
  // single tier is not enough.
  async function loadLinkedOpportunity() {
    setLinkLoad('loading');
    setSubmitError('');
    try {
      const res = await fetch(
        `/api/deal-sheet/opportunities?v=2&id=${encodeURIComponent(record.linkedOpportunityId)}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (res.status === 404) {
        setSelected(null);
        setLinkLoad('missing');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      const opp: EoiOpportunity | undefined = (d.opportunities || [])[0];
      if (!opp) {
        // GHL answered and the opportunity is not there — the link is broken.
        setSelected(null);
        setLinkLoad('missing');
        return;
      }
      setSelected(opp);
      setEditBA(record.closingBA || opp.assignedBA || '');
      setEditPrice(currencyRaw(record.closingPrice));
      setEditDateIso(ddmmyyyyToIso(record.closingDate) || '');
      setLinkLoad('ok');
    } catch {
      // Could not reach GHL. Allow editing the property record's own fields,
      // but the BA write-back is skipped because we cannot see the
      // opportunity's real value to compare against.
      setSelected({
        id: record.linkedOpportunityId,
        name: record.clientClosed || '(could not load from GHL)',
        registeredAddress: '',
        totalPurchasePrice: '',
        assignedBA: record.closingBA || '',
        pipelineStageId: '',
        stageName: '',
        pipelineName: '',
        lastStageChangeAt: '',
      });
      setEditBA(record.closingBA || '');
      setEditPrice(currencyRaw(record.closingPrice));
      setEditDateIso(ddmmyyyyToIso(record.closingDate) || '');
      setLinkLoad('error');
    }
  }

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
    if (typePrefix === '01') {
      setEditPriceLand(record.landPricePrefill ? currencyRaw(record.landPricePrefill) : '');
      setEditPriceBuild(record.buildPricePrefill ? currencyRaw(record.buildPricePrefill) : '');
    }
  }, [isEdit, record.type, record.closePrefill, record.landPricePrefill, record.buildPricePrefill]);

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

  // F15 — load Tier 1 whenever a picker step is entered (create, reassign).
  useEffect(() => {
    if ((step === 'pick' || step === 'reassign') && loadedTiers.length === 0) loadTier(1);
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

  // Other property records already linked to the chosen opportunity.
  const duplicateLinks = useMemo(() => {
    if (!selected) return [];
    return (existingLinks[selected.id] || []).filter((r) => r.id !== record.id);
  }, [selected, existingLinks, record.id]);

  function handleSelect(opp: EoiOpportunity) {
    setSelected(opp);
    setDupeAcknowledged(false);
    // Picking from the list supersedes any earlier load failure on the old link.
    setLinkLoad('ok');
    setEditBA(opp.assignedBA || '');
    const typePrefix = (record.type || '').slice(0, 2);
    const prefillTypes = ['01', '02', '03'];
    setEditPrice(
      prefillTypes.includes(typePrefix) && record.closePrefill
        ? currencyRaw(record.closePrefill)
        : ''
    );
    if (typePrefix === '01') {
      setEditPriceLand(record.landPricePrefill ? currencyRaw(record.landPricePrefill) : '');
      setEditPriceBuild(record.buildPricePrefill ? currencyRaw(record.buildPricePrefill) : '');
    }
    setEditDateIso(getTodayAESTIso());
    setSubmitError('');
    setStep('confirm');
  }

  async function handleConfirm(linkOnly = false) {
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
        totalPurchasePrice: isSplitContract ? String(parseFloat(editPriceLand || '0') + parseFloat(editPriceBuild || '0')) : editPrice.trim(),
        offerPriceLand: isSplitContract ? editPriceLand.trim() : '',
        offerPriceBuild: isSplitContract ? editPriceBuild.trim() : '',
        closingDate: isoToDDMMYYYY(editDateIso),
        writeBaToOpportunity: changedBA,
      });
      setSubmitting(false);
      if (!ok) {
        setSubmitError('Failed to link — the status has NOT been changed. Try again or cancel.');
      } else if (linkOnly) {
        // D23: link-only — close the modal without opening the composer
        onCancel();
      } else {
        // Open the EOI composer with context from this link
        const totalPrice = isSplitContract ? String(parseFloat(editPriceLand || '0') + parseFloat(editPriceBuild || '0')) : editPrice.trim();
        let eoiUrl = `/eoi/compose?recordId=${encodeURIComponent(record.id)}&oppId=${encodeURIComponent(opp.id)}&address=${encodeURIComponent(record.propertyAddress || '')}&type=${encodeURIComponent(record.type || '')}&client=${encodeURIComponent(opp.name || '')}&ba=${encodeURIComponent(editBA.trim())}&price=${encodeURIComponent(totalPrice)}&propertyType=${encodeURIComponent(record.propertyTypeCO || '')}&contractType=${encodeURIComponent(record.contractTypeCO || '')}&state=${encodeURIComponent(record.stateCO || '')}&agentName=${encodeURIComponent(record.agentNameCO || '')}&agentEmail=${encodeURIComponent(record.agentEmailCO || '')}&agentMobile=${encodeURIComponent(record.agentMobileCO || '')}`;
        if (isSplitContract) {
          eoiUrl += `&landPrice=${encodeURIComponent(editPriceLand.trim())}&buildPrice=${encodeURIComponent(editPriceBuild.trim())}`;
        }
        window.open(eoiUrl, '_blank');
      }
    }
  }

  async function handleSpeculative(linkOnly = false) {
    setSubmitting(true);
    setSubmitError('');
    const totalPrice = isSplitContract
      ? String(parseFloat(editPriceLand || '0') + parseFloat(editPriceBuild || '0'))
      : editPrice.trim();
    const ok = await onSpeculative({
      totalPrice,
      landPrice: isSplitContract ? editPriceLand.trim() : undefined,
      buildPrice: isSplitContract ? editPriceBuild.trim() : undefined,
    });
    setSubmitting(false);
    if (!ok) {
      setSubmitError('Failed to set status. Try again or cancel.');
    } else if (linkOnly) {
      // D23: speculative link-only — close modal without opening composer
      onCancel();
    } else {
      // Open the EOI composer for speculative (no oppId) — include prices
      const totalPrice = isSplitContract
        ? String(parseFloat(editPriceLand || '0') + parseFloat(editPriceBuild || '0'))
        : editPrice.trim();
      let eoiUrl = `/eoi/compose?recordId=${encodeURIComponent(record.id)}&address=${encodeURIComponent(record.propertyAddress || '')}&type=${encodeURIComponent(record.type || '')}&sendType=initial&propertyType=${encodeURIComponent(record.propertyTypeCO || '')}&contractType=${encodeURIComponent(record.contractTypeCO || '')}&state=${encodeURIComponent(record.stateCO || '')}&agentName=${encodeURIComponent(record.agentNameCO || '')}&agentEmail=${encodeURIComponent(record.agentEmailCO || '')}&agentMobile=${encodeURIComponent(record.agentMobileCO || '')}&price=${encodeURIComponent(totalPrice)}`;
      if (isSplitContract) {
        eoiUrl += `&landPrice=${encodeURIComponent(editPriceLand.trim())}&buildPrice=${encodeURIComponent(editPriceBuild.trim())}`;
      }
      window.open(eoiUrl, '_blank');
    }
  }

  async function handleRemoveClient() {
    // First click opens the confirmation panel
    if (!showRemoveConfirm) {
      setShowRemoveConfirm(true);
      setRemoveAction(isSpeculative ? 'remove' : 'speculative');
      return;
    }
    // Second click (confirmed) — execute the removal
    setSubmitting(true);
    setSubmitError('');
    const isFullRemove = removeAction === 'remove';
    const ok = await onUpdate({
      opportunityId: '',
      opportunityName: '',
      assignedBA: '',
      totalPurchasePrice: '',
      closingDate: '',
      transitionType: isFullRemove ? 'client_removed' : 'reverted_to_speculative',
      writeBaToOpportunity: false,
      revertStatus: isFullRemove ? revertStatus : undefined,
    });
    setSubmitting(false);
    if (!ok) setSubmitError('Failed to remove client. Try again or cancel.');
  }

  // D28: Edit EOI — update BA/date/price then open composer
  async function handleIncreaseConfirm(linkOnly = false) {
    if (!isSpeculative && (editBA.trim() === '' || !selected)) return;
    setSubmitting(true);
    setSubmitError('');

    const oppId = selected?.id || '';
    const oppName = selected?.name || 'SPECULATIVE EOI';
    const changedBA = selected ? editBA.trim() !== (selected.assignedBA || '').trim() : false;
    const totalNewPrice = keepPriceAsIs ? '' : (isSplitContract
      ? String(parseFloat(newPriceLand || '0') + parseFloat(newPriceBuild || '0'))
      : newPrice.trim());

    // Write BA/date updates to the property record (price only if changed)
    const ok = await onUpdate({
      opportunityId: oppId,
      opportunityName: oppName,
      assignedBA: editBA.trim(),
      totalPurchasePrice: totalNewPrice,
      offerPriceLand: !keepPriceAsIs && isSplitContract ? newPriceLand.trim() : undefined,
      offerPriceBuild: !keepPriceAsIs && isSplitContract ? newPriceBuild.trim() : undefined,
      closingDate: isoToDDMMYYYY(editDateIso),
      transitionType: 'client_edited',
      writeBaToOpportunity: changedBA,
    });
    setSubmitting(false);
    if (!ok) {
      setSubmitError('Failed to update. Try again or cancel.');
      return;
    }

    if (linkOnly) {
      // Log the price update to eoi_sends so it appears in history
      try {
        await fetch('/api/eoi/log-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: record.id,
            opportunityId: oppId,
            opportunityName: oppName,
            propertyAddress: record.propertyAddress,
            offerPrice: totalNewPrice,
            offerPriceLand: !keepPriceAsIs && isSplitContract ? newPriceLand.trim() : undefined,
            offerPriceBuild: !keepPriceAsIs && isSplitContract ? newPriceBuild.trim() : undefined,
            sendType: 'increase',
            sentBy: editBA.trim(),
            clientName: selected?.contactName || null,
            assignedBa: editBA.trim(),
          }),
        });
      } catch { /* non-fatal — update already succeeded */ }
      onCancel();
      return;
    }

    // Open the composer — sendType=increase when price changed, revision when as-is
    const composerSendType = keepPriceAsIs ? 'revision' : 'increase';
    let eoiUrl = `/eoi/compose?recordId=${encodeURIComponent(record.id)}&oppId=${encodeURIComponent(oppId)}&address=${encodeURIComponent(record.propertyAddress || '')}&type=${encodeURIComponent(record.type || '')}&client=${encodeURIComponent(oppName)}&ba=${encodeURIComponent(editBA.trim())}&propertyType=${encodeURIComponent(record.propertyTypeCO || '')}&contractType=${encodeURIComponent(record.contractTypeCO || '')}&state=${encodeURIComponent(record.stateCO || '')}&agentName=${encodeURIComponent(record.agentNameCO || '')}&agentEmail=${encodeURIComponent(record.agentEmailCO || '')}&agentMobile=${encodeURIComponent(record.agentMobileCO || '')}&sendType=${composerSendType}&loadFrom=lastSend`;
    if (!keepPriceAsIs) {
      eoiUrl += `&price=${encodeURIComponent(totalNewPrice)}`;
      if (isSplitContract) {
        eoiUrl += `&landPrice=${encodeURIComponent(newPriceLand.trim())}&buildPrice=${encodeURIComponent(newPriceBuild.trim())}`;
      }
    }
    window.open(eoiUrl, '_blank');
    onCancel();
  }

  // D31: Mark Accepted — write agreed price + offer_status to CO, log event
  async function handleMarkAccepted() {
    if (editBA.trim() === '' || !selected || !acceptedConfirmed) return;
    setSubmitting(true);
    setSubmitError('');

    const changedBA = editBA.trim() !== (selected.assignedBA || '').trim();
    const totalAgreedPrice = isSplitContract
      ? String(parseFloat(agreedPriceLand || '0') + parseFloat(agreedPriceBuild || '0'))
      : agreedPrice.trim();

    const ok = await onUpdate({
      opportunityId: selected.id,
      opportunityName: selected.name,
      assignedBA: editBA.trim(),
      totalPurchasePrice: totalAgreedPrice,
      offerPriceLand: isSplitContract ? agreedPriceLand.trim() : undefined,
      offerPriceBuild: isSplitContract ? agreedPriceBuild.trim() : undefined,
      closingDate: isoToDDMMYYYY(editDateIso),
      transitionType: 'client_edited',
      writeBaToOpportunity: changedBA,
      offerStatus: 'accepted',
      offerPrice: totalAgreedPrice,
    });
    setSubmitting(false);
    if (!ok) {
      setSubmitError('Failed to update. Try again or cancel.');
      return;
    }

    // Log mark_accepted event to activity history
    try {
      await fetch('/api/eoi/log-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          opportunityId: selected.id,
          opportunityName: selected.name,
          propertyAddress: record.propertyAddress,
          offerPrice: totalAgreedPrice,
          offerPriceLand: isSplitContract ? agreedPriceLand.trim() : undefined,
          offerPriceBuild: isSplitContract ? agreedPriceBuild.trim() : undefined,
          eventType: 'mark_accepted',
          sentBy: editBA.trim(),
          method: 'system',
          notes: 'Offer marked as accepted',
          offerStatusAtEvent: 'accepted',
          assignedBa: editBA.trim(),
        }),
      });
    } catch { /* non-fatal — update already succeeded */ }
    onCancel();
  }

  // D32-34: Reassign / Make Speculative — shared handler for both variants
  async function handleReassignConfirm(linkOnly = false) {
    if (editBA.trim() === '' && !reassignIsSpeculative) return;
    if (!reassignSelected && !reassignIsSpeculative) return;
    setSubmitting(true);
    setSubmitError('');

    const previousOppId = record.linkedOpportunityId || '';
    const previousClientName = record.clientClosed || '';

    if (reassignIsSpeculative) {
      // Go speculative — clear opp link, keep offer data
      const ok = await onUpdate({
        opportunityId: '',
        opportunityName: '',
        assignedBA: '',
        totalPurchasePrice: '',
        closingDate: '',
        transitionType: 'reverted_to_speculative',
        writeBaToOpportunity: false,
      });
      setSubmitting(false);
      if (!ok) { setSubmitError('Failed to update record'); return; }

      // Log event
      try {
        await fetch('/api/eoi/log-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: record.id,
            opportunityId: null,
            opportunityName: 'SPECULATIVE EOI',
            propertyAddress: record.propertyAddress,
            eventType: 'change_speculative',
            sentBy: record.closingBA || 'system',
            method: 'system',
            notes: 'Changed to speculative',
            offerStatusAtEvent: 'unchanged',
            previousOpportunityId: previousOppId || null,
            previousClientName: previousClientName || null,
          }),
        });
      } catch { /* best effort */ }

      if (!linkOnly) {
        // Open composer
        const totalPrice = record.closingPrice || '';
        let eoiUrl = `/eoi/compose?recordId=${encodeURIComponent(record.id)}&address=${encodeURIComponent(record.propertyAddress || '')}&type=${encodeURIComponent(record.type || '')}&sendType=revision&propertyType=${encodeURIComponent(record.propertyTypeCO || '')}&contractType=${encodeURIComponent(record.contractTypeCO || '')}&state=${encodeURIComponent(record.stateCO || '')}&agentName=${encodeURIComponent(record.agentNameCO || '')}&agentEmail=${encodeURIComponent(record.agentEmailCO || '')}&agentMobile=${encodeURIComponent(record.agentMobileCO || '')}&price=${encodeURIComponent(totalPrice)}`;
        if (reassignVariant === 'keep') eoiUrl += '&loadFrom=lastSendTermsOnly';
        window.open(eoiUrl, '_blank');
      }
      onCancel();
      return;
    }

    // Reassign to new opportunity
    const opp = reassignSelected!;
    const changedBA = editBA.trim() !== (opp.assignedBA || '').trim();
    const ok = await onUpdate({
      opportunityId: opp.id,
      opportunityName: opp.name,
      assignedBA: editBA.trim(),
      totalPurchasePrice: '', // offer price stays as-is
      closingDate: isoToDDMMYYYY(editDateIso),
      transitionType: 'reassigned',
      writeBaToOpportunity: changedBA,
    });
    setSubmitting(false);
    if (!ok) { setSubmitError('Failed to update record'); return; }

    // Log event
    try {
      await fetch('/api/eoi/log-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          opportunityId: opp.id,
          opportunityName: opp.name,
          propertyAddress: record.propertyAddress,
          eventType: 'reassign',
          sentBy: editBA.trim(),
          method: 'system',
          notes: `Reassigned from ${previousClientName || previousOppId || 'unknown'} to ${opp.name}`,
          offerStatusAtEvent: 'unchanged',
          assignedBa: editBA.trim(),
          previousOpportunityId: previousOppId || null,
          previousClientName: previousClientName || null,
        }),
      });
    } catch { /* best effort */ }

    if (!linkOnly) {
      // Open composer
      let eoiUrl = `/eoi/compose?recordId=${encodeURIComponent(record.id)}&oppId=${encodeURIComponent(opp.id)}&address=${encodeURIComponent(record.propertyAddress || '')}&type=${encodeURIComponent(record.type || '')}&client=${encodeURIComponent(opp.name || '')}&ba=${encodeURIComponent(editBA.trim())}&propertyType=${encodeURIComponent(record.propertyTypeCO || '')}&contractType=${encodeURIComponent(record.contractTypeCO || '')}&state=${encodeURIComponent(record.stateCO || '')}&agentName=${encodeURIComponent(record.agentNameCO || '')}&agentEmail=${encodeURIComponent(record.agentEmailCO || '')}&agentMobile=${encodeURIComponent(record.agentMobileCO || '')}&sendType=revision`;
      if (reassignVariant === 'keep') eoiUrl += '&loadFrom=lastSendTermsOnly';
      window.open(eoiUrl, '_blank');
    }
    onCancel();
  }

  const baEmpty = editBA.trim() === '';
  const priceEmpty = isSplitContract
    ? (currencyRaw(editPriceLand).trim() === '' || currencyRaw(editPriceBuild).trim() === '')
    : currencyRaw(editPrice).trim() === '';

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
                      <th className="px-3 py-1.5 text-left font-medium">Pipeline</th>
                      <th className="px-3 py-1.5 text-left font-medium">Stage</th>
                      <th className="px-3 py-1.5 text-left font-medium">Assigned BA</th>
                      <th className="px-3 py-1.5 text-left font-medium">Total Purchase $</th>
                      <th className="px-3 py-1.5 text-left font-medium">Registered Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpps.map((opp) => (
                      <tr key={opp.id} className={cls.row} onClick={() => handleSelect(opp)}>
                        <td className="px-3 py-1.5 font-medium">
                          {opp.name}
                          {(existingLinks[opp.id] || []).some((r) => r.id !== record.id) && (
                            <span
                              className="ml-1.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-500 border border-amber-500/40"
                              title={`Already linked to: ${(existingLinks[opp.id] || [])
                                .filter((r) => r.id !== record.id)
                                .map((r) => r.address)
                                .join(', ')}`}
                            >
                              LINKED
                            </span>
                          )}
                        </td>
                        <td className={`px-3 py-1.5 ${cls.sub}`}>{opp.pipelineName || '-'}</td>
                        <td className={`px-3 py-1.5 ${cls.sub}`}>{opp.stageName || '-'}</td>
                        <td className="px-3 py-1.5">{opp.assignedBA || '-'}</td>
                        <td className="px-3 py-1.5">{opp.totalPurchasePrice || '-'}</td>
                        <td className={`px-3 py-1.5 max-w-[220px] truncate ${cls.sub}`}>{opp.registeredAddress || '-'}</td>
                      </tr>
                    ))}
                    {filteredOpps.length === 0 && (
                      <tr>
                        <td colSpan={6} className={`px-3 py-4 text-center ${cls.sub}`}>
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
                  <button onClick={() => setShowSpeculativePrice(true)} disabled={submitting} className={cls.btn} title="Set 02 EOI with no linked opportunity — it will appear in the Unlinked EOI exception view">
                    Speculative — no client yet
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

            {/* Speculative price entry panel */}
            {showSpeculativePrice && (
              <div className={`px-4 py-3 border-t ${dark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className={`text-xs font-semibold mb-2 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                  Enter offer prices before opening the EOI composer
                </div>
                <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 items-center text-xs">
                  {isSplitContract ? (
                    <>
                      <span className={cls.label}>Offer $ (Land) *</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currencyFormatted(editPriceLand)}
                        onChange={(e) => setEditPriceLand(currencyRaw(e.target.value))}
                        placeholder="e.g. $250,000"
                        className={`w-full ${cls.input}`}
                      />
                      <span className={cls.label}>Offer $ (Build) *</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currencyFormatted(editPriceBuild)}
                        onChange={(e) => setEditPriceBuild(currencyRaw(e.target.value))}
                        placeholder="e.g. $200,000"
                        className={`w-full ${cls.input}`}
                      />
                      <span className={cls.label}>Total $</span>
                      <div className={`text-xs font-medium ${cls.sub}`}>
                        {editPriceLand || editPriceBuild
                          ? currencyFormatted(String(parseFloat(editPriceLand || '0') + parseFloat(editPriceBuild || '0')))
                          : '-'}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className={cls.label}>Offer $ *</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currencyFormatted(editPrice)}
                        onChange={(e) => setEditPrice(currencyRaw(e.target.value))}
                        placeholder="e.g. $650,000"
                        className={`w-full ${cls.input}`}
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setShowSpeculativePrice(false)} className={cls.btn}>← Back</button>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => { setSkipComposer(false); handleSpeculative(false); }}
                      disabled={submitting || (isSplitContract ? (!editPriceLand.trim() || !editPriceBuild.trim()) : !editPrice.trim())}
                      className={cls.btnPrimary}
                    >
                      {submitting && !skipComposer ? 'Saving...' : 'Confirm & Prepare EOI'}
                    </button>
                    <button
                      onClick={() => { setSkipComposer(true); handleSpeculative(true); }}
                      disabled={submitting || (isSplitContract ? (!editPriceLand.trim() || !editPriceBuild.trim()) : !editPrice.trim())}
                      className={cls.btnPrimary}
                    >
                      {submitting && skipComposer ? 'Saving...' : 'Confirm (link only)'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {step === 'actions' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {/* Read-only context */}
              <div className={`text-xs mb-4 space-y-1 ${cls.sub}`}>
                <div><span className="font-medium">Property:</span> {record.propertyAddress}</div>
                <div><span className="font-medium">Opportunity:</span> {record.clientClosed || '-'}</div>
                <div><span className="font-medium">Current Offer:</span> <span style={{ whiteSpace: 'pre-line' }}>{record.offerPrice || '-'}</span></div>
              </div>

              {linkLoad === 'loading' && (
                <div className={`text-center text-xs py-4 ${cls.sub}`}>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mx-auto mb-2" />
                  Loading opportunity data...
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <div className={`text-[10px] font-semibold uppercase tracking-wide ${cls.sub}`}>EOI Actions</div>
                <button onClick={() => { setEditAction('increase'); setNewPrice(''); setNewPriceLand(''); setNewPriceBuild(''); setKeepPriceAsIs(false); setStep('increase'); }} className={`w-full text-left ${cls.btn} py-2`}>
                  <span className="font-medium">Edit &amp; Send EOI / Log verbal offer increase</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Edit terms, price, or both — then send or log verbally</span>
                </button>
                <button onClick={() => { const eoiUrl = `/eoi/compose?recordId=${encodeURIComponent(record.id)}&oppId=${encodeURIComponent(record.linkedOpportunityId || '')}&address=${encodeURIComponent(record.propertyAddress || '')}&type=${encodeURIComponent(record.type || '')}&client=${encodeURIComponent(record.clientClosed || '')}&ba=${encodeURIComponent(record.closingBA || '')}&propertyType=${encodeURIComponent(record.propertyTypeCO || '')}&contractType=${encodeURIComponent(record.contractTypeCO || '')}&state=${encodeURIComponent(record.stateCO || '')}&agentName=${encodeURIComponent(record.agentNameCO || '')}&agentEmail=${encodeURIComponent(record.agentEmailCO || '')}&agentMobile=${encodeURIComponent(record.agentMobileCO || '')}&sendType=resend&loadFrom=lastSend`; window.open(eoiUrl, '_blank'); onCancel(); }} className={`w-full text-left ${cls.btn} py-2`}>
                  <span className="font-medium">Resend as-is</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Re-send the last EOI with no changes (recipient, CC, attachments editable)</span>
                </button>
                <button onClick={() => { setEditAction('mark_accepted'); setAgreedPrice(''); setAgreedPriceLand(''); setAgreedPriceBuild(''); setAcceptedConfirmed(false); setStep('mark_accepted'); }} className={`w-full text-left ${cls.btn} py-2`}>
                  <span className="font-medium">Mark Accepted</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Record that the offer has been accepted</span>
                </button>

                <div className={`text-[10px] font-semibold uppercase tracking-wide mt-4 ${cls.sub}`}>Client Management</div>
                <button onClick={() => { setEditAction('reassign_keep'); setReassignVariant('keep'); setReassignSelected(null); setReassignIsSpeculative(false); setStep('reassign'); }} className={`w-full text-left ${cls.btn} py-2`}>
                  <span className="font-medium">Reassign or make speculative — <span className="underline font-bold">keep existing terms</span></span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Swap the opportunity or go speculative. EOI terms stay as they were.</span>
                </button>
                <button onClick={() => { setEditAction('reassign_refresh'); setReassignVariant('refresh'); setReassignSelected(null); setReassignIsSpeculative(false); setStep('reassign'); }} className={`w-full text-left ${cls.btn} py-2`}>
                  <span className="font-medium">Reassign or make speculative — <span className="underline font-bold">refresh terms</span></span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Swap the opportunity or go speculative. EOI terms refresh from Template Admin.</span>
                </button>

                <div className={`text-[10px] font-semibold uppercase tracking-wide mt-4 ${cls.sub}`}>Unlink</div>
                <button onClick={() => { setEditAction('unlink_lost'); setDelinkReason('Lost to another buyer'); setStep('unlink_lost'); }} className={`w-full text-left ${cls.btn} py-2 border border-red-300 dark:border-red-700`}>
                  <span className="font-medium">Unlink — change status to 06 Close Lost</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Lost to another buyer — clears offer data</span>
                </button>
                <button onClick={() => { setEditAction('unlink_available'); setDelinkReason(''); setStep('unlink_available'); }} className={`w-full text-left ${cls.btn} py-2 border border-red-300 dark:border-red-700`}>
                  <span className="font-medium">Unlink — change status to 01 Available</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Return to available — requires a reason</span>
                </button>
                <button onClick={() => { setEditAction('unlink_test'); setStep('unlink_test'); }} className={`w-full text-left ${cls.btn} py-2 border border-red-300 dark:border-red-700`}>
                  <span className="font-medium">Unlink — change status to 07 Test Record</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>Strips all linked info</span>
                </button>

                <div className={`text-[10px] font-semibold uppercase tracking-wide mt-4 ${cls.sub}`}>Other</div>
                <button onClick={() => { window.open(`/eoi/compose?recordId=${record.id}&property=${encodeURIComponent(record.propertyAddress)}&contractType=${encodeURIComponent(record.contractTypeCO)}&acceptAcqTotal=${encodeURIComponent(record.acceptAcqTotal)}&packager=${encodeURIComponent(record.packager)}&sourcer=${encodeURIComponent(record.sourcer)}&viewHistory=true`, '_blank'); }} className={`w-full text-left ${cls.btn} py-2`}>
                  <span className="font-medium">View History</span>
                  <span className={`block text-[10px] mt-0.5 ${cls.sub}`}>View all EOI sends for this property</span>
                </button>
              </div>
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              {editAction && <span className={`text-[10px] ${cls.sub}`}>Selected: <span className="font-medium">{editAction}</span></span>}
              <button onClick={onCancel} className={cls.btn}>Cancel</button>
            </div>
          </>
        )}

        {step === 'increase' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs font-semibold mb-3`}>Edit EOI</div>

              <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 items-center text-xs">
                {/* RO fields */}
                <span className={cls.label}>Property</span>
                <span className={cls.sub}>{record.propertyAddress}</span>

                <span className={cls.label}>Opportunity</span>
                <span className="font-medium">{selected?.name || record.clientClosed || '-'}</span>

                <span className={cls.label}>Pipeline / Stage</span>
                <span className={cls.sub}>
                  {selected?.pipelineName || selected?.stageName
                    ? [selected?.pipelineName, selected?.stageName].filter(Boolean).join(' — ')
                    : '-'}
                </span>

                <span className={cls.label}>Offer Status</span>
                <span className={cls.sub} style={{ whiteSpace: 'pre-line' }}>{record.offerPrice || '-'}</span>

                {/* Editable BA — hidden for speculative */}
                {!isSpeculative && (
                  <>
                    <span className={cls.label}>Assigned BA *</span>
                    <div>
                      {baOptionsFailed && baOptions.length === 0 ? (
                        <input type="text" value={editBA} onChange={(e) => setEditBA(e.target.value)}
                          placeholder="Required — type the BA name"
                          className={`w-full ${cls.input} ${baEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                      ) : (
                        <select value={editBA} onChange={(e) => setEditBA(e.target.value)}
                          className={`w-full ${cls.input} ${baEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                          <option value="">— Select a BA —</option>
                          {editBA && !baOptions.includes(editBA) && <option value={editBA}>{editBA} (not in list)</option>}
                          {baOptions.map((ba) => <option key={ba} value={ba}>{ba}</option>)}
                        </select>
                      )}
                    </div>
                  </>
                )}

                {/* Editable Close Date — hidden for speculative */}
                {!isSpeculative && (
                  <>
                    <span className={cls.label}>Close Date</span>
                    <input type="date" value={editDateIso} onChange={(e) => setEditDateIso(e.target.value)} className={`w-fit ${cls.input}`} />
                  </>
                )}

                {/* Current price — reference */}
                <span className={cls.label}>Current Price (ref)</span>
                <span className={`${cls.sub} font-medium`} style={{ whiteSpace: 'pre-line' }}>
                  {record.offerPrice || currencyFormatted(record.closingPrice || record.closePrefill || '') || '-'}
                </span>

                {/* Keep price checkbox */}
                <span className={cls.label}></span>
                <label className={`flex items-center gap-2 cursor-pointer ${cls.sub}`}>
                  <input type="checkbox" checked={keepPriceAsIs} onChange={(e) => setKeepPriceAsIs(e.target.checked)} />
                  <span className="text-xs">Leave current offer price as-is</span>
                </label>

                {/* New price — editable, hidden when keepPriceAsIs */}
                {!keepPriceAsIs && (
                  isSplitContract ? (
                    <>
                      <span className={cls.label}>New Price (Land) *</span>
                      <input type="text" inputMode="decimal" value={currencyFormatted(newPriceLand)}
                        onChange={(e) => setNewPriceLand(currencyRaw(e.target.value))}
                        placeholder="e.g. $300,000"
                        className={`w-full ${cls.input} ${!newPriceLand.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} />

                      <span className={cls.label}>New Price (Build) *</span>
                      <input type="text" inputMode="decimal" value={currencyFormatted(newPriceBuild)}
                        onChange={(e) => setNewPriceBuild(currencyRaw(e.target.value))}
                        placeholder="e.g. $250,000"
                        className={`w-full ${cls.input} ${!newPriceBuild.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} />

                      <span className={cls.label}>New Total</span>
                      <span className={`font-medium ${cls.sub}`}>
                        {newPriceLand || newPriceBuild
                          ? currencyFormatted(String(parseFloat(newPriceLand || '0') + parseFloat(newPriceBuild || '0')))
                          : '-'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={cls.label}>New Offer Price *</span>
                      <input type="text" inputMode="decimal" value={currencyFormatted(newPrice)}
                        onChange={(e) => setNewPrice(currencyRaw(e.target.value))}
                        placeholder="e.g. $700,000"
                        className={`w-full ${cls.input} ${!newPrice.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                    </>
                  )
                )}
              </div>
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => setStep('actions')} disabled={submitting} className={cls.btn}>← Back</button>
              {submitError && <span className="text-[10px] text-red-400">{submitError}</span>}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleIncreaseConfirm(false)}
                  disabled={submitting || (!isSpeculative && baEmpty) || linkLoad !== 'ok' || (!keepPriceAsIs && (isSplitContract ? (!newPriceLand.trim() || !newPriceBuild.trim()) : !newPrice.trim()))}
                  className={cls.btnPrimary}
                >
                  {submitting && !skipComposer ? 'Saving...' : 'Confirm & Prepare EOI'}
                </button>
                {!keepPriceAsIs && (
                  <button
                    onClick={() => { setSkipComposer(true); handleIncreaseConfirm(true); }}
                    disabled={submitting || (!isSpeculative && baEmpty) || linkLoad !== 'ok' || (isSplitContract ? (!newPriceLand.trim() || !newPriceBuild.trim()) : !newPrice.trim())}
                    className={cls.btnPrimary}
                  >
                    {submitting && skipComposer ? 'Saving...' : 'Confirm (update only)'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {step === 'mark_accepted' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs font-semibold mb-3`}>Mark Accepted</div>

              <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 items-center text-xs">
                {/* RO fields */}
                <span className={cls.label}>Property</span>
                <span className={cls.sub}>{record.propertyAddress}</span>

                <span className={cls.label}>Opportunity</span>
                <span className="font-medium">{selected?.name || record.clientClosed || '-'}</span>

                <span className={cls.label}>Pipeline / Stage</span>
                <span className={cls.sub}>
                  {selected?.pipelineName || selected?.stageName
                    ? [selected?.pipelineName, selected?.stageName].filter(Boolean).join(' — ')
                    : '-'}
                </span>

                {/* Editable BA */}
                <span className={cls.label}>Assigned BA *</span>
                <div>
                  {baOptionsFailed && baOptions.length === 0 ? (
                    <input type="text" value={editBA} onChange={(e) => setEditBA(e.target.value)}
                      placeholder="Required — type the BA name"
                      className={`w-full ${cls.input} ${baEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                  ) : (
                    <select value={editBA} onChange={(e) => setEditBA(e.target.value)}
                      className={`w-full ${cls.input} ${baEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                      <option value="">— Select a BA —</option>
                      {editBA && !baOptions.includes(editBA) && <option value={editBA}>{editBA} (not in list)</option>}
                      {baOptions.map((ba) => <option key={ba} value={ba}>{ba}</option>)}
                    </select>
                  )}
                </div>

                {/* Editable Close Date */}
                <span className={cls.label}>Close Date</span>
                <input type="date" value={editDateIso} onChange={(e) => setEditDateIso(e.target.value)} className={`w-fit ${cls.input}`} />

                {/* Current price — reference + copy checkbox */}
                <span className={cls.label}>Current Price (ref)</span>
                <div className="flex items-start gap-2">
                  <span className={`${cls.sub} font-medium`} style={{ whiteSpace: 'pre-line' }}>
                    {record.offerPrice || currencyFormatted(record.closingPrice || record.closePrefill || '') || '-'}
                  </span>
                  {(record.offerPrice || record.closingPrice || record.closePrefill) && (
                    <label className={`flex items-center gap-1 text-[10px] cursor-pointer whitespace-nowrap ${cls.sub}`}>
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (!e.target.checked) return;
                          const src = record.offerPrice || '';
                          if (isSplitContract) {
                            const lMatch = src.match(/L:\s*\$?([\d,]+)/);
                            const bMatch = src.match(/B:\s*\$?([\d,]+)/);
                            if (lMatch) setAgreedPriceLand(lMatch[1].replace(/,/g, ''));
                            if (bMatch) setAgreedPriceBuild(bMatch[1].replace(/,/g, ''));
                          } else {
                            const m = src.match(/\$?([\d,]+)/);
                            if (m) setAgreedPrice(m[1].replace(/,/g, ''));
                            else if (record.closingPrice) setAgreedPrice(currencyRaw(record.closingPrice));
                            else if (record.closePrefill) setAgreedPrice(currencyRaw(record.closePrefill));
                          }
                          e.target.checked = false;
                        }}
                      />
                      Use as agreed price
                    </label>
                  )}
                </div>

                {/* Agreed price — editable */}
                {isSplitContract ? (
                  <>
                    <span className={cls.label}>Agreed Price (Land) *</span>
                    <input type="text" inputMode="decimal" value={currencyFormatted(agreedPriceLand)}
                      onChange={(e) => setAgreedPriceLand(currencyRaw(e.target.value))}
                      placeholder="e.g. $300,000"
                      className={`w-full ${cls.input} ${!agreedPriceLand.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} />

                    <span className={cls.label}>Agreed Price (Build) *</span>
                    <input type="text" inputMode="decimal" value={currencyFormatted(agreedPriceBuild)}
                      onChange={(e) => setAgreedPriceBuild(currencyRaw(e.target.value))}
                      placeholder="e.g. $250,000"
                      className={`w-full ${cls.input} ${!agreedPriceBuild.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} />

                    <span className={cls.label}>Agreed Total</span>
                    <span className={`font-medium ${cls.sub}`}>
                      {agreedPriceLand || agreedPriceBuild
                        ? currencyFormatted(String(parseFloat(agreedPriceLand || '0') + parseFloat(agreedPriceBuild || '0')))
                        : '-'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={cls.label}>Agreed Price *</span>
                    <input type="text" inputMode="decimal" value={currencyFormatted(agreedPrice)}
                      onChange={(e) => setAgreedPrice(currencyRaw(e.target.value))}
                      placeholder="e.g. $700,000"
                      className={`w-full ${cls.input} ${!agreedPrice.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                  </>
                )}
              </div>

              {/* Confirmation tick-box */}
              <label className={`flex items-center gap-2 mt-4 text-xs cursor-pointer ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={acceptedConfirmed}
                  onChange={(e) => setAcceptedConfirmed(e.target.checked)}
                />
                <span>I confirm the agreed price is correct and the offer has been accepted</span>
              </label>

              {submitError && <div className="text-[10px] text-red-400 mt-2">{submitError}</div>}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => setStep('actions')} disabled={submitting} className={cls.btn}>← Back</button>
              <button
                onClick={handleMarkAccepted}
                disabled={submitting || baEmpty || linkLoad !== 'ok' || !acceptedConfirmed || (isSplitContract ? (!agreedPriceLand.trim() || !agreedPriceBuild.trim()) : !agreedPrice.trim())}
                className="px-4 py-2 rounded text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Processing...' : 'Confirm — Mark Accepted'}
              </button>
            </div>
          </>
        )}

        {step === 'reassign' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs font-semibold mb-3`}>
                {reassignVariant === 'keep'
                  ? 'Reassign or make speculative — keep existing terms'
                  : 'Reassign or make speculative — refresh terms'}
              </div>

              {!reassignSelected && !reassignIsSpeculative ? (
                <>
                  {/* Opportunity picker */}
                  <div className={`px-0 py-2 flex items-center gap-2 border-b mb-2 ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
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
                    </span>
                    {nextTier && (
                      <button onClick={() => loadTier(nextTier)} disabled={loadingTier !== null} className={cls.btn}>
                        {loadingTier === nextTier ? 'Loading...' : `Widen search (${TIER_LABELS[nextTier]})`}
                      </button>
                    )}
                  </div>

                  <div className="max-h-[280px] overflow-y-auto">
                    {loadingTier === 1 && loadedTiers.length === 0 ? (
                      <div className={`p-6 text-center text-xs ${cls.sub}`}>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
                        Loading opportunities...
                      </div>
                    ) : (
                      <table className="w-full text-[11px] border-collapse">
                        <thead className={`sticky top-0 ${dark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium">Opportunity</th>
                            <th className="px-3 py-1.5 text-left font-medium">Pipeline</th>
                            <th className="px-3 py-1.5 text-left font-medium">Stage</th>
                            <th className="px-3 py-1.5 text-left font-medium">Assigned BA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOpps.map((opp) => (
                            <tr key={opp.id} className={cls.row} onClick={() => {
                              setReassignSelected(opp);
                              setReassignIsSpeculative(false);
                              setEditBA(opp.assignedBA || '');
                              setEditDateIso(getTodayAESTIso());
                            }}>
                              <td className="px-3 py-1.5 font-medium">{opp.name}</td>
                              <td className={`px-3 py-1.5 ${cls.sub}`}>{opp.pipelineName || '-'}</td>
                              <td className={`px-3 py-1.5 ${cls.sub}`}>{opp.stageName || '-'}</td>
                              <td className="px-3 py-1.5">{opp.assignedBA || '-'}</td>
                            </tr>
                          ))}
                          {filteredOpps.length === 0 && (
                            <tr>
                              <td colSpan={4} className={`px-3 py-4 text-center ${cls.sub}`}>
                                No opportunities match{nextTier ? ' — try widening the search' : ''}.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <button
                    onClick={() => { setReassignIsSpeculative(true); setReassignSelected(null); }}
                    className={`mt-3 ${cls.btn}`}
                  >
                    Make Speculative — no client
                  </button>
                </>
              ) : (
                <>
                  {/* Confirm panel — opportunity selected or speculative */}
                  <div className={`text-xs mb-4 space-y-1 ${cls.sub}`}>
                    <div><span className="font-medium">Property:</span> {record.propertyAddress}</div>
                    <div><span className="font-medium">Previous opportunity:</span> {record.clientClosed || '-'}</div>
                    <div>
                      <span className="font-medium">{reassignIsSpeculative ? 'New status:' : 'New opportunity:'}</span>{' '}
                      {reassignIsSpeculative ? 'SPECULATIVE EOI' : reassignSelected?.name || '-'}
                    </div>
                    {reassignSelected && (
                      <div><span className="font-medium">Pipeline / Stage:</span> {[reassignSelected.pipelineName, reassignSelected.stageName].filter(Boolean).join(' — ') || '-'}</div>
                    )}
                  </div>

                  {!reassignIsSpeculative && (
                    <div className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 items-center text-xs mb-3">
                      <span className={cls.label}>Assigned BA *</span>
                      <div>
                        {baOptionsFailed && baOptions.length === 0 ? (
                          <input type="text" value={editBA} onChange={(e) => setEditBA(e.target.value)}
                            placeholder="Required — type the BA name"
                            className={`w-full ${cls.input} ${editBA.trim() === '' ? 'border-red-500 ring-1 ring-red-500' : ''}`} />
                        ) : (
                          <select value={editBA} onChange={(e) => setEditBA(e.target.value)}
                            className={`w-full ${cls.input} ${editBA.trim() === '' ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                            <option value="">— Select a BA —</option>
                            {editBA && !baOptions.includes(editBA) && <option value={editBA}>{editBA} (not in list)</option>}
                            {baOptions.map((ba) => <option key={ba} value={ba}>{ba}</option>)}
                          </select>
                        )}
                      </div>

                      <span className={cls.label}>Close Date</span>
                      <input type="date" value={editDateIso} onChange={(e) => setEditDateIso(e.target.value)} className={`w-fit ${cls.input}`} />
                    </div>
                  )}

                  <button
                    onClick={() => { setReassignSelected(null); setReassignIsSpeculative(false); }}
                    className={`text-[10px] ${cls.sub} underline cursor-pointer mb-2`}
                  >
                    ← Pick a different opportunity
                  </button>

                  {submitError && <div className="text-[10px] text-red-400 mt-2">{submitError}</div>}
                </>
              )}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => { setStep('actions'); setReassignSelected(null); setReassignIsSpeculative(false); }} disabled={submitting} className={cls.btn}>← Back</button>
              {(reassignSelected || reassignIsSpeculative) && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleReassignConfirm(false)}
                    disabled={submitting || (!reassignIsSpeculative && editBA.trim() === '')}
                    className={cls.btnPrimary}
                  >
                    {submitting && !skipComposer ? 'Saving...' : 'Confirm & Prepare EOI'}
                  </button>
                  <button
                    onClick={() => { setSkipComposer(true); handleReassignConfirm(true); }}
                    disabled={submitting || (!reassignIsSpeculative && editBA.trim() === '')}
                    className={cls.btnPrimary}
                  >
                    {submitting && skipComposer ? 'Saving...' : 'Confirm (link only)'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {step === 'unlink_lost' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs font-semibold mb-3`}>Unlink — change status to 06 Close Lost</div>

              <div className={`text-xs mb-4 space-y-1 ${cls.sub}`}>
                <div><span className="font-medium">Property:</span> {record.propertyAddress}</div>
                <div><span className="font-medium">Opportunity:</span> {record.clientClosed || '-'}</div>
                <div><span className="font-medium">Current Offer:</span> <span style={{ whiteSpace: 'pre-line' }}>{record.offerPrice || '-'}</span></div>
              </div>

              <div className="mb-3">
                <label className={`block text-xs font-medium mb-1 ${cls.sub}`}>Reason</label>
                <input
                  type="text"
                  value={delinkReason}
                  onChange={(e) => setDelinkReason(e.target.value)}
                  className={`w-full text-xs rounded px-2 py-1.5 ${cls.input}`}
                  placeholder="Lost to another buyer"
                />
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded p-3 text-xs text-red-800 dark:text-red-300 space-y-2">
                <div className="font-semibold">This action will:</div>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Remove the linked opportunity, BA, price, and close date from the CO</li>
                  <li>Clear the offer price and offer status</li>
                  <li>Change the CO status to 06 Close Lost</li>
                </ul>
              </div>

              {submitError && <div className="text-[10px] text-red-400 mt-2">{submitError}</div>}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => setStep('actions')} disabled={submitting} className={cls.btn}>← Back</button>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  setSubmitError('');
                  try {
                    const ok = await onUpdate({
                      opportunityId: '',
                      opportunityName: '',
                      assignedBA: '',
                      totalPurchasePrice: '',
                      closingDate: '',
                      transitionType: 'client_removed',
                      writeBaToOpportunity: false,
                      revertStatus: '06_remove_lost',
                    });
                    if (!ok) { setSubmitError('Failed to update record'); setSubmitting(false); return; }
                    try {
                      await fetch('/api/eoi/log-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recordId: record.id,
                          opportunityId: record.linkedOpportunityId || null,
                          opportunityName: record.clientClosed || null,
                          propertyAddress: record.propertyAddress || null,
                          eventType: 'unlink_lost',
                          sentBy: record.closingBA || 'system',
                          method: 'system',
                          notes: 'Moved to 06 Close Lost',
                          offerStatusAtEvent: 'cleared',
                          delinkReason: delinkReason.trim() || 'Lost to another buyer',
                        }),
                      });
                    } catch { /* best effort */ }
                  } catch {
                    setSubmitError('Failed to update record');
                  }
                  setSubmitting(false);
                }}
                disabled={submitting}
                className="px-4 py-2 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm — Mark as Lost'}
              </button>
            </div>
          </>
        )}

        {step === 'unlink_available' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs font-semibold mb-3`}>Unlink — change status to 01 Available</div>

              <div className={`text-xs mb-4 space-y-1 ${cls.sub}`}>
                <div><span className="font-medium">Property:</span> {record.propertyAddress}</div>
                <div><span className="font-medium">Opportunity:</span> {record.clientClosed || '-'}</div>
                <div><span className="font-medium">Current Offer:</span> <span style={{ whiteSpace: 'pre-line' }}>{record.offerPrice || '-'}</span></div>
              </div>

              <div className="mb-3">
                <label className={`block text-xs font-medium mb-1 ${cls.sub}`}>Reason <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={delinkReason}
                  onChange={(e) => setDelinkReason(e.target.value)}
                  className={`w-full text-xs rounded px-2 py-1.5 ${cls.input}`}
                  placeholder="Enter a detailed reason for returning to available"
                />
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded p-3 text-xs text-red-800 dark:text-red-300 space-y-2">
                <div className="font-semibold">This action will:</div>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Remove the linked opportunity, BA, price, and close date from the CO</li>
                  <li>Clear the offer price and offer status</li>
                  <li>Change the CO status to 01 Available</li>
                </ul>
              </div>

              {submitError && <div className="text-[10px] text-red-400 mt-2">{submitError}</div>}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => setStep('actions')} disabled={submitting} className={cls.btn}>← Back</button>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  setSubmitError('');
                  try {
                    const ok = await onUpdate({
                      opportunityId: '',
                      opportunityName: '',
                      assignedBA: '',
                      totalPurchasePrice: '',
                      closingDate: '',
                      transitionType: 'client_removed',
                      writeBaToOpportunity: false,
                      revertStatus: '01_available',
                    });
                    if (!ok) { setSubmitError('Failed to update record'); setSubmitting(false); return; }
                    try {
                      await fetch('/api/eoi/log-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recordId: record.id,
                          opportunityId: record.linkedOpportunityId || null,
                          opportunityName: record.clientClosed || null,
                          propertyAddress: record.propertyAddress || null,
                          eventType: 'unlink_available',
                          sentBy: record.closingBA || 'system',
                          method: 'system',
                          notes: 'Returned to 01 Available',
                          offerStatusAtEvent: 'cleared',
                          delinkReason: delinkReason.trim(),
                        }),
                      });
                    } catch { /* best effort */ }
                  } catch {
                    setSubmitError('Failed to update record');
                  }
                  setSubmitting(false);
                }}
                disabled={submitting || !delinkReason.trim()}
                className="px-4 py-2 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm — Return to Available'}
              </button>
            </div>
          </>
        )}

        {step === 'unlink_test' && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className={`text-xs font-semibold mb-3`}>Unlink — change status to 07 Test Record</div>

              <div className={`text-xs mb-4 space-y-1 ${cls.sub}`}>
                <div><span className="font-medium">Property:</span> {record.propertyAddress}</div>
                <div><span className="font-medium">Opportunity:</span> {record.clientClosed || '-'}</div>
                <div><span className="font-medium">Current Offer:</span> <span style={{ whiteSpace: 'pre-line' }}>{record.offerPrice || '-'}</span></div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded p-3 text-xs text-red-800 dark:text-red-300 space-y-2">
                <div className="font-semibold">This action will:</div>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Remove the linked opportunity, BA, price, and close date from the CO</li>
                  <li>Clear the offer price and offer status</li>
                  <li>Change the CO status to 07 Test Record</li>
                </ul>
              </div>

              {submitError && <div className="text-[10px] text-red-400 mt-2">{submitError}</div>}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <button onClick={() => setStep('actions')} disabled={submitting} className={cls.btn}>← Back</button>
              <button
                onClick={async () => {
                  setSubmitting(true);
                  setSubmitError('');
                  try {
                    const ok = await onUpdate({
                      opportunityId: '',
                      opportunityName: '',
                      assignedBA: '',
                      totalPurchasePrice: '',
                      closingDate: '',
                      transitionType: 'client_removed',
                      writeBaToOpportunity: false,
                      revertStatus: '07_test_record',
                    });
                    if (!ok) { setSubmitError('Failed to update record'); setSubmitting(false); return; }
                    // Log to activity history
                    try {
                      await fetch('/api/eoi/log-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recordId: record.id,
                          opportunityId: record.linkedOpportunityId || null,
                          opportunityName: record.clientClosed || null,
                          propertyAddress: record.propertyAddress || null,
                          eventType: 'unlink_test',
                          sentBy: record.closingBA || 'system',
                          method: 'system',
                          notes: 'Moved to 07 Test Record',
                          offerStatusAtEvent: 'cleared',
                        }),
                      });
                    } catch { /* best effort */ }
                  } catch {
                    setSubmitError('Failed to update record');
                  }
                  setSubmitting(false);
                }}
                disabled={submitting}
                className="px-4 py-2 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm — Move to Test'}
              </button>
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
                <span className={cls.label}>Opportunity</span>
                <span className="font-medium">{selected?.name || record.clientClosed || '-'}</span>

                {linkLoad === 'missing' && (
                  <div className="col-span-2 rounded border border-red-500 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
                    <strong>This link is broken.</strong> GHL has no opportunity with ID{' '}
                    <span className="font-mono">{record.linkedOpportunityId}</span> — it has probably been
                    deleted. Changes cannot be confirmed against it. Use <strong>← Reassign</strong> to link the
                    correct opportunity, or <strong>Remove client / Speculative</strong> to clear it.
                  </div>
                )}

                {duplicateLinks.length > 0 && (
                  <div className={`col-span-2 rounded border border-amber-500 px-2 py-1.5 text-[11px] ${dark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>
                    <strong>This opportunity is already linked to another property:</strong>
                    <ul className="list-disc ml-4 mt-1">
                      {duplicateLinks.map((r) => (
                        <li key={r.id}>
                          {r.address || r.id}
                          {r.status ? ` — ${r.status}` : ''}
                        </li>
                      ))}
                    </ul>
                    <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dupeAcknowledged}
                        onChange={(e) => setDupeAcknowledged(e.target.checked)}
                      />
                      <span>
                        One client buying two properties normally means two opportunities. Tick to link it
                        to this property as well.
                      </span>
                    </label>
                  </div>
                )}

                {linkLoad === 'error' && (
                  <div className={`col-span-2 rounded border border-amber-500 px-2 py-1.5 text-[11px] ${dark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-800'}`}>
                    <strong>Could not reach GHL</strong> to load the linked opportunity — often a temporary
                    network problem. Try again in a few minutes.{' '}
                    <button type="button" onClick={loadLinkedOpportunity} className="underline font-medium">
                      Retry now
                    </button>
                    <br />
                    You can still edit the values below (they save to the property record), but the Assigned BA
                    will <strong>not</strong> be written back to the opportunity until it loads.
                  </div>
                )}

                <span className={cls.label}>Pipeline / stage</span>
                <span className={cls.sub}>
                  {selected?.pipelineName || selected?.stageName
                    ? [selected?.pipelineName, selected?.stageName].filter(Boolean).join(' — ')
                    : '-'}
                </span>

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

                {isSplitContract ? (
                  <>
                    <span className={cls.label}>Offer $ (Land) *</span>
                    <div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currencyFormatted(editPriceLand)}
                        onChange={(e) => setEditPriceLand(currencyRaw(e.target.value))}
                        placeholder="e.g. $250,000"
                        className={`w-full ${cls.input} ${currencyRaw(editPriceLand).trim() === '' ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      />
                      <div className={`text-[10px] mt-0.5 ${cls.sub}`}>
                        {record.landPricePrefill ? `Prefilled from CO land_price: ${currencyFormatted(record.landPricePrefill)}` : 'Enter the land offer price'}
                      </div>
                    </div>

                    <span className={cls.label}>Offer $ (Build) *</span>
                    <div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currencyFormatted(editPriceBuild)}
                        onChange={(e) => setEditPriceBuild(currencyRaw(e.target.value))}
                        placeholder="e.g. $200,000"
                        className={`w-full ${cls.input} ${currencyRaw(editPriceBuild).trim() === '' ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      />
                      <div className={`text-[10px] mt-0.5 ${cls.sub}`}>
                        {record.buildPricePrefill ? `Prefilled from CO build_price: ${currencyFormatted(record.buildPricePrefill)}` : 'Enter the build offer price'}
                      </div>
                    </div>

                    <span className={cls.label}>Total $</span>
                    <div className={`text-xs font-medium ${cls.sub}`}>
                      {editPriceLand || editPriceBuild
                        ? currencyFormatted(String(parseFloat(editPriceLand || '0') + parseFloat(editPriceBuild || '0')))
                        : '-'}
                    </div>
                  </>
                ) : (
                  <>
                    <span className={cls.label}>Offer $ *</span>
                    <div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={currencyFormatted(editPrice)}
                        onChange={(e) => setEditPrice(currencyRaw(e.target.value))}
                        placeholder="e.g. $650,000"
                        className={`w-full ${cls.input} ${priceEmpty ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                      />
                      <div className={`text-[10px] mt-0.5 ${priceEmpty ? 'text-red-500' : cls.sub}`}>
                        {priceEmpty
                          ? 'Required — enter the offer price to continue.'
                          : isEdit
                            ? `Current: ${record.closingPrice || '-'}; opportunity reference: ${selected?.totalPurchasePrice || '-'}`
                            : `Prefilled from the property record (${record.type || 'unknown type'}). Opportunity Total Purchase Price for reference: ${selected?.totalPurchasePrice || '-'}`}
                      </div>
                    </div>
                  </>
                )}

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

            {/* Reassign bar — sits above the remove section */}
            <div className={`px-4 py-3 border-t ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              {isEdit ? (
                <button onClick={() => { setStep('pick'); setSelected(null); setSubmitError(''); setShowRemoveConfirm(false); }} disabled={submitting} className={cls.btn}>
                  ← Reassign to a different opportunity
                </button>
              ) : (
                <button onClick={() => { setStep('pick'); setSelected(null); setSubmitError(''); }} disabled={submitting} className={cls.btn}>
                  ← Back
                </button>
              )}
            </div>

            {/* Remove-client confirmation panel */}
            {showRemoveConfirm && isEdit && (
              <div className={`px-4 py-3 border-t text-xs ${dark ? 'border-amber-700 bg-amber-900/30' : 'border-amber-300 bg-amber-50'}`}>
                <div className="font-semibold mb-2">Remove client &mdash; choose how data is handled:</div>
                <div className="flex flex-col gap-3 mb-3">
                  <label className="flex items-start gap-1.5">
                    <input type="radio" name="removeAction" checked={removeAction === 'speculative'} onChange={() => setRemoveAction('speculative')} className="mt-0.5" />
                    <div>
                      <span className="font-medium">Revert to Speculative EOI</span> <span className={dark ? 'text-gray-400' : 'text-gray-500'}>(keep status 02 EOI)</span>
                      <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Removes the linked opportunity. The property remains at EOI status for future linking.
                      </div>
                      <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Clears:</div>
                      <ul className={`columns-2 gap-x-6 mt-0.5 ml-3 list-disc ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <li>Linked opportunity</li>
                        <li>Client name</li>
                        <li>Closing BA</li>
                        <li>Offer price</li>
                        <li>Offer status</li>
                        <li>Close price</li>
                        <li>Closing date</li>
                      </ul>
                    </div>
                  </label>
                  <label className="flex items-start gap-1.5">
                    <input type="radio" name="removeAction" checked={removeAction === 'remove'} onChange={() => setRemoveAction('remove')} className="mt-0.5" />
                    <div>
                      <span className="font-medium">Remove entirely</span>
                      <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Removes ALL client and offer data:</div>
                      <ul className={`columns-2 gap-x-6 mt-0.5 ml-3 list-disc ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <li>Linked opportunity</li>
                        <li>Client name</li>
                        <li>Closing BA</li>
                        <li>Offer price</li>
                        <li>Offer status</li>
                        <li>Close price</li>
                        <li>Closing date</li>
                      </ul>
                      <div className={`mt-1 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Changes property status to:</div>
                      {removeAction === 'remove' && (
                        <select value={revertStatus} onChange={(e) => setRevertStatus(e.target.value)} className={`text-xs rounded px-1.5 py-1 mt-1 ${cls.input}`}>
                          <option value="01_available">01 Available</option>
                          <option value="03_contr_exchanged">03 Contr&apos; Exchanged</option>
                          <option value="05_remove_no_interest">05 Remove no interest</option>
                          <option value="06_remove_lost">06 Remove lost</option>
                          <option value="07_test_record">07 Test Record</option>
                        </select>
                      )}
                    </div>
                  </label>
                </div>
                <div className={`mb-3 ${dark ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontSize: 10 }}>
                  EOI send history is retained in the database for reporting and can be viewed in the EOI composer.
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowRemoveConfirm(false)} className={cls.btn}>Cancel</button>
                  <button onClick={handleRemoveClient} disabled={submitting} className="px-3 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? 'Removing...' : 'Confirm removal'}
                  </button>
                </div>
              </div>
            )}

            <div className={`px-4 py-3 border-t flex items-center justify-between ${dark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {isEdit && !showRemoveConfirm && (
                  <button onClick={handleRemoveClient} disabled={submitting} className="px-3 py-1.5 rounded text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    Remove client...
                  </button>
                )}
              </div>
              {submitError && <span className="text-[10px] text-red-400">{submitError}</span>}
              {!isEdit ? (
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => { setSkipComposer(false); handleConfirm(false); }} disabled={submitting || !editDateIso || baEmpty || priceEmpty || linkLoad === 'loading' || linkLoad === 'missing' || (duplicateLinks.length > 0 && !dupeAcknowledged) || !selected} className={cls.btnPrimary}>
                    {submitting && !skipComposer ? 'Saving...' : 'Confirm & Prepare EOI'}
                  </button>
                  <button onClick={() => { setSkipComposer(true); handleConfirm(true); }} disabled={submitting || !editDateIso || baEmpty || priceEmpty || linkLoad === 'loading' || linkLoad === 'missing' || (duplicateLinks.length > 0 && !dupeAcknowledged) || !selected} className={cls.btnPrimary}>
                    {submitting && skipComposer ? 'Saving...' : 'Confirm (link only)'}
                  </button>
                </div>
              ) : (
                <button onClick={() => handleConfirm(false)} disabled={submitting || baEmpty || priceEmpty || linkLoad === 'loading' || linkLoad === 'missing' || (duplicateLinks.length > 0 && !dupeAcknowledged) || (!selected && !isSpeculative)} className={cls.btnPrimary}>
                  {submitting ? 'Saving...' : 'Confirm changes'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
