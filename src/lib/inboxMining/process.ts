import { getMessage, listMessageIds, getAttachment, sydneyWindow, type ParsedMessage } from './gmail';
import { googleErrorMessage } from './google';
import { readPdf, expandZip, documentLinks, fetchLinkedPdf, extractFacts, mergeFacts } from './extract';
import { classify } from './classify';
import { fetchStageNames, fetchOpps, fetchRecords, type Opp, type PropRecord } from './ghl';
import { loadTrackers, type Trackers } from './trackers';
import { matchMessage } from './match';
import { buildSuggestions } from './suggest';
import {
  ensureTables, startRun, updateRun, getRun, existingMessageIds, upsertItem, getThreadMemory, autoConfirmThread,
} from './store';
import type { DocRead, Facts, LinkRead } from './types';

// Display only in phase (a): the folder CopyPdfsToDrive_v16 copies into. Nothing is copied.
const DRIVE_TARGET = 'My Drive/Purchase Data Reconstruction/01 Source extracts/v16 re-read PDFs';

const PRIORITY = [
  /exchanged|executed|signed/i, /\bCOS\b|contract/i, /\bVS\b|vendor statement|section 32|form 1|disclosure/i,
  /HIA|MBA/i, /offer\s+(and|&)\s+acceptance/i, /deed of nomination/i, /title search/i,
  /deposit|trust receipt/i, /settlement statement/i,
];
const rank = (name: string) => {
  const i = PRIORITY.findIndex((re) => re.test(name));
  return i === -1 ? PRIORITY.length : i;
};

interface Context {
  opps: Opp[];
  records: PropRecord[];
  trackers: Trackers;
}

interface ReadDoc {
  doc: DocRead;
  text: string;
}

async function readDocs(msg: ParsedMessage): Promise<{ read: ReadDoc[]; docs: DocRead[]; links: LinkRead[] }> {
  const docs: DocRead[] = [];
  const read: ReadDoc[] = [];
  const addPdf = async (doc: DocRead, buf: Buffer) => {
    try {
      const pdf = await readPdf(buf);
      Object.assign(doc, { status: 'read', pages: pdf.pages, chars: pdf.text.length, isDocuSign: pdf.isDocuSign });
      read.push({ doc, text: pdf.text });
    } catch (e) {
      Object.assign(doc, { status: 'not_read', reason: e instanceof Error ? e.message : String(e) });
    }
    docs.push(doc);
  };

  for (const att of msg.attachments) {
    const isPdf = att.mimeType === 'application/pdf' || /\.pdf$/i.test(att.filename);
    const isZip = /zip/i.test(att.mimeType) || /\.zip$/i.test(att.filename);
    if (!isPdf && !isZip) {
      if (/\.(docx?|rtf)$/i.test(att.filename)) docs.push({ name: att.filename, source: 'attachment', status: 'not_read', reason: 'Word document - open manually' });
      continue;
    }
    const buf = await getAttachment(msg.mailbox, msg.id, att.attachmentId);
    if (isPdf) {
      await addPdf({ name: att.filename, source: 'attachment', status: 'read' }, buf);
      continue;
    }
    try {
      const entries = await expandZip(buf);
      if (!entries.length) docs.push({ name: att.filename, source: 'attachment', status: 'not_read', reason: 'Zip contains no PDFs' });
      for (const e of entries) await addPdf({ name: att.filename, zipEntry: e.name, source: 'zip', status: 'read' }, e.buf);
    } catch (e) {
      docs.push({ name: att.filename, source: 'attachment', status: 'zip_not_opened', reason: e instanceof Error ? e.message : String(e) });
    }
  }

  const links: LinkRead[] = [];
  for (const url of documentLinks(msg.text)) {
    const got = await fetchLinkedPdf(url, msg.mailbox);
    if (got.ok) {
      links.push({ url, status: 'read' });
      await addPdf({ name: got.name, url, source: 'link', status: 'read' }, got.buf);
    } else {
      links.push({ url, status: 'not_read', reason: got.reason });
    }
  }
  read.sort((a, b) => rank(a.doc.zipEntry || a.doc.name) - rank(b.doc.zipEntry || b.doc.name));
  return { read, docs, links };
}

