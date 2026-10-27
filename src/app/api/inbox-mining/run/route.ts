import { NextResponse } from 'next/server';
import { runMailbox } from '@/lib/inboxMining/process';
import { INBOX_MAILBOXES, MAX_WINDOW_DAYS } from '@/lib/inboxMining/gmail';
import { getCfEmail } from '@/lib/cloudflareAuth';

// Read-only run: reads Gmail, GHL, Sheets and Geoscape; writes only the suggestion log to Postgres.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({
    mailboxes: INBOX_MAILBOXES,
    maxDays: MAX_WINDOW_DAYS,
    credentialsSet: !!process.env.GMAIL_READER_CREDENTIALS,
  });
}

export async function POST(request: Request) {
  let body: { mailbox?: string; days?: number; rerun?: boolean; runId?: unknown; skip?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const mailbox = body.mailbox || '';
  if (!INBOX_MAILBOXES.includes(mailbox)) {
    return NextResponse.json({ error: `Unknown mailbox "${mailbox}"` }, { status: 400 });
  }
  try {
    const runId = typeof body.runId === 'number' && Number.isInteger(body.runId) ? body.runId : undefined;
    const skip = Array.isArray(body.skip) ? body.skip.filter((s): s is string => typeof s === 'string') : [];
    const summary = await runMailbox(mailbox, body.days ?? MAX_WINDOW_DAYS, !!body.rerun, getCfEmail(request), { runId, skip });
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
