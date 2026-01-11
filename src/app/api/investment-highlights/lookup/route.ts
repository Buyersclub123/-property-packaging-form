import { NextRequest, NextResponse } from 'next/server';
import { lookupInvestmentHighlights } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lga, state } = body;

    if (!lga || !state) {
      return NextResponse.json(
        { error: 'LGA and state are required' },
        { status: 400 }
      );
    }

    const result = await lookupInvestmentHighlights(lga, state);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in investment highlights lookup:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to lookup investment highlights data';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
