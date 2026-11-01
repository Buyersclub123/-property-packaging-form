import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCfEmail } from '@/lib/cloudflareAuth';

// Mute suggestions for an opportunity (JT wireframe v2). Our DB only (inbox_muted_opps); nothing goes to GHL.
export const dynamic = 'force-dynamic';

async function ensure() {
  await getDb()`
    CREATE TABLE IF NOT EXISTS inbox_muted_opps (
      opportunity_id TEXT PRIMARY KEY,
      muted_by       TEXT,
      muted_at       TIMESTAMPTZ DEFAULT NOW()
    )`;
}

export async function GET() {
  try {
    await ensure();
    const rows = await getDb()`SELECT opportunity_id FROM inbox_muted_opps`;
    return NextResponse.json({ muted: rows.map((r) => r.opportunity_id as string) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { opportunityId?: unknown; muted?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const id = typeof body.opportunityId === 'string' ? body.opportunityId.trim() : '';
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return NextResponse.json({ error: 'opportunityId is required' }, { status: 400 });
  try {
    await ensure();
    if (body.muted === false) await getDb()`DELETE FROM inbox_muted_opps WHERE opportunity_id = ${id}`;
    else await getDb()`
      INSERT INTO inbox_muted_opps (opportunity_id, muted_by) VALUES (${id}, ${getCfEmail(request) || 'JT (local dev)'})
      ON CONFLICT (opportunity_id) DO NOTHING`;
    return NextResponse.json({ ok: true, opportunityId: id, muted: body.muted !== false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
