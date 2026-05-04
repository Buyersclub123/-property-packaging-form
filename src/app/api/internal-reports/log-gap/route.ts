import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID_AMAP_GAPS;
const TAB_NAME = 'Data';

/**
 * Logs a suburb with no available AMAP report to the AMAP Report Gaps Google Sheet.
 * Called when user ticks "Not available" and creates the property folder.
 */
export async function POST(request: NextRequest) {
  try {
    if (!SHEET_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEET_ID_AMAP_GAPS is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { suburb, state, propertyAddress, lga, packager } = body;

    if (!suburb || !state) {
      return NextResponse.json(
        { success: false, error: 'suburb and state are required' },
        { status: 400 }
      );
    }

    const sheets = getSheetsClient();

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Australia/Sydney',
    });

    const logRow = [
      dateStr,                    // A: Date
      suburb,                     // B: Suburb
      state,                      // C: State
      lga || '',                  // D: LGA
      propertyAddress || '',      // E: Property Address
      packager || '',             // F: Packager
      '',                         // G: Emailed (left empty for Apps Script)
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [logRow],
      },
    });

    console.log(`[AMAP Gap] Logged: ${suburb}, ${state} (${propertyAddress})`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AMAP Gap] Error logging gap:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to log AMAP gap' },
      { status: 500 }
    );
  }
}
