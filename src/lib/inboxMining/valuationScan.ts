import { getDb } from '@/lib/db';
import { gmailFor } from './google';
import { getAttachment, getMessage, sydneyWindow } from './gmail';
import { readPdf } from './extract';
import { fetchOpps, fetchStageNames, INBOX_PIPELINES, type Opp } from './ghl';
import { clientNames, oppLot, wordIn } from './match';

// Read-only valuation evidence scan: Gmail is only read, GHL is only read, nothing is stored.

export const VALUATION_FIELDS = {
  valuation_access_estimate: { id: 'tM6af4OZGnBX4bSrf1bn', label: 'Valuation access estimate' },
  valuation_access_available: { id: '362dbBtKjPU682iyoiTK', label: 'Valuation access available' },
  valuation_expected_access_date: { id: 'PSqmNxR4Etg8twxxg6c6', label: 'Valuation access available date from' },
  valuation_requested: { id: 'YvFO6OfND0rUymcdiaEC', label: 'Valuation requested' },
  valuation_requested_date: { id: 'Do1cTPfQBabBNnna9lm7', label: 'Valuation requested date' },
  valuation_booked_date: { id: 'qqTrF20beTSfT5MVlcyr', label: 'Valuation booked date' },
  valuation_attended: { id: 'jMQzRJlqXcMadLAaQQHE', label: 'Valuation attended' },
  valuation_attended_date: { id: 'doXsMp7kGfYW5MCfgEQB', label: 'Valuation attended date' },
  valuation_outcome: { id: 'SpU2h8HHC0vsjOvuAxeB', label: 'Valuation outcome' },
  valuation_amount_residential: { id: 'K2L0idGtMv7dzEahtl6S', label: 'Valuation amount (residential)' },
} as const;
export type ValField = keyof typeof VALUATION_FIELDS;

/** kind: 'propose' = a field value; 'context' = valuation evidence with no field to propose (e.g. access not yet available). */
export interface ValHit {
  kind: 'propose' | 'context';
  field?: ValField;
  proposed?: string;
  rule: string;
}

export interface ValEvidence {
  mailbox: string;
  messageId: string;
  threadId: string;
  subject: string;
  /** Who said it and when: the message itself, or the header of a quoted reply inside it. */
  by: string;
  at: string;
  quoted: boolean;
  source: string;
  quote: string;
  hits: ValHit[];
}

export interface ValThread {
  mailbox: string;
  threadId: string;
  subject: string;
  opp: { id: string; name: string; pipeline: string; stage: string; how: string } | null;
  oppCandidates: string[];
  current: Partial<Record<ValField, string>>;
  evidence: ValEvidence[];
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MON = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const monthIdx = (s: string) => MONTHS.findIndex((m) => m.startsWith(s.toLowerCase().slice(0, 3)));
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());

