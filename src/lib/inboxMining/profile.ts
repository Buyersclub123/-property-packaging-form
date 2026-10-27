import { getDb } from '@/lib/db';
import type { InboxClass } from './types';

// Sender / subject-pattern profile, rebuilt live from inbox_items on every request (nothing cached).
// It never changes the rule class and never creates suggestions; it only adds a pre-class and a priority.
// Internal senders (staff, shared mailboxes) send mixed content, so only external senders pre-classify by sender.

export const INTERNAL_DOMAINS = ['buyersclub.com.au'];
const MIN_CLASSIFIED = 3;
const MIN_SHARE = 0.8;
const ACT_CLASSES: string[] = ['registration_titles_issued', 'contract_executed_exchanged', 'deposit_receipt', 'finance_update', 'bp_report'];

export interface SenderProfile {
  email: string;
  name: string;
  count: number;
  classes: Record<string, number>;
  classified: number;
  topClass: string | null;
  topShare: number;
  internal: boolean;
  internalOnly: number;
  matched: number;
  mailboxes: string[];
  lastSubject: string;
  lastAt: string;
}

export interface TemplateProfile {
  template: string;
  count: number;
  classes: Record<string, number>;
  classified: number;
  topClass: string | null;
  topShare: number;
}

export interface ItemProfile {
  sender: string;
  template: string;
  threadPos: number;
  threadLen: number;
  internalOnly: boolean;
  unknownSender: boolean;
  preClass?: InboxClass;
  preReason?: string;
  priority: 1 | 2 | 3;
  priorityReason: string;
}

export interface Profile {
  builtAt: string;
  itemCount: number;
  senders: SenderProfile[];
  templates: TemplateProfile[];
  unknownSenders: SenderProfile[];
  items: Map<number, ItemProfile>;
}

