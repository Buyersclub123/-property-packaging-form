// Precedent check (backlog 21): shared types, thresholds and the per-suggestion verdict. No server imports (used by the page).

export const WINDOW_DAYS = 14;
export const MIN_EMAILS = 20;
export const MIN_RATE = 0.3;
/** Date fields often hold the event date (e.g. the day the deposit was paid), which can be a day or two before the email. */
export const DATE_LEAD_DAYS = 2;

export interface FieldStat { fieldId: string; name: string; hits: number; rate: number; medianDays: number | null; schedule?: boolean }

/** Deadline / scheduled dates (due, expiry, ETA...) can fall inside the window without anyone acting, so they never count as a change. */
export const isScheduleField = (name: string) =>
  /due|expiry|eta\b|estimated|expected|scheduled|extension|appointment|calendar|check in|settlement date|inspection date/i.test(name);
export interface CurrentStat { fieldId: string; name: string; opps: number; set: number; rate: number; top: [string, number][] }
export interface TypeStats {
  type: string;
  emails: number;
  opps: number;
  fieldChanged: number;
  replied: number;
  noteTask: number;
  nothing: number;
  stageMoved: number;
  medianReplyHrs: number | null;
  dateFields: FieldStat[];
  current: CurrentStat[];
}
export interface PrecedentSummary {
  builtAt: string;
  windowDays: number;
  minEmails: number;
  minRate: number;
  emails: number;
  oppsLoaded: number;
  contacts: number;
  contactErrors: number;
  missingOpp: number;
  errors: string[];
  types: TypeStats[];
}

/** Inbox (queue) class -> June-Oct activity type it is measured against. */
export const CLASS_TO_ACTIVITY: Record<string, string> = {
  registration_titles_issued: 'registration_confirmation',
  contract_received_unsigned: 'contract_received',
  contract_executed_exchanged: 'executed_contract',
  deposit_receipt: 'deposit_paid',
  bp_report: 'bp_report',
  finance_update: 'finance_update',
  build_update_progress_claim: 'build_update',
};

/** Non-date opportunity fields the class-to-field map suggests: only today's value exists for these. */
export const CURRENT_FIELDS: Record<string, string> = {
  Bnw4HsJmQKftLhEuo5VS: 'Registration',
  V0dIHoJT8xQDYtMVbZi5: 'Land Deposit Paid',
  z46PLoTif5bLLyVNeL13: 'Build Deposit Paid',
  ltb5pdvpiOp47H5Q8g7C: 'B&P Condition Status',
  KaDnA48WSWgbYKtl3oPx: 'Finance Formal Approval Received',
};

export const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '–');

export function precedentFor(
  summary: PrecedentSummary | null,
  cls: string,
  s: { target: string; fieldId?: string; fieldLabel: string }
): { ok: boolean | null; line: string } | null {
  if (!summary) return null;
  const act = CLASS_TO_ACTIVITY[cls];
  const ts = act ? summary.types.find((t) => t.type === act) : undefined;
  if (!act) return { ok: false, line: 'No precedent: this class has no matching activity type' };
  if (!ts || ts.emails < summary.minEmails) {
    return { ok: false, line: `No precedent: only ${ts?.emails || 0} matched ${act.replace(/_/g, ' ')} emails (needs ${summary.minEmails})` };
  }
  const base = `${ts.emails} ${act.replace(/_/g, ' ')} emails: field changed ${pct(ts.fieldChanged, ts.emails)}, reply ${pct(ts.replied, ts.emails)}, note/task ${pct(ts.noteTask, ts.emails)}, nothing ${pct(ts.nothing, ts.emails)}`;
  if (s.target !== 'opportunity' || !s.fieldId) return { ok: null, line: `${base}. Property Record fields have no history, so no field-level precedent.` };
  const df = ts.dateFields.find((f) => f.fieldId === s.fieldId);
  if (df) {
    return {
      ok: df.rate >= summary.minRate,
      line: `${base}. ${df.name} set within ${summary.windowDays} days in ${Math.round(df.rate * 100)}%${df.medianDays !== null ? ` (median ${df.medianDays} days)` : ''}.`,
    };
  }
  const cur = ts.current.find((f) => f.fieldId === s.fieldId);
  if (cur) {
    const top = cur.top[0] ? ` (most common: ${cur.top[0][0]})` : '';
    return { ok: cur.rate >= summary.minRate, line: `${base}. ${Math.round(cur.rate * 100)}% of these opportunities now have ${cur.name} set${top}; no timing for this field.` };
  }
  return { ok: false, line: `${base}. No data for ${s.fieldLabel}.` };
}