async function processMessage(mailbox: string, id: string, runId: number, ctx: Context): Promise<void> {
  const msg = await getMessage(mailbox, id);
  const { read, docs, links } = await readDocs(msg);

  const docFacts: Facts[] = read.map(({ doc, text }) => {
    const f = extractFacts(text, doc.zipEntry || doc.name);
    doc.needsVisualRead = !!doc.isDocuSign && (!f.contractDate || !f.purchaser || !(f.landPrice || f.buildPrice || f.totalPrice));
    return f;
  });
  const facts = mergeFacts(...docFacts, extractFacts(`${msg.subject}\n${msg.text}`, 'email'));
  const docText = read.map((r) => r.text).join('\n');

  const { cls, rule } = classify({
    subject: msg.subject,
    body: msg.text,
    filenames: msg.attachments.map((a) => a.filename).concat(docs.map((d) => d.zipEntry || '').filter(Boolean)),
    docText,
    fromEmail: msg.fromEmail,
    builderSenders: ctx.trackers.builderSenders,
  });

  const haystack = [msg.subject, facts.purchaser?.value || '', msg.text.slice(0, 20000), ...read.map((r) => r.text.slice(0, 30000))].join('\n');
  const memory = await getThreadMemory(mailbox, msg.threadId);
  const match = await matchMessage({ facts, haystack, memory, opps: ctx.opps, records: ctx.records, trackers: ctx.trackers });
  const suggestions = ['A', 'B', 'C'].includes(match.grade) ? buildSuggestions(cls, facts, msg.date) : [];

  if (match.grade === 'A' && match.source === 'rules' && match.opportunityId) {
    await autoConfirmThread(mailbox, msg.threadId, msg.subject, msg.date, msg.from, match.opportunityId, match.propertyRecordId || null);
  }

  await upsertItem({
    runId,
    mailbox,
    messageId: msg.id,
    threadId: msg.threadId,
    receivedAt: msg.date,
    direction: msg.direction,
    from: msg.from,
    to: msg.to,
    subject: msg.subject,
    cls,
    clsRule: rule,
    facts,
    docs,
    links,
    match,
    suggestions,
    driveTarget: read.length ? DRIVE_TARGET : null,
  });
}

// Each request processes messages for about CHUNK_MS, then returns; the page calls again until remaining is 0.
const CHUNK_MS = 60_000;
const MESSAGE_TIMEOUT_MS = 90_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

export interface RunSummary {
  mailbox: string;
  runId: number;
  seen: number;
  skipped: number;
  written: number;
  remaining: number;
  failedIds: string[];
  errors: string[];
}

export async function runMailbox(
  mailbox: string,
  days: number,
  rerun: boolean,
  by: string | null,
  opts: { runId?: number; skip?: string[] } = {}
): Promise<RunSummary> {
  await ensureTables();
  const { start, end } = sydneyWindow(days);
  let runId: number;
  if (opts.runId) {
    const run = await getRun(opts.runId);
    if (!run || run.mailbox !== mailbox) throw new Error(`Run ${opts.runId} is not a run for ${mailbox}`);
    runId = run.id;
  } else {
    runId = await startRun(mailbox, start, end, by);
  }
  const skip = new Set(opts.skip || []);
  const errors: string[] = [];
  const failedIds: string[] = [];
  let seen = 0;
  let skipped = 0;
  let written = 0;
  let remaining = 0;
  try {
    const ids = await listMessageIds(mailbox, start, end);
    seen = ids.length;
    const existing = await existingMessageIds(mailbox, ids, rerun ? runId : null);
    skipped = existing.size;
    const todo = ids.filter((id) => !existing.has(id) && !skip.has(id));
    remaining = todo.length;
    if (todo.length) {
      const names = await fetchStageNames();
      const [opps, records, trackers] = await Promise.all([fetchOpps(names), fetchRecords(), loadTrackers()]);
      if (!opts.runId) {
        if (trackers.uncon.error) errors.push(trackers.uncon.error);
        if (trackers.construction.error) errors.push(trackers.construction.error);
      }
      const deadline = Date.now() + CHUNK_MS;
      for (let n = 0; n < todo.length && Date.now() < deadline; n++) {
        const id = todo[n];
        const tag = `[inbox-mining] ${mailbox} ${n + 1}/${todo.length} ${id}`;
        const t0 = Date.now();
        console.log(`${tag} start`);
        try {
          await withTimeout(processMessage(mailbox, id, runId, { opps, records, trackers }), MESSAGE_TIMEOUT_MS);
          written++;
          console.log(`${tag} ok ${Date.now() - t0}ms`);
        } catch (e) {
          failedIds.push(id);
          errors.push(googleErrorMessage(e, `message ${id}`));
          console.error(`${tag} FAILED ${Date.now() - t0}ms: ${errors[errors.length - 1]}`);
        }
        remaining--;
      }
    }
  } catch (e) {
    errors.push(googleErrorMessage(e, mailbox));
    remaining = 0;
  }
  await updateRun(runId, seen, written, errors, remaining === 0);
  return { mailbox, runId, seen, skipped, written, remaining, failedIds, errors };
}
