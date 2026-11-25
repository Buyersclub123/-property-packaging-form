// Sam Singh client mail-out: Luca's one-off automatic reply.
// Ali sends each client "<First Name> | Buyers Club" with Luca cc'd. When the client
// replies (with Luca on the reply), Luca's template goes back once, in the same thread.
// Gmail is the record: a thread where Luca has already written is never replied to again,
// and a Redis key per thread stops two runs replying at the same time.

import { google } from 'googleapis';
import { gmailFor } from '@/lib/inboxMining/google';
import { parseCredentials } from '@/lib/gmailSendAsUser';
import { getRedisClient } from '@/lib/redis';

const ALI = 'ali.h@buyersclub.com.au';
const LUCA = 'luca.d@buyersclub.com.au';
const LUCA_FROM = 'Luca Arezzi De Bonis <luca.d@buyersclub.com.au>';
const SUBJECT_SUFFIX = ' | Buyers Club';
const SEARCH = `from:${ALI} subject:"Buyers Club" "Sam Singh has moved on" newer_than:60d`;
const LOCK_PREFIX = 'sam-singh-autoreply:thread:';

export interface AutoReplyResult {
  threadId: string;
  client: string;
  firstName: string;
  action: 'replied' | 'would_reply' | 'already_replied' | 'no_client_reply' | 'locked' | 'failed';
  error?: string;
}

type Msg = { id: string; internalDate: number; headers: Record<string, string> };

const addr = (v: string) => (v.match(/<([^>]+)>/)?.[1] || v).trim().toLowerCase();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function lucaSender() {
  const raw = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!raw) throw new Error('GOOGLE_SHEETS_CREDENTIALS is not configured');
  const c = parseCredentials(raw);
  const auth = new google.auth.JWT({
    email: c.client_email,
    key: c.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.settings.basic'],
    subject: LUCA,
  });
  return google.gmail({ version: 'v1', auth });
}

function lucaHtml(firstName: string, signature: string) {
  return `<div style="font-family:Arial,sans-serif;font-size:14px"><p>Good afternoon ${esc(firstName)},</p>
<p>As Ali mentioned, I'm here to support you at any point, so if you need anything before we're in touch, please don't hesitate to reach out.</p>
<p>Hope you enjoy the rest of your day.</p></div><br>${signature}`;
}

function mime(to: string, subject: string, html: string, inReplyTo: string, references: string) {
  const lines = [
    `From: ${LUCA_FROM}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `In-Reply-To: ${inReplyTo}`,
    `References: ${references}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
  ];
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

async function listThreadIds(gmail: ReturnType<typeof gmailFor>) {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const r = await gmail.users.messages.list({ userId: 'me', q: SEARCH, maxResults: 500, pageToken });
    for (const m of r.data.messages || []) if (m.threadId) ids.add(m.threadId);
    pageToken = r.data.nextPageToken || undefined;
  } while (pageToken);
  return [...ids];
}

async function threadMessages(gmail: ReturnType<typeof gmailFor>, threadId: string): Promise<Msg[]> {
  const t = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Message-ID', 'References'],
  });
  return (t.data.messages || [])
    .map(m => ({
      id: m.id || '',
      internalDate: Number(m.internalDate || 0),
      headers: Object.fromEntries((m.payload?.headers || []).map(h => [String(h.name).toLowerCase(), String(h.value || '')])),
    }))
    .sort((a, b) => a.internalDate - b.internalDate);
}

export async function runSamSinghAutoReply({ dryRun }: { dryRun: boolean }): Promise<AutoReplyResult[]> {
  const reader = gmailFor(LUCA);
  const results: AutoReplyResult[] = [];
  let sender: ReturnType<typeof lucaSender> | null = null;
  let signature: string | null = null;

  for (const threadId of await listThreadIds(reader)) {
    const msgs = await threadMessages(reader, threadId);
    const original = msgs.find(m =>
      addr(m.headers.from || '') === ALI &&
      (m.headers.subject || '').endsWith(SUBJECT_SUFFIX) &&
      (m.headers.cc || '').toLowerCase().includes(LUCA));
    if (!original) continue;

    const client = addr(original.headers.to || '');
    const subject = original.headers.subject;
    const firstName = subject.slice(0, -SUBJECT_SUFFIX.length).trim();
    const base = { threadId, client, firstName };
    const later = msgs.filter(m => m.internalDate >= original.internalDate && m.id !== original.id);

    if (later.some(m => addr(m.headers.from || '') === LUCA)) { results.push({ ...base, action: 'already_replied' }); continue; }
    const clientReplies = later.filter(m => addr(m.headers.from || '') === client);
    if (!client || clientReplies.length === 0) { results.push({ ...base, action: 'no_client_reply' }); continue; }
    if (dryRun) { results.push({ ...base, action: 'would_reply' }); continue; }

    const redis = await getRedisClient();
    const lockKey = LOCK_PREFIX + threadId;
    if (!(await redis.set(lockKey, new Date().toISOString(), { NX: true }))) { results.push({ ...base, action: 'locked' }); continue; }

    try {
      sender ??= lucaSender();
      if (signature === null) {
        const sa = await sender.users.settings.sendAs.get({ userId: 'me', sendAsEmail: LUCA });
        signature = sa.data.signature || '';
      }
      const last = clientReplies[clientReplies.length - 1];
      const replyId = last.headers['message-id'];
      const references = [last.headers.references, replyId].filter(Boolean).join(' ');
      await sender.users.messages.send({
        userId: 'me',
        requestBody: { threadId, raw: mime(client, `Re: ${subject}`, lucaHtml(firstName, signature), replyId, references) },
      });
      results.push({ ...base, action: 'replied' });
    } catch (e) {
      await redis.del(lockKey);
      results.push({ ...base, action: 'failed', error: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
