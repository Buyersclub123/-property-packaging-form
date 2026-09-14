import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocoder';
import { getStashData } from '@/lib/stash';
import { listAllInvestmentHighlightsV2, lgaMatches } from '@/lib/investmentHighlightsV2';

/**
 * POST /api/admin/investment-highlights/resolve-lga
 * Body: { suburb, state }
 * Returns: { lga, existingMatch? }
 * 
 * Uses the same LGA resolution as the property form:
 * Stash API first, then Geoscape geocodeAddress fallback.
 * Then checks V2 sheet for duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburb, state } = body;

    if (!suburb || !state) {
      return NextResponse.json(
        { success: false, error: 'suburb and state are required' },
        { status: 400 }
      );
    }

    const query = `${suburb.trim()}, ${state.trim()}`;
    let lga: string | null = null;

    // Step 1a: Try Stash API first (same as property form)
    try {
      const stashResult = await getStashData(query);
      if (stashResult?.lga && typeof stashResult.lga === 'string' && stashResult.lga.trim()) {
        lga = stashResult.lga.trim();
        console.log('[resolve-lga] LGA from Stash:', lga);
      }
    } catch (stashErr) {
      console.log('[resolve-lga] Stash API failed, trying Geoscape:', stashErr);
    }

    // Step 1b: Fallback to Geoscape geocodeAddress (same as property form)
    if (!lga) {
      try {
        const geocodeResult = await geocodeAddress(query);
        if (geocodeResult.bestMatch?.lga) {
          lga = geocodeResult.bestMatch.lga.trim();
          console.log('[resolve-lga] LGA from Geoscape bestMatch:', lga);
        } else if (geocodeResult.suggestions?.length > 0) {
          for (const suggestion of geocodeResult.suggestions) {
            if (suggestion.lga) {
              lga = suggestion.lga.trim();
              console.log('[resolve-lga] LGA from Geoscape suggestion:', lga);
              break;
            }
          }
        }
      } catch (geoErr) {
        console.log('[resolve-lga] Geoscape fallback failed:', geoErr);
      }
    }

    if (!lga) {
      return NextResponse.json({
        success: false,
        error: `Could not resolve LGA for "${suburb}, ${state}". Check the suburb name and try again.`,
      });
    }

    // Step 2: Check for existing match in V2 sheet
    const allReports = await listAllInvestmentHighlightsV2();
    const normalizedState = state.trim().toUpperCase();

    let existingMatch: { lga: string; reportName: string; matchType: string } | null = null;

    for (const report of allReports) {
      const reportState = (report.state || '').trim().toUpperCase();
      if (reportState !== normalizedState) continue;

      const match = lgaMatches(lga, report.lga);
      if (match) {
        existingMatch = {
          lga: report.lga,
          reportName: report.reportName || report.lga,
          matchType: match,
        };
        break;
      }
    }

    return NextResponse.json({
      success: true,
      lga,
      existingMatch,
    });
  } catch (error) {
    console.error('[resolve-lga] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve LGA' },
      { status: 500 }
    );
  }
}
