import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/eoi/log-update
 *
 * Records a price update in eoi_sends WITHOUT sending an email.
 * Used when the user increases the offer via "Confirm (update only)"
 * — e.g. a verbal increase communicated to the agent outside the system.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, opportunityId, propertyAddress, offerPrice, sendType, sentBy } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
    }

    const sql = getDb();

    const priceNumeric = offerPrice ? parseFloat(String(offerPrice).replace(/[^0-9.]/g, '')) || null : null;

    const result = await sql`
      INSERT INTO eoi_sends (
        record_id, opportunity_id, property_address, send_type,
        offer_price, agent_email, sent_by,
        delivery_status, eoi_status, notes
      ) VALUES (
        ${recordId},
        ${opportunityId || null},
        ${propertyAddress || null},
        ${sendType || 'increase'},
        ${priceNumeric},
        ${''},
        ${sentBy || 'unknown'},
        'recorded',
        'recorded',
        ${'Price updated without sending EOI (verbal/update only)'}
      ) RETURNING id`;

    return NextResponse.json({ ok: true, sendId: result[0]?.id });
  } catch (err) {
    console.error('Failed to log EOI update:', err);
    return NextResponse.json({ error: 'Failed to log update' }, { status: 500 });
  }
}
