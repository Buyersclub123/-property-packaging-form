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

const src = (f: { source: string; quote: string }) => `${f.source}: "${f.quote}"`;

function sydneyDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/**
 * Class-to-field map (plan 2.5, confirmed with changes E). Values are formatted
 * the way phase (b) would write them. No pipeline stage suggestions.
 */
export function buildSuggestions(cls: InboxClass, facts: Facts, receivedAt: Date): Suggestion[] {
  const out: Suggestion[] = [];
  switch (cls) {
    case 'registration_titles_issued': {
      const ev = facts.registration ? src(facts.registration) : 'classification rule';
      out.push(rec('land_registration', 'Registered', ev));
      out.push(opp('registration', 'Registration', ['Yes'], ev));
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
      break;
    }
    case 'deposit_receipt': {
      if (facts.deposit) {
        const build = /build|construction/i.test(facts.deposit.quote);
        out.push(opp(build ? 'buildDepositPaid' : 'landDepositPaid', build ? 'Build Deposit Paid' : 'Land Deposit Paid', ['Yes'], src(facts.deposit)));
      }
      break;
    }
    case 'bp_report': {
      out.push(
        opp('bpConditionStatus', 'B&P Condition Status', 'Report received', facts.bp ? src(facts.bp) : 'classification rule',
          'Option text to be agreed before phase (b)')
      );
      break;
    }
    case 'finance_update': {
      if (facts.finance && /formal|unconditional/i.test(facts.finance.value)) {
        out.push(opp('financeApprovalReceived', 'Finance Formal Approval Received', ['Yes'], src(facts.finance)));
      }
      break;
    }
    case 'build_update_progress_claim': {
      out.push(opp('lastConstructionUpdateDate', 'Last Construction Update Date', sydneyDate(receivedAt), 'email received date'));
      if (facts.constructionStage) out.push(rec('construction_stage', facts.constructionStage.value, src(facts.constructionStage)));
      break;
    }
    default:
      break;
  }
  return out;
}
