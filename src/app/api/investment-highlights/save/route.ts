import { NextRequest, NextResponse } from 'next/server';
import { saveInvestmentHighlightsData } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburbs, state, reportName, validPeriod, mainBody, extraInfo } = body;

    if (!suburbs || !state) {
      return NextResponse.json(
        { error: 'Suburbs and state are required' },
        { status: 400 }
      );
    }

    if (!reportName || !validPeriod || !mainBody) {
      return NextResponse.json(
        { error: 'Report name, valid period, and main body are required' },
        { status: 400 }
      );
    }

    // Extract first suburb for lookup purposes
    const suburbList = suburbs.split(',').map((s: string) => s.trim());
    const firstSuburb = suburbList[0] || '';

    await saveInvestmentHighlightsData('', firstSuburb, state, {
      suburbs,
      state,
      reportName,
      validPeriod,
      mainBody,
      extraInfo: extraInfo || '',
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving investment highlights data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save investment highlights data' },
      { status: 500 }
    );
  }
}