const EMAIL_RE = /[a-z0-9._%+'-]+@[a-z0-9.-]+\.[a-z]{2,}/g;
export const emailsIn = (s: string | null | undefined): string[] => (s || '').toLowerCase().match(EMAIL_RE) || [];
const isInternal = (e: string) => INTERNAL_DOMAINS.some((d) => e.endsWith(`@${d}`));
const displayName = (from: string) => from.replace(/<[^>]*>/, '').replace(/"/g, '').trim();

const ADDRESS_RE =
  /\b(lot|unit|sl)\s*#|\b(st|street|rd|road|ave|avenue|dr|drive|way|pl|place|ct|court|cres|crescent|cl|close|pde|parade|ln|lane|blvd|boulevard|tce|terrace|cct|circuit|hwy|highway)\b|\b(nsw|qld|vic|wa|sa|tas|act|nt)\s*#/;

/** Candidate template segments of a subject: Re:/Fwd: and numbers removed, address segments dropped. */
export function subjectSegments(subject: string): string[] {
  const s = (subject || '')
    .replace(/^\s*((re|fw|fwd|aw)\s*:\s*|\[[^\]]*\]\s*)+/i, '')
    .toLowerCase()
    .replace(EMAIL_RE, '<email>')
    .replace(/\$\s?[\d,]+(\.\d+)?/g, '<$>')
    .replace(/\d+/g, '#');
  const segments = s.split(/\s+[-–—|:\/]\s+|\s*\|\s*/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const keep = segments.filter((seg) => !ADDRESS_RE.test(seg) && /[a-z]{3,}/.test(seg)).map((seg) => seg.split(' ').slice(0, 6).join(' '));
  return keep.length ? keep : segments.slice(0, 1);
}

function dominant(classes: Record<string, number>): { classified: number; topClass: string | null; topShare: number } {
  let classified = 0;
  let topClass: string | null = null;
  let top = 0;
  for (const [cls, n] of Object.entries(classes)) {
    if (cls === 'other') continue;
    classified += n;
    if (n > top) {
      top = n;
      topClass = cls;
    }
  }
  return { classified, topClass, topShare: classified ? top / classified : 0 };
}

const fmtShare = (p: { classified: number; topClass: string | null; classes: Record<string, number> }) =>
  `${p.classes[p.topClass || ''] || 0}/${p.classified} classified items were ${p.topClass}`;

interface Row {
  id: number;
  mailbox: string;
  thread_id: string;
  received_at: string;
  direction: string;
  from_addr: string | null;
  to_addr: string | null;
  subject: string | null;
  cls: string;
  grade: string | null;
}

export async function buildProfile(): Promise<Profile> {
  const sql = getDb();
  const rows = (await sql`
    SELECT id, mailbox, thread_id, received_at, direction, from_addr, to_addr, subject, cls, match->>'grade' AS grade
    FROM inbox_items ORDER BY received_at`) as Row[];

  const senders = new Map<string, SenderProfile>();
  const templates = new Map<string, TemplateProfile>();
  const threads = new Map<string, number[]>();
  const meta = new Map<number, { sender: string; template: string; internalOnly: boolean }>();

  // Template = the subject segment shared by the most subjects, so recurring phrases win over client names.
  const segs = new Map<number, string[]>();
  // Counted per distinct thread, so a long reply chain on one client's subject doesn't become a template.
  const freq = new Map<string, Set<string>>();
  for (const r of rows) {
    const s = subjectSegments(r.subject || '');
    segs.set(r.id, s);
    s.forEach((x) => freq.set(x, (freq.get(x) || new Set<string>()).add(`${r.mailbox}|${r.thread_id}`)));
  }
  const df = (x: string) => freq.get(x)?.size || 0;
  const classifiedThreads = new Map<string, Set<string>>();

  for (const r of rows) {
    const sender = emailsIn(r.from_addr)[0] || '(no sender)';
    const recipients = emailsIn(r.to_addr);
    const internalOnly = isInternal(sender) && recipients.every(isInternal);
    const template = (segs.get(r.id) || []).reduce((best, x) => (df(x) > df(best) ? x : best), (segs.get(r.id) || [''])[0] || '');
    meta.set(r.id, { sender, template, internalOnly });

    const at = new Date(r.received_at).toISOString();
    const sp = senders.get(sender) || {
      email: sender, name: displayName(r.from_addr || ''), count: 0, classes: {}, classified: 0, topClass: null, topShare: 0,
      internal: isInternal(sender), internalOnly: 0, matched: 0, mailboxes: [], lastSubject: '', lastAt: '',
    };
    sp.count++;
    sp.classes[r.cls] = (sp.classes[r.cls] || 0) + 1;
    if (internalOnly) sp.internalOnly++;
    if (r.grade && ['A', 'B', 'C', 'HOLD'].includes(r.grade)) sp.matched++;
    if (!sp.mailboxes.includes(r.mailbox)) sp.mailboxes.push(r.mailbox);
    sp.lastSubject = r.subject || '';
    sp.lastAt = at;
    senders.set(sender, sp);

    if (template) {
      const tp = templates.get(template) || { template, count: 0, classes: {}, classified: 0, topClass: null, topShare: 0 };
      tp.count++;
      tp.classes[r.cls] = (tp.classes[r.cls] || 0) + 1;
      templates.set(template, tp);
      if (r.cls !== 'other') classifiedThreads.set(template, (classifiedThreads.get(template) || new Set<string>()).add(`${r.mailbox}|${r.thread_id}`));
    }

    const tk = `${r.mailbox}|${r.thread_id}`;
    threads.set(tk, [...(threads.get(tk) || []), r.id]);
  }
  senders.forEach((sp) => Object.assign(sp, dominant(sp.classes)));
  templates.forEach((tp) => Object.assign(tp, dominant(tp.classes)));

  const isUnknown = (sp: SenderProfile) => !sp.internal && sp.classified === 0 && sp.matched === 0;
  const items = new Map<number, ItemProfile>();
  for (const r of rows) {
    const m = meta.get(r.id)!;
    const thread = threads.get(`${r.mailbox}|${r.thread_id}`) || [r.id];
    const sp = senders.get(m.sender)!;
    const tp = m.template ? templates.get(m.template) : undefined;

    let preClass: InboxClass | undefined;
    let preReason: string | undefined;
    if (r.cls === 'other') {
      if (!sp.internal && sp.topClass && sp.classified >= MIN_CLASSIFIED && sp.topShare >= MIN_SHARE && sp.classified * 2 >= sp.count) {
        preClass = sp.topClass as InboxClass;
        preReason = `sender ${sp.email}: ${fmtShare(sp)}`;
      } else if (tp?.topClass && (classifiedThreads.get(tp.template)?.size || 0) >= MIN_CLASSIFIED && tp.topShare >= MIN_SHARE && tp.classified * 2 >= tp.count) {
        preClass = tp.topClass as InboxClass;
        preReason = `subject template "${tp.template}": ${fmtShare(tp)}`;
      }
    }

    const cls = r.cls === 'other' ? preClass || 'other' : r.cls;
    const via = r.cls === 'other' && preClass ? ' (pre-class)' : '';
    const matched = !!r.grade && ['A', 'B', 'C'].includes(r.grade);
    const unknownSender = isUnknown(sp);
    const threadPos = thread.indexOf(r.id) + 1;
    let priority: 1 | 2 | 3;
    let priorityReason: string;
    if (r.grade === 'HOLD') {
      priority = 1;
      priorityReason = 'HOLD: contradictory facts';
    } else if (ACT_CLASSES.includes(cls) && matched) {
      priority = 1;
      priorityReason = `${cls}${via}, matched (grade ${r.grade})`;
    } else if (m.internalOnly) {
      priority = 3;
      priorityReason = 'internal-only';
    } else if (cls !== 'other') {
      priority = 2;
      priorityReason = `${cls}${via}${matched ? '' : ', not matched'}`;
    } else if (unknownSender && threadPos === 1) {
      priority = 2;
      priorityReason = 'unknown external sender, first message in thread';
    } else {
      priority = 3;
      priorityReason = sp.count >= MIN_CLASSIFIED && sp.classified === 0 ? `sender ${sp.email}: all ${sp.count} items unclassified` : 'unclassified';
    }

    items.set(r.id, {
      sender: m.sender, template: m.template, threadPos, threadLen: thread.length, internalOnly: m.internalOnly,
      unknownSender, preClass, preReason, priority, priorityReason,
    });
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  const all = Array.from(senders.values()).sort(byCount);
  return {
    builtAt: new Date().toISOString(),
    itemCount: rows.length,
    senders: all,
    templates: Array.from(templates.values()).sort(byCount),
    unknownSenders: all.filter(isUnknown),
    items,
  };
}
