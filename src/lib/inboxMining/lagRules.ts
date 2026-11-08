// Lag-sheet demonstration (JT 9/11): deterministic update-type rules run over the NEW part of one email.
// Each hit is one mined fact. No model calls; nothing is written anywhere except our own DB.
import { FRIENDLY_TO_FIELD_ID } from '@/app/api/contract-team-reporting/fields';
import { extractFacts } from './extract';
import { findDate, valuationHits, VALUATION_FIELDS } from './valuationScan';

export interface MinedFact {
  type: string;
  /** 'none' = no GHL field for it yet; the row still shows the mined value. */
  target: 'opportunity' | 'property_record' | 'none';
  field: string;
  fieldId?: string;
  value: string;
  quote: string;
  note?: string;
}

const sydneyYmd = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const QUESTION = /\?\s*$|^(?:can|could|would|will|when|what|is|are|do|does|has|have|please\s+(?:advise|confirm|let))\b/i;
const NEGATED = /\b(?:not|yet\s+to|still\s+waiting|awaiting|once|if|until|before|when\s+the)\b/i;

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 6 && s.length < 600 && (s.match(/@/g) || []).length < 3);
}

type Ctx = { ref: Date; fromBuilder: boolean };
type Rule = {
  type: string;
  target: MinedFact['target'];
  field: string | ((m: RegExpMatchArray) => string);
  re: RegExp;
  value: (s: string, m: RegExpMatchArray, c: Ctx) => { value: string; note?: string } | null;
  /** Statements only: skip questions and conditional/negated wording. */
  plain?: boolean;
};

const dateOr = (s: string, c: Ctx) => {
  const d = findDate(s, c.ref);
  return d ? { value: d.iso } : { value: sydneyYmd(c.ref), note: 'no date in the text: email received date' };
};
const dateOnly = (s: string, c: Ctx) => {
  const d = findDate(s, c.ref);
  return d ? { value: d.iso } : null;
};
const fixed = (v: string) => () => ({ value: v });
const money = (raw: string) => raw.replace(/,/g, '');

