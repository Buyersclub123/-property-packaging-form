import type { gmail_v1 } from 'googleapis';
import { gmailFor } from './google';

export const INBOX_MAILBOXES = [
  'property@buyersclub.com.au',
  'contracts@buyersclub.com.au',
  'construction@buyersclub.com.au',
  'sydney.m@buyersclub.com.au',
];

export const MAX_WINDOW_DAYS = 7;

export interface AttachmentMeta {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface ParsedMessage {
  id: string;
  threadId: string;
  mailbox: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: Date;
  direction: 'inbound' | 'outbound';
  text: string;
  attachments: AttachmentMeta[];
}

function sydneyOffsetMinutes(at: Date): number {
  const s = at.toLocaleString('en-US', { timeZone: 'Australia/Sydney', timeZoneName: 'longOffset' });
  const m = s.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) throw new Error(`Could not determine the Sydney UTC offset from "${s}"`);
  const mins = parseInt(m[2], 10) * 60 + parseInt(m[3], 10);
  return m[1] === '-' ? -mins : mins;
}

/** Window from Sydney midnight (days-1) days ago until now. */
export function sydneyWindow(days: number, now = new Date()): { start: Date; end: Date } {
  if (!Number.isInteger(days) || days < 1 || days > MAX_WINDOW_DAYS) {
    throw new Error(`Window must be 1-${MAX_WINDOW_DAYS} days (got ${days})`);
  }
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const [y, mo, d] = ymd.split('-').map(Number);
  const localMidnightAsUtc = Date.UTC(y, mo - 1, d - (days - 1));
  const offset = sydneyOffsetMinutes(new Date(localMidnightAsUtc));
  return { start: new Date(localMidnightAsUtc - offset * 60000), end: now };
}

export async function listMessageIds(mailbox: string, start: Date, end: Date): Promise<string[]> {
  const gmail = gmailFor(mailbox);
  const q = `after:${Math.floor(start.getTime() / 1000)} before:${Math.ceil(end.getTime() / 1000)}`;
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 500, pageToken }, { timeout: 60_000 });
    for (const m of res.data.messages || []) if (m.id) ids.push(m.id);
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return ids;
}

function decode(data?: string | null): string {
  if (!data) return '';
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>/gi, ' $1 ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n');
}

function walk(part: gmail_v1.Schema$MessagePart | undefined, out: { plain: string[]; html: string[]; atts: AttachmentMeta[] }) {
  if (!part) return;
  const mime = part.mimeType || '';
  if (part.filename && part.body?.attachmentId) {
    out.atts.push({
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: mime,
      size: part.body.size || 0,
    });
  } else if (mime === 'text/plain' && part.body?.data) {
    out.plain.push(decode(part.body.data));
  } else if (mime === 'text/html' && part.body?.data) {
    out.html.push(decode(part.body.data));
  }
  for (const p of part.parts || []) walk(p, out);
}

function header(msg: gmail_v1.Schema$Message, name: string): string {
  const h = msg.payload?.headers?.find((x) => (x.name || '').toLowerCase() === name.toLowerCase());
  return h?.value || '';
}

export function emailOf(addr: string): string {
  const m = addr.match(/<([^>]+)>/);
  return (m ? m[1] : addr).trim().toLowerCase();
}

export async function getMessage(mailbox: string, id: string): Promise<ParsedMessage> {
  const gmail = gmailFor(mailbox);
  const res = await gmail.users.messages.get({ userId: 'me', id, format: 'full' }, { timeout: 60_000 });
  const msg = res.data;
  const out = { plain: [] as string[], html: [] as string[], atts: [] as AttachmentMeta[] };
  walk(msg.payload, out);
  // Links live in the HTML hrefs, so read both bodies when both exist.
  const text = [out.plain.join('\n'), out.html.length ? stripHtml(out.html.join('\n')) : ''].filter(Boolean).join('\n');
  const from = header(msg, 'From');
  const fromEmail = emailOf(from);
  const outbound = (msg.labelIds || []).includes('SENT') || fromEmail === mailbox.toLowerCase();
  return {
    id,
    threadId: msg.threadId || id,
    mailbox,
    from,
    fromEmail,
    to: header(msg, 'To'),
    subject: header(msg, 'Subject'),
    date: new Date(parseInt(msg.internalDate || '0', 10)),
    direction: outbound ? 'outbound' : 'inbound',
    text,
    attachments: out.atts,
  };
}

export async function getAttachment(mailbox: string, messageId: string, attachmentId: string): Promise<Buffer> {
  const gmail = gmailFor(mailbox);
  const res = await gmail.users.messages.attachments.get({ userId: 'me', messageId, id: attachmentId }, { timeout: 60_000 });
  if (!res.data.data) throw new Error('Attachment returned no data');
  return Buffer.from(res.data.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/** Attachment ids are not stable between fetches, so resolve by filename at view time. */
export async function getAttachmentByName(mailbox: string, messageId: string, filename: string): Promise<Buffer> {
  const msg = await getMessage(mailbox, messageId);
  const att = msg.attachments.find((a) => a.filename === filename);
  if (!att) throw new Error(`Attachment "${filename}" not found on message ${messageId}`);
  return getAttachment(mailbox, messageId, att.attachmentId);
}
