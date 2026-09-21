import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/eoi/history?recordId=xxx
 *
 * Returns the EOI send history for a property record, ordered newest first.
 * Also returns the latest send for quick "last EOI" display on the Deal Sheet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');

  if (!recordId) {
    return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
  }

  const sql = getDb();

  const sends = await sql`
    SELECT
      id, record_id, opportunity_id, opportunity_name, property_address, event_type,
      offer_price, offer_price_land, offer_price_build, offer_status_at_event,
      agent_email, client_name, assigned_ba, close_date,
      sent_by, sent_at, delivery_status, method,
      initiated_by, delink_reason, changes, notes
    FROM eoi_sends
    WHERE record_id = ${recordId}
    ORDER BY sent_at DESC`;

  return NextResponse.json({
    recordId,
    sends,
    count: sends.length,
    latest: sends[0] || null,
  });
}
