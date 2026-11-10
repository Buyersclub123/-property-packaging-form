import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { emailFromHeaders, isAdmin, loadAccess } from '@/lib/tileAccess';
import { AUTOMATED_UPDATES } from '@/lib/automatedUpdates';
import { ensureStampTables, setStampApply, stampApplyEnabled } from '@/lib/ctrStamp';
import { readOpportunity, setSettledApply, settledApplyEnabled } from '@/lib/ctrSettled';

export const dynamic = 'force-dynamic';

// Register + nightly stamp status (last runs, recent log rows).
export async function GET() {
  try {
    await ensureStampTables();
    const sql = getDb();
    const runs = await sql`SELECT run_id, at, dry_run, result FROM ctr_stamp_log WHERE object = 'run' ORDER BY at DESC LIMIT 10`;
    const recent = await sql`SELECT run_id, at, object, record_id, field, old_value, new_value, date_field, date_written, dry_run, result FROM ctr_stamp_log WHERE object <> 'run' ORDER BY at DESC LIMIT 200`;
    const settledApply = await settledApplyEnabled();
    const [settledSwitch] = await sql`SELECT updated_by, updated_at FROM ctr_stamp_settings WHERE key = 'settled_apply'`;
    // Rows logged before opportunity_name existed: fill the name from GHL once.
    const unnamed = (await sql`SELECT DISTINCT opportunity_id FROM ctr_settled_log WHERE opportunity_name IS NULL LIMIT 20`) as { opportunity_id: string }[];
    for (const { opportunity_id } of unnamed) {
      const opp = await readOpportunity(opportunity_id);
      if (opp?.name) await sql`UPDATE ctr_settled_log SET opportunity_name = ${opp.name} WHERE opportunity_id = ${opportunity_id} AND opportunity_name IS NULL`;
    }
    const settledRecent = await sql`SELECT run_id, at, user_email, opportunity_id, opportunity_name, record_id, step, field, old_value, new_value, read_back, dry_run, result FROM ctr_settled_log WHERE step <> 'run' ORDER BY at DESC, id LIMIT 200`;
    return NextResponse.json({ register: AUTOMATED_UPDATES, stamp: { apply: await stampApplyEnabled(), runs, recent }, settled: { apply: settledApply, switchedBy: settledSwitch?.updated_by ?? null, switchedAt: settledSwitch?.updated_at ?? null, recent: settledRecent } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

// Switch the nightly stamp ({ apply }) or Settlement confirmed -> Settled ({ settledApply }) between dry run and apply. Admins only.
export async function POST(request: NextRequest) {
  const email = emailFromHeaders(request.headers);
  if (!email) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    if (!isAdmin(email, await loadAccess())) return NextResponse.json({ error: 'Admins only.' }, { status: 403 });
    const { apply, settledApply } = await request.json();
    if (typeof settledApply === 'boolean') {
      await setSettledApply(settledApply, email);
      return NextResponse.json({ ok: true, settledApply });
    }
    await ensureStampTables();
    await setStampApply(apply === true, email);
    return NextResponse.json({ ok: true, apply: apply === true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
