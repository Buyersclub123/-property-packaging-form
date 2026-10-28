import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureTables } from '@/lib/inboxMining/store';
import { getCfEmail } from '@/lib/cloudflareAuth';

// POST {ids, status}: mark workflow items done (moves them to Processed) or reopen them.
// Writes only inbox_items.workflow; nothing goes to GHL or Gmail.
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { ids?: unknown; status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is number => Number.isInteger(x)) : [];
  const status = body.status === 'done' || body.status === 'open' ? body.status : null;
  if (!ids.length || ids.length > 2000) return NextResponse.json({ error: 'ids must be 1-2000 item ids' }, { status: 400 });
  if (!status) return NextResponse.json({ error: "status must be 'done' or 'open'" }, { status: 400 });
  try {
    await ensureTables();
    const entry = { status, by: getCfEmail(request) || 'JT (local dev)', at: new Date().toISOString() };
    const rows = await getDb()`
      UPDATE inbox_items SET workflow = ${JSON.stringify(entry)}::jsonb WHERE id = ANY(${ids}::int[]) RETURNING id`;
    return NextResponse.json({ updated: rows.length, entry });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
