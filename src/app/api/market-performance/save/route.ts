import { NextRequest, NextResponse } from 'next/server';
import { saveMarketPerformanceData, logMarketPerformanceUpdate, lookupMarketPerformance, MarketPerformanceLogEntry } from '@/lib/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburbName, state, data, dataSource, changedBy } = body;

    if (!suburbName || !state || !data || !dataSource) {
      return NextResponse.json(
        { error: 'Suburb name, state, data, and dataSource are required' },
        { status: 400 }
      );
    }

    if (!['SPI', 'REI', 'BOTH'].includes(dataSource)) {
      return NextResponse.json(
        { error: 'dataSource must be SPI, REI, or BOTH' },
        { status: 400 }
      );
    }

    // Get old values for logging
    const oldData = await lookupMarketPerformance(suburbName, state);
    const oldValues = oldData.found && oldData.data ? oldData.data : null;

    await saveMarketPerformanceData(suburbName, state, data, dataSource);
    
    const actionType = oldValues ? 'UPDATED' : 'COLLECTED';
    const now = new Date().toISOString();
    
    // Log only fields that changed (compare old vs new)
    const changedFields: Partial<MarketPerformanceLogEntry> = {
      suburbName,
      state,
      actionType,
      changedBy: changedBy || 'Unknown',
      timestamp: now,
      notes: `Data source: ${dataSource === 'SPI' ? 'Smart Property Investment' : dataSource === 'REI' ? 'Real Estate Investar' : 'Both'}`,
    };
    
    // Only include fields that actually changed
    if (data.medianPriceChange3Months !== undefined) {
      const oldVal = oldValues?.medianPriceChange3Months || '';
      const newVal = data.medianPriceChange3Months || '';
      if (oldVal !== newVal) {
        changedFields.medianPriceChange3Months = newVal;
      }
    }
    if (data.medianPriceChange1Year !== undefined) {
      const oldVal = oldValues?.medianPriceChange1Year || '';
      const newVal = data.medianPriceChange1Year || '';
      if (oldVal !== newVal) {
        changedFields.medianPriceChange1Year = newVal;
      }
    }
    if (data.medianPriceChange3Year !== undefined) {
      const oldVal = oldValues?.medianPriceChange3Year || '';
      const newVal = data.medianPriceChange3Year || '';
      if (oldVal !== newVal) {
        changedFields.medianPriceChange3Year = newVal;
      }
    }
    if (data.medianPriceChange5Year !== undefined) {
      const oldVal = oldValues?.medianPriceChange5Year || '';
      const newVal = data.medianPriceChange5Year || '';
      if (oldVal !== newVal) {
        changedFields.medianPriceChange5Year = newVal;
      }
    }
    if (data.medianYield !== undefined) {
      const oldVal = oldValues?.medianYield || '';
      const newVal = data.medianYield || '';
      if (oldVal !== newVal) {
        changedFields.medianYield = newVal;
      }
    }
    if (data.medianRentChange1Year !== undefined) {
      const oldVal = oldValues?.medianRentChange1Year || '';
      const newVal = data.medianRentChange1Year || '';
      if (oldVal !== newVal) {
        changedFields.medianRentChange1Year = newVal;
      }
    }
    if (data.rentalPopulation !== undefined) {
      const oldVal = oldValues?.rentalPopulation || '';
      const newVal = data.rentalPopulation || '';
      if (oldVal !== newVal) {
        changedFields.rentalPopulation = newVal;
      }
    }
    if (data.vacancyRate !== undefined) {
      const oldVal = oldValues?.vacancyRate || '';
      const newVal = data.vacancyRate || '';
      if (oldVal !== newVal) {
        changedFields.vacancyRate = newVal;
      }
    }
    
    await logMarketPerformanceUpdate(changedFields as MarketPerformanceLogEntry);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving market performance data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save market performance data' },
      { status: 500 }
    );
  }
}

