import { getDb } from '@/lib/db';
import { gmailFor, googleErrorMessage } from './google';

// Precedent check (backlog 21): sent forwards ("Fw:/Fwd:") in shared and staff mailboxes, metadata only
// (subject, date, to). No bodies, no attachments. Gmail is only read.

export const normSubject = (s: string) =>
  s.toLowerCase().replace(/^\s*((re|fw|fwd|aw)\s*:\s*)+/i, '').replace(/\s+/g, ' ').trim();

const FWD_RE = /^\s*(re\s*:\s*)*(fw|fwd)\s*:/i;
const AFTER = '2026/06/01';
const BEFORE = '2026/11/15';

export async function ensureForwardsTable(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS email_forwards (
      mailbox      TEXT NOT NULL,
      message_id   TEXT NOT NULL,
      thread_id    TEXT,
      sent_at      TIMESTAMPTZ NOT NULL,
      subject      TEXT,
      norm_subject TEXT,
      to_addrs     TEXT,
      PRIMARY KEY (mailbox, message_id)
    )`;
  await sql`CREATE INDEX IF NOT EXISTS email_forwards_subject ON email_forwards (norm_subject)`;
}

/** One time-boxed chunk (about a minute) for one mailbox; call again while remaining > 0. */
export async function mineForwards(mailbox: string, maxPerChunk = 500) {
  await ensureForwardsTable();
  const sql = getDb();
  const gmail = gmailFor(mailbox);
  const q = `in:sent subject:(fw OR fwd) after:${AFTER} before:${BEFORE}`;
  const ids: string[] = [];
  try {
    let pageToken: string | undefined;
    do {
      const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500, pageToken }, { timeout: 60_000 });
      for (const m of res.data.messages || []) if (m.id) ids.push(m.id);
      pageToken = res.data.nextPageToken || undefined;
    } while (pageToken);
  } catch (e) {
    return { mailbox, readable: false, listed: 0, written: 0, remaining: 0, error: googleErrorMessage(e, 'Gmail list') };
  }
  const have = new Set(
    ((await sql`SELECT message_id FROM email_forwards WHERE mailbox = ${mailbox}`) as { message_id: string }[]).map((r) => r.message_id)
  );
  const todo = ids.filter((id) => !have.has(id));
  const chunk = todo.slice(0, maxPerChunk);
  const rows: { id: string; thread: string; at: string; subject: string; to: string }[] = [];
  const errors: string[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < chunk.length) {
      const id = chunk[i++];
      try {
        const res = await gmail.users.messages.get(
          { userId: 'me', id, format: 'metadata', metadataHeaders: ['Subject', 'To'], fields: 'id,threadId,internalDate,payload(headers(name,value))' },
          { timeout: 30_000 }
        );
        const h = (n: string) => res.data.payload?.headers?.find((x) => (x.name || '').toLowerCase() === n.toLowerCase())?.value || '';
        rows.push({ id, thread: res.data.threadId || '', at: new Date(Number(res.data.internalDate)).toISOString(), subject: h('Subject'), to: h('To') });
      } catch (e) {
        if (errors.length < 5) errors.push(googleErrorMessage(e, `Gmail message ${id}`));
      }
    }
  }));
  // Messages whose subject is not actually a forward are stored too (norm_subject null) so they are not re-read.
  if (rows.length) {
    await sql`
      INSERT INTO email_forwards (mailbox, message_id, thread_id, sent_at, subject, norm_subject, to_addrs)
      SELECT ${mailbox}, u.id, u.thread, u.at::timestamptz, u.subject, u.ns, u.to_addrs
      FROM unnest(${rows.map((r) => r.id)}::text[], ${rows.map((r) => r.thread)}::text[], ${rows.map((r) => r.at)}::text[],
        ${rows.map((r) => r.subject)}::text[], ${rows.map((r) => (FWD_RE.test(r.subject) ? normSubject(r.subject) : null))}::text[],
        ${rows.map((r) => r.to)}::text[]) AS u(id, thread, at, subject, ns, to_addrs)
      ON CONFLICT (mailbox, message_id) DO NOTHING`;
  }
  return { mailbox, readable: true, listed: ids.length, written: rows.length, remaining: todo.length - chunk.length, errors };
}
