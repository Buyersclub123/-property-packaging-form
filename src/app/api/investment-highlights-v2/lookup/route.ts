import { NextRequest, NextResponse } from 'next/server';
import { lookupInvestmentHighlightsV2 } from '@/lib/investmentHighlightsV2';
import { validateReportDate } from '@/lib/dateValidation';

/**
 * POST /api/investment-highlights-v2/lookup
 * 
 * Lookup investment highlights by LGA + State (V2 - LGA-keyed)
 * Uses normalised matching with fuzzy fallback
 * Also accepts suburb for fallback suburb-based lookup
 * 
 * Body: { lga: string, state: string, suburb?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lga, state, suburb } = body;

    if ((!lga && !suburb) || !state) {
      return NextResponse.json(
        { error: 'LGA (or Suburb) and State are required' },
        { status: 400 }
      );
    }

    console.log('[V2 Lookup] Searching for LGA:', lga, 'Suburb:', suburb, 'State:', state);

    const result = await lookupInvestmentHighlightsV2(lga || '', state);

    if (result.found && result.data) {
      console.log('[V2 Lookup] Match found:', result.matchType, '- LGA:', result.data.lga);

      // Build combined validPeriod string for compatibility
      const { validFromMonth, validFromYear, validToMonth, validToYear } = result.data;
      let validPeriod = '';
      if (validFromMonth && validFromYear && validToMonth && validToYear) {
        if (validFromYear === validToYear) {
          validPeriod = `${validFromMonth} - ${validToMonth} ${validToYear}`;
        } else {
          validPeriod = `${validFromMonth} ${validFromYear} - ${validToMonth} ${validToYear}`;
        }
      }

      // Date validation
      const dateValidation = validateReportDate(validPeriod);

      return NextResponse.json({
        found: true,
        matchType: result.matchType,
        data: {
          ...result.data,
          validPeriod, // combined string for display/compat
        },
        dateStatus: {
          isValid: dateValidation.isValid,
          status: dateValidation.status,
          displayText: dateValidation.displayText,
          daysUntilExpiry: dateValidation.daysUntilExpiry,
        },
      });
    } else {
      console.log('[V2 Lookup] No match found for:', lga, state);
      return NextResponse.json({ found: false });
    }
  } catch (error: any) {
    console.error('[V2 Lookup] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to lookup investment highlights' },
      { status: 500 }
    );
  }
}
