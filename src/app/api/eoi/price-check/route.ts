import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/eoi/price-check?recordId=xxx&opportunityId=yyy&price=zzz[&landPrice=&buildPrice=]
 *
 * F55 — Offer price mismatch detection.
 *
 * Compares the price from the property record (passed via URL) against the
 * last recorded price in the database for the current active relationship.
 *
 * Logic:
 * 1. Find the most recent "relationship start" event for this record+opportunity
 *    (link_created, reassign, speculative_created, change_speculative).
 *    This is the cutoff — only events after it belong to the current relationship.
 * 2. Find the most recent price-carrying event after that cutoff.
 * 3. Compare the URL price against the DB price.
 * 4. Return mismatch details or { match: true }.
 *
 * For speculative records, opportunityId is null — the query matches on
 * record_id WHERE opportunity_id IS NULL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get('recordId');
  const opportunityId = searchParams.get('opportunityId') || null;
  const urlPrice = searchParams.get('price') || '';
  const urlLandPrice = searchParams.get('landPrice') || '';
  const urlBuildPrice = searchParams.get('buildPrice') || '';

  if (!recordId) {
    return NextResponse.json({ error: 'recordId is required' }, { status: 400 });
  }

  // Parse URL prices to numbers for comparison
  const parsePrice = (v: string): number | null => {
    if (!v) return null;
    const cleaned = v.replace(/[^0-9.]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : Math.round(n);
  };

  const urlLand = parsePrice(urlLandPrice);
  const urlBuild = parsePrice(urlBuildPrice);
  // For split contracts, calculate total from land + build (the raw price param
  // may contain the concatenated display string which produces a garbage number)
  const urlTotal = (urlLand !== null && urlBuild !== null)
    ? urlLand + urlBuild
    : parsePrice(urlPrice);

  // If no URL price at all, nothing to compare
  if (urlTotal === null && urlLand === null && urlBuild === null) {
    return NextResponse.json({ match: true, reason: 'no_url_price' });
  }

  try {
    const sql = getDb();

    const relationshipStartTypes = ['link_created', 'reassign', 'speculative_created', 'change_speculative'];

    // Step 1: Find the cutoff — most recent relationship-start event
    let cutoffRows;
    if (opportunityId) {
      cutoffRows = await sql`
        SELECT sent_at FROM eoi_sends
        WHERE record_id = ${recordId}
          AND opportunity_id = ${opportunityId}
          AND event_type = ANY(${relationshipStartTypes})
        ORDER BY sent_at DESC
        LIMIT 1`;
    } else {
      // Speculative — opportunity_id IS NULL
      cutoffRows = await sql`
        SELECT sent_at FROM eoi_sends
        WHERE record_id = ${recordId}
          AND opportunity_id IS NULL
          AND event_type = ANY(${relationshipStartTypes})
        ORDER BY sent_at DESC
        LIMIT 1`;
    }

    const cutoff = cutoffRows.length > 0 ? cutoffRows[0].sent_at : null;

    // Step 2: Find the most recent price-carrying event after the cutoff
    let priceRows;
    if (opportunityId) {
      if (cutoff) {
        priceRows = await sql`
          SELECT offer_price, offer_price_land, offer_price_build, event_type, sent_at
          FROM eoi_sends
          WHERE record_id = ${recordId}
            AND opportunity_id = ${opportunityId}
            AND offer_price IS NOT NULL
            AND sent_at >= ${cutoff}
          ORDER BY sent_at DESC
          LIMIT 1`;
      } else {
        // No cutoff found — use all events for this record+opportunity
        priceRows = await sql`
          SELECT offer_price, offer_price_land, offer_price_build, event_type, sent_at
          FROM eoi_sends
          WHERE record_id = ${recordId}
            AND opportunity_id = ${opportunityId}
            AND offer_price IS NOT NULL
          ORDER BY sent_at DESC
          LIMIT 1`;
      }
    } else {
      // Speculative
      if (cutoff) {
        priceRows = await sql`
          SELECT offer_price, offer_price_land, offer_price_build, event_type, sent_at
          FROM eoi_sends
          WHERE record_id = ${recordId}
            AND opportunity_id IS NULL
            AND offer_price IS NOT NULL
            AND sent_at >= ${cutoff}
          ORDER BY sent_at DESC
          LIMIT 1`;
      } else {
        priceRows = await sql`
          SELECT offer_price, offer_price_land, offer_price_build, event_type, sent_at
          FROM eoi_sends
          WHERE record_id = ${recordId}
            AND opportunity_id IS NULL
            AND offer_price IS NOT NULL
          ORDER BY sent_at DESC
          LIMIT 1`;
      }
    }

    // No DB baseline — nothing to compare against, no mismatch
    if (priceRows.length === 0) {
      return NextResponse.json({ match: true, reason: 'no_db_baseline' });
    }

    const dbRow = priceRows[0];
    const dbTotal = dbRow.offer_price !== null ? Math.round(Number(dbRow.offer_price)) : null;
    const dbLand = dbRow.offer_price_land !== null ? Math.round(Number(dbRow.offer_price_land)) : null;
    const dbBuild = dbRow.offer_price_build !== null ? Math.round(Number(dbRow.offer_price_build)) : null;

    // Compare: check total, then land and build independently
    const isSplit = (urlLand !== null || urlBuild !== null) && (dbLand !== null || dbBuild !== null);

    const mismatches: {
      field: string;
      urlValue: number | null;
      dbValue: number | null;
    }[] = [];

    if (isSplit) {
      // Split contract — check if ANY field differs
      const landDiffers = urlLand !== null && dbLand !== null && urlLand !== dbLand;
      const buildDiffers = urlBuild !== null && dbBuild !== null && urlBuild !== dbBuild;
      const totalDiffers = urlTotal !== null && dbTotal !== null && urlTotal !== dbTotal;

      if (landDiffers || buildDiffers || totalDiffers) {
        // Show all three fields so the user sees the full picture
        mismatches.push({ field: 'land', urlValue: urlLand, dbValue: dbLand });
        mismatches.push({ field: 'build', urlValue: urlBuild, dbValue: dbBuild });
        mismatches.push({ field: 'total', urlValue: urlTotal, dbValue: dbTotal });
      }
    } else {
      // Single contract — compare total only
      if (urlTotal !== null && dbTotal !== null && urlTotal !== dbTotal) {
        mismatches.push({ field: 'total', urlValue: urlTotal, dbValue: dbTotal });
      }
    }

    if (mismatches.length === 0) {
      return NextResponse.json({ match: true });
    }

    return NextResponse.json({
      match: false,
      mismatches,
      dbEventType: dbRow.event_type,
      dbEventDate: dbRow.sent_at,
      isSplit,
    });
  } catch (err) {
    console.error('Price check failed:', err);
    return NextResponse.json({ error: 'Price check failed' }, { status: 500 });
  }
}
