import { NextRequest, NextResponse } from 'next/server';
import { lookupInvestmentHighlights } from '@/lib/googleSheets';
import { validateReportDate } from '@/lib/dateValidation';

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
    
    // If report found, add date validation
    if (result.found && result.data) {
      const dateValidation = validateReportDate(result.data.validPeriod || '');
      
      return NextResponse.json({
        ...result,
        dateStatus: {
          isValid: dateValidation.isValid,
          status: dateValidation.status,
          displayText: dateValidation.displayText,
          daysUntilExpiry: dateValidation.daysUntilExpiry,
        },
      });
    }
    
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
