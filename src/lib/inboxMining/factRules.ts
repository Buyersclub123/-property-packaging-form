import type { FactKey } from './types';

// Fact-extraction rules. No server imports: the queue page re-uses them to find a fact's exact text for highlighting.

export const STAGE_PATTERNS: [string, RegExp][] = [
  ['Handover', /\bhandover\b/i],
  ['Practical Completion', /\bpractical\s+completion\b|\bPC\s+(stage|claim|inspection)\b/i],
  ['Fixing/Plastering', /\b(fixing|fix(ing)?\s+stage|plaster(ing)?)\b/i],
  ['Tiling/Lock-up', /\b(lock[\s-]?up|tiling)\b/i],
  ['Enclosed/Roof Cover', /\b(enclosed|roof\s+cover)\b/i],
  ['Frame/Plate Height', /\b(frame\s+stage|frame\s+(is\s+)?complete|plate\s+height)\b/i],
  ['Slab', /\b(slab|base\s+stage)\b/i],
  ['BA Issued', /\b(BA|building\s+approval|building\s+permit)\s+(issued|approved|received)\b/i],
];

const PLAN_TYPES: Record<string, string> = {
  'DEPOSITED PLAN': 'DP',
  'STRATA PLAN': 'SP',
  'SURVEY PLAN': 'SP',
  'REGISTERED PLAN': 'RP',
  'PLAN OF SUBDIVISION': 'PS',
};

function money(raw: string): string {
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : raw;
}

/** prefer: tested on the 80 characters before a match; avoid: tested on 60 characters either side. */
export type Rule = { key: FactKey; re: RegExp; value: (m: RegExpMatchArray) => string; prefer?: RegExp; avoid?: RegExp };

/** First match, unless the rule says which occurrence to prefer (e.g. the property line over a bill-to block). */
export function pickMatch(rule: Rule, text: string): RegExpMatchArray | null {
  if (!rule.prefer && !rule.avoid) return text.match(rule.re);
  const re = new RegExp(rule.re.source, rule.re.flags.includes('g') ? rule.re.flags : `${rule.re.flags}g`);
  const all: RegExpExecArray[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) {
    all.push(m);
    if (m[0] === '') re.lastIndex++;
  }
  if (!all.length) return null;
  const before = (m: RegExpExecArray) => text.slice(Math.max(0, m.index - 80), m.index);
  const around = (m: RegExpExecArray) => text.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
  return (
    (rule.prefer && all.find((m) => rule.prefer!.test(before(m)))) ||
    (rule.avoid && all.find((m) => !rule.avoid!.test(around(m)))) ||
    all[0]
  );
}

export const RULES: Rule[] = [
  { key: 'lot', re: /\bLot\s*(?:No\.?|Number)?\s*[:#]?\s*(\d{1,5}[A-Z]?)\b/i, value: (m) => m[1].toUpperCase() },
  {
    key: 'planNumber',
    re: /\b(DP|SP|RP|LP|PS|CP|SP|Deposited Plan|Strata Plan|Survey Plan|Registered Plan|Plan of Subdivision)\s*(?:No\.?)?\s*[:#]?\s*(\d{3,7}[A-Z]?)\b/i,
    value: (m) => m[2].toUpperCase(),
  },
  {
    key: 'planType',
    re: /\b(DP|SP|RP|LP|PS|CP|Deposited Plan|Strata Plan|Survey Plan|Registered Plan|Plan of Subdivision)\s*(?:No\.?)?\s*[:#]?\s*\d{3,7}/i,
    value: (m) => PLAN_TYPES[m[1].toUpperCase()] || m[1].toUpperCase(),
  },
  {
    key: 'state',
    re: /\b(NSW|QLD|VIC|WA|SA|TAS|ACT|NT)\s+\d{4}\b/,
    value: (m) => m[1],
    // The property's line (with a lot / allotment number) beats bill-to and letterhead addresses; otherwise the first match as before.
    prefer: /\b(lot|allotment)\s*(?:no\.?\s*)?\d/i,
  },
  { key: 'landPrice', re: /land\s+(?:purchase\s+)?price[^$\d\n]{0,30}\$\s?([\d,]{4,}(?:\.\d{2})?)/i, value: (m) => money(m[1]) },
  {
    key: 'buildPrice',
    re: /(?:build(?:ing)?|construction)\s+(?:contract\s+)?(?:price|sum)[^$\d\n]{0,30}\$\s?([\d,]{4,}(?:\.\d{2})?)|total\s+contract\s+(?:price|sum)[^$\d\n]{0,30}\$\s?([\d,]{4,}(?:\.\d{2})?)/i,
    value: (m) => money(m[1] || m[2]),
  },
  { key: 'totalPrice', re: /(?:total\s+purchase|purchase)\s+price[^$\d\n]{0,30}\$\s?([\d,]{4,}(?:\.\d{2})?)/i, value: (m) => money(m[1]) },
  {
    key: 'contractDate',
    re: /(?:contract\s+date|date\s+of\s+(?:this\s+)?(?:contract|agreement)|date\s+of\s+exchange|exchange\s+date)[^0-9A-Za-z]{0,12}(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9},?\s+\d{4})/i,
    value: (m) => m[1],
  },
  { key: 'purchaser', re: /purchaser(?:\(s\)|s)?(?:'s)?\s*(?:name(?:\(s\))?)?\s*[:\-]\s*([^\n]{3,80})/i, value: (m) => m[1].trim() },
  { key: 'vendorBuilder', re: /(?:vendor|builder)(?:'s)?\s*(?:name)?\s*[:\-]\s*([^\n]{3,80})/i, value: (m) => m[1].trim() },
  {
    key: 'registration',
    re: /(titles?\s+(?:have|has)?\s*(?:now\s+)?(?:been\s+)?(?:issued|registered)|plan\s+(?:has\s+)?(?:now\s+)?(?:been\s+)?registered|registration\s+of\s+(?:the\s+)?(?:plan|titles?)|titles?\s+issued)/i,
    value: (m) => m[1],
  },
  { key: 'titleReference', re: /(?:title\s+reference|folio\s+identifier|title\s+ref\.?|volume\s*\/\s*folio)\s*[:\-]?\s*([A-Z0-9/]{4,20})/i, value: (m) => m[1] },
  { key: 'deposit', re: /deposit[^$\n]{0,40}\$\s?([\d,]{3,}(?:\.\d{2})?)/i, value: (m) => money(m[1]) },
  {
    key: 'finance',
    re: /(formal\s+(?:loan\s+)?approval|unconditional(?:ly)?\s+approv\w*|unconditional\s+loan\s+approval|loan\s+(?:has\s+been\s+)?approved)/i,
    value: (m) => m[1],
  },
  { key: 'bp', re: /(building\s+(?:and|&)\s+pest\s+(?:inspection\s+)?report|B\s?&\s?P\s+report|pest\s+inspection\s+report)/i, value: (m) => m[1] },
];

/** For facts stored before `match` existed: re-run the same rule on the stored quote to recover the matched text. */
export function matchInQuote(key: string, value: string, quote: string): string | null {
  if (key === 'constructionStage') {
    const re = STAGE_PATTERNS.find(([s]) => s === value)?.[1];
    return re ? quote.match(re)?.[0] ?? null : null;
  }
  const rule = RULES.find((r) => r.key === key);
  return rule ? quote.match(rule.re)?.[0] ?? null : null;
}
