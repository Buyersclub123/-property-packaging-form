import { NextRequest, NextResponse } from 'next/server';
import { lookupInvestmentHighlights } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lga, state, suburb } = body;

    if ((!lga && !suburb) || !state) {
      return NextResponse.json(
        { error: 'LGA or Suburb, and State are required' },
        { status: 400 }
      );
    }

    const result = await lookupInvestmentHighlights(lga || '', suburb || '', state);
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
