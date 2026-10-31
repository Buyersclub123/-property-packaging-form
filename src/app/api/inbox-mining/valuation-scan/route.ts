import { NextResponse } from 'next/server';
import { INBOX_MAILBOXES } from '@/lib/inboxMining/gmail';
import { scanValuations } from '@/lib/inboxMining/valuationScan';

// GET ?mailbox=&days=: valuation evidence from the last N days of one inbox mailbox. Gmail and GHL are only read.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mailbox = (url.searchParams.get('mailbox') || '').trim().toLowerCase();
  const days = parseInt(url.searchParams.get('days') || '7', 10);
  if (!INBOX_MAILBOXES.includes(mailbox)) {
    return NextResponse.json({ error: `mailbox must be one of ${INBOX_MAILBOXES.join(', ')}` }, { status: 400 });
  }
  try {
    return NextResponse.json(await scanValuations(mailbox, days));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
