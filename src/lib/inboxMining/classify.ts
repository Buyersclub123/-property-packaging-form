import type { InboxClass } from './types';

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
}

const CONTRACT_FILE =
  /\b(COS|VS|contract|vendor\s+statement|section\s+32|form\s+1|disclosure|HIA|MBA|offer\s+(?:and|&)\s+acceptance|deed\s+of\s+nomination)\b/i;
const EXECUTED_FILE = /\b(exchanged|executed|fully\s+signed|signed)\b/i;

function hit(re: RegExp, ...texts: string[]): string | null {
  for (const t of texts) {
    const m = t.match(re);
    if (m) return m[0];
  }
  return null;
}

/** Rules only (phase a). Order matters: the first rule that fires wins, and the rule is shown in the UI. */
export function classify(input: ClassifyInput): ClassifyResult {
  const { subject, body, docText } = input;
  const files = input.filenames.join(' | ');
  const head = body.slice(0, 4000);

  let m = hit(
    /titles?\s+(?:have\s+|has\s+)?(?:now\s+)?(?:been\s+)?(?:issued|registered)|plan\s+(?:has\s+)?(?:now\s+)?(?:been\s+)?registered|registration\s+of\s+(?:the\s+)?(?:plan|titles?)|titles?\s+issued/i,
    subject,
    head
  );
  if (m) return { cls: 'registration_titles_issued', rule: `registration wording: "${m}"` };

  m = hit(/deposit\s+(?:receipt|received|paid)|trust\s+(?:account\s+)?receipt|receipt\s+of\s+deposit/i, subject, files, head);
  if (m) return { cls: 'deposit_receipt', rule: `deposit receipt wording: "${m}"` };

  m = hit(/building\s+(?:and|&)\s+pest|B\s?&\s?P\s+(?:report|inspection)|pest\s+inspection/i, subject, files);
  if (m) return { cls: 'bp_report', rule: `B&P wording: "${m}"` };

  m = hit(/formal\s+(?:loan\s+)?approval|unconditional(?:ly)?\s+approv\w*|loan\s+(?:has\s+been\s+)?approved|conditional\s+approval|finance\s+approv\w*|valuation\s+(?:report|returned|came\s+in)/i, subject, head);
  if (m) return { cls: 'finance_update', rule: `finance wording: "${m}"` };

  const domain = input.fromEmail.split('@')[1] || '';
  const builder = input.builderSenders.get(input.fromEmail) || input.builderSenders.get(domain);
  if (builder) return { cls: 'build_update_progress_claim', rule: `sender is builder "${builder}" in Kata's tracker` };
  m = hit(/progress\s+claim|construction\s+update|build(?:ing)?\s+update|site\s+update|stage\s+(?:claim|invoice|payment)|slab\s+(?:stage|complete|poured)|frame\s+stage|lock[\s-]?up\s+stage|practical\s+completion/i, subject, files);
  if (m) return { cls: 'build_update_progress_claim', rule: `build update wording: "${m}"` };

  const contractFile = input.filenames.find((f) => /\.(pdf|zip)$/i.test(f) && CONTRACT_FILE.test(f));
  m = hit(/\b(?:exchanged|executed|fully\s+signed)\b|completed:\s|signed\s+contracts?/i, subject);
  if (m && (contractFile || /docusign envelope id/i.test(docText)))
    return { cls: 'contract_executed_exchanged', rule: `executed wording in subject: "${m}"` };
  const execFile = input.filenames.find((f) => CONTRACT_FILE.test(f) && EXECUTED_FILE.test(f));
  if (execFile) return { cls: 'contract_executed_exchanged', rule: `executed contract file: "${execFile}"` };

  if (contractFile) return { cls: 'contract_received_unsigned', rule: `contract file: "${contractFile}"` };
  m = hit(/contracts?\s+(?:for\s+(?:review|signing)|attached|issued|for\s+lot)/i, subject, head);
  if (m) return { cls: 'contract_received_unsigned', rule: `contract wording: "${m}"` };

  return { cls: 'other', rule: 'no rule matched' };
}
