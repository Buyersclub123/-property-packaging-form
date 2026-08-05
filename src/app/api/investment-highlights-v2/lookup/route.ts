import { NextRequest, NextResponse } from 'next/server';
import { lookupInvestmentHighlightsV2 } from '@/lib/investmentHighlightsV2';

/**
 * POST /api/investment-highlights-v2/lookup
 * 
 * Lookup investment highlights by LGA + State (V2 - LGA-keyed)
 * Uses normalised matching with fuzzy fallback
 * 
 * Body: { lga: string, state: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lga, state } = body;

    if (!lga || !state) {
      return NextResponse.json(
        { error: 'LGA and State are required' },
        { status: 400 }
      );
    }

    console.log('[V2 Lookup] Searching for LGA:', lga, 'State:', state);

    const result = await lookupInvestmentHighlightsV2(lga, state);

    if (result.found) {
      console.log('[V2 Lookup] Match found:', result.matchType, '- LGA:', result.data?.lga);
    } else {
      console.log('[V2 Lookup] No match found for:', lga, state);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[V2 Lookup] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to lookup investment highlights' },
      { status: 500 }
    );
  }
}