const RULES: Rule[] = [
  { type: 'Exchange Date', target: 'opportunity', field: 'exchangeDate', plain: true,
    re: /\b(?:contracts?\s+(?:have|has)\s+(?:now\s+)?(?:been\s+)?exchanged|exchanged\s+contracts?|exchange\s+of\s+contracts\s+(?:has|have|took|occurred)|exchange\s+date\s*(?:is|was|:))/i, value: (s, _m, c) => dateOr(s, c) },
  { type: 'Unconditional Date', target: 'opportunity', field: 'unconditionalDate', plain: true,
    re: /\b(?:contract|sale|purchase)\b[^.\n]{0,40}\b(?:is|now|has\s+gone|gone|become|became|went)\s+unconditional\b|\bunconditional\s+date\s*(?:is|was|:)/i, value: (s, _m, c) => dateOr(s, c) },
  { type: 'Settlement Date (booked / extended)', target: 'opportunity', field: 'settlementDate', plain: true,
    re: /\bsettlement\b[^.\n]{0,60}\b(booked|scheduled|confirmed|extended|set\s+for|moved\s+to|date\s+(?:is|has\s+been|of|:)|will\s+(?:take\s+place|occur))/i,
    value: (s, m, c) => { const d = dateOnly(s, c); return d ? { value: d.value, note: m[1].toLowerCase() } : null; } },
  { type: 'Stage move implied by email', target: 'opportunity', field: 'pipeline stage', plain: true,
    re: /\b(?:settlement\s+(?:has\s+)?(?:now\s+)?(?:been\s+)?(?:completed|effected)|has\s+(?:now\s+)?settled|congratulations\s+on\s+(?:your\s+)?settlement)\b/i, value: fixed('Settled') },
  { type: 'Stage move implied by email', target: 'opportunity', field: 'pipeline stage', plain: true,
    re: /\bcongratulations\b[^.\n]{0,40}\b(?:exchange|exchanging)\b/i, value: fixed('Exchanged') },
  { type: 'Finance approval received', target: 'opportunity', field: 'financeApprovalReceived', plain: true,
    re: /\b(?:formal|unconditional|full)\s+(?:finance\s+|loan\s+)?approval\b[^.\n]{0,40}\b(?:received|issued|granted|has\s+been|is\s+in|came\s+through|attached)|\b(?:loan|finance)\s+(?:has\s+been\s+|is\s+now\s+)?formally\s+approved\b/i, value: fixed('Yes') },
  { type: 'Finance Status step', target: 'opportunity', field: 'financeStatus', plain: true,
    re: /\b(?:loan|finance|application)\b[^.\n]{0,30}\b(?:has\s+been\s+|was\s+|now\s+)(?:lodged|submitted)\b/i, value: fixed('Lodged') },
  { type: 'Finance Status step', target: 'opportunity', field: 'financeStatus', plain: true,
    re: /\bvaluation\b[^.\n]{0,20}\b(?:has\s+been\s+|was\s+|now\s+)ordered\b|\bordered\s+(?:the\s+)?valuation\b/i, value: fixed('Valuation ordered') },
  { type: 'Finance Status step', target: 'opportunity', field: 'financeStatus', plain: true,
    re: /\b(?:conditional|pre-?)\s*approval\b[^.\n]{0,30}\b(?:received|issued|granted|has\s+been)|\bconditionally\s+approved\b/i, value: fixed('Conditional approval') },
  { type: 'Insurance quote', target: 'opportunity', field: 'insuranceStatus', plain: true,
    re: /\binsurance\b[^.\n]{0,40}\bquote\b|\bquote\b[^.\n]{0,40}\binsurance\b/i, value: fixed('Quote received') },
  { type: 'Rent appraisal', target: 'property_record', field: 'rent_appraisal_primary_from',
    re: /\brent(?:al)?\s+(?:appraisal|assessment)\b[^\n]{0,120}?\$\s?(\d{3,4})(?:\s*(?:-|–|to)\s*\$?\s?(\d{3,4}))?/i,
    value: (_s, m) => ({ value: m[1], note: m[2] ? `range $${m[1]}-$${m[2]} per week` : 'per week' }) },
  { type: 'Deal Fallen Over + reason', target: 'opportunity', field: 'dealFallenOver', plain: true,
    re: /\b(?:deal|contract|sale|purchase)\b[^.\n]{0,30}\b(?:has\s+)?(?:fallen\s+over|fell\s+over|been\s+terminated|been\s+rescinded|been\s+cancelled|is\s+terminated)\b|\b(?:notice\s+of\s+)?(?:termination|rescission)\s+of\s+(?:the\s+)?contract\b/i,
    value: (s) => { const r = s.match(/\b(?:due\s+to|because(?:\s+of)?|as\s+the)\s+([^.\n]{5,120})/i); return { value: 'Yes', note: r ? `reason: ${r[1].trim()}` : undefined }; } },
  { type: 'Deposit paid (land / build)', target: 'opportunity', field: (m) => (/build|construct/i.test(m[1] || '') ? 'buildDepositPaid' : 'landDepositPaid'), plain: true,
    re: /\b(land|build(?:ing)?|construction)?\s*deposit\b[^.\n]{0,50}\b(?:has\s+been\s+|was\s+|now\s+)?(?:paid|received|receipted|cleared)\b|\b(land|build(?:ing)?|construction)?\s*deposit\s+receipt\b/i, value: fixed('Yes') },
  { type: 'Holding deposit / EOI accepted', target: 'none', field: 'holding_deposit_eoi', plain: true,
    re: /\b(holding\s+deposit|EOI|expression\s+of\s+interest)\b[^.\n]{0,50}\b(received|paid|accepted|approved|successful)\b/i,
    value: (_s, m) => ({ value: `${m[1]} ${m[2]}`.replace(/\s+/g, ' ') }) },
  { type: 'Price change', target: 'property_record', field: (m) => (/land/i.test(m[0]) ? 'land_price' : /build/i.test(m[0]) ? 'build_price' : 'total_price'), plain: true,
    re: /\bprice\b[^.\n]{0,40}\b(?:reduced|increased|changed|varied|adjusted|amended|revised|now)\b[^\n]{0,60}?\$\s?([\d,]{5,})|\bvariation\b[^.\n]{0,60}\$\s?([\d,]{4,})/i,
    value: (_s, m) => ({ value: money(m[1] || m[2]), note: m[2] ? 'variation amount' : undefined }) },
  { type: 'Handover / keys', target: 'property_record', field: 'construction_stage', plain: true,
    re: /\b(?:handover|hand\s+over)\b[^.\n]{0,50}\b(?:booked|scheduled|arranged|completed?|confirmed|took\s+place)\b|\bkeys?\b[^.\n]{0,30}\b(?:are\s+ready|have\s+been\s+(?:collected|handed)|collected|handed\s+over)\b/i,
    value: (s, _m, c) => { const d = findDate(s, c.ref); return { value: 'Handover', note: d ? `date ${d.iso}` : undefined }; } },
  { type: 'BA issued', target: 'property_record', field: 'construction_stage', plain: true,
    re: /\b(?:building\s+(?:approval|permit)|\bBA\b)\b[^.\n]{0,40}\b(?:has\s+been\s+|was\s+|now\s+)?(?:issued|approved|granted)\b/i,
    value: (s, _m, c) => ({ value: 'BA Issued', note: `BA issued ${dateOr(s, c).value}` }) },
  { type: 'PCI booked / report', target: 'opportunity', field: 'preSettlementInspectionDate', plain: true,
    re: /\b(?:PCI|practical\s+completion\s+inspection|pre-?settlement\s+inspection)\b[^.\n]{0,50}\b(?:booked|scheduled|arranged|confirmed|set)\b/i, value: (s, _m, c) => dateOnly(s, c) },
  { type: 'PCI booked / report', target: 'opportunity', field: 'preSettlementInspectionStatus', plain: true,
    re: /\b(?:PCI|practical\s+completion\s+inspection|pre-?settlement\s+inspection)\s+report\b/i, value: fixed('Report received') },
  { type: 'Resale listing', target: 'none', field: 'resale_listing', plain: true,
    re: /\b(?:re-?sale|resell(?:ing)?|re-?list(?:ed|ing))\b[^.\n]{0,60}\b(?:listed|listing|market|campaign|live)\b|\blisted\s+(?:for\s+sale|on\s+(?:the\s+)?market)\b|https?:\/\/(?:www\.)?realestate\.com\.au\/property-\S+/i,
    value: (s) => { const u = s.match(/https?:\/\/\S+/); return { value: u ? u[0] : 'Listed' }; } },
];

