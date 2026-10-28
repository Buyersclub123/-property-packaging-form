import type { gmail_v1 } from 'googleapis';
import { getDb } from '@/lib/db';
import { gmailFor } from './google';
import { emailOf } from './gmail';
import { fetchStageNames, fetchOpps, INBOX_PIPELINES } from './ghl';

// Backlog 17: activity mining. Metadata + Gmail snippet only: no attachment opening, no value extraction,
// no model calls, nothing written anywhere except the email_activity table. Snippets are classified, not stored.

export const INTERNAL_DOMAINS = ['buyersclub.com.au'];
const CHUNK_MS = 50_000;
const MAX_CLIENT_SENDER_EMAILS = 300;
const PARALLEL = 8;

type Rule = [activity: string, re: RegExp];

// Order matters: first match wins. Subject is tried first, then the snippet (first lines).
// Rules v2 (backlog 20): the old contract_received is split into signing_notice, eoi, contract_received
// (contract subject + pdf/doc attached) and contract_thread (contract subject, no document attached).
// executed_contract likewise needs a document attached (or a DocuSign 'Completed' notice); replies in an
// 'Exchanged contract' thread without one are contract_thread.
const RULES: Rule[] = [
  ['calendar', /^(updated |new )?invitation:|^(accepted|declined|tentatively accepted|cancell?ed( event)?):/],
  ['executed_contract', /completed: complete with docusign|fully executed|executed (land |build |hia )?contract|contracts? (have been |has been |were )?exchanged|exchange of contracts|signed contract attached|\bexchanged\b|buyer signed contract/],
  ['registration_confirmation', /^titles?\b|titles?\b(?: and [a-z]+)?(?: have| has)?(?: been)? (issued|registered)|plan (has been |is )?registered|registration of (the )?plan|land (has )?registered|title(s)? (release|registration)|\bregistration (update|notice|confirmed)/],
  ['settlement', /\bsettle(d|ment)\b/],
  ['deposit_paid', /deposit (paid|received|receipt|has been|confirmation)|receipt (of|for) deposit|\bdeposit\b.*\breceipt/],
  ['deposit_due', /deposit (is |now )?due|deposit (reminder|request|invoice|details)/],
  ['bp_report', /building (and|&) pest|\bb ?& ?p\b|pest (and|&) build|\bp ?& ?b\b|pest inspection|pre-?purchase (building )?inspection|^building inspection\b|building inspections\b/],
  ['complaint', /complain|unhappy|disappointed|frustrat|unacceptable|not happy|disgust|ombudsman|fair trading|\brefund\b|\bdispute\b/],
  ['build_update', /progress claim|stage (claim|receipt|payment|invoice)|\b(base|slab|frame|lock ?-?up|enclosed|fixing|tiling|roof|practical completion|pc|final) (stage|claim|payment|account|inspection|invoice)|construction (update|commence|start)|build(ing)? (update|progress|commence)|site (update|visit|photos|start)|practical completion|\bhandover\b|building (approval|permit)|\bba (issued|approved)|plumbing permit|\bpci\d*\b|-claim-|final account|planning (consent|permit|approval)|\bda (approved|issued|lodged)|receive da\b/],
  ['insurance_quote', /insurance (quote|policy|renewal)|certificate of (currency|insurance)|landlord insurance|builders? warranty insurance/],
  ['property_manager', /property manag(er|ement)|leasing (update|agent)|tenan(t|cy)|rental (appraisal|listing)|receipt \(#rwims/],
  ['finance_update', /financ(e|ial) (for|extension|update|approval|approved|clause|condition)|formal approval|conditional approval|unconditional approval|pre-?approval|loan (approval|offer|documents?|docs|application)|\bvaluation\b|finance (update|approval|approved|clause|condition)|\bmortgage\b|\blender\b|\brefinanc|finance (is )?due|borrowing (capacity|power)/],
  ['contract_reviewed', /contracts? review(ed)?\b/],
  ['signing_notice', /please (review and )?sign|reminder to sign|sign (the |your )?(contract|documents?)|send ([a-z]+ )?(for )?signing|docusign|sent you (a |the )?document|signature request/],
  ['eoi', /\beoi\b|expression of interest|property reserved/],
  ['contract_received', /contracts? (of sale |to be reviewed|for review|attached|issued|pack|documents?|docs|drawings)|(land|build|hia|building|draft) contract|amend(ed|ment)?\]? (to )?contract|contract (variation|amendment)|reaforms/],
  ['property_review', /property review|qa to verify|ba auto send|approval overview/],
  ['entity_admin', /bare trust|entity name|trust deed/],
  ['client_onboarding', /^introduction\b|meet your new buyers club|welcome to buyers club|strategy document/],
];

// Tried after the subject rules, before the header/noise rules.
const SENDER_DOMAIN_RULES: Rule[] = [
  ['signing_notice', /(^|\.)(docusign|pandadoc)\.(net|com)$/],
  ['bp_report', /(^|\.)(wpbi|truelineinspections)\.com\.au$/],
  ['noise', /^docs\.google\.com$/],
];

const DOC_ATTACHMENT_RE = /(^|,)(pdf|docx?|zip)(,|$)/;

function withDocSplit(c: Classified, attTypes: string): Classified {
  if (!['contract_received', 'executed_contract'].includes(c.activity) || DOC_ATTACHMENT_RE.test(attTypes)) return c;
  if (/complete with docusign/.test(c.rule)) return c;
  return { activity: 'contract_thread', rule: `${c.rule} (no pdf/doc attached)` };
}

const GENERIC_DOMAINS = /^(gmail|hotmail|outlook|live|yahoo|icloud|me|bigpond|optusnet|iinet|tpg)\./;
const THANKS_RE = /^\W*(hi|hello|dear)?[^.!?\n]{0,30}?\b(thank(s| you)|cheers|much appreciated|received,? (with )?thanks|noted|got it|all good|perfect|great,? thanks)\b/;
const REQUEST_RE = /\?|can you|could you|would you|please (advise|confirm|send|let me know|update|call)|when (will|is|can)|any update|update on|i need|we need|request/;
const NOISE_SENDER_RE = /(^|[.@])(no-?reply|newsletter|news|marketing|promo|mailer|notifications?|updates|communication|events?)[@.]/;
const NOISE_TEXT_RE = /unsubscribe|webinar|newsletter|listings?|stock ?list|for sale|offer today|opportunit(y|ies) for sale|out of office|automatic reply|auto(matic)?-?reply|delivery status notification|undeliverable/;

export interface Classified { activity: string; rule: string }

export function classifyActivity(m: { subject: string; snippet: string; fromEmail: string; direction: string; listUnsubscribe: boolean; autoSubmitted: boolean; attTypes: string }): Classified {
  return withDocSplit(classifyRaw(m), m.attTypes);
}

function classifyRaw(m: { subject: string; snippet: string; fromEmail: string; direction: string; listUnsubscribe: boolean; autoSubmitted: boolean; attTypes: string }): Classified {
  const subject = (m.subject || '').toLowerCase().replace(/^\s*((re|fw|fwd)\s*:\s*)+/, '');
  const snippet = (m.snippet || '').toLowerCase().replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  if (m.autoSubmitted || /out of office|automatic reply|undeliverable|delivery status notification/.test(subject)) {
    return { activity: 'noise', rule: 'auto-reply / bounce' };
  }
  for (const [activity, re] of RULES) if (re.test(subject)) return { activity, rule: `subject ${re.exec(subject)?.[0]}` };
  const senderDomain = m.fromEmail.split('@')[1] || '';
  for (const [activity, re] of SENDER_DOMAIN_RULES) if (re.test(senderDomain)) return { activity, rule: `sender domain ${senderDomain}` };
  if (/(^|,)ics(,|$)/.test(m.attTypes)) return { activity: 'calendar', rule: 'ics attachment' };
  if (m.listUnsubscribe) return { activity: 'noise', rule: 'List-Unsubscribe header' };
  if (NOISE_SENDER_RE.test(m.fromEmail)) return { activity: 'noise', rule: `sender ${m.fromEmail}` };
  if (NOISE_TEXT_RE.test(subject)) return { activity: 'noise', rule: `subject ${NOISE_TEXT_RE.exec(subject)?.[0]}` };
  const first = snippet.slice(0, 200);
  // Settlement is subject-only: first lines often mention settlement in passing (e.g. PM introductions).
  for (const [activity, re] of RULES) if (activity !== 'settlement' && re.test(first)) return { activity, rule: `first lines ${re.exec(first)?.[0]}` };
  if (THANKS_RE.test(first) && first.length < 160) return { activity: 'thank_you', rule: `first lines ${THANKS_RE.exec(first)?.[2]}` };
  const domain = m.fromEmail.split('@')[1] || '';
  if (m.direction === 'in' && !isInternal(m.fromEmail) && GENERIC_DOMAINS.test(domain) && REQUEST_RE.test(`${subject} ${first}`)) {
    return { activity: 'client_request', rule: `personal-domain sender + "${REQUEST_RE.exec(`${subject} ${first}`)?.[0]}"` };
  }
  if (THANKS_RE.test(first)) return { activity: 'thank_you', rule: `first lines ${THANKS_RE.exec(first)?.[2]}` };
  if (NOISE_TEXT_RE.test(first)) return { activity: 'noise', rule: `first lines ${NOISE_TEXT_RE.exec(first)?.[0]}` };
  return { activity: 'other', rule: 'no rule matched' };
}

const isInternal = (e: string) => INTERNAL_DOMAINS.some((d) => e.endsWith(`@${d}`));
const emailsIn = (s: string) => s.toLowerCase().match(/[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [];

let tablesReady = false;
export async function ensureActivityTable(): Promise<void> {
  if (tablesReady) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS email_activity (
      id SERIAL PRIMARY KEY,
      mailbox TEXT NOT NULL,
      message_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      direction TEXT NOT NULL,
      from_addr TEXT,
      from_email TEXT,
      sender_domain TEXT,
      to_addrs TEXT,
      cc_addrs TEXT,
      internal_external TEXT,
      all_internal BOOLEAN,
      sent_at TIMESTAMPTZ NOT NULL,
      sydney_date DATE,
      month TEXT,
      weekday TEXT,
      hour INT,
      subject TEXT,
      activity TEXT NOT NULL,
      activity_rule TEXT,
      att_count INT,
      att_types TEXT,
      thread_pos INT,
      thread_len INT,
      reply_hours NUMERIC,
      opp_id TEXT,
      opp_name TEXT,
      opp_rule TEXT,
      mined_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (mailbox, message_id)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS email_activity_thread ON email_activity (mailbox, thread_id, sent_at)`;
  await sql`ALTER TABLE email_activity ADD COLUMN IF NOT EXISTS activity_v1 TEXT, ADD COLUMN IF NOT EXISTS activity_rule_v1 TEXT`;
  tablesReady = true;
}

/** UTC instant of 00:00 Sydney time on y-m-d (handles AEST/AEDT). */
export function sydneyMidnight(y: number, m: number, d: number): Date {
  for (const off of [10, 11]) {
    const t = new Date(Date.UTC(y, m - 1, d) - off * 3_600_000);
    const p = sydneyParts(t);
    if (p.hour === 0 && p.date === `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`) return t;
  }
  throw new Error(`Cannot resolve Sydney midnight for ${y}-${m}-${d}`);
}

function sydneyParts(t: Date): { date: string; hour: number; weekday: string } {
  const f = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(t);
  const g = (k: string) => f.find((x) => x.type === k)?.value || '';
  return { date: `${g('year')}-${g('month')}-${g('day')}`, hour: parseInt(g('hour'), 10), weekday: g('weekday') };
}

function attachmentsOf(part: gmail_v1.Schema$MessagePart | undefined, out: string[]) {
  if (!part) return;
  if (part.filename) out.push((part.filename.split('.').pop() || part.mimeType || '?').toLowerCase());
  for (const p of part.parts || []) attachmentsOf(p, out);
}

const MESSAGE_FIELDS =
  'id,threadId,labelIds,snippet,internalDate,payload(headers(name,value),filename,mimeType,parts(filename,mimeType,parts(filename,mimeType,parts(filename,mimeType,parts(filename,mimeType)))))';

async function mineOne(mailbox: string, id: string): Promise<void> {
  const gmail = gmailFor(mailbox);
  const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full', fields: MESSAGE_FIELDS }, { timeout: 60_000 });
  const msg = res.data;
  const h = (n: string) => msg.payload?.headers?.find((x) => (x.name || '').toLowerCase() === n.toLowerCase())?.value || '';
  const from = h('From');
  const fromEmail = emailOf(from);
  const to = h('To');
  const cc = h('Cc');
  const direction = (msg.labelIds || []).includes('SENT') || fromEmail === mailbox.toLowerCase() ? 'out' : 'in';
  const atts: string[] = [];
  attachmentsOf(msg.payload, atts);
  const sentAt = new Date(parseInt(msg.internalDate || '0', 10));
  const p = sydneyParts(sentAt);
  const subject = h('Subject');
  const c = classifyActivity({
    subject, snippet: msg.snippet || '', fromEmail, direction,
    listUnsubscribe: !!h('List-Unsubscribe'), autoSubmitted: /auto-(replied|generated)/i.test(h('Auto-Submitted')),
    attTypes: [...new Set(atts)].join(','),
  });
  const internal = isInternal(fromEmail);
  const allInternal = internal && [...emailsIn(to), ...emailsIn(cc)].every(isInternal);
  const sql = getDb();
  await sql`
    INSERT INTO email_activity (mailbox, message_id, thread_id, direction, from_addr, from_email, sender_domain, to_addrs, cc_addrs,
      internal_external, all_internal, sent_at, sydney_date, month, weekday, hour, subject, activity, activity_rule, att_count, att_types)
    VALUES (${mailbox}, ${id}, ${msg.threadId || id}, ${direction}, ${from}, ${fromEmail}, ${fromEmail.split('@')[1] || ''}, ${to}, ${cc},
      ${internal ? 'internal' : 'external'}, ${allInternal}, ${sentAt.toISOString()}, ${p.date}, ${p.date.slice(0, 7)}, ${p.weekday}, ${p.hour},
      ${subject}, ${c.activity}, ${c.rule}, ${atts.length}, ${Array.from(new Set(atts)).join(',')})
    ON CONFLICT (mailbox, message_id) DO UPDATE SET activity = EXCLUDED.activity, activity_rule = EXCLUDED.activity_rule`;
}

export interface ActivityChunk { mailbox: string; month: string; listed: number; mined: number; remaining: number; failed: { id: string; error: string }[] }

/** Mine one chunk (~50s) of one mailbox-month. Already-mined messages are skipped, so re-calling resumes. */
export async function mineChunk(mailbox: string, month: string, skip: string[] = []): Promise<ActivityChunk> {
  await ensureActivityTable();
  const [y, m] = month.split('-').map(Number);
  const start = sydneyMidnight(y, m, 1);
  const end = m === 12 ? sydneyMidnight(y + 1, 1, 1) : sydneyMidnight(y, m + 1, 1);
  const gmail = gmailFor(mailbox);
  const q = `after:${Math.floor(start.getTime() / 1000)} before:${Math.floor(Math.min(end.getTime(), Date.now()) / 1000)}`;
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const r = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500, pageToken, includeSpamTrash: false }, { timeout: 60_000 });
    for (const x of r.data.messages || []) if (x.id) ids.push(x.id);
    pageToken = r.data.nextPageToken || undefined;
  } while (pageToken);

  const sql = getDb();
  const done = new Set(((await sql`SELECT message_id FROM email_activity WHERE mailbox = ${mailbox} AND message_id = ANY(${ids})`) as { message_id: string }[]).map((r) => r.message_id));
  const skipSet = new Set(skip);
  const todo = ids.filter((id) => !done.has(id) && !skipSet.has(id));
  const deadline = Date.now() + CHUNK_MS;
  const failed: { id: string; error: string }[] = [];
  let mined = 0;
  let i = 0;
  while (i < todo.length && Date.now() < deadline) {
    const batch = todo.slice(i, i + PARALLEL);
    i += batch.length;
    const results = await Promise.allSettled(batch.map((id) => mineOne(mailbox, id)));
    results.forEach((r, k) => {
      if (r.status === 'fulfilled') mined++;
      else failed.push({ id: batch[k], error: r.reason instanceof Error ? r.reason.message : String(r.reason) });
    });
  }
  console.log(`[email-activity] ${mailbox} ${month} mined ${mined}, failed ${failed.length}, remaining ${todo.length - i}`);
  return { mailbox, month, listed: ids.length, mined, remaining: todo.length - i, failed };
}

/** Thread position/length and reply-within hours over the mined set, then a cheap opportunity match. */
export async function finalizeActivity(): Promise<{ rows: number; matched: number; oppError: string | null }> {
  await ensureActivityTable();
  const sql = getDb();
  await sql`
    UPDATE email_activity e SET thread_pos = x.pos, thread_len = x.len
    FROM (SELECT id, ROW_NUMBER() OVER w AS pos, COUNT(*) OVER (PARTITION BY mailbox, thread_id) AS len
          FROM email_activity WINDOW w AS (PARTITION BY mailbox, thread_id ORDER BY sent_at, id)) x
    WHERE e.id = x.id`;
  await sql`
    UPDATE email_activity e SET reply_hours = x.h
    FROM (SELECT id, ROUND((EXTRACT(EPOCH FROM (CASE WHEN direction = 'in' THEN next_out ELSE next_in END) - sent_at) / 3600)::numeric, 1) AS h
          FROM (SELECT id, direction, sent_at,
                  MIN(sent_at) FILTER (WHERE direction = 'out') OVER f AS next_out,
                  MIN(sent_at) FILTER (WHERE direction = 'in') OVER f AS next_in
                FROM email_activity
                WINDOW f AS (PARTITION BY mailbox, thread_id ORDER BY sent_at, id ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING)) w) x
    WHERE e.id = x.id AND e.reply_hours IS DISTINCT FROM x.h`;

  // Opportunity match (cheap): the opportunity's contact full name appears in the subject, or is the display name of a
  // low-volume external sender. Names of internal staff and high-volume senders (solicitors, brokers) are ignored, since
  // they also appear as contacts on opportunities and would match every email they send or are copied on.
  let matched = 0;
  let oppError: string | null = null;
  try {
    const opps = await fetchOpps(await fetchStageNames());
    const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
    const byName = new Map<string, typeof opps>();
    for (const o of opps) {
      const n = norm(o.contactName || '');
      if (n.trim().split(' ').length < 2 || n.trim().length < 6) continue;
      byName.set(n, [...(byName.get(n) || []), o]);
    }
    const displayName = (a: string) => norm((a || '').replace(/<[^>]*>/g, ' ').replace(/"/g, ' '));
    const senders = (await sql`SELECT from_addr, internal_external, COUNT(*) OVER (PARTITION BY from_email)::int AS n FROM email_activity`) as { from_addr: string; internal_external: string; n: number }[];
    for (const s of senders) {
      if (s.internal_external === 'internal' || s.n > MAX_CLIENT_SENDER_EMAILS) byName.delete(displayName(s.from_addr));
    }
    const rows = (await sql`
      SELECT id, subject, CASE WHEN internal_external = 'external' AND COUNT(*) OVER (PARTITION BY from_email) <= ${MAX_CLIENT_SENDER_EMAILS} THEN from_addr ELSE '' END AS from_addr
      FROM email_activity`) as { id: number; subject: string; from_addr: string }[];
    await sql`UPDATE email_activity SET opp_id = NULL, opp_name = NULL, opp_rule = NULL`;
    const ids: number[] = [];
    const oppIds: string[] = [];
    const oppNames: string[] = [];
    const oppRules: string[] = [];
    for (const r of rows) {
      const words = norm(`${r.subject} | ${displayName(r.from_addr)}`).trim().split(' ');
      let hit: string | undefined;
      for (let i = 0; i < words.length && !hit; i++) {
        for (let len = 4; len >= 2 && !hit; len--) {
          const key = ` ${words.slice(i, i + len).join(' ')} `;
          if (i + len <= words.length && byName.has(key)) hit = key;
        }
      }
      if (!hit) continue;
      const cands = byName.get(hit)!;
      const o = cands.find((c) => c.pipelineId === INBOX_PIPELINES.propertyTeam) || cands[0];
      ids.push(r.id);
      oppIds.push(o.id);
      oppNames.push(o.name);
      oppRules.push(`contact name "${hit.trim()}"${cands.length > 1 ? ` (${cands.length} opps)` : ''}`);
    }
    for (let i = 0; i < ids.length; i += 5000) {
      await sql`
        UPDATE email_activity e SET opp_id = u.oid, opp_name = u.oname, opp_rule = u.orule
        FROM unnest(${ids.slice(i, i + 5000)}::int[], ${oppIds.slice(i, i + 5000)}::text[], ${oppNames.slice(i, i + 5000)}::text[], ${oppRules.slice(i, i + 5000)}::text[]) AS u(id, oid, oname, orule)
        WHERE e.id = u.id`;
    }
    matched = ids.length;
  } catch (e) {
    oppError = e instanceof Error ? e.message : String(e);
  }
  const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM email_activity`) as { n: number }[];
  return { rows: n, matched, oppError };
}

// Backlog 20: re-run classification on stored rows (no re-mining). Snippets were never stored, so a row the
// v1 rules classified from its first lines / headers keeps that result unless a subject or sender rule now
// fires (subject rules always took precedence); its stored first-lines match is re-tested against the new rules.
// The v1 result is kept in activity_v1 / activity_rule_v1, and re-runs always start from it.
interface StoredRow {
  id: number;
  subject: string | null;
  from_email: string | null;
  direction: string;
  att_types: string | null;
  base_activity: string;
  base_rule: string | null;
}

function reclassifyRow(r: StoredRow): Classified {
  const rule = r.base_rule || '';
  if (rule.startsWith('auto-reply')) return { activity: r.base_activity, rule };
  const attTypes = r.att_types || '';
  const c = classifyActivity({
    subject: r.subject || '', snippet: '', fromEmail: r.from_email || '', direction: r.direction,
    listUnsubscribe: false, autoSubmitted: false, attTypes,
  });
  if (c.activity !== 'other') return c;
  if (rule.startsWith('first lines ')) {
    const frag = rule.slice('first lines '.length);
    for (const [activity, re] of RULES) {
      if (activity !== 'settlement' && re.test(frag)) return withDocSplit({ activity, rule: `first lines ${re.exec(frag)?.[0]}` }, attTypes);
    }
  }
  return { activity: r.base_activity, rule };
}

function subjectPattern(s: string): string {
  return (s || '').toLowerCase().replace(/^\s*((re|fw|fwd|aw)\s*:\s*)+/, '').replace(/\[[^\]]*\]/g, ' ')
    .split(/\s[-|:–]\s|:|\||,|\(|\//)[0].replace(/\d+/g, '#').replace(/\s+/g, ' ').trim()
    .split(' ').slice(0, 5).join(' ') || '(blank)';
}

type Tally = Map<string, number>;
const bump = (m: Tally, k: string) => m.set(k, (m.get(k) || 0) + 1);
const top = (m: Tally, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const topText = (m: Tally, n: number) => top(m, n).map(([k, v]) => `${k}: ${v}`).join(', ');

interface PatternTally { n: number; domains: Tally; to: Tally; example: string }

function patternReport(m: Map<string, PatternTally>) {
  return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 30).map(([pattern, p]) => ({
    pattern, n: p.n, now: topText(p.to, 4), senders: topText(p.domains, 3), example: p.example.slice(0, 100),
  }));
}

export async function reclassifyStored(apply: boolean) {
  await ensureActivityTable();
  const sql = getDb();
  const before: Tally = new Map();
  const after: Tally = new Map();
  const moves: Tally = new Map();
  const otherBefore = new Map<string, PatternTally>();
  const otherAfter = new Map<string, PatternTally>();
  const addPattern = (m: Map<string, PatternTally>, r: StoredRow, to: string) => {
    const k = subjectPattern(r.subject || '');
    const p = m.get(k) || { n: 0, domains: new Map(), to: new Map(), example: r.subject || '' };
    p.n++;
    bump(p.domains, r.from_email?.split('@')[1] || '');
    bump(p.to, to);
    m.set(k, p);
  };
  const ids: number[] = [];
  const acts: string[] = [];
  const rules: string[] = [];
  let lastId = 0;
  for (;;) {
    const rows = (await sql`
      SELECT id, subject, from_email, direction, att_types,
        COALESCE(activity_v1, activity) AS base_activity, COALESCE(activity_rule_v1, activity_rule) AS base_rule
      FROM email_activity WHERE id > ${lastId} ORDER BY id LIMIT 20000`) as StoredRow[];
    if (!rows.length) break;
    lastId = rows[rows.length - 1].id;
    for (const r of rows) {
      const c = reclassifyRow(r);
      bump(before, r.base_activity);
      bump(after, c.activity);
      if (c.activity !== r.base_activity) bump(moves, `${r.base_activity} -> ${c.activity}`);
      if (r.base_activity === 'other') addPattern(otherBefore, r, c.activity);
      if (c.activity === 'other') addPattern(otherAfter, r, c.activity);
      ids.push(r.id);
      acts.push(c.activity);
      rules.push(c.rule);
    }
  }
  if (apply) {
    for (let i = 0; i < ids.length; i += 5000) {
      await sql`
        UPDATE email_activity e SET activity_v1 = COALESCE(e.activity_v1, e.activity),
          activity_rule_v1 = COALESCE(e.activity_rule_v1, e.activity_rule), activity = u.a, activity_rule = u.r
        FROM unnest(${ids.slice(i, i + 5000)}::int[], ${acts.slice(i, i + 5000)}::text[], ${rules.slice(i, i + 5000)}::text[]) AS u(id, a, r)
        WHERE e.id = u.id`;
    }
  }
  return {
    applied: apply,
    rows: ids.length,
    changed: [...moves.values()].reduce((s, v) => s + v, 0),
    before: Object.fromEntries(top(before, 50)),
    after: Object.fromEntries(top(after, 50)),
    moves: Object.fromEntries(top(moves, 60)),
    otherTop30Before: patternReport(otherBefore),
    otherTop30After: patternReport(otherAfter),
  };
}
