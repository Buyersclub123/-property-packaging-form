import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { INBOX_MAILBOXES } from '@/lib/inboxMining/gmail';
import { ensureActivityTable, mineChunk, finalizeActivity, reclassifyStored, refineOther } from '@/lib/inboxMining/activity';

// Backlog 17 activity mining. Gmail metadata/snippet reads only; writes only to the email_activity table.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  try {
    await ensureActivityTable();
    const sql = getDb();
    const counts = await sql`
      SELECT activity, mailbox, COUNT(*)::int AS n FROM email_activity GROUP BY 1, 2 ORDER BY 1, 2`;
    const months = await sql`SELECT mailbox, month, COUNT(*)::int AS n FROM email_activity GROUP BY 1, 2 ORDER BY 1, 2`;
    return NextResponse.json({ counts, months });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { action?: string; apply?: unknown; mailbox?: string; month?: string; skip?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    if (body.action === 'finalize') return NextResponse.json(await finalizeActivity());
    if (body.action === 'reclassify') return NextResponse.json(await reclassifyStored(body.apply === true));
    if (body.action === 'refine') return NextResponse.json(await refineOther(body.apply === true));
    const mailbox = body.mailbox || '';
    if (!(INBOX_MAILBOXES as readonly string[]).includes(mailbox)) {
      return NextResponse.json({ error: `mailbox must be one of ${INBOX_MAILBOXES.join(', ')}` }, { status: 400 });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month || '')) return NextResponse.json({ error: 'month must be YYYY-MM' }, { status: 400 });
    const skip = Array.isArray(body.skip) ? body.skip.filter((x): x is string => typeof x === 'string') : [];
    return NextResponse.json(await mineChunk(mailbox, body.month!, skip));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
