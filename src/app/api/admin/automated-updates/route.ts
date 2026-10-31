import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emailFromHeaders, isAdmin, loadAccess } from '@/lib/tileAccess';
import { AUTOMATED_UPDATES } from '@/lib/automatedUpdates';
import { ensureStampTables, setStampApply, stampApplyEnabled } from '@/lib/ctrStamp';

export const dynamic = 'force-dynamic';

// Register + nightly stamp status (last runs, recent log rows).
export async function GET() {
  try {
    await ensureStampTables();
    const sql = getDb();
    const runs = await sql`SELECT run_id, at, dry_run, result FROM ctr_stamp_log WHERE object = 'run' ORDER BY at DESC LIMIT 10`;
    const recent = await sql`SELECT run_id, at, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result FROM ctr_stamp_log WHERE object <> 'run' ORDER BY at DESC LIMIT 200`;
    return NextResponse.json({ register: AUTOMATED_UPDATES, stamp: { apply: await stampApplyEnabled(), runs, recent } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// Switch the nightly stamp between dry run and apply. Admins only.
export async function POST(request: NextRequest) {
  const email = emailFromHeaders(request.headers);
  if (!email) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    if (!isAdmin(email, await loadAccess())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    const { apply } = await request.json();
    await ensureStampTables();
    await setStampApply(apply === true, email);
    return NextResponse.json({ ok: true, apply: apply === true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
