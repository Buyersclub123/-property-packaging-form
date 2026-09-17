import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/eoi/last-send?recordId=xxx
 *
 * Returns the most recent successful send's full payload for a property record.
 * Used by the composer to prefill fields from the last sent EOI instead of
 * loading fresh from Template Admin (e.g. for Increase Offer, Revise, Resend).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');

  if (!recordId) {
    return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
  }

  const sql = getDb();

  const rows = await sql`
    SELECT id, send_type, offer_price, sent_at, payload
    FROM eoi_sends
    WHERE record_id = ${recordId}
      AND delivery_status = 'sent'
    ORDER BY sent_at DESC
    LIMIT 1`;

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No previous send found' }, { status: 404 });
  }

  const row = rows[0];
  // payload is stored as JSON text — parse it so the client gets an object
  let payload = row.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { /* return as-is */ }
  }

  return NextResponse.json({
    sendId: row.id,
    sendType: row.send_type,
    offerPrice: row.offer_price,
    sentAt: row.sent_at,
    payload,
  });
}
