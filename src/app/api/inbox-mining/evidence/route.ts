import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureTables } from '@/lib/inboxMining/store';

// GET ?message=<gmail id>: the inbox item for a Gmail message (used by /inbox-mining/evidence). Reads our DB only.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const message = (new URL(request.url).searchParams.get('message') || '').trim();
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(message)) return NextResponse.json({ error: 'message must be a Gmail message id' }, { status: 400 });
  try {
    await ensureTables();
    const rows = (await getDb()`
      SELECT id, mailbox, received_at FROM inbox_items WHERE message_id = ${message} ORDER BY received_at DESC LIMIT 1`) as { id: number; mailbox: string; received_at: string }[];
    if (!rows.length) return NextResponse.json({ error: `Message ${message} is not in the inbox database` }, { status: 404 });
    return NextResponse.json({ itemId: rows[0].id, mailbox: rows[0].mailbox, receivedAt: rows[0].received_at });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
