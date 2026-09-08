import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/db-health?secret=...
 *
 * Returns row counts for every EOI system table and confirms connectivity.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!process.env.DEAL_SHEET_WEBHOOK_SECRET || secret !== process.env.DEAL_SHEET_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = getDb();

  try {
    // COUNT(*) returns bigint as a string through Neon HTTP driver — parse to int.
    const counts: Record<string, number> = {};
    const queries: [string, Promise<Record<string, unknown>[]>][] = [
      ['eoi_template_values', sql`SELECT COUNT(*) AS n FROM eoi_template_values`],
      ['special_conditions', sql`SELECT COUNT(*) AS n FROM special_conditions`],
      ['contacts', sql`SELECT COUNT(*) AS n FROM contacts`],
      ['eoi_sends', sql`SELECT COUNT(*) AS n FROM eoi_sends`],
      ['eoi_audit_log', sql`SELECT COUNT(*) AS n FROM eoi_audit_log`],
      ['client_portal_entries', sql`SELECT COUNT(*) AS n FROM client_portal_entries`],
    ];
    for (const [name, query] of queries) {
      try {
        const rows = await query;
        counts[name] = parseInt(String(rows[0]?.n ?? '0'), 10);
      } catch {
        counts[name] = -1; // table doesn't exist yet
      }
    }

    return NextResponse.json({
      ok: true,
      database: 'connected',
      tables: counts,
    });
  } catch (err) {
    console.error('db-health error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ ok: false, database: 'error', error: message }, { status: 500 });
  }
}