function sydneyYmd(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function ymd(y: number, m: number, d: number): string | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Year for a day/month with no year: the one nearest the email date (4 months before to 8 months after). */
function inferYear(m: number, d: number, ref: Date): number {
  const y = parseInt(sydneyYmd(ref).slice(0, 4), 10);
  for (const cand of [y, y + 1, y - 1]) {
    const diff = (Date.UTC(cand, m, d) - ref.getTime()) / 86400000;
    if (diff >= -120 && diff <= 240) return cand;
  }
  return y;
}

/** First explicit date in the text as YYYY-MM-DD; today/tomorrow/yesterday are relative to the email. */
export function findDate(text: string, ref: Date): { iso: string; raw: string } | null {
  const cands: { i: number; iso: string; raw: string }[] = [];
  let m: RegExpExecArray | null;
  const num = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b/g;
  while ((m = num.exec(text))) {
    const y = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const iso = ymd(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    if (iso) cands.push({ i: m.index, iso, raw: m[0] });
  }
  const dm = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\b,?(?:\\s+(20\\d{2}))?`, 'gi');
  while ((m = dm.exec(text))) {
    const mi = monthIdx(m[2]);
    const d = parseInt(m[1], 10);
    const iso = ymd(m[3] ? parseInt(m[3], 10) : inferYear(mi, d, ref), mi, d);
    if (iso) cands.push({ i: m.index, iso, raw: m[0] });
  }
  const md = new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s+(20\\d{2}))?`, 'gi');
  while ((m = md.exec(text))) {
    const mi = monthIdx(m[1]);
    const d = parseInt(m[2], 10);
    const iso = ymd(m[3] ? parseInt(m[3], 10) : inferYear(mi, d, ref), mi, d);
    if (iso) cands.push({ i: m.index, iso, raw: m[0] });
  }
  const rel = /\b(today|tomorrow|yesterday)\b/gi;
  while ((m = rel.exec(text))) {
    const off = ({ today: 0, tomorrow: 1, yesterday: -1 } as Record<string, number>)[m[1].toLowerCase()];
    cands.push({ i: m.index, iso: sydneyYmd(new Date(ref.getTime() + off * 86400000)), raw: m[0] });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.i - b.i);
  return { iso: cands[0].iso, raw: cands[0].raw };
}

function monthYear(text: string, ref: Date): string | null {
  const m = text.match(new RegExp(`\\b${MON}\\s+(20\\d{2})\\b`, 'i'));
  if (m) return `${cap(MONTHS[monthIdx(m[1])])} ${m[2]}`;
  const n = text.match(new RegExp(`\\b(?:in|by|around|during|early|mid|late|end of)\\s+${MON}\\b(?!\\s+\\d)`, 'i'));
  if (n) {
    const mi = monthIdx(n[1]);
    return `${cap(MONTHS[mi])} ${inferYear(mi, 15, ref)}`;
  }
  return null;
}

// ---- splitting a message into its own text and dated quoted replies ----

export interface Segment {
  by: string;
  at: Date | null;
  quoted: boolean;
  text: string;
}

const HEADER = /(?:^|\n)[ \t]*(?:On ((?:[^\n]{0,160}?\n?){1,3}?)\s?wrote:|From:[ \t]*([^\n]+)\n[ \t]*(?:Sent|Date):[ \t]*([^\n]+))/gi;

function headerDate(raw: string): Date | null {
  // Time of day is approximate (Sydney ~UTC+10/11); only the day matters for the window.
  const t = raw.replace(/\s+/g, ' ').trim();
  const time = t.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hh = time ? +time[1] % 12 + (/pm/i.test(time[3] || '') ? 12 : 0) : 12;
  if (time && !time[3]) hh = +time[1];
  const at = (y: number, mo: number, d: number) => new Date(Date.UTC(y, mo, d, hh - 11, time ? +time[2] : 0));
  const dm = t.match(new RegExp(`\\b(\\d{1,2})\\s+${MON}\\s+(20\\d{2})`, 'i'));
  if (dm) return at(+dm[3], monthIdx(dm[2]), +dm[1]);
  const md = t.match(new RegExp(`\\b${MON}\\s+(\\d{1,2}),?\\s+(20\\d{2})`, 'i'));
  if (md) return at(+md[3], monthIdx(md[1]), +md[2]);
  const n = t.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if (n) return at(+n[3], +n[2] - 1, +n[1]);
  const iso = t.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return at(+iso[1], +iso[2] - 1, +iso[3]);
  return null;
}

export function segments(text: string, by: string, at: Date): Segment[] {
  const clean = text
    .split('\n')
    .map((l) => l.replace(/^[ \t>]+/, '').replace(/\*/g, ''))
    .join('\n');
  const marks: { i: number; end: number; by: string; at: Date | null }[] = [];
  for (const m of clean.matchAll(HEADER)) {
    const i = m.index ?? 0;
    if (m[1] !== undefined) {
      const h = m[1].replace(/\n/g, ' ');
      const who = h.match(/([^,]*<[^>]+>)\s*$/)?.[1] || h.split(',').slice(-1)[0];
      const name = who.replace(/^.*\b\d{1,2}:\d{2}(?:\s*[AP]M)?\s*/i, '').replace(/^.*\b20\d{2}\s*/, '').trim();
      marks.push({ i, end: i + m[0].length, by: name || who.trim(), at: headerDate(h) });
    } else {
      marks.push({ i, end: i + m[0].length, by: m[2].trim(), at: headerDate(m[3]) });
    }
  }
  const out: Segment[] = [{ by, at, quoted: false, text: clean.slice(0, marks[0]?.i ?? clean.length) }];
  marks.forEach((mk, k) => {
    out.push({ by: mk.by, at: mk.at, quoted: true, text: clean.slice(mk.end, marks[k + 1]?.i ?? clean.length) });
  });
  return out.map((s) => ({ ...s, text: s.text.replace(/^(?:To|Cc|Subject|Sent|Date):[^\n]*$/gim, '') }));
}

// ---- rules ----

const KW = /\bvaluations?\b|\bvaluers?\b|\bvals?\b|\bvalued at\b|\bbe valued\b|\bcan be valued\b/i;
const BOILERPLATE = /if a valuation inspection is required|valued (?:client|member|employee|customer)|for bank valuation or inspection requirements|valuation intervention team|matters to valuers|for valuers|valuers can recognise|tested later by valuation|bookings: valuations|not a valuation|valuation on your timepiece|will order a valuation and progress your file|may require a valuation|any valuation required by your lender/i;
const CONSTRUCTION = /progress (?:inspection|claim|payment|valuation)|final (?:valuation|payment|claim|inspection)|releasing payment|before payment|proceeding with payment|authori[sz]ed[^.]{0,20}payment|payment to the builder|100%|practical completion|\bPCI\b|final account|lock ?up|frame stage|internal valuation|works are complete|scope of works/i;

const OUTCOME: [string, RegExp][] = [
  ['Shortfall', /shortfall|came (?:in|back) (?:short|under|below|low)|(?:under|below)[- ]value|valued? (?:under|below|less than)|valued at \$[\d,]+k? (?:below|under|less)|short of (?:the )?(?:contract|purchase)|lower than (?:the )?(?:contract|purchase)|\$[\d,]+k? short\b|short by \$/i],
  ['Above value', /came (?:in|back) (?:above|over|higher)|above (?:the )?(?:contract|purchase) (?:price|value)|above value|over value/i],
  ['At value', /(?:came|come|coming|has come|is back|came back|come back) (?:in |back )?(?:at|on) (?:full )?(?:value|contract|purchase price)|\bat value\b|valued at (?:the )?(?:contract|purchase) price|supports? the (?:contract|purchase) price|no shortfall|met (?:the )?(?:contract|purchase) price|in line with the contract price/i],
  ['Pending', /valuation (?:is )?(?:still )?(?:pending|outstanding|to come|awaited)|awaiting (?:the )?valuation|waiting (?:on|for) (?:the )?valuation|valuation (?:report )?(?:is )?not (?:yet )?(?:back|received|in)|working with the (?:bank )?valuer to update/i],
];
const AMOUNT = /(?:valued at|valuation (?:amount|figure|came in at|came back at|of|at|is|was|:)|valuation (?:that )?(?:has )?(?:come|came) (?:in|back) at|market value(?: of| is| :|:)?)\s*:?\s*\$\s?(\d{1,3}(?:,\d{3})+|\d{5,})(?:\.\d{2})?(?!\s*(?:below|under|less|short|above|over|more))/i;
const ATTENDED = /(?:valuer|valuation|valuation inspection|valuation report)\b[^.,]{0,25}?\b(?:attended|has (?:now )?been completed|was completed|conducted|carried out|took place|has been done|was done|done today|(?:fully )?inspected)|valuer (?:has )?(?:been|went) (?:out|to (?:the )?(?:site|property))|attended (?:the )?(?:site|property) for (?:the )?valuation|valuation report[^.]{0,30}(?:has (?:now )?been completed|completed and returned)/i;
const BOOKED = /(?:valuation|valuer)\b[^.]{0,50}?\b(?:booked|scheduled|arranged) (?:in )?(?:for|on)\b|valuer (?:will|is going to|is due to) (?:attend|inspect|be (?:on site|attending|at))|booked (?:in )?(?:the |a )?valuation|valuation (?:appointment|inspection) (?:is )?(?:on|for)\b|inspection to be conducted on/i;
const REQUESTED = /(?:valuation|valuer)\b[^.]{0,30}?\b(?:has been |was |been |have )?(?:ordered|requested|instructed|submitted|initiated)\b|\b(?:has|have|had|we've|I've|broker has|lender has|bank has)\s+(?:now\s+)?(?:ordered|requested|instructed|initiated|submitted)\s+(?:a |the |an |some )?(?:\w+ ){0,2}valuations?\b|valuation request (?:has been |was )?(?:sent|submitted|lodged)/i;
const NOT_DONE = /\b(?:will|to order|reorder|re-order|need(?:s)? to|please|can you|could you|once|when|if|until|as soon as|waiting for (?:your|the) instructions?|to be)\b/i;
const NEGATED = /\b(?:hasn['’]t|has not|have not|haven['’]t|not (?:yet )?(?:been )?(?:ordered|requested|booked|attended|completed|available)|not as of yet|yet to be)\b/i;
const QUESTION = /\?|please confirm|can you confirm|confirm (?:if|whether)|just confirming/i;
const CANCELLED = /cancel+ed|unable to (?:access|attend)|access issues?|could not (?:access|attend)|couldn't (?:access|attend)|fenced off|still under construction/i;
const ACCESS_YES = /(?:is|are|now|site is|lot is|land is|property is) (?:now )?(?:ready|available|accessible|open) (?:for|to) (?:the |a )?(?:valuation|valuer|val)\b|valuation access (?:is |has been |has just been )?(?:now )?(?:available|confirmed|granted|ready)|access (?:for|to) (?:the )?(?:valu\w+|valuer) (?:is |has been )?(?:now )?(?:available|confirmed|granted)|can now be valued|ready to be valued|accessible for valuation/i;
const ACCESS_NO = /not (?:yet )?(?:ready|available|accessible) for (?:the )?valu|not in a state that the land can be valued|would not be ready for|cannot be valued|can't be valued|no valuation access|valuation access (?:is )?not|until (?:valuation )?access|once valuation access|as soon as valuation access|when valuation access|update on valuation access|civil works are still underway|until next year/i;
const ACCESS_FROM = /(?:access|valu\w+)[^.]{0,60}?\b(?:from|after|expected|estimated|anticipated|by|around|in)\b/i;

/** Sentences that mention a valuation, from a segment's text. */
export function sentences(text: string): string[] {
  const flat = text.replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  for (const s of flat.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)) {
    const t = s.trim();
    if (!keepSentence(t)) continue;
    out.push(t.length > 360 ? `${t.slice(0, 360)}…` : t);
  }
  return out;
}

