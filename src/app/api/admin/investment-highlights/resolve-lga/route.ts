import { NextRequest, NextResponse } from 'next/server';
import { resolveLga } from '@/lib/resolveLga';
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

    const lga = await resolveLga(suburb, state);

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
