'use client';

// ============================================================================
// EOI COMPOSER — preview-first rebuild (V2)
//
// Two-panel layout:
//   Left  — colour-coded edit form (table layout, "i" info toggles)
//   Right — live email preview in an iframe (server-rendered, WYSIWYG)
//
// The preview endpoint and the send route both call renderEoiEmailHtml()
// from eoi-email.ts. One function, one rendering path, zero drift.
//
// Loaded from /eoi/compose?recordId=xxx&address=...&type=...  (Deal Sheet)
// Prefills from URL params (instant) + linked opportunity contact (GHL lookup).
// Pulls terms from the DB (WP1 template admin values).
// Sends via /api/eoi/send (Gmail API).
// Records durable history in eoi_sends.
// ============================================================================

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail } from '@/lib/userAuth';
import { handleMobileInput, normalizeMobileForStorage } from '@/lib/phoneFormatter';
import type { EoiEmailData } from '@/lib/eoi-email';

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
  event_type: string;
  opportunity_name: string;
  property_address: string;
  offer_price: string;
  offer_price_land: string;
  offer_price_build: string;
  offer_status_at_event: string;
  agent_email: string;
  client_name: string;
  assigned_ba: string;
  close_date: string;
  sent_by: string;
  sent_at: string;
  delivery_status: string;
  method: string;
  initiated_by: string;
  delink_reason: string;
  changes: { field: string; label: string; from: string; to: string }[] | null;
  notes: string;
}

// ---- attachment types -------------------------------------------------------

type AttachmentType = 'ID' | 'Deposit Receipt' | 'Finance Comfort Letter' | 'Upgrade List' | 'Other';
const ATTACHMENT_TYPES: AttachmentType[] = ['ID', 'Deposit Receipt', 'Finance Comfort Letter', 'Upgrade List', 'Other'];

interface Attachment {
  file: File;
  base64: string;
  mimeType: string;
  type: AttachmentType;
  forLabel: string;
  autoName: string;
}

/** Build auto-name for an attachment: "{type} - {forLabel}.{ext}" */
function buildAutoName(type: AttachmentType, forLabel: string, fileName: string): string {
  const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
  if (type === 'Finance Comfort Letter' || type === 'Upgrade List' || !forLabel.trim()) return `${type}${ext}`;
  return `${type} - ${forLabel}${ext}`;
}

/** Read a File as base64 (strips the data URI prefix) */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Human-readable file size */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_TOTAL_ATTACHMENT_SIZE = 18 * 1024 * 1024; // 18MB — Gmail 25MB minus base64 overhead

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

/** Strip to numeric only — used for deposit and LVR fields (single numbers). */
function numericOnly(v: string): string { return (v || '').replace(/[^0-9.]/g, ''); }

/**
 * B1 fix: Format a value for currency display.
 * If parseable as a single number, format with $ and thousand separators.
 * If not (e.g. a range like "$890,000 – $920,000"), return as-is.
 */
function currencyFormat(v: string): string {
  if (!v) return '';
  const cleaned = v.replace(/[$,\s]/g, '').trim();
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    const n = parseFloat(cleaned);
    return '$' + n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return v; // Not a single number — display as-is
}

function emptyPurchaser(): Purchaser { return { name: '', email: '', phone: '', address: '' }; }

/** T1: Auto-grow textarea to fit content */
function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
  const ta = e.currentTarget;
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}

// ---- colour-coding ----------------------------------------------------------

type FieldColour = 'green' | 'grey' | 'yellow';
const BG: Record<FieldColour, string> = {
  green: '#e8f5e9',
  grey: '#f5f5f5',
  yellow: '#fff8e1',
};

// ---- field info data (for "i" panels) ----------------------------------------

const FIELD_INFO: Record<string, string[]> = {
  propertyAddress: ['Source: Property Record (CO)', 'Field: property_address', 'Does not write back'],
  notes: ['Source: EOI Template Admin (initial value)', 'On send: Writes eoi_notes to CO'],
  speculativeMessage: ['Source: EOI Template Admin', 'Shown as banner in email when no opportunity linked', 'Does not write back'],
  price: ['Source: CO Offer Price field', 'On send: Writes offer_price + offer_status ("Offered") to CO'],
  landPrice: ['Source: CO Offer Price Land', 'On send: Writes offer_price_land to CO'],
  buildPrice: ['Source: CO Offer Price Build', 'On send: Writes offer_price_build to CO'],
  totalPrice: ['Calculated from Offer Price Land + Offer Price Build', 'Writes back to CO Offer Price on send'],
  depositAmount: ['Source: EOI Template Admin', 'Does not write back'],
  depositPayable: ['Source: EOI Template Admin', 'Does not write back'],
  landDeposit: ['Source: Manual entry (mandatory)', 'Does not write back'],
  buildDeposit: ['Source: Manual entry (mandatory)', 'Does not write back'],
  finance: ['Source: EOI Template Admin', 'Does not write back'],
  buildingPest: ['Source: EOI Template Admin', 'Does not write back'],
  pci: ['Source: EOI Template Admin', 'Does not write back'],
  commission: ['Source: Manual entry', 'Does not write back'],
  settlement: ['Source: EOI Template Admin', 'Does not write back'],
  specialConditions: ['Source: EOI Template Admin', 'Does not write back'],
  contractEntity: ['Source: Opportunity \u2192 Prop Team Info New', 'Field: Trust Name / SMSF Name', 'Does not write back'],
  p1Name: ['Source: Opportunity \u2192 Contact', 'Contact-inherited \u2014 cannot write back through the Opportunity to the Contact'],
  p1Email: ['Source: Opportunity \u2192 Contact', 'Contact-inherited \u2014 cannot write back'],
  p1Phone: ['Source: Opportunity \u2192 Contact', 'Contact-inherited \u2014 cannot write back'],
  p1Address: ['Source: Opportunity \u2192 Opportunity Details', 'Field: Postal Address', 'Writes back to Opportunity'],
  p2Name: ['Source: Opportunity \u2192 Opportunity Details', 'Field: Partner Name', 'Writes back to Opportunity'],
  p2Email: ['Source: Opportunity \u2192 Opportunity Details', 'Field: Partner Email', 'Writes back to Opportunity'],
  p2Phone: ['Source: Opportunity \u2192 Opportunity Details', 'Field: Partner Phone', 'Writes back to Opportunity'],
  p2Address: ['Source: Opportunity \u2192 Opportunity Details', 'Field: Partner Address', 'Writes back to Opportunity'],
  p3Plus: ['No GHL fields for additional purchasers', 'Does not write back'],
  solicitor: ['Source: Opportunity \u2192 Prop Team Info New', 'Fields: Solicitor Company / Name / Phone / Email', 'On send: Writes back to Opportunity'],
  broker: ['Source: Opportunity \u2192 Isobel Team Info', 'Fields: Broker Company / Name / Phone / Email', 'On send: Writes back to Opportunity'],
  lvr: ['Source: Manual entry', 'Does not write back'],
  agentGroup: ['Source: Property Record (CO) \u2192 agent_email / agent_name / agent_mobile', 'On send: Writes back to CO'],
};

// ---- form inline styles -----------------------------------------------------

const formSectionSty: React.CSSProperties = {
  background: '#4D4D4D', color: '#FBD721', textAlign: 'center', fontWeight: 600,
  letterSpacing: 1, padding: '8px 10px', fontSize: '13px',
  fontFamily: '"Calibri Light","Calibri","Segoe UI",Arial,sans-serif',
};

const formLabelSty: React.CSSProperties = {
  width: 160, padding: '6px 10px', fontWeight: 700, fontSize: '13px',
  verticalAlign: 'top', borderBottom: '1px solid #ddd', textAlign: 'right',
  color: '#2A2A2A',
};

const formValueSty: React.CSSProperties = {
  padding: '6px 10px', fontSize: '13px', verticalAlign: 'top',
  borderBottom: '1px solid #ddd',
};

