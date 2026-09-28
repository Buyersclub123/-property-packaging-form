import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';

/**
 * POST /api/eoi/update-ghl-price
 *
 * F55 — Updates the offer price fields on the GHL property record
 * after the user resolves a price mismatch in the composer.
 *
 * Body: { recordId, offerPrice, offerPriceLand?, offerPriceBuild? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, offerPrice, offerPriceLand, offerPriceBuild, closingPrice } = body;

    if (!recordId) {
      return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
    }

    const bearerToken = process.env.GHL_BEARER_TOKEN || '';
    const locationId = process.env.GHL_LOCATION_ID || '';

    if (!bearerToken || !locationId) {
      return NextResponse.json({ error: 'GHL credentials not configured' }, { status: 500 });
    }

    // Build the properties to update
    const properties: Record<string, string> = {};

    if (offerPriceLand && offerPriceBuild) {
      // Split contract — write land, build, and calculated total
      const land = String(Math.round(parseFloat(String(offerPriceLand).replace(/[^0-9.]/g, '')) || 0));
      const build = String(Math.round(parseFloat(String(offerPriceBuild).replace(/[^0-9.]/g, '')) || 0));
      const total = String(Math.round((parseFloat(land) || 0) + (parseFloat(build) || 0)));

      if (land !== '0') properties.offer_price_land = land;
      if (build !== '0') properties.offer_price_build = build;
      if (total !== '0') properties.offer_price = total;
    } else if (offerPrice) {
      // Single contract — write total only
      const raw = String(Math.round(parseFloat(String(offerPrice).replace(/[^0-9.]/g, '')) || 0));
      if (raw !== '0') properties.offer_price = raw;
    }

    // Close $ update
    if (closingPrice) {
      const raw = String(Math.round(parseFloat(String(closingPrice).replace(/[^0-9.]/g, '')) || 0));
      if (raw !== '0') properties.closing_price = raw;
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ error: 'No price values to update' }, { status: 400 });
    }

    const url = `https://services.leadconnectorhq.com/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${locationId}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('GHL price update failed:', res.status, errText);
      return NextResponse.json({ error: 'GHL update failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Failed to update GHL price:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
