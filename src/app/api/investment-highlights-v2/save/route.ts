import { NextRequest, NextResponse } from 'next/server';
import { saveInvestmentHighlightsV2, lookupInvestmentHighlightsV2 } from '@/lib/investmentHighlightsV2';

/**
 * POST /api/investment-highlights-v2/save
 * 
 * Create or update investment highlights for an LGA (V2 - LGA-keyed)
 * - If LGA+State already exists: updates row, appends suburb, logs who/when
 * - If LGA+State is new: creates new row
 * 
 * Body: {
 *   lga: string,
 *   state: string,
 *   suburb: string,
 *   validFromMonth: string,
 *   validFromYear: string,
 *   validToMonth: string,
 *   validToYear: string,
 *   mainBody: string,
 *   pdfDriveLink?: string,
 *   pdfFileId?: string,
 *   updatedBy: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lga, state, suburb, validFromMonth, validFromYear, validToMonth, validToYear, mainBody, pdfDriveLink, pdfFileId, updatedBy } = body;

    // Validate required fields
    if (!lga || !state) {
      return NextResponse.json(
        { error: 'LGA and State are required' },
        { status: 400 }
      );
    }

    if (!validFromMonth || !validFromYear || !validToMonth || !validToYear) {
      return NextResponse.json(
        { error: 'Valid period (from/to month and year) is required' },
        { status: 400 }
      );
    }

    if (!mainBody || mainBody.trim().length === 0) {
      return NextResponse.json(
        { error: 'Main body content is required' },
        { status: 400 }
      );
    }

    if (!updatedBy) {
      return NextResponse.json(
        { error: 'updatedBy (user email) is required' },
        { status: 400 }
      );
    }

    console.log('[V2 Save] Saving for LGA:', lga, 'State:', state, 'By:', updatedBy);

    const result = await saveInvestmentHighlightsV2({
      lga,
      state,
      suburb: suburb || '',
      validFromMonth,
      validFromYear,
      validToMonth,
      validToYear,
      mainBody,
      pdfDriveLink,
      pdfFileId,
      updatedBy,
    });

    console.log('[V2 Save] Result:', result.action, 'Row:', result.rowNumber);

    const actionMsg = result.action === 'updated'
      ? 'Updated existing report for ' + lga + ' (' + state + ')'
      : 'Created new report for ' + lga + ' (' + state + ')';

    return NextResponse.json({
      success: true,
      action: result.action,
      rowNumber: result.rowNumber,
      message: actionMsg,
    });
  } catch (error: any) {
    console.error('[V2 Save] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to save investment highlights' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/investment-highlights-v2/save?lga=X&state=Y
 * 
 * Check if a report already exists for this LGA (used before save to show "update" vs "create" prompt)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lga = searchParams.get('lga');
    const state = searchParams.get('state');

    if (!lga || !state) {
      return NextResponse.json(
        { error: 'LGA and State query params are required' },
        { status: 400 }
      );
    }

    const result = await lookupInvestmentHighlightsV2(lga, state);

    return NextResponse.json({
      exists: result.found,
      matchType: result.matchType || null,
      currentData: result.found ? {
        lga: result.data?.lga,
        validPeriod: `${result.data?.validFromMonth} ${result.data?.validFromYear} - ${result.data?.validToMonth} ${result.data?.validToYear}`,
        updatedBy: result.data?.updatedBy,
        updatedAt: result.data?.updatedAt,
        suburbs: result.data?.suburbs,
      } : null,
    });
  } catch (error: any) {
    console.error('[V2 Save Check] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to check report existence' },
      { status: 500 }
    );
  }
}
