import { FRIENDLY_TO_FIELD_ID, PROPERTY_FIELD_MAP, PROPERTY_FIELD_LABELS } from '@/app/api/contract-team-reporting/fields';
import type { Facts, InboxClass, Suggestion } from './types';

const RECORD_KEYS = new Set(Object.values(PROPERTY_FIELD_MAP));

function opp(friendly: string, label: string, proposed: string | string[], source: string, note?: string): Suggestion {
  const fieldId = FRIENDLY_TO_FIELD_ID[friendly];
  return { target: 'opportunity', fieldKey: friendly, fieldLabel: label, fieldId, proposed, source, notInGhl: !fieldId, note };
}

function rec(key: string, proposed: string, source: string): Suggestion {
  const inGhl = RECORD_KEYS.has(key);
  return {
    target: 'property_record',
    fieldKey: key,
    fieldLabel: (PROPERTY_FIELD_LABELS[key] || key).trim(),
    proposed,
    source,
    notInGhl: !inGhl,
  };
}

/** Expected action with no field write (JT 28/10 class-to-field map). */
function action(key: string, label: string, source: string, note?: string): Suggestion {
  return { target: 'action', fieldKey: key, fieldLabel: label, proposed: '', source, notInGhl: true, note };
}

const src = (f: { source: string; quote: string }) => `${f.source}: "${f.quote}"`;

function isoDate(raw: string): string | null {
  const m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function sydneyDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * Class-to-field map (plan 2.5, confirmed with changes E; revised by JT 28/10 from the precedent check,
 * docs/planning/agent-plans/class-to-field-map-proposal.md). Values are formatted the way phase (b)
 * would write them. No pipeline stage suggestions.
 */
export function buildSuggestions(cls: InboxClass, facts: Facts, receivedAt: Date): Suggestion[] {
  const out: Suggestion[] = [];
  switch (cls) {
    case 'registration_titles_issued': {
      const ev = facts.registration ? src(facts.registration) : 'classification rule';
      out.push(rec('land_registration', 'Registered', ev));
      out.push(opp('registration', 'Registration', ['Registered'], ev));
      if (facts.titleReference) out.push(rec('title_reference', facts.titleReference.value, src(facts.titleReference)));
      break;
    }
    case 'contract_executed_exchanged': {
      if (facts.lot) out.push(rec('lot_number', facts.lot.value, src(facts.lot)));
      if (facts.landPrice) out.push(rec('land_price', facts.landPrice.value, src(facts.landPrice)));
      if (facts.buildPrice) out.push(rec('build_price', facts.buildPrice.value, src(facts.buildPrice)));
      if (facts.totalPrice) out.push(rec('total_price', facts.totalPrice.value, src(facts.totalPrice)));
      if (facts.contractDate) out.push(rec('contract_date', facts.contractDate.value, src(facts.contractDate)));
      if (facts.planNumber)
        out.push(rec('plan_number', `${facts.planType?.value || ''}${facts.planNumber.value}`, src(facts.planNumber)));
      if (facts.titleReference) out.push(rec('title_reference', facts.titleReference.value, src(facts.titleReference)));
      const exchange = facts.contractDate ? isoDate(facts.contractDate.value) : null;
      out.push(
        exchange
          ? opp('exchangeDate', 'Exchange Date', exchange, src(facts.contractDate!))
          : opp('exchangeDate', 'Exchange Date', sydneyDate(receivedAt), 'email received date (no date found in the contract)')
      );
      break;
    }
    case 'deposit_receipt': {
      out.push(action('record_deposit_paid', 'Record deposit paid on the opportunity', facts.deposit ? src(facts.deposit) : 'classification rule',
        'Land / Build Deposit Paid boxes; mapped to a field later'));
      break;
    }
    case 'bp_report': {
      out.push(action('record_bp_outcome', 'Review the B&P report and record the outcome in B&P Condition Status',
        facts.bp ? src(facts.bp) : 'classification rule', 'The team records the outcome (e.g. Satisfied), not receipt'));
      break;
    }
    case 'finance_update': {
      if (facts.finance && /formal|unconditional/i.test(facts.finance.value)) {
        out.push(opp('financeApprovalReceived', 'Finance Formal Approval Received', ['Yes'], src(facts.finance)));
      }
      break;
    }
    case 'build_update_progress_claim': {
      out.push(action('pass_build_update', 'Pass the build update on to the client',
        facts.constructionStage ? src(facts.constructionStage) : `email received ${sydneyDate(receivedAt)}`));
      break;
    }
    default:
      break;
  }
  return out;
}
