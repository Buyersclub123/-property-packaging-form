import { NextResponse } from 'next/server';
import { INBOX_MAILBOXES } from '@/lib/inboxMining/gmail';
import { rehit, scanValuations } from '@/lib/inboxMining/valuationScan';

// GET ?mailbox=[&from=&to=&since=] (ISO dates): valuation evidence from one inbox mailbox.
// Default is the last 7 days. Gmail and GHL are only read.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function isoParam(url: URL, name: string): Date | undefined | null {
  const v = url.searchParams.get(name);
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// POST {items: [{quote, at}]}: re-applies the current rules to saved evidence (no Gmail or GHL calls).
export async function POST(request: Request) {
  let body: { items?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : null;
  if (!items || !items.every((x) => x && typeof x.quote === 'string' && typeof x.at === 'string')) {
    return NextResponse.json({ error: 'items must be [{quote, at}]' }, { status: 400 });
  }
  return NextResponse.json({ results: rehit(items as { quote: string; at: string }[]) });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mailbox = (url.searchParams.get('mailbox') || '').trim().toLowerCase();
  if (!INBOX_MAILBOXES.includes(mailbox)) {
    return NextResponse.json({ error: `mailbox must be one of ${INBOX_MAILBOXES.join(', ')}` }, { status: 400 });
  }
  const from = isoParam(url, 'from');
  const to = isoParam(url, 'to');
  const since = isoParam(url, 'since');
  if (from === null || to === null || since === null) {
    return NextResponse.json({ error: 'from / to / since must be ISO dates' }, { status: 400 });
  }
  try {
    return NextResponse.json(await scanValuations(mailbox, { from, to, since }));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
