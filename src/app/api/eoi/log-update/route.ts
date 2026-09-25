import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/eoi/log-update
 *
 * Records an activity in eoi_sends WITHOUT sending an email.
 * Used for verbal increases ("Confirm (update only)"), unlink events, and other
 * system actions that need to be tracked in activity history.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recordId, opportunityId, opportunityName, propertyAddress,
      offerPrice, offerPriceLand, offerPriceBuild,
      sendType, eventType: eventTypeOverride,
      sentBy, clientName, assignedBa,
      method: methodOverride, notes: notesOverride, offerStatusAtEvent,
      delinkReason,
      previousOpportunityId, previousClientName,
    } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
    }

    const sql = getDb();

    const priceNumeric = offerPrice ? Math.round(parseFloat(String(offerPrice).replace(/[^0-9.]/g, ''))) || null : null;
    const landNumeric = offerPriceLand ? Math.round(parseFloat(String(offerPriceLand).replace(/[^0-9.]/g, ''))) || null : null;
    const buildNumeric = offerPriceBuild ? Math.round(parseFloat(String(offerPriceBuild).replace(/[^0-9.]/g, ''))) || null : null;

    // eventType override takes precedence (e.g. 'unlink_test'), otherwise prefix sendType with 'eoi_'
    const eventType = eventTypeOverride || (sendType ? `eoi_${sendType}` : 'eoi_increase');
    const method = methodOverride || 'verbal';
    const notes = notesOverride || 'Price updated without sending EOI (verbal/update only)';

    const result = await sql`
      INSERT INTO eoi_sends (
        record_id, opportunity_id, opportunity_name, property_address, event_type,
        offer_price, offer_price_land, offer_price_build, offer_status_at_event,
        agent_email, client_name, assigned_ba,
        sent_by, delivery_status, method, notes, delink_reason,
        previous_opportunity_id, previous_client_name
      ) VALUES (
        ${recordId},
        ${opportunityId || null},
        ${opportunityName || null},
        ${propertyAddress || null},
        ${eventType},
        ${priceNumeric},
        ${landNumeric},
        ${buildNumeric},
        ${offerStatusAtEvent || 'offered'},
        ${''},
        ${null},
        ${assignedBa || null},
        ${sentBy || 'unknown'},
        'recorded',
        ${method},
        ${notes},
        ${delinkReason || null},
        ${previousOpportunityId || null},
        ${previousClientName || null}
      ) RETURNING id`;

    return NextResponse.json({ ok: true, sendId: result[0]?.id });
  } catch (err) {
    console.error('Failed to log EOI update:', err);
    return NextResponse.json({ error: 'Failed to log update' }, { status: 500 });
  }
}