/** Signature contact details (last lines of the new part): compared with the opportunity's contacts later. */
export function signatureContacts(fresh: string): { phones: string[]; emails: string[] } {
  const tail = fresh.split(/\r?\n/).slice(-25).join('\n');
  const phones = Array.from(new Set((tail.match(/(?:\+?61\s?|0)4\d{2}[\s-]?\d{3}[\s-]?\d{3}|(?:\+?61\s?|\(?0)[2378]\)?[\s-]?\d{4}[\s-]?\d{4}/g) || [])
    .map((p) => p.replace(/[^\d+]/g, '').replace(/^\+?61/, '0'))));
  const emails = Array.from(new Set((tail.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).map((e) => e.toLowerCase())));
  return { phones, emails };
}

export function mineFacts(subject: string, fresh: string, ref: Date, fromBuilder: boolean, contractEvent: boolean): MinedFact[] {
  const out: MinedFact[] = [];
  const seen = new Set<string>();
  const add = (f: MinedFact) => {
    const k = `${f.type}|${f.field}|${f.value}`;
    if (seen.has(k)) return;
    seen.add(k);
    if (f.target === 'opportunity' && !f.fieldId) f.fieldId = FRIENDLY_TO_FIELD_ID[f.field];
    out.push(f);
  };
  const c: Ctx = { ref, fromBuilder };
  const sents = [subject.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, ''), ...splitSentences(fresh)];
  for (const s of sents) {
    for (const r of RULES) {
      const m = s.match(r.re);
      if (!m) continue;
      if (r.plain && (QUESTION.test(s) || NEGATED.test(s.slice(0, (m.index || 0) + m[0].length)))) continue;
      const v = r.value(s, m, c);
      if (!v || !v.value) continue;
      add({ type: r.type, target: r.target, field: typeof r.field === 'string' ? r.field : r.field(m), value: v.value, quote: s.slice(0, 360), note: v.note });
    }
    for (const h of valuationHits(s, ref)) {
      if (h.kind !== 'propose' || !h.field || !h.proposed) continue;
      if (!/booked|attended|outcome|amount/.test(h.field)) continue;
      add({ type: 'Valuation booked / attended / outcome', target: 'opportunity', field: h.field, fieldId: VALUATION_FIELDS[h.field].id, value: h.proposed, quote: s.slice(0, 360) });
    }
  }

  const text = `${subject}\n${fresh}`;
  const facts = extractFacts(text, 'email');
  if (fromBuilder && facts.constructionStage)
    add({ type: 'Construction stage (builder progress claim)', target: 'property_record', field: 'construction_stage', value: facts.constructionStage.value, quote: facts.constructionStage.quote });
  if (facts.registration)
    add({ type: 'Land registration', target: 'property_record', field: 'land_registration', value: 'Registered', quote: facts.registration.quote });
  if (contractEvent || facts.registration) {
    if (facts.lot) add({ type: 'Lot / plan / title reference', target: 'property_record', field: 'lot_number', value: facts.lot.value, quote: facts.lot.quote });
    if (facts.planNumber)
      add({ type: 'Lot / plan / title reference', target: 'none', field: 'plan_number', value: `${facts.planType?.value || ''}${facts.planNumber.value}`, quote: facts.planNumber.quote });
    if (facts.titleReference) add({ type: 'Lot / plan / title reference', target: 'none', field: 'title_reference', value: facts.titleReference.value, quote: facts.titleReference.quote });
    if (facts.contractDate) add({ type: 'Build / land contract dates', target: 'none', field: 'contract_date', value: findDate(facts.contractDate.value, ref)?.iso || facts.contractDate.value, quote: facts.contractDate.quote });
    if (facts.vendorBuilder) add({ type: 'Builder / developer', target: 'opportunity', field: 'agentBuilderDetails', value: facts.vendorBuilder.value, quote: facts.vendorBuilder.quote });
  }
  if (facts.bp && /\b(?:attached|enclosed|received|find|here\s+is|please\s+see)\b/i.test(facts.bp.quote))
    add({ type: 'B&P report received', target: 'opportunity', field: 'bpConditionStatus', value: 'Report received', quote: facts.bp.quote });
  return out;
}
