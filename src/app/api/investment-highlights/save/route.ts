import { NextRequest, NextResponse } from 'next/server';
import { saveInvestmentHighlightsData } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lga, state, investmentHighlights, dataSource, sourceDocument } = body;

    if (!lga || !state) {
      return NextResponse.json(
        { error: 'LGA and state are required' },
        { status: 400 }
      );
    }

    if (!investmentHighlights) {
      return NextResponse.json(
        { error: 'Investment highlights content is required' },
        { status: 400 }
      );
    }

    await saveInvestmentHighlightsData(lga, state, {
      investmentHighlights,
      dataSource: dataSource || 'Manual Entry',
      sourceDocument: sourceDocument || '',
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
