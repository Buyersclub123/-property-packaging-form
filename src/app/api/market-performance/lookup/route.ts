import { NextRequest, NextResponse } from 'next/server';
import { lookupMarketPerformance } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburbName, state } = body;

    if (!suburbName || !state) {
      return NextResponse.json(
        { error: 'Suburb name and state are required' },
        { status: 400 }
      );
    }

    const result = await lookupMarketPerformance(suburbName, state);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in market performance lookup:', error);
    const errorMessage = error?.message || error?.toString() || 'Failed to lookup market performance data';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}




