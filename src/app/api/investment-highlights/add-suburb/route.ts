import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

/**
 * Add suburb to existing report's suburb list in Google Sheet
 * Called on form submission when user selected report from dropdown
 * Structure: 7 columns (A-G)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suburb, state, reportName } = body;
    
    if (!suburb || !state || !reportName) {
      return NextResponse.json(
        { error: 'Suburb, state, and report name are required' },
        { status: 400 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // Read all rows (7 columns: A-G)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:G`,
    });
    
    const rows = response.data.values || [];
    const normalizedReportName = reportName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();
    const newSuburb = suburb.trim();
    
    console.log('[add-suburb] Matching request:', {
      suburb: newSuburb,
      state: normalizedState,
      reportName: normalizedReportName,
    });
    
    // Find existing row by report name and state
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowReportName = (row[2] || '').trim().toLowerCase(); // Column C
      const rowState = (row[1] || '').trim().toUpperCase(); // Column B
      const matches = rowReportName === normalizedReportName && rowState === normalizedState;
      
      if (i < 5) { // Log first 5 rows for debugging
        console.log('[add-suburb] Checking row', i + 2, ':', {
          rowReportName,
          rowState,
          normalizedReportName,
          normalizedState,
          matches,
        });
      }
      
      if (matches) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex < 0) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Get existing suburbs from column A
    const existingRow = rows[rowIndex];
    const existingSuburbs = (existingRow[0] || '').trim();
    
    // Parse existing suburbs
    const suburbList = existingSuburbs
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    
    // Add new suburb if not already in list
    if (!suburbList.includes(newSuburb)) {
      suburbList.push(newSuburb);
      const updatedSuburbs = suburbList.join(', ');
      
      // Update column A with new suburb list
      const actualRowNumber = rowIndex + 2; // +2 for header row and 0-index
      await sheets.spreadsheets.values.update({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[updatedSuburbs]],
        },
      });
      
      return NextResponse.json({
        success: true,
        message: `Suburb "${newSuburb}" added to report`,
        updatedSuburbs: updatedSuburbs,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: `Suburb "${newSuburb}" already in report`,
        updatedSuburbs: existingSuburbs,
      });
    }
  } catch (error: any) {
    console.error('Error adding suburb to report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add suburb to report' },
      { status: 500 }
    );
  }
}
