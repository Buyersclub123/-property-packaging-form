import type { InboxClass, ClassBasis } from './types';

export interface ClassifyInput {
  subject: string;
  body: string;
  filenames: string[];
  docText: string;
  fromEmail: string;
  builderSenders: Map<string, string>;
}

export interface ClassifyResult {
  cls: InboxClass;
  rule: string;
  /** The text the class was based on (subject line, file name or email line), quoted in WHY. */
  basis?: ClassBasis;
  /** A client asking a question: a reply item, never a field suggestion (JT 01/11). */
  question?: boolean;
}

const CONTRACT_FILE =
  /\b(COS|VS|contract|vendor\s+statement|section\s+32|form\s+1|disclosure|HIA|MBA|offer\s+(?:and|&)\s+acceptance|deed\s+of\s+nomination)\b/i;
const EXECUTED_FILE = /\b(exchanged|executed|fully\s+signed|signed)\b/i;
const INTERNAL = /@buyersclub\.com\.au$/i;
const PERSONAL_DOMAIN = /^(gmail|hotmail|outlook|live|yahoo|icloud|me|bigpond|optusnet|iinet|tpg)\./i;
const QUESTION =
  /\?|\b(?:can|could|would)\s+you\b|\bplease\s+(?:advise|confirm|let\s+(?:me|us)\s+know|update)\b|\bwhen\s+(?:will|is|can|do|are)\b|\bany\s+update\b|\bapproximate\s+date\b|\bwhat\s+is\s+the\s+(?:status|date)\b/i;
const PROGRESS =
  /progress\s+claim|construction\s+update|build(?:ing)?\s+update|site\s+update|stage\s+(?:claim|invoice|payment|receipt)|\b(?:base|slab|frame|lock[\s-]?up|enclosed|fixing|roof|final|pci)\s*(?:stage|claim|payment|invoice|inspection|complete[d]?)\b|slab\s+poured|practical\s+completion|-claim-|\bhandover\b/i;
const CONTRACT_EVENT =
  /accepted\s+(?:land\s+|build\s+|hia\s+)?contract|exchange\s+of\s+contracts|contracts?\s+(?:have\s+been\s+|has\s+been\s+|were\s+)?exchanged|\bexchanged\b|fully\s+executed|executed\s+(?:land\s+|build\s+|hia\s+)?contract/i;

/** First line of the body without quoted replies, for basis quotes. */
const bodyLines = (body: string) => body.split(/\r?\n/).filter((l) => !/^\s*>/.test(l));

function find(re: RegExp, subject: string, files: string[], head: string): ClassBasis | null {
  let m = subject.match(re);
  if (m) return { where: 'subject', text: subject.trim(), match: m[0] };
  for (const f of files) {
    m = f.match(re);
    if (m) return { where: 'file', text: f, match: m[0] };
  }
  if (head) {
    for (const line of bodyLines(head)) {
      m = line.match(re);
      if (m) return { where: 'email', text: line.trim().slice(0, 300), match: m[0] };
    }
  }
  return null;
}

/** Rules only (phase a). Order matters: the first rule that fires wins, and the rule is shown in the UI. */
export function classify(input: ClassifyInput): ClassifyResult {
  const { subject, body, docText } = input;
  const files = input.filenames;
  const head = body.slice(0, 4000);
  const first = bodyLines(body).join('\n').slice(0, 600);
  const said = (b: ClassBasis) => `"${b.match}" in the ${b.where === 'subject' ? 'subject line' : b.where === 'file' ? 'file name' : 'email'}`;
  const domain = input.fromEmail.split('@')[1] || '';
  const builder = input.builderSenders.get(input.fromEmail) || input.builderSenders.get(domain);

  // JT 01/11: a client asking a question is a reply item, never a date-field suggestion.
  if (!builder && !INTERNAL.test(input.fromEmail) && PERSONAL_DOMAIN.test(domain)) {
    const q = find(QUESTION, subject.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, ''), [], first);
    if (q) return { cls: 'other', rule: `client question: ${said(q)}`, basis: q, question: true };
  }

  let b = find(
    /titles?\s+(?:have\s+|has\s+)?(?:now\s+)?(?:been\s+)?(?:issued|registered)|plan\s+(?:has\s+)?(?:now\s+)?(?:been\s+)?registered|registration\s+of\s+(?:the\s+)?(?:plan|titles?)|titles?\s+issued/i,
    subject, [], head
  );
  if (b) return { cls: 'registration_titles_issued', rule: `registration wording: ${said(b)}`, basis: b };

  b = find(/deposit\s+(?:receipt|received|paid)|trust\s+(?:account\s+)?receipt|receipt\s+of\s+deposit/i, subject, files, head);
  if (b) return { cls: 'deposit_receipt', rule: `deposit receipt wording: ${said(b)}`, basis: b };

  b = find(/building\s+(?:and|&)\s+pest|B\s?&\s?P\s+(?:report|inspection)|pest\s+inspection/i, subject, files, '');
  if (b) return { cls: 'bp_report', rule: `B&P wording: ${said(b)}`, basis: b };

  b = find(/formal\s+(?:loan\s+)?approval|unconditional(?:ly)?\s+approv\w*|loan\s+(?:has\s+been\s+)?approved|conditional\s+approval|finance\s+approv\w*|valuation\s+(?:report|returned|came\s+in)/i, subject, [], head);
  if (b) return { cls: 'finance_update', rule: `finance wording: ${said(b)}`, basis: b };

  // JT 01/11: "Accepted land contract" / exchange emails are contract events, whoever sends them.
  b = find(CONTRACT_EVENT, subject, [], '');
  if (b) return { cls: 'contract_executed_exchanged', rule: `contract event wording: ${said(b)}`, basis: b };

  // JT 01/11: build-update class only from builder senders (Kata's tracker) with progress wording.
  if (builder) {
    b = find(PROGRESS, subject, files, head);
    if (b) return { cls: 'build_update_progress_claim', rule: `builder "${builder}" (Kata's tracker) + progress wording: ${said(b)}`, basis: b };
  }

  const contractFile = files.find((f) => /\.(pdf|zip)$/i.test(f) && CONTRACT_FILE.test(f));
  b = find(/\b(?:executed|fully\s+signed)\b|completed:\s|signed\s+contracts?/i, subject, [], '');
  if (b && (contractFile || /docusign envelope id/i.test(docText)))
    return { cls: 'contract_executed_exchanged', rule: `executed wording: ${said(b)}`, basis: b };
  const execFile = files.find((f) => CONTRACT_FILE.test(f) && EXECUTED_FILE.test(f));
  if (execFile) {
    const m = execFile.match(EXECUTED_FILE)![0];
    return { cls: 'contract_executed_exchanged', rule: `executed contract file: "${execFile}"`, basis: { where: 'file', text: execFile, match: m } };
  }

  if (contractFile) {
    const m = contractFile.match(CONTRACT_FILE)![0];
    return { cls: 'contract_received_unsigned', rule: `contract file: "${contractFile}"`, basis: { where: 'file', text: contractFile, match: m } };
  }
  b = find(/contracts?\s+(?:for\s+(?:review|signing)|attached|issued|for\s+lot)/i, subject, [], head);
  if (b) return { cls: 'contract_received_unsigned', rule: `contract wording: ${said(b)}`, basis: b };

  return { cls: 'other', rule: builder ? `builder "${builder}" but no progress wording` : 'no rule matched' };
}