export function keepSentence(t: string): boolean {
  return t.length >= 8 && KW.test(t) && !BOILERPLATE.test(t) && (t.match(/@/g) || []).length < 3;
}

export function valuationHits(line: string, ref: Date): ValHit[] {
  const hits: ValHit[] = [];
  const emailDay = sydneyYmd(ref);
  const date = findDate(line, ref);
  const P = (field: ValField, proposed: string, rule: string) => hits.push({ kind: 'propose', field, proposed, rule });
  const C = (rule: string) => hits.push({ kind: 'context', rule });
  if (CONSTRUCTION.test(line) && !/settlement|formal approval|land valuation|pre-?settlement/i.test(line)) {
    C('construction progress / final valuation (not the purchase valuation; no field proposed)');
    return hits;
  }
  const question = QUESTION.test(line);
  const negated = NEGATED.test(line);
  for (const [label, re] of OUTCOME) {
    if (!re.test(line)) continue;
    if (label === 'Pending' && /has (?:now )?been completed|completed and returned|came back|come back at/i.test(line)) continue;
    P('valuation_outcome', label, `outcome wording → ${label}`);
    break;
  }
  const amt = line.match(AMOUNT);
  if (amt && /valuation|valuer|market value|property|dwelling|land/i.test(line) && !/complimentary|review \(valued|offer/i.test(line)) {
    P('valuation_amount_residential', `$${amt[1].replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`, 'valuation amount');
  }
  if (question) C('question, not a statement (no field proposed)');
  else if (CANCELLED.test(line)) C('valuation cancelled / no access (no field proposed)');
  else if (ATTENDED.test(line) && !NOT_DONE.test(line.match(ATTENDED)![0]) && !/to be conducted|will be (?:conducted|completed)/i.test(line) && !negated) {
    const d = date && date.iso <= emailDay ? date : null;
    P('valuation_attended', 'Yes', 'valuer attended / valuation done');
    P('valuation_attended_date', d ? d.iso : emailDay, d ? `date in text "${d.raw}"` : 'no date in text: email date');
  } else if (BOOKED.test(line) && !negated && !/report (?:is )?expected/i.test(line)) {
    if (date) P('valuation_booked_date', date.iso, `booked, date in text "${date.raw}"`);
    else C('valuation booked, no date stated');
  }
  if (!question && !negated) {
    if (/\bvaluer (?:is|has been) (?:requesting|asking)\b/i.test(line)) {
      P('valuation_requested', 'Yes', 'valuer already engaged (asking for documents); request date not stated');
    } else if (REQUESTED.test(line) && !NOT_DONE.test(line)) {
      const d = date && date.iso <= emailDay ? date : null;
      P('valuation_requested', 'Yes', 'valuation ordered / requested');
      P('valuation_requested_date', d ? d.iso : emailDay, d ? `date in text "${d.raw}"` : 'no date in text: email date');
    }
  }
  const fromM = line.match(ACCESS_FROM);
  const near = fromM ? line.slice(fromM.index ?? 0, (fromM.index ?? 0) + 90) : line;
  const nearDate = findDate(near, ref);
  if (ACCESS_NO.test(line)) {
    const my = monthYear(near, ref) || monthYear(line, ref);
    if (nearDate && nearDate.iso > emailDay) P('valuation_expected_access_date', nearDate.iso, `access expected from "${nearDate.raw}"`);
    else if (my) P('valuation_access_estimate', my, 'access not yet available; month estimate in text');
    else C('valuation access not yet available, no date given (no field proposed)');
  } else if (ACCESS_YES.test(line) && !question && !negated && !/\b(?:until|when|once|resubmit)\b/i.test(line)) {
    if (date && date.iso > emailDay) P('valuation_expected_access_date', date.iso, `access from "${date.raw}"`);
    else P('valuation_access_available', 'Yes', 'access available / ready for valuation');
  } else if (fromM && /access|ready|available/i.test(near) && !question) {
    const my = !nearDate ? monthYear(near, ref) : null;
    if (nearDate && nearDate.iso > emailDay) P('valuation_expected_access_date', nearDate.iso, `access expected from "${nearDate.raw}"`);
    else if (my) P('valuation_access_estimate', my, 'access estimate (month)');
  }
  if (!hits.length) C('mentions a valuation; no rule fired');
  return hits;
}

/** Re-applies the current rules to stored evidence without reading Gmail again. */
export function rehit(items: { quote: string; at: string }[]): { keep: boolean; hits: ValHit[] }[] {
  return items.map((it) => {
    const q = it.quote.replace(/…$/, '');
    return { keep: keepSentence(q), hits: valuationHits(q, new Date(it.at)) };
  });
}

// ---- opportunity matching ----

let oppCache: { at: number; opps: Opp[] } | null = null;
async function opps(): Promise<Opp[]> {
  if (oppCache && Date.now() - oppCache.at < 30 * 60_000) return oppCache.opps;
  const all = await fetchOpps(await fetchStageNames());
  oppCache = { at: Date.now(), opps: all };
  return all;
}

const normName = (o: Opp) => o.name.split(/\s+[-–|]\s+|\(/)[0].trim().toLowerCase();
const isTestOrStaff = (o: Opp, staff: string[]) =>
  /^zzz|mapping test|portfolio review|staff look after/i.test(o.name) || staff.some((s) => o.name.toLowerCase().startsWith(s));

function preferred(group: Opp[]): Opp {
  const fin = group.find((o) => o.pipelineId === INBOX_PIPELINES.finance);
  const con = group.find((o) => o.pipelineId === INBOX_PIPELINES.construction);
  if (fin && con) return /settled/i.test(fin.stageName) || fin.status === 'won' ? con : fin;
  return fin || group.find((o) => o.pipelineId === INBOX_PIPELINES.propertyTeam) || group[0];
}

function byName(text: string, pool: Opp[]): { group: Opp[]; first: boolean }[] {
  const groups = new Map<string, { group: Opp[]; first: boolean }>();
  for (const o of pool) {
    const n = clientNames(o.name);
    if (!n.surnames.some((s) => wordIn(text, s))) continue;
    const g = groups.get(normName(o)) || { group: [], first: false };
    g.group.push(o);
    g.first = g.first || n.firstNames.some((f) => wordIn(text, f));
    groups.set(normName(o), g);
  }
  return Array.from(groups.values());
}

export function matchOpp(subject: string, body: string, pool: Opp[]): { opp: Opp | null; how: string; cands: string[] } {
  const subj = byName(subject, pool);
  const subjFirst = subj.filter((g) => g.first);
  if (subjFirst.length === 1) return { opp: preferred(subjFirst[0].group), how: 'client name in subject', cands: [] };
  if (subj.length === 1) return { opp: preferred(subj[0].group), how: 'client surname in subject', cands: [] };
  const lot = subject.match(/\bLot:?\s*(\d{1,5}[A-Z]?)\b/i)?.[1]?.toUpperCase();
  if (lot) {
    const words = subject.toLowerCase().match(/[a-z]{4,}/g) || [];
    const hit = pool.filter((o) => oppLot(o) === lot && words.some((w) => !['street', 'road', 'estate', 'avenue', 'drive', 'claim', 'stage', 'final', 'frame'].includes(w) && o.registeredAddress.toLowerCase().includes(w)));
    const g = new Map(hit.map((o) => [normName(o), o]));
    if (g.size === 1) return { opp: preferred(hit), how: 'lot + street in subject', cands: [] };
  }
  const all = byName(`${subject}\n${body}`, pool);
  const allFirst = all.filter((g) => g.first);
  if (allFirst.length === 1) return { opp: preferred(allFirst[0].group), how: 'client name in body', cands: [] };
  const cands = (subj.length ? subj : all).map((g) => preferred(g.group).name).slice(0, 5);
  return { opp: null, how: cands.length ? 'ambiguous' : 'no client name found', cands };
}

function cur(o: Opp, f: ValField): string {
  const v = o.fields[VALUATION_FIELDS[f].id];
  return Array.isArray(v) ? v.join(', ') : v || '';
}

// ---- scan ----

export interface ScanRange {
  /** List emails received in [from, to). Defaults to the last 7 Sydney days. */
  from?: Date;
  to?: Date;
  /** Evidence (incl. quoted replies) dated before this is ignored. Defaults to `from`; set it to the overall start when scanning in chunks. */
  since?: Date;
}

export async function scanValuations(mailbox: string, range: ScanRange = {}): Promise<{ mailbox: string; listed: number; threads: ValThread[] }> {
  const win = sydneyWindow(7);
  const listFrom = range.from || win.start;
  const end = range.to || win.end;
  const start = range.since || listFrom;
  const gmail = gmailFor(mailbox);
  const q = `after:${Math.floor(listFrom.getTime() / 1000)} before:${Math.ceil(end.getTime() / 1000)} (valuation OR valuations OR valuer OR valuers OR valued OR filename:valuation)`;
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500, pageToken }, { timeout: 60_000 });
    for (const m of res.data.messages || []) if (m.id) ids.push(m.id);
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  const all = await opps();
  const byId = new Map(all.map((o) => [o.id, o]));
  const sql = getDb();
  const stored = (await sql`
    SELECT message_id, match FROM inbox_items
    WHERE mailbox = ${mailbox} AND received_at >= ${start.toISOString()}`) as { message_id: string; match: { grade?: string; opportunityId?: string } | null }[];
  const storedMatch = new Map(stored.map((r) => [r.message_id, r.match]));

  const msgs = [];
  for (const id of ids) msgs.push(await getMessage(mailbox, id));
  const staff = Array.from(new Set(msgs.filter((m) => /@buyersclub\.com\.au$/.test(m.fromEmail)).map((m) => m.from.replace(/<[^>]+>|"/g, '').trim().toLowerCase()).filter((n) => n.split(' ').length >= 2)));
  const pool = all.filter((o) => !isTestOrStaff(o, staff));

  const threads = new Map<string, ValThread>();
  const seen = new Set<string>();
  for (const msg of msgs) {
    const segs = segments(msg.text, msg.from, msg.date);
    const docs: { name: string; text: string }[] = [];
    for (const a of msg.attachments) {
      if (!/pdf$/i.test(a.filename) || !/valu/i.test(a.filename) || a.size > 15_000_000) continue;
      try {
        docs.push({ name: a.filename, text: (await readPdf(await getAttachment(mailbox, msg.id, a.attachmentId))).text });
      } catch {
        docs.push({ name: `${a.filename} (unreadable)`, text: '' });
      }
    }
    let t = threads.get(msg.threadId);
    if (!t) {
      t = { mailbox, threadId: msg.threadId, subject: msg.subject, opp: null, oppCandidates: [], current: {}, evidence: [] };
      threads.set(msg.threadId, t);
    }
    if (!t.opp) {
      const sm = storedMatch.get(msg.id);
      let opp: Opp | null = null;
      let how = '';
      if (sm?.opportunityId && ['A', 'B', 'C'].includes(sm.grade || '') && byId.has(sm.opportunityId)) {
        opp = byId.get(sm.opportunityId)!;
        how = `queue match, grade ${sm.grade}`;
      } else {
        const m = matchOpp(msg.subject, `${segs[0].text.slice(0, 4000)}\n${docs.map((d) => d.text.slice(0, 3000)).join('\n')}`, pool);
        opp = m.opp;
        how = m.how;
        t.oppCandidates = m.cands;
      }
      if (opp) {
        t.opp = { id: opp.id, name: opp.name, pipeline: opp.pipelineName, stage: opp.stageName, how };
        for (const f of Object.keys(VALUATION_FIELDS) as ValField[]) t.current[f] = cur(opp, f);
      }
    }
    const units = [
      { by: msg.from, at: msg.date as Date | null, quoted: false, text: `${msg.subject.replace(/^((re|fw|fwd)\s*:\s*)+/i, '')}.`, source: 'subject line' },
      ...segs.map((s) => ({ ...s, source: s.quoted ? 'quoted reply' : 'body' })),
      ...docs.map((d) => ({ by: msg.from, at: msg.date as Date | null, quoted: false, text: d.text, source: d.name })),
    ];
    for (const u of units) {
      if (!u.at || u.at < start) continue;
      for (const line of sentences(u.text)) {
        const key = line.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 200);
        if (seen.has(key)) continue;
        seen.add(key);
        t.evidence.push({
          mailbox,
          messageId: msg.id,
          threadId: msg.threadId,
          subject: msg.subject,
          by: u.by,
          at: u.at.toISOString(),
          quoted: u.quoted,
          source: u.source,
          quote: line,
          hits: valuationHits(line, u.at),
        });
      }
    }
  }
  return { mailbox, listed: ids.length, threads: Array.from(threads.values()).filter((t) => t.evidence.length) };
}
