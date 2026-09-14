'use client';

// ============================================================================
// EOI COMPOSER — real sending workflow
//
// Matches the layout of the existing GHL EOI builder form:
// - Charcoal/yellow brand colours
// - Section headers: PROPERTY, TERMS, PURCHASER/S, LEGALS, FINANCE
// - Table layout with alternating dark/light rows
// - Inline editable cells
// - Recipient bar with agent email + CC
//
// Loaded from /eoi/compose?recordId=xxx&address=...&type=...  (Deal Sheet)
// Prefills from URL params (instant) + linked opportunity contact (GHL lookup).
// Pulls terms from the DB (WP1 template admin values).
// Sends via /api/eoi/send (Nodemailer → SMTP).
// Records durable history in eoi_sends.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail } from '@/lib/userAuth';
import { handleMobileInput, normalizeMobileForStorage } from '@/lib/phoneFormatter';
import { renderEoiEmailHtml, type EoiEmailData } from '@/lib/eoi-email';

if (typeof document !== 'undefined') document.title = 'Buyers Club — Expression of Interest';

// ---- types ------------------------------------------------------------------

type AuState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS';
const AU_STATES: AuState[] = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS'];

type PropertyType = 'established' | 'new_single' | 'hl_split';
const TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: 'established', label: 'Established' },
  { value: 'new_single', label: 'New (Single Contract)' },
  { value: 'hl_split', label: 'H&L (Split Contract)' },
];
const TYPE_LABELS: Record<PropertyType, string> = {
  established: 'ESTABLISHED',
  new_single: 'NEW (SINGLE CONTRACT)',
  hl_split: 'H&L (SPLIT CONTRACT)',
};

interface Purchaser { name: string; email: string; phone: string; address: string; }

interface SendHistoryItem {
  id: number;
  send_type: string;
  offer_price: string;
  agent_email: string;
  sent_by: string;
  sent_at: string;
  delivery_status: string;
  eoi_status: string;
}

// ---- helpers ----------------------------------------------------------------

function detectState(address: string): AuState | null {
  const upper = (address || '').toUpperCase();
  for (const s of AU_STATES) {
    if (new RegExp(`\\b${s}\\b`).test(upper)) return s;
  }
  return null;
}

/**
 * Determine the composer's PropertyType from the CO fields property_type + contract_type.
 * Falls back to the deal_type display label only if CO fields are empty.
 */
function resolvePropertyType(propertyTypeCO: string, contractTypeCO: string, dealTypeLabel: string): PropertyType {
  const pt = (propertyTypeCO || '').toLowerCase().trim();
  const ct = (contractTypeCO || '').toLowerCase().trim();
  // CO fields present — use them (Row 3 decision)
  if (pt === 'new' && ct.includes('split')) return 'hl_split';
  if (pt === 'new') return 'new_single';
  if (pt === 'established') return 'established';
  // Fallback: infer from the deal_type display label (fragile, legacy only)
  const upper = (dealTypeLabel || '').toUpperCase();
  if (upper.startsWith('01') || upper.includes('H&L') || upper.includes('HL')) return 'hl_split';
  if (upper.startsWith('02') || upper.includes('SINGLE') || upper.includes('NEW')) return 'new_single';
  return 'established';
}

function currencyRaw(v: string): string { return (v || '').replace(/[^0-9.]/g, ''); }

