import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emailFromHeaders, isAdmin, loadAccess } from '@/lib/tileAccess';

// Always run at request time, never pre-render at build (data must be live)
export const dynamic = 'force-dynamic';

// Built-in CTRT views "deleted" from the View Builder are hidden for everyone (the code version stays).
// Admin > Views lists them and restores them.

async function ensureTable() {
  await getDb()`CREATE TABLE IF NOT EXISTS ctr_hidden_views (
    view_id TEXT PRIMARY KEY,
    view_name TEXT NOT NULL,
    hidden_by TEXT,
    hidden_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

async function list() {
  return getDb()`SELECT view_id, view_name, hidden_by, hidden_at FROM ctr_hidden_views ORDER BY view_name`;
}

export async function GET() {
  try {
    await ensureTable();
    return NextResponse.json({ hidden: await list() });
  } catch (e) {
    console.error('CTR hidden views GET error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// { id, name, hidden: true } hides a built-in view (anyone signed in, from the View Builder);
// { id, hidden: false } restores it (admins only, from Admin > Views).
export async function POST(request: NextRequest) {
  const email = emailFromHeaders(request.headers);
  if (!email) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const { id, name, hidden } = await request.json();
    if (!id || typeof id !== 'string' || !id.startsWith('builtin-')) {
      return NextResponse.json({ error: 'Only built-in views can be hidden.' }, { status: 400 });
    }
    await ensureTable();
    const sql = getDb();
    if (hidden === false) {
      if (!isAdmin(email, await loadAccess())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
      await sql`DELETE FROM ctr_hidden_views WHERE view_id = ${id}`;
    } else {
      await sql`INSERT INTO ctr_hidden_views (view_id, view_name, hidden_by) VALUES (${id}, ${String(name || id)}, ${email})
        ON CONFLICT (view_id) DO UPDATE SET view_name = EXCLUDED.view_name, hidden_by = EXCLUDED.hidden_by, hidden_at = NOW()`;
    }
    return NextResponse.json({ ok: true, hidden: await list() });
  } catch (e) {
    console.error('CTR hidden views POST error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
