import { NextRequest, NextResponse } from 'next/server';
import {
  listMarketPerformanceSuburbs,
  lookupMarketPerformance,
  saveMarketPerformanceData,
  logMarketPerformanceUpdate,
  MarketPerformanceLogEntry,
} from '@/lib/googleSheets';

/**
 * GET /api/admin/market-performance
 * ?action=list → returns all suburb+state pairs
 * ?action=lookup&suburb=X&state=Y → returns full data for a suburb
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const suburbs = await listMarketPerformanceSuburbs();
      return NextResponse.json({ success: true, suburbs });
    }

    if (action === 'lookup') {
      const suburb = searchParams.get('suburb');
      const state = searchParams.get('state');

      if (!suburb || !state) {
        return NextResponse.json(
          { success: false, error: 'suburb and state are required' },
          { status: 400 }
        );
      }

      const result = await lookupMarketPerformance(suburb, state);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use ?action=list or ?action=lookup' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[market-performance API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/market-performance
 * Body: { action: 'update' | 'create', suburb, state, fields, userEmail }
 * fields: { medianPriceChange3Months?, medianPriceChange1Year?, ... }
 * For update: only include fields that changed (not marked "no update")
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, suburb, state, fields, userEmail } = body;

    if (!action || !suburb || !state || !fields || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'action, suburb, state, fields, and userEmail are required' },
        { status: 400 }
      );
    }

    const trimmedSuburb = suburb.trim();
    const trimmedState = state.trim().toUpperCase();

    if (!trimmedSuburb) {
      return NextResponse.json(
        { success: false, error: 'Suburb name cannot be empty' },
        { status: 400 }
      );
    }

    if (action === 'create') {
      // Check for duplicates first
      const existing = await lookupMarketPerformance(trimmedSuburb, trimmedState);
      if (existing.found) {
        return NextResponse.json(
          { success: false, error: `${trimmedSuburb}, ${trimmedState} already exists. Use edit instead.` },
          { status: 409 }
        );
      }

      // Save new suburb with all fields
      await saveMarketPerformanceData(trimmedSuburb, trimmedState, fields, 'BOTH');

      // Log the creation
      const logEntry: MarketPerformanceLogEntry = {
        timestamp: new Date().toISOString(),
        suburbName: trimmedSuburb,
        state: trimmedState,
        actionType: 'COLLECTED',
        changedBy: userEmail,
        medianPriceChange3Months: fields.medianPriceChange3Months || '',
        medianPriceChange1Year: fields.medianPriceChange1Year || '',
        medianPriceChange3Year: fields.medianPriceChange3Year || '',
        medianPriceChange5Year: fields.medianPriceChange5Year || '',
        medianYield: fields.medianYield || '',
        medianRentChange1Year: fields.medianRentChange1Year || '',
        rentalPopulation: fields.rentalPopulation || '',
        vacancyRate: fields.vacancyRate || '',
        notes: 'Data source: MP Portal (new suburb)',
        editedViaPortal: 'Y',
      };
      await logMarketPerformanceUpdate(logEntry);

      return NextResponse.json({ success: true, message: `Created ${trimmedSuburb}, ${trimmedState}` });
    }

    if (action === 'update') {
      // Verify suburb exists
      const existing = await lookupMarketPerformance(trimmedSuburb, trimmedState);
      if (!existing.found) {
        return NextResponse.json(
          { success: false, error: `${trimmedSuburb}, ${trimmedState} not found` },
          { status: 404 }
        );
      }

      // Build partial update with only changed fields
      const changedFields: Record<string, string> = {};
      const fieldKeys = [
        'medianPriceChange3Months',
        'medianPriceChange1Year',
        'medianPriceChange3Year',
        'medianPriceChange5Year',
        'medianYield',
        'medianRentChange1Year',
        'rentalPopulation',
        'vacancyRate',
      ];

      for (const key of fieldKeys) {
        if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
          changedFields[key] = fields[key];
        }
      }

      if (Object.keys(changedFields).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No fields to update' },
          { status: 400 }
        );
      }

      // Save updated fields
      await saveMarketPerformanceData(trimmedSuburb, trimmedState, changedFields, 'BOTH');

      // Log the update (only changed fields)
      const logEntry: MarketPerformanceLogEntry = {
        timestamp: new Date().toISOString(),
        suburbName: trimmedSuburb,
        state: trimmedState,
        actionType: 'UPDATED',
        changedBy: userEmail,
        medianPriceChange3Months: changedFields.medianPriceChange3Months || '',
        medianPriceChange1Year: changedFields.medianPriceChange1Year || '',
        medianPriceChange3Year: changedFields.medianPriceChange3Year || '',
        medianPriceChange5Year: changedFields.medianPriceChange5Year || '',
        medianYield: changedFields.medianYield || '',
        medianRentChange1Year: changedFields.medianRentChange1Year || '',
        rentalPopulation: changedFields.rentalPopulation || '',
        vacancyRate: changedFields.vacancyRate || '',
        notes: 'Data source: MP Portal',
        editedViaPortal: 'Y',
      };
      await logMarketPerformanceUpdate(logEntry);

      return NextResponse.json({
        success: true,
        message: `Updated ${trimmedSuburb}, ${trimmedState}`,
        fieldsUpdated: Object.keys(changedFields),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "create" or "update"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[market-performance API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
