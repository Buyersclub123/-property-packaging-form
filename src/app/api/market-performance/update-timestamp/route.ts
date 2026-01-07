import { NextRequest, NextResponse } from 'next/server';
import { updateMarketPerformanceTimestamp, logMarketPerformanceUpdate, lookupMarketPerformance } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburbName, state, changedBy } = body;

    if (!suburbName || !state) {
      return NextResponse.json(
        { error: 'Suburb name and state are required' },
        { status: 400 }
      );
    }

    if (!changedBy) {
      return NextResponse.json(
        { error: 'User email (changedBy) is required' },
        { status: 400 }
      );
    }

    // Get current values before updating timestamp
    const currentData = await lookupMarketPerformance(suburbName, state);
    
    await updateMarketPerformanceTimestamp(suburbName, state);
    
    const now = new Date().toISOString();
    
    // Log the verification with all current values
    const logEntry: any = {
      suburbName,
      state,
      actionType: 'VERIFIED' as const,
      changedBy,
      timestamp: now,
      notes: 'Data verified as still valid',
    };
    
    // Include all current values that exist
    if (currentData.found && currentData.data) {
      if (currentData.data.medianPriceChange3Months) {
        logEntry.medianPriceChange3Months = currentData.data.medianPriceChange3Months;
      }
      if (currentData.data.medianPriceChange1Year) {
        logEntry.medianPriceChange1Year = currentData.data.medianPriceChange1Year;
      }
      if (currentData.data.medianPriceChange3Year) {
        logEntry.medianPriceChange3Year = currentData.data.medianPriceChange3Year;
      }
      if (currentData.data.medianPriceChange5Year) {
        logEntry.medianPriceChange5Year = currentData.data.medianPriceChange5Year;
      }
      if (currentData.data.medianYield) {
        logEntry.medianYield = currentData.data.medianYield;
      }
      if (currentData.data.medianRentChange1Year) {
        logEntry.medianRentChange1Year = currentData.data.medianRentChange1Year;
      }
      if (currentData.data.rentalPopulation) {
        logEntry.rentalPopulation = currentData.data.rentalPopulation;
      }
      if (currentData.data.vacancyRate) {
        logEntry.vacancyRate = currentData.data.vacancyRate;
      }
    }
    
    await logMarketPerformanceUpdate(logEntry);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating market performance timestamp:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update timestamp' },
      { status: 500 }
    );
  }
}