function currencyFormat(v: string): string {
  const raw = currencyRaw(v);
  if (!raw) return '';
  const n = parseFloat(raw);
  if (isNaN(n)) return '';
  return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function emptyPurchaser(): Purchaser { return { name: '', email: '', phone: '', address: '' }; }

// ---- CSS vars matching the existing form ------------------------------------

const CSS = `
:root {
  --yellow: #FBD721;
  --yellow-dim: #fff4b3;
  --charcoal: #4D4D4D;
  --charcoal-dark: #2A2A2A;
  --row-dark: #E0E0E0;
  --row-light: #E0E0E0;
  --row-edit: #FAFAFA;
  --row-edit-hover: #F2F2F2;
  --text: #2A2A2A;
  --text-soft: #555;
  --text-muted: #888;
  --red: #c0392b;
  --green: #1e7a3a;
  --border: #d4d4d4;
}
* { box-sizing: border-box; }
body { font-family: "Calibri Light", "Calibri", "Segoe UI", Arial, sans-serif; }
.eoi-page { background: #f0f0f0; min-height: 100vh; padding: 24px 16px 80px; }
.toolbar {
  max-width: 1080px; margin: 0 auto 18px; background: var(--charcoal-dark); color: #fff;
  border-radius: 6px; padding: 14px 18px; display: flex; align-items: center; flex-wrap: wrap; gap: 14px;
}
.toolbar-title { font-weight: 700; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; color: var(--yellow); margin-right: auto; }
.toolbar select, .toolbar button, .toolbar input {
  font-family: inherit; font-size: 13px; padding: 7px 12px; border-radius: 4px; border: 1px solid #555; background: #fff; color: var(--charcoal-dark); cursor: pointer;
}
.toolbar button.primary { background: var(--yellow); border-color: var(--yellow); font-weight: 700; }
.toolbar button.primary:hover { background: #ffd83a; }
.toolbar button.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.toolbar-group { display: flex; align-items: center; gap: 6px; padding-right: 12px; border-right: 1px solid #555; }
.toolbar-group:last-of-type { border-right: none; }
.eoi-sheet { max-width: 1080px; margin: 0 auto; background: #fff; padding: 32px 40px 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: 1.5px dashed #c0c0c0; position: relative; }
.eoi-sheet::before {
  content: 'EMAIL PREVIEW'; position: absolute; top: -10px; left: 24px;
  background: #f0f0f0; padding: 1px 10px; font-size: 9px; letter-spacing: 1.5px;
  color: #999; font-weight: 600; border-radius: 2px;
}
.eoi-header { border-bottom: 3px solid var(--yellow); padding-bottom: 18px; margin-bottom: 20px; display: flex; align-items: flex-end; justify-content: space-between; }
.eoi-header h1 { font-size: 26px; font-weight: 700; color: var(--charcoal-dark); letter-spacing: -0.5px; margin: 0; }
.badges { display: flex; gap: 6px; }
.state-badge { background: var(--charcoal-dark); color: var(--yellow); padding: 4px 12px; font-size: 12px; font-weight: 700; letter-spacing: 2px; border-radius: 2px; }
.type-badge { background: var(--yellow); color: var(--charcoal-dark); padding: 4px 12px; font-size: 12px; font-weight: 700; letter-spacing: 2px; border-radius: 2px; }
table.eoi { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
table.eoi td { border: 1pt solid #fff; padding: 6px 10px 6px 14px; vertical-align: middle; font-size: 13.5px; }
table.eoi input, table.eoi textarea {
  width: 100%; border: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--text);
  padding: 2px 0; outline: none;
}
table.eoi textarea { resize: vertical; overflow: hidden; }
table.eoi input:focus, table.eoi textarea:focus { background: #fff; box-shadow: inset 0 0 0 2px var(--yellow); border-radius: 2px; }
.section-head { background: var(--charcoal); color: var(--yellow); text-align: center; font-weight: 600; letter-spacing: 1px; padding: 8px 10px !important; }
.label-dark { background: var(--row-dark); text-align: right; width: 140px; font-weight: 700; }
.label-light { background: var(--row-light); text-align: right; width: 140px; font-weight: 700; }
.value-dark { background: var(--row-dark); }
.value-light { background: var(--row-light); }
.value-edit { background: var(--row-edit); }
.sub-label { text-align: right; width: 100px; font-weight: 700; padding: 6px 10px 6px 14px !important; }
.purchaser-head { background: var(--charcoal); color: #fff; text-align: center; font-weight: 600; }
.recipient-bar { background: var(--yellow); border: 1px solid var(--yellow); padding: 12px 14px; margin-bottom: 18px; font-size: 13px; max-width: 1080px; margin: 0 auto 18px; }
.recipient-row { display: flex; gap: 14px; align-items: center; }
.recipient-bar label { font-weight: 700; color: var(--charcoal-dark); white-space: nowrap; }
.recipient-bar input { flex: 1; border: 1px solid #c4a800; padding: 6px 10px; font-family: inherit; font-size: 13px; border-radius: 3px; background: #fff; }
.recipient-meta { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #d4b800; font-size: 12px; color: var(--charcoal-dark); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.history-panel { max-width: 1080px; margin: 18px auto 0; background: #fff; padding: 18px 24px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.history-item { border-bottom: 1px solid #eee; padding: 8px 0; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
.history-item:last-child { border-bottom: none; }
.send-result { max-width: 1080px; margin: 0 auto 12px; padding: 12px 18px; border-radius: 6px; font-size: 13px; }
.send-ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.send-fail { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.contact-note { max-width: 1080px; margin: 0 auto 12px; background: #e8f4fd; border: 1px solid #bee5eb; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #0c5460; }
.fill-prompt { background: #d4edda !important; }
.fill-writeback { background: #fff3cd !important; }
.fill-manual { background: #ffffff !important; }
.fill-calculated { background: #e9ecef !important; }
.source-label { display: block; font-size: 9.5px; color: #999; font-weight: 400; font-style: italic; margin-top: 1px; letter-spacing: 0.2px; }
.legend { max-width: 1080px; margin: 18px auto 0; background: #fff; padding: 14px 20px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 12px; }
.legend-title { font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--charcoal-dark); }
.legend-items { display: flex; flex-wrap: wrap; gap: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.legend-swatch { width: 16px; height: 16px; border: 1px solid #ccc; border-radius: 2px; }

/* Side annotations — anchored to sections */
.side-note {
  position: absolute; right: -220px; width: 200px;
  background: #fafafa; border: 1px solid #e5e5e5; border-radius: 4px; padding: 8px 10px;
  font-size: 10px; line-height: 1.5; color: #888;
}
.side-note strong { color: #555; font-weight: 600; }
@media (max-width: 1400px) { .side-note { display: none; } }
`;

// ---- component --------------------------------------------------------------

export default function EoiComposePage() {
  // Auth
  const [userEmail, setUserEmail] = useState('');
  const [authEmail, setAuthEmail] = useState('');

  // Record params (from URL — instant, no fetch needed)
  const [recordId, setRecordId] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [oppId, setOppId] = useState('');

  // EOI form state
  const [state, setState] = useState<AuState>('NSW');
  const [propertyType, setPropertyType] = useState<PropertyType>('established');
  const [offerPrice, setOfferPrice] = useState('');
  const [landPrice, setLandPrice] = useState('');
  const [buildPrice, setBuildPrice] = useState('');
  const [purchasers, setPurchasers] = useState<Purchaser[]>([emptyPurchaser(), emptyPurchaser()]);
  const [contractEntity, setContractEntity] = useState('');
  const [notes, setNotes] = useState('');

  // Agent
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [agencyName, setAgencyName] = useState('');

  // Solicitor
  const [solicitorName, setSolicitorName] = useState('');
  const [solicitorEmail, setSolicitorEmail] = useState('');
  const [solicitorPhone, setSolicitorPhone] = useState('');
  const [solicitorCompany, setSolicitorCompany] = useState('');

  // Broker
  const [brokerName, setBrokerName] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [brokerCompany, setBrokerCompany] = useState('');
  const [lvr, setLvr] = useState('');

  const [consultantName, setConsultantName] = useState('');
  const [consultantEmail, setConsultantEmail] = useState('');

  // Terms from DB
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<string[]>([]);

  // Editable copies of Template Admin terms (initialised from DB, editable on form)
  const [editDepositAmount, setEditDepositAmount] = useState('');
  const [editDepositPayable, setEditDepositPayable] = useState('');
  const [editLandDeposit, setEditLandDeposit] = useState('');
  const [editBuildDeposit, setEditBuildDeposit] = useState('');
  const [editFinance, setEditFinance] = useState('');
  const [editBuildingPest, setEditBuildingPest] = useState('');
  const [editPci, setEditPci] = useState('');
  const [editCommission, setEditCommission] = useState('');
  const [editSettlement, setEditSettlement] = useState('');
  const [editConditions, setEditConditions] = useState('');

  // Auto-grow textarea refs
  const conditionsRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const autoGrow = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, []);
  useEffect(() => { autoGrow(conditionsRef.current); }, [editConditions, autoGrow]);
  useEffect(() => { autoGrow(notesRef.current); }, [notes, autoGrow]);

  // Send state
  const [sendType, setSendType] = useState<'initial' | 'increase' | 'revision'>('initial');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; sendId?: number; deliveryStatus?: string; error?: string } | null>(null);

  // History
  const [history, setHistory] = useState<SendHistoryItem[]>([]);

  // Contact loading note
  const [contactNote, setContactNote] = useState('');

  // ---- auth -----------------------------------------------------------------
  useEffect(() => {
    const saved = getUserEmail();
    if (saved) { setAuthEmail(saved); setUserEmail(saved); }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (validateUserEmail(userEmail)) {
      saveUserEmail(userEmail);
      setAuthEmail(userEmail);
    }
  }

  // ---- read URL params (instant — no API call needed for basic record data) -
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const id = p.get('recordId') || '';
    setRecordId(id);

    const addr = p.get('address') || '';
    setPropertyAddress(addr);

    // State: prefer CO field, fall back to address parsing
    const stateParam = (p.get('state') || '').toUpperCase().trim();
    if (AU_STATES.includes(stateParam as AuState)) {
      setState(stateParam as AuState);
    } else {
      const detected = detectState(addr);
      if (detected) setState(detected);
    }

    // Property type: use CO fields property_type + contract_type (Row 3 decision)
    setPropertyType(resolvePropertyType(p.get('propertyType') || '', p.get('contractType') || '', p.get('type') || ''));

    setOfferPrice(currencyRaw(p.get('price') || ''));
    // H&L land/build prices
    setLandPrice(currencyRaw(p.get('landPrice') || ''));
    setBuildPrice(currencyRaw(p.get('buildPrice') || ''));

    // Agent from CO
    setAgentName(p.get('agentName') || '');
    setAgentEmail(p.get('agentEmail') || '');
    setAgentPhone(p.get('agentMobile') || '');

    setConsultantName(p.get('ba') || '');
    setOppId(p.get('oppId') || '');

    const client = p.get('client') || '';
    if (client && client !== 'SPECULATIVE EOI') {
      setPurchasers([{ ...emptyPurchaser(), name: client }, emptyPurchaser()]);
    }

    const st = p.get('sendType');
    if (st === 'increase' || st === 'revision') setSendType(st);
  }, []);

  // ---- load linked opportunity contact + solicitor + broker -----------------
  useEffect(() => {
    if (!oppId || !authEmail) {
      if (!oppId && recordId) setContactNote('No linked opportunity — this will be a speculative EOI.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/deal-sheet/opportunities?v=2&id=${encodeURIComponent(oppId)}&_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('lookup failed');
        const d = await res.json();
        const opp = (d.opportunities || [])[0];
        if (!opp) throw new Error('not found');

        // Purchaser 1 from contact + postal address
        const name = opp.contactName || opp.name || '';
        if (name) {
          setPurchasers((prev) => {
            const next = [...prev];
            next[0] = {
              ...next[0],
              name: name || next[0].name,
              email: opp.contactEmail || next[0].email,
              phone: opp.contactPhone || next[0].phone,
              address: opp.postalAddress || next[0].address,
            };
            // Purchaser 2 from partner fields
            if (opp.partnerName) {
              next[1] = {
                name: opp.partnerName || '',
                email: opp.partnerEmail || '',
                phone: opp.partnerPhone || '',
                address: opp.partnerAddress || '',
              };
            }
            return next;
          });
        }
        if (opp.assignedBA) {
          setConsultantName(opp.assignedBA);
          // Look up BA email from the BAs list for CC purposes
          try {
            const baRes = await fetch('/api/bas');
            if (baRes.ok) {
              const baData = await baRes.json();
              const match = (baData.bas || []).find((b: { name: string; email: string }) =>
                b.name.toLowerCase().trim() === opp.assignedBA.toLowerCase().trim()
              );
              if (match?.email) setConsultantEmail(match.email);
            }
          } catch { /* BA email lookup is non-critical */ }
        }

        // Contract Entity — whichever of the 3 entity fields has a value
        if (opp.contractEntity) setContractEntity(opp.contractEntity);

        // Solicitor
        if (opp.solicitorName) setSolicitorName(opp.solicitorName);
        if (opp.solicitorCompany) setSolicitorCompany(opp.solicitorCompany);
        if (opp.solicitorEmail) setSolicitorEmail(opp.solicitorEmail);
        if (opp.solicitorPhone) setSolicitorPhone(opp.solicitorPhone);

        // Broker
        if (opp.brokerName) setBrokerName(opp.brokerName);
        if (opp.brokerCompany) setBrokerCompany(opp.brokerCompany);
        if (opp.brokerEmail) setBrokerEmail(opp.brokerEmail);
        if (opp.brokerPhone) setBrokerPhone(opp.brokerPhone);

        const got = [opp.contactEmail && 'email', opp.contactPhone && 'phone'].filter(Boolean);
        setContactNote('The Agent\'s name, email and phone number are synced with the property record; any changes made here will automatically update that record.');
      } catch {
        setContactNote('Could not read the linked opportunity — enter details manually.');
      }
    })();
  }, [oppId, authEmail, recordId]);

  // ---- load terms from DB ---------------------------------------------------
  const fetchTerms = useCallback(async () => {
    try {
      const [tRes, cRes] = await Promise.all([
        fetch(`/api/eoi/templates?state=${state}&type=${propertyType}&_t=${Date.now()}`),
        fetch(`/api/eoi/conditions?state=${state}&type=${propertyType}&_t=${Date.now()}`),
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      setTerms(tData.values || {});
      setConditions((cData.conditions || []).filter((c: { is_default: boolean }) => c.is_default).map((c: { text: string }) => c.text));
    } catch { /* fall back to empty */ }
  }, [state, propertyType]);

  useEffect(() => { if (authEmail) fetchTerms(); }, [fetchTerms, authEmail]);

  // Initialise editable copies when terms/conditions load from DB
  useEffect(() => {
    setEditDepositAmount(terms.deposit_amount || '');
    setEditDepositPayable(terms.deposit_payable || '');
    // Land/build deposit: blank & mandatory (rows 10-11) — do NOT prefill from Template Admin
    setEditFinance(terms.finance || '');
    setEditBuildingPest(terms.building_pest || '');
    setEditPci(terms.pci || '');
    setEditCommission(''); // Manual entry (row 15)
    setEditSettlement(terms.settlement || '');
    setEditConditions(conditions.map(c => {
      const stripped = c.replace(/^[\s]*[-\u2013\u2014\u2022]\s*/, '');
      return stripped ? `\u2022 ${stripped}` : c;
    }).join('\n'));
    // Notes: prefill from Template Admin if available, otherwise use hardcoded default
    const defaultNotes = 'Exchanged contract is to be sent to: CONTRACTS@BUYERSCLUB.COM.AU\n\nPlease do not send the contract directly to the purchaser';
    setNotes(terms.notes || defaultNotes);
  }, [terms, conditions]);

  // ---- load history ---------------------------------------------------------
  useEffect(() => {
    if (!recordId || !authEmail) return;
    fetch(`/api/eoi/history?recordId=${encodeURIComponent(recordId)}&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.sends || []))
      .catch(() => {});
  }, [recordId, authEmail, sendResult]);

  // ---- derived values -------------------------------------------------------
  const isHL = propertyType === 'hl_split';
  const isEstablished = propertyType === 'established';

  const totalPrice = useMemo(() => {
    if (!isHL) return '';
    const land = parseFloat(currencyRaw(landPrice)) || 0;
    const build = parseFloat(currencyRaw(buildPrice)) || 0;
    return land + build > 0 ? String(land + build) : '';
  }, [isHL, landPrice, buildPrice]);

  const displayOfferPrice = useMemo(() => {
    if (isHL && totalPrice) return currencyFormat(totalPrice);
    return currencyFormat(offerPrice);
  }, [isHL, totalPrice, offerPrice]);

  // ---- build email data object (shared by preview + send) --------------------
  function buildEmailData(): EoiEmailData {
    return {
      propertyAddress,
      offerPrice: displayOfferPrice,
      state,
      propertyType,
      propertyTypeLabel: TYPE_LABELS[propertyType],
      purchasers: purchasers.filter((p) => p.name.trim()),
      contractEntity,
      depositAmount: editDepositAmount,
      depositPayable: editDepositPayable,
      landDeposit: editLandDeposit,
      buildDeposit: editBuildDeposit,
      finance: editFinance,
      buildingPest: editBuildingPest,
      pci: editPci,
      commission: editCommission,
      settlement: editSettlement,
      specialConditions: editConditions.split('\n').filter((l: string) => l.trim()),
      landPrice: isHL ? currencyFormat(landPrice) : '',
      buildPrice: isHL ? currencyFormat(buildPrice) : '',
      totalPrice: isHL ? currencyFormat(totalPrice) : '',
      agentName, agentEmail, agentPhone, agencyName,
      solicitorName, solicitorEmail, solicitorPhone, solicitorCompany,
      brokerName, brokerEmail, brokerPhone, brokerCompany,
      consultantName,
      consultantEmail,
      notes,
      lvr,
    };
  }

  // Live email preview HTML — same function used on send, so preview = email
  const previewHtml = useMemo(() => renderEoiEmailHtml(buildEmailData()), [
    propertyAddress, displayOfferPrice, state, propertyType, purchasers, contractEntity,
    editDepositAmount, editDepositPayable, editLandDeposit, editBuildDeposit,
    editFinance, editBuildingPest, editPci, editCommission, editSettlement, editConditions,
    landPrice, buildPrice, totalPrice, agentName, agentEmail, agentPhone, agencyName,
    solicitorName, solicitorEmail, solicitorPhone, solicitorCompany,
    brokerName, brokerEmail, brokerPhone, brokerCompany,
    consultantName, consultantEmail, notes, lvr,
  ]);

  // ---- send -----------------------------------------------------------------
  async function handleSend() {
    if (!agentEmail) { alert('Agent email is required'); return; }
    if (!recordId) return;
    // Mandatory field validation
    const missing: string[] = [];
    if (isHL && !editLandDeposit.trim()) missing.push('Land Deposit');
    if (isHL && !editBuildDeposit.trim()) missing.push('Build Deposit');
    if (!lvr.trim()) missing.push('LVR');
    if (missing.length > 0) { alert(`Required fields missing: ${missing.join(', ')}`); return; }

    setSending(true);
    setSendResult(null);
    setContactNote('');

    const emailData = buildEmailData();
    // Use the same renderer as the preview — what you see IS what gets sent
    const renderedHtml = renderEoiEmailHtml(emailData);

    try {
      const res = await fetch('/api/eoi/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          opportunityId: oppId || null,
          propertyAddress,
          sendType,
          offerPrice: displayOfferPrice,
          agentEmail,
          sentBy: authEmail,
          consultantEmail,
          emailData,
          renderedHtml,
        }),
      });
      const data = await res.json();
      setSendResult(data);
    } catch (err) {
      setSendResult({ ok: false, error: err instanceof Error ? err.message : 'Send failed' });
    } finally {
      setSending(false);
    }
  }

  // ---- purchaser helpers ----------------------------------------------------
  function updatePurchaser(idx: number, field: keyof Purchaser, value: string) {
    setPurchasers((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  function addPurchaser() {
    if (purchasers.length < 6) setPurchasers((prev) => [...prev, emptyPurchaser()]);
  }

  function removePurchaser(idx: number) {
    if (purchasers.length > 1) setPurchasers((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---- auth gate ------------------------------------------------------------
  if (!authEmail) {
    return (
      <div className="eoi-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <style suppressHydrationWarning>{CSS}</style>
        <form onSubmit={handleAuth} style={{ background: '#fff', padding: 32, borderRadius: 6, maxWidth: 380, width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Expression of Interest</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Enter your @buyersclub.com.au email to continue</p>
          <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="your.name@buyersclub.com.au"
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', fontSize: 14, marginBottom: 12 }} />
          <button type="submit" style={{ width: '100%', background: 'var(--yellow)', border: 'none', borderRadius: 4, padding: '10px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (!recordId) {
    return (
      <div className="eoi-page" style={{ textAlign: 'center', paddingTop: 120 }}>
        <style suppressHydrationWarning>{CSS}</style>
        <p style={{ color: 'var(--text-muted)' }}>No recordId provided. Open this from the Deal Sheet.</p>
      </div>
    );
  }

  // ---- RENDER — matching existing form layout --------------------------------
  return (
    <div className="eoi-page">
      <style suppressHydrationWarning>{CSS}</style>

      {/* Toolbar */}
      <div className="toolbar">
        <span className="toolbar-title">Expression of Interest</span>
        <div className="toolbar-group">
          <label style={{ fontSize: 12, color: '#ccc' }}>State<span style={{ display: 'block', fontSize: 9, color: '#999', fontStyle: 'italic' }}>CO &rarr; state</span></label>
          <select value={state} onChange={(e) => setState(e.target.value as AuState)} style={{ background: '#fff3cd' }}>
            {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="toolbar-group">
          <label style={{ fontSize: 12, color: '#ccc' }}>Type<span style={{ display: 'block', fontSize: 9, color: '#999', fontStyle: 'italic' }}>CO &rarr; property_type</span></label>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)} style={{ background: '#fff3cd' }}>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="toolbar-group" style={{ borderRight: 'none', gap: 8 }}>
          <button className="primary" onClick={handleSend} disabled={sending || !agentEmail}>
            {sending ? 'Sending...' : sendType === 'increase' ? 'Send Increased Offer' : sendType === 'revision' ? 'Send Revised EOI' : 'Send EOI'}
          </button>
          <button onClick={() => window.close()} style={{ background: '#666', color: '#fff', border: '1px solid #555' }}>
            Close
          </button>
        </div>
      </div>

      {/* Contact note */}
      {contactNote && <div className="contact-note">{contactNote}</div>}

      {/* Send result */}
      {sendResult && (
        <div className={`send-result ${sendResult.ok ? 'send-ok' : 'send-fail'}`}>
          {sendResult.ok ? (
            <>{sendResult.deliveryStatus === 'sent' ? 'Success! The EOI has been sent.' : sendResult.deliveryStatus === 'no_credentials' ? 'EOI recorded but email credentials are not configured.' : `EOI recorded. Delivery: ${sendResult.deliveryStatus}`}</>
          ) : (
            <>{sendResult.error || 'Send failed'}</>
          )}
        </div>
      )}

      {/* Recipient bar */}
      <div className="recipient-bar">
        <div className="recipient-row">
          <label>Agent Email: <span className="source-label" style={{ color: '#8a7300' }}>CO &rarr; agent_email</span></label>
          <input value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="agent@agency.com.au" style={{ fontWeight: 600, fontSize: 14 }} />
        </div>
        <div className="recipient-row" style={{ marginTop: 6 }}>
          <label>Agent Name: <span className="source-label" style={{ color: '#8a7300' }}>CO &rarr; agent_name</span></label>
          <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name" />
        </div>
        <div className="recipient-row" style={{ marginTop: 6 }}>
          <label>Agent Phone: <span className="source-label" style={{ color: '#8a7300' }}>CO &rarr; agent_mobile</span></label>
          <input value={agentPhone} onChange={(e) => setAgentPhone(handleMobileInput(e.target.value))}
            onBlur={(e) => setAgentPhone(normalizeMobileForStorage(e.target.value))}
            placeholder="0450 581 822" />
        </div>
        <div className="recipient-meta">
          <strong>From:</strong>
          <span>property@buyersclub.com.au</span>
          <span style={{ color: '#999' }}>·</span>
          <strong>CC:</strong>
          <span>property@buyersclub.com.au</span>
          <span style={{ color: '#999' }}>·</span>
          <span>{consultantName || 'Assigned BA'}{consultantEmail ? ` (${consultantEmail})` : ''} <span className="source-label" style={{ display: 'inline', color: '#8a7300' }}>(Opp &rarr; Prop Team Info New)</span></span>
        </div>
      </div>

      {/* EOI Sheet */}
      <div className="eoi-sheet" ref={sheetRef}>
        <div className="eoi-header">
          <h1>Expression of Interest</h1>
          <div className="badges">
            <span className="state-badge">{state}</span>
            <span className="type-badge">{TYPE_LABELS[propertyType]}</span>
          </div>
        </div>

        <table className="eoi">
          <tbody>
            {/* PROPERTY */}
            <tr><td colSpan={4} className="section-head" style={{ position: 'relative' }}>PROPERTY
              <div className="side-note" style={{ top: 0 }}>
                <strong>Source:</strong> CO / Deal Sheet<br />
                <strong>Notes:</strong> Template Admin<br />
                <strong>On send:</strong> Does not write back
              </div>
            </td></tr>
            <tr>
              <td className="label-dark">Property Address<span className="source-label">CO &rarr; property_address</span></td>
              <td colSpan={3} className="value-edit fill-writeback">
                <input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} placeholder="e.g. 12 Smith Street, Richmond VIC 3121" />
              </td>
            </tr>
            <tr>
              <td className="label-light" style={{ verticalAlign: 'top' }}>Notes<span className="source-label">EOI Template Admin</span></td>
              <td colSpan={3} className="fill-prompt" style={{ verticalAlign: 'top' }}>
                <textarea ref={notesRef} data-field="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ overflow: 'hidden' }} />
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ padding: '6px 10px', fontSize: 13, color: '#b91c1c', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                Please do not send the contract directly to the purchaser
              </td>
            </tr>

            {/* TERMS */}
            <tr><td colSpan={4} className="section-head" style={{ position: 'relative' }}>TERMS
              <div className="side-note" style={{ top: 0 }}>
                <strong>Source:</strong> Template Admin<br />
                <strong>Price/LVR:</strong> Manual entry<br />
                <strong>On send:</strong> Offer price &amp; status write to CO
              </div>
            </td></tr>

            {/* Price */}
            {isHL ? (
              <>
                <tr>
                  <td className="label-light" rowSpan={3}>Price<span className="source-label">CO &rarr; land/build_price</span></td>
                  <td colSpan={3} className="value-light" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-light)' }}>Land Price:</td>
                      <td className="fill-writeback"><input value={landPrice ? currencyFormat(landPrice) : ''} onChange={(e) => setLandPrice(currencyRaw(e.target.value))} placeholder="$" /></td>
                    </tr></tbody></table>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="value-light" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-light)' }}>Build Price:</td>
                      <td className="fill-writeback"><input value={buildPrice ? currencyFormat(buildPrice) : ''} onChange={(e) => setBuildPrice(currencyRaw(e.target.value))} placeholder="$" /></td>
                    </tr></tbody></table>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="value-light" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-light)', fontWeight: 700 }}>Total Price:</td>
                      <td className="fill-calculated" style={{ fontWeight: 700 }}>{totalPrice ? currencyFormat(totalPrice) : ''}<span className="source-label">Calculated</span></td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="label-light">Price<span className="source-label">Manual entry</span></td>
                <td colSpan={3} className="fill-manual">
                  <input value={offerPrice ? currencyFormat(offerPrice) : ''} onChange={(e) => setOfferPrice(currencyRaw(e.target.value))} placeholder="$" />
                </td>
              </tr>
            )}

            {/* Deposit */}
            {isHL ? (
              <>
                <tr>
                  <td className="label-dark" rowSpan={2}>Deposit<span className="source-label">Manual (mandatory)</span></td>
                  <td colSpan={3} className="value-dark" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-dark)' }}>Land Amount:</td>
                      <td className="fill-manual"><input value={editLandDeposit ? currencyFormat(editLandDeposit) : ''} onChange={(e) => setEditLandDeposit(currencyRaw(e.target.value))} placeholder="$ (required)" /></td>
                    </tr></tbody></table>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="value-light" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-light)' }}>Build Amount:</td>
                      <td className="fill-manual"><input value={editBuildDeposit ? currencyFormat(editBuildDeposit) : ''} onChange={(e) => setEditBuildDeposit(currencyRaw(e.target.value))} placeholder="$ (required)" /></td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td className="label-dark" rowSpan={2}>Deposit</td>
                  <td colSpan={3} className="value-dark" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-dark)' }}>Amount:<span className="source-label">EOI Template Admin</span></td>
                      <td className="fill-prompt"><input value={editDepositAmount} onChange={(e) => setEditDepositAmount(e.target.value)} placeholder="Deposit amount" /></td>
                    </tr></tbody></table>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="value-light" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td className="sub-label" style={{ background: 'var(--row-light)' }}>Payable:<span className="source-label">EOI Template Admin</span></td>
                      <td className="fill-prompt"><input value={editDepositPayable} onChange={(e) => setEditDepositPayable(e.target.value)} placeholder="Payable terms" /></td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </>
            )}

            <tr>
              <td className="label-dark">Finance<span className="source-label">EOI Template Admin</span></td>
              <td colSpan={3} className="fill-prompt"><input value={editFinance} onChange={(e) => setEditFinance(e.target.value)} placeholder="Finance terms" /></td>
            </tr>

            {isEstablished ? (
              <tr>
                <td className="label-light">Building &amp; Pest<span className="source-label">EOI Template Admin</span></td>
                <td colSpan={3} className="fill-prompt"><input value={editBuildingPest} onChange={(e) => setEditBuildingPest(e.target.value)} placeholder="B&P terms" /></td>
              </tr>
            ) : (
              <tr>
                <td className="label-light">PCI<span className="source-label">EOI Template Admin</span></td>
                <td colSpan={3} className="fill-prompt"><input value={editPci} onChange={(e) => setEditPci(e.target.value)} placeholder="PCI terms" /></td>
              </tr>
            )}

            {isHL && (
              <tr>
                <td className="label-dark">Commission<span className="source-label">Manual entry</span></td>
                <td colSpan={3} className="fill-manual"><input value={editCommission} onChange={(e) => setEditCommission(e.target.value)} placeholder="Commission (required)" /></td>
              </tr>
            )}

            <tr>
              <td className="label-dark" style={{ verticalAlign: 'top' }}>Special Conditions<span className="source-label">EOI Template Admin</span></td>
              <td colSpan={3} className="fill-prompt" style={{ verticalAlign: 'top', paddingTop: 8, paddingBottom: 8 }}>
                <textarea
                  ref={conditionsRef}
                  data-field="conditions"
                  value={editConditions}
                  onChange={(e) => setEditConditions(e.target.value)}
                  rows={3}
                  placeholder="One condition per line"
                  style={{ overflow: 'hidden' }}
                />
              </td>
            </tr>

            <tr>
              <td className="label-light">Settlement<span className="source-label">EOI Template Admin</span></td>
              <td colSpan={3} className="fill-prompt"><input value={editSettlement} onChange={(e) => setEditSettlement(e.target.value)} placeholder="Settlement terms" /></td>
            </tr>

            {/* PURCHASER/S */}
            <tr><td colSpan={4} className="section-head" style={{ position: 'relative' }}>PURCHASER/S
              <div className="side-note" style={{ top: 0 }}>
                <strong>Source:</strong> Opp Contact / Details<br />
                <strong>On send:</strong> P1 address, P2 details write back to Opp
              </div>
            </td></tr>
            <tr>
              <td className="label-light">Contract Entity<span className="source-label">Opp &rarr; Prop Team Info New</span></td>
              <td colSpan={3} className="fill-writeback">
                <input value={contractEntity} onChange={(e) => setContractEntity(e.target.value)} placeholder="e.g. The Smith Family Trust / John Smith Pty Ltd ATF Smith SMSF" />
              </td>
            </tr>
            {/* Purchasers in pairs of 2 per row */}
            {Array.from({ length: Math.ceil(purchasers.length / 2) }, (_, rowIdx) => {
              const pair = purchasers.slice(rowIdx * 2, rowIdx * 2 + 2);
              return (
                <React.Fragment key={rowIdx}>
                  {/* Purchaser header row */}
                  <tr>
                    <td className="label-dark"></td>
                    <td colSpan={3} style={{ padding: 0 }}>
                      <table data-purchaser-table="true" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}><tbody><tr>
                        {pair.map((_, i) => {
                          const pi = rowIdx * 2 + i;
                          return (
                            <td key={pi} className="purchaser-head" style={{ width: pair.length === 1 ? '100%' : '50%' }}>
                              Purchaser {pi + 1}
                              {purchasers.length > 1 && (
                                <button onClick={() => removePurchaser(pi)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 11 }} title="Remove">x</button>
                              )}
                            </td>
                          );
                        })}
                      </tr></tbody></table>
                    </td>
                  </tr>
                  {/* Purchaser data rows */}
                  {(['Name', 'Email', 'Phone', 'Address'] as const).map((label, li) => {
                    const field = label.toLowerCase() as keyof Purchaser;
                    const isDark = li % 2 === 0;
                    return (
                      <tr key={`row${rowIdx}-${label}`}>
                        <td className={isDark ? 'label-light' : 'label-dark'}>{label}<span className="source-label">{
                          label === 'Address' ? 'Opp \u2192 Opp Details' : (rowIdx === 0 ? 'Opp \u2192 contact' : 'Opp \u2192 Opp Details')
                        }</span></td>
                        <td colSpan={3} style={{ padding: 0 }}>
                          <table data-purchaser-table="true" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}><tbody><tr>
                            {pair.map((p, i) => {
                              const pi = rowIdx * 2 + i;
                              return (
                                <td key={pi} className="fill-writeback" style={{ width: pair.length === 1 ? '100%' : '50%', padding: '6px 10px' }}>
                                  <input value={p[field]} onChange={(e) => updatePurchaser(pi, field, e.target.value)}
                                    placeholder={label === 'Name' ? 'Full name' : label === 'Email' ? 'email@example.com' : label === 'Phone' ? '04XX XXX XXX' : 'Postal address'} />
                                </td>
                              );
                            })}
                          </tr></tbody></table>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {purchasers.length < 6 && (
              <tr>
                <td className="label-light"></td>
                <td colSpan={3} style={{ background: 'var(--row-light)', textAlign: 'center' }}>
                  <button onClick={addPurchaser} style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: 4, padding: '4px 12px', fontSize: 12, cursor: 'pointer', color: 'var(--text-soft)' }}>
                    + Add purchaser
                  </button>
                </td>
              </tr>
            )}

            {/* LEGALS */}
            <tr><td colSpan={4} className="section-head" style={{ position: 'relative' }}>LEGALS
              <div className="side-note" style={{ top: 0 }}>
                <strong>Source:</strong> Prop Team Info New / Opp<br />
                <strong>On send:</strong> Writes back to Opp
              </div>
            </td></tr>
            <tr>
              <td className="label-dark">Company<span className="source-label">Opp &rarr; Prop Team Info New</span></td>
              <td colSpan={3} className="fill-writeback"><input value={solicitorCompany} onChange={(e) => setSolicitorCompany(e.target.value)} placeholder="Solicitor / conveyancer company" /></td>
            </tr>
            <tr>
              <td className="label-light">Contact<span className="source-label">Opp &rarr; Prop Team Info New</span></td>
              <td colSpan={3} className="fill-writeback"><input value={solicitorName} onChange={(e) => setSolicitorName(e.target.value)} placeholder="Contact name" /></td>
            </tr>
            <tr>
              <td className="label-dark">Phone<span className="source-label">Opp &rarr; Prop Team Info New</span></td>
              <td colSpan={3} className="fill-writeback"><input value={solicitorPhone} onChange={(e) => setSolicitorPhone(e.target.value)} /></td>
            </tr>
            <tr>
              <td className="label-light">Email<span className="source-label">Opp &rarr; Prop Team Info New</span></td>
              <td colSpan={3} className="fill-writeback"><input value={solicitorEmail} onChange={(e) => setSolicitorEmail(e.target.value)} /></td>
            </tr>

            {/* FINANCE */}
            <tr><td colSpan={4} className="section-head" style={{ position: 'relative' }}>FINANCE
              <div className="side-note" style={{ top: 0 }}>
                <strong>Source:</strong> Isobel Team Info / Opp<br />
                <strong>On send:</strong> Writes back to Opp
              </div>
            </td></tr>
            <tr>
              <td className="label-dark">Company<span className="source-label">Opp &rarr; Isobel Team Info</span></td>
              <td colSpan={3} className="fill-writeback"><input value={brokerCompany} onChange={(e) => setBrokerCompany(e.target.value)} placeholder="Broker company" /></td>
            </tr>
            <tr>
              <td className="label-light">Contact<span className="source-label">Opp &rarr; Isobel Team Info</span></td>
              <td colSpan={3} className="fill-writeback"><input value={brokerName} onChange={(e) => setBrokerName(e.target.value)} placeholder="Broker name" /></td>
            </tr>
            <tr>
              <td className="label-dark">Phone<span className="source-label">Opp &rarr; Isobel Team Info</span></td>
              <td colSpan={3} className="fill-writeback"><input value={brokerPhone} onChange={(e) => setBrokerPhone(e.target.value)} /></td>
            </tr>
            <tr>
              <td className="label-light">Email<span className="source-label">Opp &rarr; Isobel Team Info</span></td>
              <td colSpan={3} className="fill-writeback"><input value={brokerEmail} onChange={(e) => setBrokerEmail(e.target.value)} /></td>
            </tr>
            <tr>
              <td className="label-dark">LVR<span className="source-label">Manual entry</span></td>
              <td colSpan={3} className="fill-manual"><input value={lvr} onChange={(e) => setLvr(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="e.g. 80" style={{ width: 50, display: 'inline-block' }} />{lvr && <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>%</span>}</td>
            </tr>
          </tbody>
        </table>
      </div>

      

      {/* Submitted by / consultant */}
      <div style={{ maxWidth: 920, margin: '0 auto', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Assigned BA:</span>
          <input value={consultantName} onChange={(e) => setConsultantName(e.target.value)} placeholder="BA / Consultant name"
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: 200, background: '#fff3cd' }} />
          <span className="source-label" style={{ display: 'inline' }}>Opp &rarr; Prop Team Info New</span>
          <span style={{ marginLeft: 'auto' }}>Logged in as: {authEmail}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="legend">
        <div className="legend-title">Field Colour Legend</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: '#d4edda' }}></div>
            <span>EOI Template Admin — editable, does not write back</span>
          </div>
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: '#fff3cd' }}></div>
            <span>Prefilled from GHL (CO/Opp) — editable, writes back on send</span>
          </div>
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: '#ffffff' }}></div>
            <span>Manual entry — user completes before sending</span>
          </div>
          <div className="legend-item">
            <div className="legend-swatch" style={{ background: '#e9ecef' }}></div>
            <span>Calculated — derived from other fields (read-only)</span>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
          On send: offer status/price write to CO. Purchaser address, partner, solicitor &amp; broker details write back to the Opportunity.
          CO = Custom Object · Opp = Opportunity
        </div>
      </div>

      {/* Live Email Preview — renders using the SAME function that generates the sent email */}
      <div style={{ maxWidth: 1080, margin: '24px auto 0', position: 'relative' }}>
        <div style={{ background: '#f0f0f0', padding: '1px 10px', fontSize: 9, letterSpacing: 1.5, color: '#999', fontWeight: 600, borderRadius: 2, display: 'inline-block', marginBottom: -10, position: 'relative', zIndex: 1 }}>
          EMAIL PREVIEW — what the agent will receive
        </div>
        <div
          style={{ border: '1.5px dashed #c0c0c0', background: '#f0f0f0', padding: 20 }}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      {/* Send History */}
      {history.length > 0 && (
        <div className="history-panel">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--charcoal-dark)' }}>Send History</h3>
          {history.map((h) => (
            <div key={h.id} className="history-item">
              <div>
                <strong style={{ textTransform: 'capitalize' }}>{h.send_type}</strong>
                {h.offer_price ? ` — $${Number(h.offer_price).toLocaleString('en-AU')}` : ''}
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{h.agent_email}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: h.delivery_status === 'sent' ? 'var(--green)' : h.delivery_status === 'failed' ? 'var(--red)' : 'var(--text-muted)' }}>
                  {h.delivery_status}
                </span>
                <br />
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {new Date(h.sent_at).toLocaleString('en-AU')} · {h.sent_by}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