// ---- CSS vars ---------------------------------------------------------------

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
  max-width: 1400px; margin: 0 auto 18px; background: var(--charcoal-dark); color: #fff;
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
.recipient-bar { background: var(--yellow); border: 1px solid var(--yellow); padding: 12px 14px; margin-bottom: 18px; font-size: 13px; max-width: 1400px; margin: 0 auto 18px; }
.recipient-row { display: flex; gap: 14px; align-items: center; }
.recipient-bar label { font-weight: 700; color: var(--charcoal-dark); white-space: nowrap; }
.recipient-bar input { flex: 1; border: 1px solid #c4a800; padding: 6px 10px; font-family: inherit; font-size: 13px; border-radius: 3px; background: #fff; }
.recipient-meta { margin-top: 8px; padding-top: 8px; border-top: 1px dashed #d4b800; font-size: 12px; color: var(--charcoal-dark); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.history-panel { max-width: 1400px; margin: 18px auto 0; background: #fff; padding: 18px 24px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.history-item { border-bottom: 1px solid #eee; padding: 8px 0; font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
.history-item:last-child { border-bottom: none; }
.send-result { max-width: 1400px; margin: 0 auto 12px; padding: 12px 18px; border-radius: 6px; font-size: 13px; }
.send-ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
.send-fail { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
.contact-note { max-width: 1400px; margin: 0 auto 12px; background: #e8f4fd; border: 1px solid #bee5eb; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #0c5460; }
.source-label { display: block; font-size: 9.5px; color: #999; font-weight: 400; font-style: italic; margin-top: 1px; letter-spacing: 0.2px; }

/* Two-panel layout */
.eoi-panels { display: flex; gap: 24px; max-width: 1400px; margin: 0 auto; }
.eoi-form-panel { flex: 1 1 50%; min-width: 0; }
.eoi-preview-panel { flex: 1 1 50%; min-width: 0; }
@media (max-width: 1200px) {
  .eoi-panels { flex-direction: column; }
  .eoi-preview-panel { }
}

/* Form table */
.eoi-form-table { width: 100%; border-collapse: collapse; border: 1px solid #ccc; background: #fff; }
.eoi-form-input {
  width: 100%; border: 1px solid #ddd; border-radius: 3px; padding: 4px 8px;
  font-size: 13px; font-family: inherit; background: #fff;
}
.eoi-form-input:focus { outline: none; border-color: var(--yellow); box-shadow: 0 0 0 2px rgba(251,215,33,0.3); }
.eoi-form-textarea {
  width: 100%; border: 1px solid #ddd; border-radius: 3px; padding: 4px 8px;
  font-size: 13px; font-family: inherit; background: #fff; overflow: hidden; resize: none;
}
.eoi-form-textarea:focus { outline: none; border-color: var(--yellow); box-shadow: 0 0 0 2px rgba(251,215,33,0.3); }

/* Info button & panel */
.eoi-info-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border-radius: 50%; border: 1px solid #999;
  background: #fff; color: #666; font-size: 10px; font-weight: 600;
  cursor: pointer; margin-left: 6px; vertical-align: middle;
  line-height: 1; padding: 0;
}
.eoi-info-btn:hover { background: #e0e0e0; }
.eoi-info-panel {
  background: #f0f4ff; padding: 8px 12px 8px 172px; font-size: 11px;
  color: #444; border-bottom: 1px solid #ddd; line-height: 1.6;
}

/* Colour legend */
.legend { max-width: 1400px; margin: 0 auto 12px; background: #fff; padding: 10px 16px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); font-size: 12px; }
.legend-items { display: flex; flex-wrap: wrap; gap: 16px; }
.legend-item { display: flex; align-items: center; gap: 6px; }
.legend-swatch { width: 16px; height: 16px; border: 1px solid #ccc; border-radius: 2px; }

`;

// ---- component --------------------------------------------------------------

export default function EoiComposePage() {
  // Auth
  const [userEmail, setUserEmail] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [sendAsEmail, setSendAsEmail] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ name: string; email: string }[]>([]);
  const [globalCcList, setGlobalCcList] = useState<string[]>([]);
  const [ccPropertyOn, setCcPropertyOn] = useState(true);
  const [ccBaOn, setCcBaOn] = useState(true);
  const [manualCc, setManualCc] = useState('');

  // Record params (from URL — instant, no fetch needed)
  const [recordId, setRecordId] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [oppId, setOppId] = useState('');
  const [oppName, setOppName] = useState('');
  // D38: view-history-only mode
  const [viewHistoryMode, setViewHistoryMode] = useState(false);
  const [viewContractType, setViewContractType] = useState('');
  const [viewAcceptAcqTotal, setViewAcceptAcqTotal] = useState('');
  const [viewPackager, setViewPackager] = useState('');
  const [viewSourcer, setViewSourcer] = useState('');

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
  const [editConditions, setEditConditions] = useState<string[]>([]);
  const [newConditionText, setNewConditionText] = useState('');

  // Send state
  const [sendType, setSendType] = useState<'initial' | 'increase' | 'revision' | 'resend'>('initial');
  const isResend = sendType === 'resend';
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; sendId?: number; deliveryStatus?: string; error?: string } | null>(null);

  // History
  const [history, setHistory] = useState<SendHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Speculative message
  const [speculativeMessage, setSpeculativeMessage] = useState('');

  // Contact loading note
  const [contactNote, setContactNote] = useState('');

  // D28-PRE: load-from-history state
  const [loadFrom, setLoadFrom] = useState('');
  const [loadedFromHistory, setLoadedFromHistory] = useState(false);
  const [lastSendDate, setLastSendDate] = useState('');
  const [historyFallback, setHistoryFallback] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previousPayload, setPreviousPayload] = useState<Record<string, any> | null>(null);

  // Preview
  const [previewHtml, setPreviewHtml] = useState('');

  // Attachments (T7)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingType, setPendingType] = useState<AttachmentType>('ID');
  const [pendingFor, setPendingFor] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Info panel toggle
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  const toggleInfo = useCallback((id: string) => {
    setOpenInfo(prev => prev === id ? null : id);
  }, []);

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

  // ---- initialise sendAs + fetch team members --------------------------------
  useEffect(() => {
    if (!authEmail) return;
    setSendAsEmail(authEmail);
    fetch('/api/bas')
      .then(r => r.ok ? r.json() : { bas: [] })
      .then(d => setTeamMembers(d.bas || []))
      .catch(() => {});
    fetch(`/api/eoi/templates?state=GLB&type=all&_t=${Date.now()}`)
      .then(r => r.ok ? r.json() : { values: {} })
      .then(d => {
        const raw = d.values?.cc_list || '';
        setGlobalCcList(raw.split(',').map((e: string) => e.trim()).filter((e: string) => e.includes('@')));
        setCcPropertyOn(d.values?.cc_include_property !== 'false');
        setCcBaOn(d.values?.cc_include_ba !== 'false');
      })
      .catch(() => {});
  }, [authEmail]);

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

    // B1 fix: store price as-is (don't strip non-numeric chars from ranges)
    setOfferPrice(p.get('price') || '');
    setLandPrice(p.get('landPrice') || '');
    setBuildPrice(p.get('buildPrice') || '');

    // Agent from CO
    setAgentName(p.get('agentName') || '');
    setAgentEmail(p.get('agentEmail') || '');
    setAgentPhone(p.get('agentMobile') || '');

    setConsultantName(p.get('ba') || '');
    setOppId(p.get('oppId') || '');

    const client = p.get('client') || '';
    setOppName(client);
    if (client && client !== 'SPECULATIVE EOI') {
      setPurchasers([{ ...emptyPurchaser(), name: client }, emptyPurchaser()]);
    }

    const st = p.get('sendType');
    if (st === 'increase' || st === 'revision' || st === 'resend') setSendType(st);

    // D28-PRE: flag for loading from last send
    const lf = p.get('loadFrom');
    if (lf) setLoadFrom(lf);

    // D38: view-history-only mode
    if (p.get('viewHistory') === 'true') {
      setViewHistoryMode(true);
      setViewContractType(p.get('contractType') || '');
      setViewAcceptAcqTotal(p.get('acceptAcqTotal') || '');
      setViewPackager(p.get('packager') || '');
      setViewSourcer(p.get('sourcer') || '');
      // Use property param as address if address not set
      if (!addr && p.get('property')) setPropertyAddress(p.get('property') || '');
    }
  }, []);

  // ---- load linked opportunity contact + solicitor + broker -----------------
  useEffect(() => {
    // D28-PRE: skip opp contact fetch when loading full last send — payload has everything
    // lastSendTermsOnly does NOT skip — we need fresh contact data from the new opp
    if (loadFrom === 'lastSend') return;
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

  useEffect(() => { if (authEmail && loadFrom !== 'lastSend' && loadFrom !== 'lastSendTermsOnly') fetchTerms(); }, [fetchTerms, authEmail, loadFrom]);

  // Initialise editable copies when terms/conditions load from DB
  // (skipped when loaded from history — payload populates these instead)
  useEffect(() => {
    if (loadedFromHistory) return;
    setEditDepositAmount(terms.deposit_amount || '');
    setEditDepositPayable(terms.deposit_payable || '');
    setEditLandDeposit(terms.land_deposit || '');
    setEditBuildDeposit(terms.build_deposit || '');
    setEditFinance(terms.finance || '');
    setEditBuildingPest(terms.building_pest || '');
    setEditPci(terms.pci || '');
    setEditCommission(terms.commission || '');
    setEditSettlement(terms.settlement || '');
    setEditConditions(conditions.map(c => c.replace(/^[\s]*[-\u2013\u2014\u2022]\s*/, '').trim()).filter(Boolean));
    setNotes(terms.notes || '');
    setSpeculativeMessage(terms.speculative_message || '');
  }, [terms, conditions, loadedFromHistory]);

  // ---- D28-PRE: load from last sent EOI ------------------------------------
  useEffect(() => {
    if (loadFrom !== 'lastSend' || !recordId || !authEmail) return;
    (async () => {
      try {
        const res = await fetch(`/api/eoi/last-send?recordId=${encodeURIComponent(recordId)}&_t=${Date.now()}`);
        if (!res.ok) {
          // No previous send — fall back to Template Admin
          setHistoryFallback(true);
          setLoadFrom(''); // allow fetchTerms to run
          return;
        }
        const data = await res.json();
        const p = data.payload;
        if (!p) { setHistoryFallback(true); setLoadFrom(''); return; }

        // Populate all fields from the payload
        // Terms / conditions
        setEditDepositAmount(p.depositAmount || '');
        setEditDepositPayable(p.depositPayable || '');
        setEditLandDeposit(p.landDeposit || '');
        setEditBuildDeposit(p.buildDeposit || '');
        setEditFinance(p.finance || '');
        setEditBuildingPest(p.buildingPest || '');
        setEditPci(p.pci || '');
        setEditCommission(p.commission || '');
        setEditSettlement(p.settlement || '');
        setEditConditions(Array.isArray(p.specialConditions)
          ? p.specialConditions.map((c: string) => c.replace(/^[\s]*[-\u2013\u2014\u2022]\s*/, '').trim()).filter(Boolean)
          : []);
        setNotes(p.notes || '');
        setSpeculativeMessage(p.speculativeMessage || '');

        // Contract entity
        if (p.contractEntity) setContractEntity(p.contractEntity);

        // Purchasers
        if (Array.isArray(p.purchasers) && p.purchasers.length > 0) {
          setPurchasers(p.purchasers.map((pu: { name?: string; email?: string; phone?: string; address?: string }) => ({
            name: pu.name || '',
            email: pu.email || '',
            phone: pu.phone || '',
            address: pu.address || '',
          })));
        }

        // Agent
        if (p.agentName) setAgentName(p.agentName);
        if (p.agentEmail) setAgentEmail(p.agentEmail);
        if (p.agentPhone) setAgentPhone(p.agentPhone);
        if (p.agencyName) setAgencyName(p.agencyName);

        // Solicitor
        if (p.solicitorName) setSolicitorName(p.solicitorName);
        if (p.solicitorCompany) setSolicitorCompany(p.solicitorCompany);
        if (p.solicitorEmail) setSolicitorEmail(p.solicitorEmail);
        if (p.solicitorPhone) setSolicitorPhone(p.solicitorPhone);

        // Broker
        if (p.brokerName) setBrokerName(p.brokerName);
        if (p.brokerCompany) setBrokerCompany(p.brokerCompany);
        if (p.brokerEmail) setBrokerEmail(p.brokerEmail);
        if (p.brokerPhone) setBrokerPhone(p.brokerPhone);

        // Consultant
        if (p.consultantName) setConsultantName(p.consultantName);
        if (p.consultantEmail) setConsultantEmail(p.consultantEmail);

        // LVR
        if (p.lvr) setLvr(p.lvr);

        // Prices: for increase, URL params already set the new price — don't overwrite.
        // For revision and resend, use the payload prices.
        if (sendType !== 'increase') {
          if (p.offerPrice) setOfferPrice(p.offerPrice.replace(/[$,\s]/g, ''));
          if (p.landPrice) setLandPrice(p.landPrice.replace(/[$,\s]/g, ''));
          if (p.buildPrice) setBuildPrice(p.buildPrice.replace(/[$,\s]/g, ''));
        }

        setPreviousPayload(p);
        setLoadedFromHistory(true);
        setLastSendDate(data.sentAt ? new Date(data.sentAt).toLocaleDateString('en-AU') : '');
        setContactNote('Values loaded from the last sent EOI — contacts, terms, and conditions are from the previous send.');
      } catch {
        setHistoryFallback(true);
        setLoadFrom('');
      }
    })();
  }, [loadFrom, recordId, authEmail, sendType]);

  // ---- D32-34: load TERMS ONLY from last sent EOI (keep terms variant) ------
  // Loads terms/conditions/prices but NOT client data (purchasers, solicitor, broker, etc.)
  // The opp-fetch useEffect above handles client data from the new opportunity (if oppId present).
  useEffect(() => {
    if (loadFrom !== 'lastSendTermsOnly' || !recordId || !authEmail) return;
    (async () => {
      try {
        const res = await fetch(`/api/eoi/last-send?recordId=${encodeURIComponent(recordId)}&_t=${Date.now()}`);
        if (!res.ok) {
          // No previous send — fall back to Template Admin
          setHistoryFallback(true);
          setLoadFrom('');
          return;
        }
        const data = await res.json();
        const p = data.payload;
        if (!p) { setHistoryFallback(true); setLoadFrom(''); return; }

        // Populate TERMS fields only
        setEditDepositAmount(p.depositAmount || '');
        setEditDepositPayable(p.depositPayable || '');
        setEditLandDeposit(p.landDeposit || '');
        setEditBuildDeposit(p.buildDeposit || '');
        setEditFinance(p.finance || '');
        setEditBuildingPest(p.buildingPest || '');
        setEditPci(p.pci || '');
        setEditCommission(p.commission || '');
        setEditSettlement(p.settlement || '');
        setEditConditions(Array.isArray(p.specialConditions)
          ? p.specialConditions.map((c: string) => c.replace(/^[\s]*[-\u2013\u2014\u2022]\s*/, '').trim()).filter(Boolean)
          : []);
        setNotes(p.notes || '');
        setSpeculativeMessage(p.speculativeMessage || '');

        // Prices from payload (not URL for keep-terms)
        if (p.offerPrice) setOfferPrice(p.offerPrice.replace(/[$,\s]/g, ''));
        if (p.landPrice) setLandPrice(p.landPrice.replace(/[$,\s]/g, ''));
        if (p.buildPrice) setBuildPrice(p.buildPrice.replace(/[$,\s]/g, ''));

        // NOT populated: purchasers, contractEntity, solicitor, broker, LVR, consultant
        // Those come from the opp-fetch effect (reassign) or stay blank (speculative)

        setPreviousPayload(p);
        setLoadedFromHistory(true);
        setLastSendDate(data.sentAt ? new Date(data.sentAt).toLocaleDateString('en-AU') : '');

        // Banner text
        const clientParam = new URLSearchParams(window.location.search).get('client');
        if (clientParam) {
          setContactNote(`Terms retained from previously sent EOI (${data.sentAt ? new Date(data.sentAt).toLocaleDateString('en-AU') : 'unknown'}) — contact details from ${clientParam}.`);
        } else {
          setContactNote(`Terms retained from previously sent EOI (${data.sentAt ? new Date(data.sentAt).toLocaleDateString('en-AU') : 'unknown'}) — no client linked (speculative).`);
        }
      } catch {
        setHistoryFallback(true);
        setLoadFrom('');
      }
    })();
  }, [loadFrom, recordId, authEmail]);

  // ---- load history ---------------------------------------------------------
  useEffect(() => {
    if (!recordId || (!authEmail && !viewHistoryMode)) return;
    setHistoryLoading(true);
    fetch(`/api/eoi/history?recordId=${encodeURIComponent(recordId)}&_t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => setHistory(d.sends || []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [recordId, authEmail, viewHistoryMode, sendResult]);

  // ---- derived values -------------------------------------------------------
  const isHL = propertyType === 'hl_split';
  const isEstablished = propertyType === 'established';

  const totalPrice = useMemo(() => {
    if (!isHL) return '';
    const land = parseFloat((landPrice || '').replace(/[$,\s]/g, '')) || 0;
    const build = parseFloat((buildPrice || '').replace(/[$,\s]/g, '')) || 0;
    return land + build > 0 ? String(land + build) : '';
  }, [isHL, landPrice, buildPrice]);

  const displayOfferPrice = useMemo(() => {
    if (isHL && totalPrice) return currencyFormat(totalPrice);
    return currencyFormat(offerPrice);
  }, [isHL, totalPrice, offerPrice]);

  // ---- D-CHANGES: diff previous payload against current emailData ------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function diffPayloads(prev: Record<string, any>, curr: Record<string, any>): { field: string; label: string; from: string; to: string }[] {
    const changes: { field: string; label: string; from: string; to: string }[] = [];

    // Simple string/value fields to compare
    const fieldMap: Record<string, string> = {
      offerPrice: 'Offer Price',
      landPrice: 'Land Price',
      buildPrice: 'Build Price',
      totalPrice: 'Total Price',
      depositAmount: 'Deposit Amount',
      depositPayable: 'Deposit Payable',
      landDeposit: 'Land Deposit',
      buildDeposit: 'Build Deposit',
      finance: 'Finance',
      buildingPest: 'Building & Pest',
      pci: 'PCI',
      commission: 'Commission',
      settlement: 'Settlement',
      contractEntity: 'Contract Entity',
      notes: 'Notes',
      lvr: 'LVR',
      speculativeMessage: 'Speculative Message',
      agentName: 'Agent Name',
      agentEmail: 'Agent Email',
      agentPhone: 'Agent Phone',
      agencyName: 'Agency Name',
      solicitorName: 'Solicitor Name',
      solicitorEmail: 'Solicitor Email',
      solicitorPhone: 'Solicitor Phone',
      solicitorCompany: 'Solicitor Company',
      brokerName: 'Broker Name',
      brokerEmail: 'Broker Email',
      brokerPhone: 'Broker Phone',
      brokerCompany: 'Broker Company',
      consultantName: 'Consultant Name',
      consultantEmail: 'Consultant Email',
    };

    for (const [key, label] of Object.entries(fieldMap)) {
      const prevVal = (prev[key] ?? '').toString().trim();
      const currVal = (curr[key] ?? '').toString().trim();
      if (prevVal !== currVal) {
        changes.push({ field: key, label, from: prevVal, to: currVal });
      }
    }

    // Special conditions — array comparison
    const prevConds: string[] = Array.isArray(prev.specialConditions) ? prev.specialConditions.map((c: string) => c.trim()) : [];
    const currConds: string[] = Array.isArray(curr.specialConditions) ? curr.specialConditions.map((c: string) => c.trim()) : [];
    const addedConds = currConds.filter(c => !prevConds.includes(c));
    const removedConds = prevConds.filter(c => !currConds.includes(c));
    if (addedConds.length > 0 || removedConds.length > 0) {
      const parts: string[] = [];
      if (addedConds.length) parts.push(`${addedConds.length} added`);
      if (removedConds.length) parts.push(`${removedConds.length} removed`);
      changes.push({ field: 'specialConditions', label: 'Special Conditions', from: `${prevConds.length} conditions`, to: `${currConds.length} conditions (${parts.join(', ')})` });
    }

    // Purchasers — compare names
    const prevPurchasers: string[] = Array.isArray(prev.purchasers) ? prev.purchasers.map((p: { name?: string }) => (p.name || '').trim()) : [];
    const currPurchasers: string[] = Array.isArray(curr.purchasers) ? curr.purchasers.map((p: { name?: string }) => (p.name || '').trim()) : [];
    const prevNames = prevPurchasers.filter(Boolean).join(', ');
    const currNames = currPurchasers.filter(Boolean).join(', ');
    if (prevNames !== currNames) {
      changes.push({ field: 'purchasers', label: 'Purchasers', from: prevNames || '(none)', to: currNames || '(none)' });
    }

    return changes;
  }

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
      specialConditions: editConditions.filter(l => l.trim()),
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
      speculativeMessage: !oppId ? speculativeMessage : undefined,
      senderEmail: sendAsEmail || authEmail,
    };
  }

  // ---- preview refresh (debounced) ------------------------------------------
  useEffect(() => {
    if (!authEmail || !recordId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const ed = buildEmailData();
        const res = await fetch('/api/eoi/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailData: ed }),
          signal: controller.signal,
        });
        if (res.ok) setPreviewHtml(await res.text());
      } catch { /* aborted or network error */ }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    propertyAddress, offerPrice, landPrice, buildPrice, state, propertyType,
    purchasers, contractEntity, editDepositAmount, editDepositPayable,
    editLandDeposit, editBuildDeposit, editFinance, editBuildingPest,
    editPci, editCommission, editSettlement, editConditions,
    agentName, agentEmail, agentPhone, agencyName,
    solicitorName, solicitorEmail, solicitorPhone, solicitorCompany,
    brokerName, brokerEmail, brokerPhone, brokerCompany,
    consultantName, consultantEmail, notes, lvr,
    authEmail, recordId,
  ]);

  // ---- T1: auto-grow textareas on value changes -----------------------------
  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>('.eoi-form-textarea').forEach(ta => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });
  }, [notes, editDepositPayable, editFinance, editBuildingPest, editPci, editSettlement,
    editCommission, editDepositAmount, propertyAddress, contractEntity, speculativeMessage, purchasers]);

  // ---- T6: iframe auto-height -----------------------------------------------
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc?.documentElement) {
        iframe.style.height = Math.max(400, doc.documentElement.scrollHeight + 16) + 'px';
      }
    } catch { /* cross-origin guard */ }
  }, []);

  useEffect(() => {
    if (!previewHtml) return;
    const timer = setTimeout(resizeIframe, 150);
    return () => clearTimeout(timer);
  }, [previewHtml, resizeIframe]);

  // ---- attachment handlers (T7) -----------------------------------------------
  function handleFileSelected(file: File) {
    const totalSize = attachments.reduce((sum, a) => sum + a.file.size, 0) + file.size;
    if (totalSize > MAX_TOTAL_ATTACHMENT_SIZE) {
      alert(`Total attachment size would exceed 18 MB (Gmail limit minus encoding overhead). Remove an attachment first or choose a smaller file.`);
      return;
    }
    setPendingFile(file);
    setPendingType('ID');
    setPendingFor('');
  }

  async function confirmAttachment() {
    if (!pendingFile) return;
    const base64 = await readFileAsBase64(pendingFile);
    const autoName = buildAutoName(pendingType, pendingFor, pendingFile.name);
    setAttachments(prev => [...prev, {
      file: pendingFile,
      base64,
      mimeType: pendingFile.type || 'application/octet-stream',
      type: pendingType,
      forLabel: pendingFor,
      autoName,
    }]);
    setPendingFile(null);
    setPendingType('ID');
    setPendingFor('');
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  // ---- send -----------------------------------------------------------------
  async function handleSend() {
    if (!agentEmail) { alert('Agent email is required'); return; }
    if (!recordId) return;
    // Mandatory field validation
    const missing: string[] = [];
    if (isHL && !editLandDeposit.trim()) missing.push('Land Deposit');
    if (isHL && !editBuildDeposit.trim()) missing.push('Build Deposit');
    if (oppId && !lvr.trim()) missing.push('LVR');
    if (missing.length > 0) { alert(`Required fields missing: ${missing.join(', ')}`); return; }

    setSending(true);
    setSendResult(null);
    setContactNote('');

    const emailData = buildEmailData();

    // D-CHANGES: compute field-level diff if loaded from a previous send
    const changes = loadedFromHistory && previousPayload
      ? diffPayloads(previousPayload, emailData)
      : undefined;

    try {
      const res = await fetch('/api/eoi/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          opportunityId: oppId || null,
          opportunityName: oppName || null,
          propertyAddress,
          sendType,
          offerPrice: displayOfferPrice,
          agentEmail,
          sentBy: sendAsEmail || authEmail,
          initiatedBy: authEmail,
          consultantEmail,
          emailData,
          manualCc: manualCc.trim() || undefined,
          changes: changes !== undefined ? changes : undefined,
          attachments: attachments.length > 0 ? attachments.map(a => ({
            base64: a.base64,
            mimeType: a.mimeType,
            autoName: a.autoName,
            type: a.type,
            forLabel: a.forLabel,
          })) : undefined,
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

  // ---- form row helper -------------------------------------------------------
  function renderFormRow(id: string, label: string, src: string, colour: FieldColour, content: React.ReactNode) {
    return (
      <React.Fragment key={id}>
        <tr style={{ background: BG[colour] }}>
          <td style={formLabelSty}>
            {label}
            <span className="source-label">{src}</span>
            <button onClick={() => toggleInfo(id)} className="eoi-info-btn" title="Field info">i</button>
          </td>
          <td style={formValueSty}>{content}</td>
        </tr>
        {openInfo === id && FIELD_INFO[id] && (
          <tr><td colSpan={2} className="eoi-info-panel">
            {FIELD_INFO[id].map((line, i) => <div key={i}>{line}</div>)}
          </td></tr>
        )}
      </React.Fragment>
    );
  }

  // ---- condition list helpers ------------------------------------------------
  function addConditionItem() {
    if (!newConditionText.trim()) return;
    setEditConditions(prev => [...prev, newConditionText.trim()]);
    setNewConditionText('');
  }
  function removeConditionItem(idx: number) {
    setEditConditions(prev => prev.filter((_, i) => i !== idx));
  }
  function moveConditionItem(idx: number, dir: -1 | 1) {
    setEditConditions(prev => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return prev;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  }
  function updateConditionItem(idx: number, text: string) {
    setEditConditions(prev => prev.map((c, i) => i === idx ? text : c));
  }

  // ---- purchaser field colour ------------------------------------------------
  function pColour(idx: number, field: string): FieldColour {
    if (idx === 0) return field === 'address' ? 'green' : 'yellow';
    if (idx === 1) return 'green';
    return 'grey';
  }

  function pInfoId(idx: number, field: string): string {
    if (idx === 0) return `p1${field.charAt(0).toUpperCase() + field.slice(1)}`;
    if (idx === 1) return `p2${field.charAt(0).toUpperCase() + field.slice(1)}`;
    return 'p3Plus';
  }

  function pSrc(idx: number, field: string): string {
    if (idx === 0) {
      if (field === 'address') return 'Opportunity \u2192 Opportunity Details \u2192 Postal Address \u00b7 writes back';
      return 'Opportunity \u2192 Contact \u00b7 contact-inherited \u00b7 does not write back';
    }
    if (idx === 1) {
      const fMap: Record<string, string> = { name: 'Partner Name', email: 'Partner Email', phone: 'Partner Phone', address: 'Partner Address' };
      return `Opportunity \u2192 Opportunity Details \u2192 ${fMap[field] || field} \u00b7 writes back`;
    }
    return 'Manual \u00b7 does not write back';
  }

  // ---- D38: view-history-only mode ------------------------------------------
  if (viewHistoryMode) {
    return (
      <div className="eoi-page">
        <style suppressHydrationWarning>{CSS}</style>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 16px' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: 'var(--charcoal-dark)' }}>EOI History</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <span><strong>Property:</strong> {propertyAddress || '—'}</span>
            {viewContractType && <span><strong>Contract Type:</strong> {viewContractType}</span>}
            {viewAcceptAcqTotal && <span><strong>Accept Acq&apos;/Total:</strong> {viewAcceptAcqTotal}</span>}
            {viewPackager && <span><strong>Packager:</strong> {viewPackager}</span>}
            {viewSourcer && <span><strong>Sourcer:</strong> {viewSourcer}</span>}
          </div>
          {historyLoading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading history...</p>
          ) : history.length > 0 ? (
            <div className="history-panel">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--charcoal-dark)' }}>Send History</h3>
              {history.map((h) => (
                <div key={h.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ textTransform: 'capitalize' }}>{({
                        eoi_initial: 'Initial',
                        eoi_increase: 'Increase',
                        eoi_revision: 'Revision',
                        eoi_resend: 'Resend',
                        mark_accepted: 'Mark Accepted',
                        reassign: 'Reassigned',
                        change_speculative: 'Changed to Speculative',
                        unlink_test: 'Unlinked to 07 Test Record',
                        unlink_lost: 'Unlinked to 06 Close Lost',
                        unlink_available: 'Unlinked to 01 Available',
                      } as Record<string, string>)[h.event_type] || (h.event_type || '').replace(/^eoi_/, '')}</strong>
                      {h.offer_price ? ` — $${Number(h.offer_price).toLocaleString('en-AU')}` : ''}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{h.agent_email}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: h.delivery_status === 'sent' ? 'var(--green)' : h.delivery_status === 'failed' ? 'var(--red)' : 'var(--text-muted)' }}>
                        {h.delivery_status}
                      </span>
                      {h.delivery_status === 'sent' && (
                        <>
                          {' · '}
                          <a href={`/api/eoi/view-send?sendId=${h.id}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--blue, #3b82f6)', fontSize: 11, textDecoration: 'underline' }}>View EOI</a>
                        </>
                      )}
                      <br />
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                        {new Date(h.sent_at).toLocaleString('en-AU')} · {h.sent_by}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 11, color: '#666', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <span><strong>Opp:</strong> {h.opportunity_name || '—'}</span>
                    <span><strong>Purchaser 1:</strong> {h.client_name || '—'}</span>
                    <span><strong>BA:</strong> {h.assigned_ba || '—'}</span>
                    <span><strong>Method:</strong> {h.method || '—'}</span>
                    {(h.offer_price_land || h.offer_price_build) && (
                      <span><strong>L:</strong> ${Number(h.offer_price_land || 0).toLocaleString('en-AU')} · <strong>B:</strong> ${Number(h.offer_price_build || 0).toLocaleString('en-AU')} · <strong>Tot.</strong> ${Number((Number(h.offer_price_land) || 0) + (Number(h.offer_price_build) || 0)).toLocaleString('en-AU')}</span>
                    )}
                    {h.offer_status_at_event && <span><strong>Status:</strong> {h.offer_status_at_event}</span>}
                    {h.delink_reason && <span><strong>Reason:</strong> {h.delink_reason}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No EOI history found for this property.</p>
          )}
        </div>
      </div>
    );
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

  // ---- RENDER ----------------------------------------------------------------
  return (
    <div className="eoi-page">
      <style suppressHydrationWarning>{CSS}</style>

      {/* Toolbar */}
      <div className="toolbar">
        <span className="toolbar-title">Expression of Interest</span>
        <div className="toolbar-group">
          <label style={{ fontSize: 12, color: '#ccc' }}>State<span style={{ display: 'block', fontSize: 9, color: '#999', fontStyle: 'italic' }}>Property Record (CO) &rarr; state</span></label>
          <select value={state} onChange={(e) => setState(e.target.value as AuState)} disabled={isResend} style={{ background: '#fff3cd' }}>
            {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="toolbar-group">
          <label style={{ fontSize: 12, color: '#ccc' }}>Type<span style={{ display: 'block', fontSize: 9, color: '#999', fontStyle: 'italic' }}>Property Record (CO) &rarr; property_type</span></label>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)} disabled={isResend} style={{ background: '#fff3cd' }}>
            {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="toolbar-group" style={{ borderRight: 'none', gap: 8 }}>
          <button className="primary" onClick={handleSend} disabled={sending || !agentEmail || !!sendResult?.ok}>
            {sendResult?.ok ? 'EOI Sent' : sending ? 'Sending...' : 'Send EOI'}
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
            <>{sendResult.deliveryStatus === 'sent' ? 'Success! The EOI has been sent.' : sendResult.deliveryStatus === 'no_credentials' ? 'EOI recorded but email credentials are not configured.' : `EOI recorded. Delivery: ${sendResult.deliveryStatus}`}
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>Close this tab to return to the Deal Sheet. To send again, use the action menu.</div></>
          ) : (
            <>
              <div style={{ fontWeight: 600 }}>The EOI could not be sent. Your data is safe — please wait a few moments and try again.</div>
              {sendResult.error && <div style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{sendResult.error}</div>}
            </>
          )}
        </div>
      )}

      {/* Recipient bar */}
      <div className="recipient-bar">
        <div className="recipient-row">
          <label>Agent Email: <span className="source-label" style={{ color: '#8a7300' }}>Property Record (CO) &rarr; agent_email</span></label>
          <input value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} placeholder="agent@agency.com.au" style={{ fontWeight: 600, fontSize: 14 }} />
          <button onClick={() => toggleInfo('agentGroup')} className="eoi-info-btn" style={{ borderColor: '#c4a800' }} title="Agent field info">i</button>
        </div>
        {openInfo === 'agentGroup' && (
          <div style={{ background: '#f0f4ff', padding: '6px 12px', marginTop: 6, borderRadius: 4, fontSize: 11, color: '#444', lineHeight: 1.6 }}>
            {FIELD_INFO.agentGroup.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
        <div className="recipient-row" style={{ marginTop: 6 }}>
          <label>Agent Name: <span className="source-label" style={{ color: '#8a7300' }}>Property Record (CO) &rarr; agent_name</span></label>
          <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Agent name" />
        </div>
        <div className="recipient-row" style={{ marginTop: 6 }}>
          <label>Agent Phone: <span className="source-label" style={{ color: '#8a7300' }}>Property Record (CO) &rarr; agent_mobile</span></label>
          <input value={agentPhone} onChange={(e) => setAgentPhone(handleMobileInput(e.target.value))}
            onBlur={(e) => setAgentPhone(normalizeMobileForStorage(e.target.value))}
            placeholder="0450 581 822" />
        </div>
        <div className="recipient-meta">
          <strong>Send as:</strong>
          <select value={sendAsEmail} onChange={e => setSendAsEmail(e.target.value)}
            style={{ border: '1px solid #c4a800', borderRadius: 3, padding: '2px 6px', fontSize: 12, background: '#fff', fontFamily: 'inherit' }}>
            {authEmail && <option value={authEmail}>{authEmail} (you)</option>}
            {teamMembers.filter(m => m.email !== authEmail).map(m => (
              <option key={m.email} value={m.email}>{m.name} — {m.email}</option>
            ))}
          </select>
          <span style={{ color: '#999' }}>·</span>
          <strong>CC:</strong>
          {ccPropertyOn && <><span>property@buyersclub.com.au</span><span style={{ color: '#999' }}>·</span></>}
          {ccBaOn && <span>{consultantName || 'Assigned BA'}{consultantEmail ? ` (${consultantEmail})` : ''} <span className="source-label" style={{ display: 'inline', color: '#8a7300' }}>(Opportunity &rarr; Prop Team Info New)</span></span>}
          {globalCcList.map(email => (
            <><span key={email} style={{ color: '#999' }}>·</span><span>{email}</span></>
          ))}
          {!ccPropertyOn && !ccBaOn && globalCcList.length === 0 && !manualCc.trim() && <span style={{ color: '#999', fontStyle: 'italic' }}>None</span>}
        </div>
        <div className="recipient-row" style={{ marginTop: 6 }}>
          <label>Additional CC:</label>
          <input value={manualCc} onChange={(e) => setManualCc(e.target.value)}
            placeholder="Comma-separated emails e.g. john@example.com, jane@example.com"
            style={{ flex: 1, fontSize: 12 }} />
        </div>
      </div>

      {/* ================ TWO-PANEL LAYOUT ================ */}
      <div className="eoi-panels">

        {/* ======== LEFT PANEL — Edit Form ======== */}
        <div className="eoi-form-panel">

          {/* Colour legend */}
          <div className="legend">
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-swatch" style={{ background: BG.green, border: '1px solid #4caf50' }} />
                <span>Writes back to GHL on send</span>
              </div>
              <div className="legend-item">
                <div className="legend-swatch" style={{ background: BG.grey, border: '1px solid #9e9e9e' }} />
                <span>Does not write back</span>
              </div>
              <div className="legend-item">
                <div className="legend-swatch" style={{ background: BG.yellow, border: '1px solid #ff9800' }} />
                <span>Contact-inherited (this EOI only)</span>
              </div>
            </div>
            <a href="/admin/eoi-templates" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 11, color: '#666', textDecoration: 'underline' }}>EOI Template Admin</a>
          </div>

          {/* D28-PRE: data source banner */}
          {loadedFromHistory && (
            <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#856404' }}>
              {sendType === 'resend' ? (
                <><strong>This is an exact resend of the previous EOI{lastSendDate ? ` (sent ${lastSendDate})` : ''}.</strong> Only the recipient, CC, and attachments can be changed.</>
              ) : (
                <><strong>Values loaded from previously sent EOI{lastSendDate ? ` (sent ${lastSendDate})` : ''}.</strong> All fields are editable — terms, conditions, and price. Changes from the previous send will be tracked.</>
              )}
            </div>
          )}
          {historyFallback && (
            <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#721c24' }}>
              <strong>No previous send found for this property.</strong> Values loaded from EOI Template Admin defaults.
            </div>
          )}

          {/* Form table — disabled in resend mode */}
          <fieldset disabled={isResend} style={{ border: 'none', margin: 0, padding: 0, opacity: isResend ? 0.7 : 1 }}>
          <table className="eoi-form-table">
            <tbody>

              {/* ============ SPECULATIVE BANNER ============ */}
              {!oppId && (
                renderFormRow('speculativeMessage', 'Speculative Message', 'EOI Template Admin \u00b7 shown as banner when no opportunity linked', 'yellow',
                  <textarea className="eoi-form-textarea" value={speculativeMessage} onChange={e => setSpeculativeMessage(e.target.value)} onInput={autoGrow} rows={2}
                    placeholder="e.g. Please find EOI on behalf of my clients..." />
                )
              )}

              {/* ============ PROPERTY ============ */}
              <tr><td colSpan={2} style={formSectionSty}>PROPERTY</td></tr>

              {renderFormRow('propertyAddress', 'Property Address', 'Property Record (CO) \u2192 property_address \u00b7 does not write back', 'grey',
                <textarea className="eoi-form-textarea" rows={1} value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} onInput={autoGrow} placeholder="e.g. 12 Smith Street, Richmond VIC 3121" />
              )}

              {renderFormRow('notes', 'Notes', 'EOI Template Admin \u00b7 writes eoi_notes to CO on send', 'green',
                <textarea className="eoi-form-textarea" value={notes} onChange={e => setNotes(e.target.value)} onInput={autoGrow} rows={3} />
              )}

              {/* ============ TERMS ============ */}
              <tr><td colSpan={2} style={formSectionSty}>TERMS</td></tr>

              {/* Price — depends on property type */}
              {isHL ? (
                <>
                  {renderFormRow('landPrice', 'Offer Price Land', 'Property Record (CO) \u2192 Offer Price Land \u00b7 writes back on send', 'green',
                    <input className="eoi-form-input" value={currencyFormat(landPrice)} onChange={e => setLandPrice(e.target.value.replace(/[$,]/g, '').trim())} placeholder="$" />
                  )}
                  {renderFormRow('buildPrice', 'Offer Price Build', 'Property Record (CO) \u2192 Offer Price Build \u00b7 writes back on send', 'green',
                    <input className="eoi-form-input" value={currencyFormat(buildPrice)} onChange={e => setBuildPrice(e.target.value.replace(/[$,]/g, '').trim())} placeholder="$" />
                  )}
                  {renderFormRow('totalPrice', 'Offer Price', 'Calculated (land + build) \u00b7 writes back to Offer Price on send', 'green',
                    <strong>{currencyFormat(totalPrice) || '\u2014'}</strong>
                  )}
                </>
              ) : (
                renderFormRow('price', 'Offer Price', 'Property Record (CO) \u2192 Offer Price \u00b7 writes back on send', 'green',
                  <input className="eoi-form-input" value={currencyFormat(offerPrice)} onChange={e => setOfferPrice(e.target.value.replace(/[$,]/g, '').trim())} placeholder="$" />
                )
              )}

              {/* Deposit */}
              {isHL ? (
                <>
                  {renderFormRow('landDeposit', 'Land Deposit', 'EOI Template Admin \u00b7 does not write back', 'grey',
                    <input className="eoi-form-input" value={editLandDeposit} onChange={e => setEditLandDeposit(e.target.value)} placeholder="Required" />
                  )}
                  {renderFormRow('buildDeposit', 'Build Deposit', 'EOI Template Admin \u00b7 does not write back', 'grey',
                    <input className="eoi-form-input" value={editBuildDeposit} onChange={e => setEditBuildDeposit(e.target.value)} placeholder="Required" />
                  )}
                </>
              ) : (
                <>
                  {renderFormRow('depositAmount', 'Deposit Amount', 'EOI Template Admin \u00b7 does not write back', 'grey',
                    <textarea className="eoi-form-textarea" rows={1} value={editDepositAmount} onChange={e => setEditDepositAmount(e.target.value)} onInput={autoGrow} placeholder="Deposit amount" />
                  )}
                  {renderFormRow('depositPayable', 'Deposit Payable', 'EOI Template Admin \u00b7 does not write back', 'grey',
                    <textarea className="eoi-form-textarea" value={editDepositPayable} onChange={e => setEditDepositPayable(e.target.value)} onInput={autoGrow} rows={2} placeholder="Payable terms" />
                  )}
                </>
              )}

              {/* Finance */}
              {renderFormRow('finance', 'Finance', 'EOI Template Admin \u00b7 does not write back', 'grey',
                <textarea className="eoi-form-textarea" rows={1} value={editFinance} onChange={e => setEditFinance(e.target.value)} onInput={autoGrow} placeholder="Finance terms" />
              )}

              {/* Building & Pest / PCI */}
              {isEstablished ? (
                renderFormRow('buildingPest', 'Building & Pest', 'EOI Template Admin \u00b7 does not write back', 'grey',
                  <textarea className="eoi-form-textarea" rows={1} value={editBuildingPest} onChange={e => setEditBuildingPest(e.target.value)} onInput={autoGrow} placeholder="B&P terms" />
                )
              ) : (
                renderFormRow('pci', 'PCI', 'EOI Template Admin \u00b7 does not write back', 'grey',
                  <textarea className="eoi-form-textarea" rows={1} value={editPci} onChange={e => setEditPci(e.target.value)} onInput={autoGrow} placeholder="PCI terms" />
                )
              )}

              {/* Commission (H&L only) */}
              {isHL && renderFormRow('commission', 'Commission', 'EOI Template Admin \u00b7 does not write back', 'grey',
                <textarea className="eoi-form-textarea" rows={1} value={editCommission} onChange={e => setEditCommission(e.target.value)} onInput={autoGrow} placeholder="Commission (required)" />
              )}

              {/* Special Conditions */}
              {renderFormRow('specialConditions', 'Special Conditions', 'EOI Template Admin \u00b7 does not write back', 'grey',
                <div style={{ width: '100%' }}>
                  {editConditions.map((cond, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 4 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 2 }}>
                        <button onClick={() => moveConditionItem(i, -1)} disabled={i === 0}
                          style={{ fontSize: 9, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }} title="Move up">{'\u25B2'}</button>
                        <button onClick={() => moveConditionItem(i, 1)} disabled={i === editConditions.length - 1}
                          style={{ fontSize: 9, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }} title="Move down">{'\u25BC'}</button>
                      </div>
                      <span style={{ fontSize: 13, color: '#888', paddingTop: 2, flexShrink: 0 }}>{'\u2022'}</span>
                      <textarea className="eoi-form-input" value={cond} onChange={e => updateConditionItem(i, e.target.value)}
                        onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                        ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                        rows={1} style={{ flex: 1, resize: 'none', overflow: 'hidden' }} />
                      <button onClick={() => removeConditionItem(i)}
                        style={{ fontSize: 11, color: '#c0392b', background: 'none', border: '1px solid #e0e0e0', borderRadius: 3, cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }} title="Remove">{'\u2715'}</button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <input className="eoi-form-input" value={newConditionText} onChange={e => setNewConditionText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addConditionItem()}
                      placeholder="Add a new condition\u2026" style={{ flex: 1 }} />
                    <button onClick={addConditionItem} disabled={!newConditionText.trim()}
                      style={{ fontSize: 11, background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer', padding: '4px 10px', whiteSpace: 'nowrap' }}>+ Add</button>
                  </div>
                </div>
              )}

              {/* Settlement */}
              {renderFormRow('settlement', 'Settlement', 'EOI Template Admin \u00b7 does not write back', 'grey',
                <textarea className="eoi-form-textarea" rows={1} value={editSettlement} onChange={e => setEditSettlement(e.target.value)} onInput={autoGrow} placeholder="Settlement terms" />
              )}

              {/* ============ PURCHASER/S ============ */}
              <tr><td colSpan={2} style={formSectionSty}>PURCHASER/S</td></tr>

              {/* Contract Entity */}
              {renderFormRow('contractEntity', 'Contract Entity', 'Opportunity \u2192 Prop Team Info New \u2192 Trust/SMSF Name \u00b7 does not write back', 'grey',
                <textarea className="eoi-form-textarea" rows={1} value={contractEntity} onChange={e => setContractEntity(e.target.value)} onInput={autoGrow}
                  placeholder="e.g. The Smith Family Trust / John Smith Pty Ltd ATF Smith SMSF" />
              )}

              {/* Purchasers */}
              {purchasers.map((p, idx) => (
                <React.Fragment key={idx}>
                  {/* Purchaser sub-header */}
                  <tr>
                    <td colSpan={2} style={{ ...formSectionSty, background: '#666', fontSize: '12px', padding: '5px 10px', textAlign: 'left' }}>
                      <span style={{ marginLeft: 'auto' }}>Purchaser {idx + 1}</span>
                      {purchasers.length > 1 && (
                        <button onClick={() => removePurchaser(idx)}
                          style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                          title="Remove purchaser">&times;</button>
                      )}
                    </td>
                  </tr>

                  {/* Name */}
                  {renderFormRow(pInfoId(idx, 'name'), 'Name', pSrc(idx, 'name'), pColour(idx, 'name'),
                    <input className="eoi-form-input" style={{ fontWeight: 600 }}
                      value={p.name} onChange={e => updatePurchaser(idx, 'name', e.target.value)} placeholder="Full name" />
                  )}
                  {/* Email */}
                  {renderFormRow(pInfoId(idx, 'email'), 'Email', pSrc(idx, 'email'), pColour(idx, 'email'),
                    <input className="eoi-form-input" value={p.email} onChange={e => updatePurchaser(idx, 'email', e.target.value)} placeholder="email@example.com" />
                  )}
                  {/* Phone */}
                  {renderFormRow(pInfoId(idx, 'phone'), 'Phone', pSrc(idx, 'phone'), pColour(idx, 'phone'),
                    <input className="eoi-form-input" value={p.phone} onChange={e => updatePurchaser(idx, 'phone', e.target.value)} placeholder="04XX XXX XXX" />
                  )}
                  {/* Address */}
                  {renderFormRow(pInfoId(idx, 'address'), 'Address', pSrc(idx, 'address'), pColour(idx, 'address'),
                    <textarea className="eoi-form-textarea" rows={1} value={p.address} onChange={e => updatePurchaser(idx, 'address', e.target.value)} onInput={autoGrow} placeholder="Postal address" />
                  )}
                </React.Fragment>
              ))}

              {/* Add purchaser */}
              {purchasers.length < 6 && (
                <tr>
                  <td colSpan={2} style={{ background: '#f0f0f0', textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid #ddd' }}>
                    <button onClick={addPurchaser}
                      style={{ background: 'transparent', border: '1px dashed #bbb', borderRadius: 4, padding: '4px 14px', fontSize: 12, cursor: 'pointer', color: '#555' }}>
                      + Add purchaser
                    </button>
                  </td>
                </tr>
              )}

              {/* ============ LEGALS ============ */}
              <tr>
                <td colSpan={2} style={formSectionSty}>
                  LEGALS
                  <button onClick={() => toggleInfo('solicitor')} className="eoi-info-btn"
                    style={{ marginLeft: 8, borderColor: '#FBD721', color: '#FBD721' }} title="Solicitor field info">i</button>
                </td>
              </tr>
              {openInfo === 'solicitor' && (
                <tr><td colSpan={2} className="eoi-info-panel" style={{ paddingLeft: 12 }}>
                  {FIELD_INFO.solicitor.map((line, i) => <div key={i}>{line}</div>)}
                </td></tr>
              )}

              {/* Solicitor fields */}
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Company<span className="source-label">Opportunity &rarr; Prop Team Info New &rarr; Solicitor Company &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={solicitorCompany} onChange={e => setSolicitorCompany(e.target.value)} placeholder="Solicitor / conveyancer company" /></td>
              </tr>
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Contact<span className="source-label">Opportunity &rarr; Prop Team Info New &rarr; Solicitor Name &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={solicitorName} onChange={e => setSolicitorName(e.target.value)} placeholder="Contact name" /></td>
              </tr>
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Phone<span className="source-label">Opportunity &rarr; Prop Team Info New &rarr; Solicitor Phone &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={solicitorPhone} onChange={e => setSolicitorPhone(e.target.value)} /></td>
              </tr>
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Email<span className="source-label">Opportunity &rarr; Prop Team Info New &rarr; Solicitor Email &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={solicitorEmail} onChange={e => setSolicitorEmail(e.target.value)} /></td>
              </tr>

              {/* ============ FINANCE ============ */}
              <tr>
                <td colSpan={2} style={formSectionSty}>
                  FINANCE
                  <button onClick={() => toggleInfo('broker')} className="eoi-info-btn"
                    style={{ marginLeft: 8, borderColor: '#FBD721', color: '#FBD721' }} title="Broker field info">i</button>
                </td>
              </tr>
              {openInfo === 'broker' && (
                <tr><td colSpan={2} className="eoi-info-panel" style={{ paddingLeft: 12 }}>
                  {FIELD_INFO.broker.map((line, i) => <div key={i}>{line}</div>)}
                </td></tr>
              )}

              {/* Broker fields */}
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Company<span className="source-label">Opportunity &rarr; Isobel Team Info &rarr; Broker Company &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={brokerCompany} onChange={e => setBrokerCompany(e.target.value)} placeholder="Broker company" /></td>
              </tr>
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Contact<span className="source-label">Opportunity &rarr; Isobel Team Info &rarr; Broker Name &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={brokerName} onChange={e => setBrokerName(e.target.value)} placeholder="Broker name" /></td>
              </tr>
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Phone<span className="source-label">Opportunity &rarr; Isobel Team Info &rarr; Broker Phone &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={brokerPhone} onChange={e => setBrokerPhone(e.target.value)} /></td>
              </tr>
              <tr style={{ background: BG.green }}>
                <td style={formLabelSty}>Email<span className="source-label">Opportunity &rarr; Isobel Team Info &rarr; Broker Email &middot; writes back</span></td>
                <td style={formValueSty}><input className="eoi-form-input" value={brokerEmail} onChange={e => setBrokerEmail(e.target.value)} /></td>
              </tr>

              {/* LVR */}
              {renderFormRow('lvr', 'LVR', 'Manual entry \u00b7 does not write back', 'grey',
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input className="eoi-form-input" style={{ width: 80 }}
                    value={lvr} onChange={e => { const v = e.target.value; setLvr(/^[tT][bBcC]{0,2}$/.test(v) ? v.toUpperCase() : numericOnly(v)); }} placeholder="e.g. 80 or TBC" />
                  {lvr && lvr.toUpperCase() !== 'TBC' && <span style={{ fontSize: 13, fontWeight: 600 }}>%</span>}
                </div>
              )}

            </tbody>
          </table>
          </fieldset>

          {/* ======== ATTACHMENTS (T7) ======== */}
          <div style={{ marginTop: 16, background: '#fff', border: '1px solid #ccc', borderRadius: 4, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#2A2A2A' }}>Attachments</h4>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ background: '#fff', border: '1px dashed #bbb', borderRadius: 4, padding: '4px 14px', fontSize: 12, cursor: 'pointer', color: '#555' }}>
                + Add attachment
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFileSelected(e.target.files[0]); e.target.value = ''; }} />
            </div>

            {/* Pending attachment — type + for selection */}
            {pendingFile && (
              <div style={{ background: '#f9f9f9', border: '1px solid #ddd', borderRadius: 4, padding: 10, marginBottom: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{pendingFile.name} ({formatFileSize(pendingFile.size)})</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600 }}>Type:</label>
                  <select value={pendingType} onChange={e => { setPendingType(e.target.value as AttachmentType); setPendingFor(''); }}
                    style={{ padding: '3px 8px', fontSize: 12, borderRadius: 3, border: '1px solid #ccc' }}>
                    {ATTACHMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>

                  {/* Contextual "For" */}
                  {pendingType === 'ID' && (
                    <>
                      <label style={{ fontWeight: 600 }}>For:</label>
                      <select value={pendingFor} onChange={e => setPendingFor(e.target.value)}
                        style={{ padding: '3px 8px', fontSize: 12, borderRadius: 3, border: '1px solid #ccc' }}>
                        <option value="">Select purchaser</option>
                        {purchasers.filter(p => p.name.trim()).map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                  {pendingType === 'Deposit Receipt' && (
                    <>
                      <label style={{ fontWeight: 600 }}>For:</label>
                      <select value={pendingFor} onChange={e => setPendingFor(e.target.value)}
                        style={{ padding: '3px 8px', fontSize: 12, borderRadius: 3, border: '1px solid #ccc' }}>
                        <option value="">Select</option>
                        {isHL && <option value="Land">Land</option>}
                        {isHL && <option value="Build">Build</option>}
                        <option value="Property">Property</option>
                      </select>
                    </>
                  )}
                  {pendingType === 'Other' && (
                    <>
                      <label style={{ fontWeight: 600 }}>For:</label>
                      <input value={pendingFor} onChange={e => setPendingFor(e.target.value)}
                        placeholder="Description" style={{ padding: '3px 8px', fontSize: 12, borderRadius: 3, border: '1px solid #ccc', width: 140 }} />
                    </>
                  )}

                  <button onClick={confirmAttachment}
                    disabled={
                      (pendingType === 'ID' && !pendingFor) ||
                      (pendingType === 'Deposit Receipt' && !pendingFor)
                    }
                    style={{ background: '#FBD721', border: '1px solid #d4b800', borderRadius: 3, padding: '3px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Add
                  </button>
                  <button onClick={() => { setPendingFile(null); setPendingFor(''); }}
                    style={{ background: '#eee', border: '1px solid #ccc', borderRadius: 3, padding: '3px 10px', fontSize: 12, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
                <div style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                  Will be named: <strong>{buildAutoName(pendingType, pendingFor, pendingFile.name)}</strong>
                </div>
              </div>
            )}

            {/* Attached files list */}
            {attachments.map((a, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < attachments.length - 1 ? '1px solid #eee' : 'none', fontSize: 12 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{a.autoName}</span>
                  <span style={{ color: '#888', marginLeft: 8 }}>({formatFileSize(a.file.size)})</span>
                </div>
                <button onClick={() => removeAttachment(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                  title="Remove attachment">&times;</button>
              </div>
            ))}

            {attachments.length === 0 && !pendingFile && (
              <div style={{ color: '#999', fontSize: 11, textAlign: 'center', padding: 8 }}>No attachments</div>
            )}
          </div>

        </div>

        {/* ======== RIGHT PANEL — Email Preview ======== */}
        <div className="eoi-preview-panel">
          <div style={{ background: '#2A2A2A', color: '#FBD721', padding: '8px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 1, borderRadius: '6px 6px 0 0' }}>
            EMAIL PREVIEW
          </div>
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml || '<html><body style="margin:0;padding:40px;color:#888;font-family:sans-serif;text-align:center"><p>Preview will appear here once data is loaded...</p></body></html>'}
            onLoad={resizeIframe}
            style={{ width: '100%', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 6px 6px', background: '#f0f0f0', minHeight: 400 }}
            title="EOI Email Preview"
          />
        </div>
      </div>

      {/* Submitted by / consultant */}
      <div style={{ maxWidth: 1400, margin: '12px auto 0', paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Assigned BA:</span>
          <input value={consultantName} onChange={(e) => setConsultantName(e.target.value)} placeholder="BA / Consultant name"
            style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px', fontSize: 12, width: 200, background: '#fff3cd' }} />
          <span className="source-label" style={{ display: 'inline' }}>Opportunity &rarr; Prop Team Info New</span>
          <span style={{ marginLeft: 'auto' }}>Logged in as: {authEmail}</span>
        </div>
      </div>

      {/* Send History */}
      {history.length > 0 && (
        <div className="history-panel">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: 'var(--charcoal-dark)' }}>Send History</h3>
          {history.map((h) => (
            <div key={h.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <strong style={{ textTransform: 'capitalize' }}>{({
                    eoi_initial: 'Initial',
                    eoi_increase: 'Increase',
                    eoi_revision: 'Revision',
                    eoi_resend: 'Resend',
                    mark_accepted: 'Mark Accepted',
                    reassign: 'Reassigned',
                    change_speculative: 'Changed to Speculative',
                    unlink_test: 'Unlinked to 07 Test Record',
                    unlink_lost: 'Unlinked to 06 Close Lost',
                    unlink_available: 'Unlinked to 01 Available',
                  } as Record<string, string>)[h.event_type] || (h.event_type || '').replace(/^eoi_/, '')}</strong>
                  {h.offer_price ? ` — $${Number(h.offer_price).toLocaleString('en-AU')}` : ''}
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{h.agent_email}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: h.delivery_status === 'sent' ? 'var(--green)' : h.delivery_status === 'failed' ? 'var(--red)' : 'var(--text-muted)' }}>
                    {h.delivery_status}
                  </span>
                  {h.delivery_status === 'sent' && (
                    <>
                      {' · '}
                      <a
                        href={`/api/eoi/view-send?sendId=${h.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--blue, #3b82f6)', fontSize: 11, textDecoration: 'underline' }}
                      >
                        View EOI
                      </a>
                    </>
                  )}
                  <br />
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {new Date(h.sent_at).toLocaleString('en-AU')} · {h.sent_by}
                  </span>
                </div>
              </div>
              {/* Detail rows — always show key fields, others when populated */}
              <div style={{ marginTop: 4, fontSize: 11, color: '#666', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <span><strong>Opp:</strong> {h.opportunity_name || '—'}</span>
                <span><strong>Purchaser 1:</strong> {h.client_name || '—'}</span>
                <span><strong>BA:</strong> {h.assigned_ba || '—'}</span>
                <span><strong>Method:</strong> {h.method || '—'}</span>
                {h.offer_price_land && h.offer_price_build && (
                  <span><strong>L:</strong> ${Number(h.offer_price_land).toLocaleString('en-AU')} · <strong>B:</strong> ${Number(h.offer_price_build).toLocaleString('en-AU')} · <strong>Tot.</strong> ${(Number(h.offer_price_land) + Number(h.offer_price_build)).toLocaleString('en-AU')}</span>
                )}
                {h.offer_status_at_event && <span><strong>Status:</strong> {h.offer_status_at_event}</span>}
                {h.initiated_by && <span><strong>Initiated by:</strong> {h.initiated_by}</span>}
                {h.close_date && <span><strong>Close:</strong> {h.close_date}</span>}
                {h.delink_reason && <span><strong>Reason:</strong> {h.delink_reason}</span>}
              </div>
              {/* D-CHANGES: show field-level changes (filtered by action type) */}
              {(() => {
                if (!h.changes) return null;
                // Fields expected to change per action — excluded from display
                const expectedFields: Record<string, string[]> = {
                  eoi_increase: ['offerPrice', 'landPrice', 'buildPrice', 'totalPrice'],
                };
                const exclude = expectedFields[h.event_type] || [];
                const additional = h.changes.filter((c: { field: string }) => !exclude.includes(c.field));
                if (h.changes.length === 0) {
                  return <div style={{ marginTop: 3, fontSize: 10, color: '#6b7280', fontStyle: 'italic' }}>No changes from previous send — exact resend</div>;
                }
                if (additional.length === 0) return null; // only expected changes — nothing extra to show
                return (
                  <div style={{ marginTop: 3, fontSize: 10, color: '#b45309', fontStyle: 'italic' }}>
                    Additional changes: {additional.map((c: { label: string }) => c.label).join(', ')}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
