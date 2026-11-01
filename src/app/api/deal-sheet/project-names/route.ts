import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emailFromHeaders, isAdmin, loadAccess } from '@/lib/tileAccess';

export const dynamic = 'force-dynamic';

// Deal Sheet admin list of project names. Property Records pick project_name from it (Quick Record dropdown);
// the CTRT project views filter on that field. Stored in the tool's database only — nothing here writes to GHL.
async function ensureTable() {
  await getDb()`CREATE TABLE IF NOT EXISTS deal_sheet_project_names (
    name TEXT PRIMARY KEY,
    added_by TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;
}

async function list() {
  const rows = await getDb()`SELECT name, added_by, added_at FROM deal_sheet_project_names ORDER BY lower(name)`;
  return { projects: rows, names: rows.map((r) => String(r.name)) };
}

export async function GET() {
  try {
    await ensureTable();
    return NextResponse.json(await list());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// { action: 'add' | 'remove', name }. Admins only.
export async function POST(request: NextRequest) {
  const email = emailFromHeaders(request.headers);
  if (!email) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    if (!isAdmin(email, await loadAccess())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    const { action, name } = await request.json();
    const clean = String(name ?? '').trim().replace(/\s+/g, ' ');
    if (!clean || clean.length > 120) return NextResponse.json({ error: 'Project name must be 1–120 characters.' }, { status: 400 });
    await ensureTable();
    const sql = getDb();
    if (action === 'remove') await sql`DELETE FROM deal_sheet_project_names WHERE name = ${clean}`;
    else await sql`INSERT INTO deal_sheet_project_names (name, added_by) VALUES (${clean}, ${email}) ON CONFLICT (name) DO NOTHING`;
    return NextResponse.json(await list());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
