import { NextResponse } from 'next/server';
import { buildLagRows, geoscapePass, mineChunk, resetLagSheet } from '@/lib/inboxMining/lagSheet';
import { INBOX_MAILBOXES } from '@/lib/inboxMining/gmail';

// Lag-sheet demonstration (JT 9/11). POST {action:'mine', mailbox, days, skip} reads one ~60 s chunk of mail;
// {action:'geoscape'} runs the lot + plan pass; {action:'rows'} returns the sheet rows. GHL and Gmail are only read.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { action?: string; mailbox?: string; days?: number; skip?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    if (body.action === 'mine') {
      if (!body.mailbox || !(INBOX_MAILBOXES as readonly string[]).includes(body.mailbox)) return NextResponse.json({ error: 'Unknown mailbox' }, { status: 400 });
      const days = body.days ?? 90;
      if (!Number.isInteger(days) || days < 1 || days > 120) return NextResponse.json({ error: 'days must be 1-120' }, { status: 400 });
      const skip = Array.isArray(body.skip) ? body.skip.filter((s): s is string => typeof s === 'string') : [];
      return NextResponse.json(await mineChunk(body.mailbox, days, skip));
    }
    if (body.action === 'geoscape') return NextResponse.json(await geoscapePass());
    if (body.action === 'rows') return NextResponse.json({ rows: await buildLagRows() });
    if (body.action === 'reset') return NextResponse.json(await resetLagSheet());
    return NextResponse.json({ error: 'action must be mine, geoscape or rows' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
