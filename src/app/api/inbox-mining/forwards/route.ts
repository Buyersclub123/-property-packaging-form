import { NextResponse } from 'next/server';
import { mineForwards } from '@/lib/inboxMining/forwards';

// POST {mailbox}: one chunk of sent-forward metadata for the precedent check. Gmail is only read.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: { mailbox?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const mailbox = typeof body.mailbox === 'string' ? body.mailbox.trim().toLowerCase() : '';
  if (!/^[a-z0-9._-]+@buyersclub\.com\.au$/.test(mailbox)) {
    return NextResponse.json({ error: 'mailbox must be a @buyersclub.com.au address' }, { status: 400 });
  }
  try {
    return NextResponse.json(await mineForwards(mailbox));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
