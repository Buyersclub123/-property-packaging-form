import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const TAB_NAME = 'Investment Highlights';

/**
 * GET /api/admin/investment-highlights
 * ?action=list → returns all report names with suburbs and states
 * ?action=lookup&reportName=X&state=Y → returns full data for a report
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!SHEET_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS not configured' },
        { status: 500 }
      );
    }

    const sheets = getSheetsClient();

    if (action === 'list') {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A2:G`,
      });

      const rows = response.data.values || [];

      const reports = rows
        .filter((row) => row[0] && row[0].trim())
        .map((row) => ({
          suburbs: (row[0] || '').trim(),
          state: (row[1] || '').trim(),
          reportName: (row[2] || '').trim(),
          validPeriod: (row[3] || '').trim(),
        }))
        .sort((a, b) => a.reportName.localeCompare(b.reportName));

      return NextResponse.json({ success: true, reports });
    }

    if (action === 'lookup') {
      const reportName = searchParams.get('reportName');
      const state = searchParams.get('state');

      if (!reportName || !state) {
        return NextResponse.json(
          { success: false, error: 'reportName and state are required' },
          { status: 400 }
        );
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A2:I`,
      });

      const rows = response.data.values || [];
      const normalizedReport = reportName.trim().toLowerCase();
      const normalizedState = state.trim().toUpperCase();

      const matchingRow = rows.find((row) => {
        const rowReport = (row[2] || '').trim().toLowerCase();
        const rowState = (row[1] || '').trim().toUpperCase();
        return rowReport === normalizedReport && rowState === normalizedState;
      });

      if (!matchingRow) {
        return NextResponse.json({ success: true, found: false });
      }

      return NextResponse.json({
        success: true,
        found: true,
        data: {
          suburbs: matchingRow[0] || '',
          state: matchingRow[1] || '',
          reportName: matchingRow[2] || '',
          validPeriod: matchingRow[3] || '',
          mainBody: matchingRow[4] || '',
          pdfDriveLink: matchingRow[5] || '',
          pdfFileId: matchingRow[6] || '',
          lastEditedBy: matchingRow[7] || '',
          lastEditedDate: matchingRow[8] || '',
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action. Use ?action=list or ?action=lookup' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[investment-highlights API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/investment-highlights
 * Body: { reportName, state, mainBody, userEmail, suburbs?, validPeriod?, editedReportName? }
 * Updates column E (Main Body), H (Last Edited By), I (Last Edited Date)
 * Optionally updates: A (Suburbs), C (Report Name), D (Valid Period)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportName, state, mainBody, userEmail, suburbs, validPeriod, editedReportName } = body;

    if (!reportName || !state || !mainBody || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'reportName, state, mainBody, and userEmail are required' },
        { status: 400 }
      );
    }

    if (!SHEET_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS not configured' },
        { status: 500 }
      );
    }

    const sheets = getSheetsClient();

    // Find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A2:I`,
    });

    const rows = response.data.values || [];
    const normalizedReport = reportName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    const rowIndex = rows.findIndex((row) => {
      const rowReport = (row[2] || '').trim().toLowerCase();
      const rowState = (row[1] || '').trim().toUpperCase();
      return rowReport === normalizedReport && rowState === normalizedState;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Report "${reportName}" in ${state} not found` },
        { status: 404 }
      );
    }

    const actualRowNumber = rowIndex + 2;
    const now = new Date().toISOString().split('T')[0];

    // Update: column E (Main Body), H (Last Edited By), I (Last Edited Date)
    const updates: { range: string; values: string[][] }[] = [
      { range: `${TAB_NAME}!E${actualRowNumber}`, values: [[mainBody.trim()]] },
      { range: `${TAB_NAME}!H${actualRowNumber}`, values: [[userEmail]] },
      { range: `${TAB_NAME}!I${actualRowNumber}`, values: [[now]] },
    ];

    // Optionally update suburbs (col A)
    if (suburbs !== undefined) {
      updates.push({ range: `${TAB_NAME}!A${actualRowNumber}`, values: [[suburbs.trim()]] });
    }

    // Optionally update report name (col C)
    if (editedReportName && editedReportName.trim()) {
      updates.push({ range: `${TAB_NAME}!C${actualRowNumber}`, values: [[editedReportName.trim()]] });
    }

    // Optionally update valid period (col D)
    if (validPeriod !== undefined) {
      updates.push({ range: `${TAB_NAME}!D${actualRowNumber}`, values: [[validPeriod.trim()]] });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates },
    });

    return NextResponse.json({
      success: true,
      message: `Updated "${reportName}" (${state})`,
    });
  } catch (error) {
    console.error('[investment-highlights API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/investment-highlights
 * Body: { reportName, state, pdfDriveLink, pdfFileId, userEmail }
 * Updates columns F (PDF Drive Link) and G (PDF File ID), plus H (Last Edited By) and I (Last Edited Date)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportName, state, pdfDriveLink, pdfFileId, userEmail, updatedReportName } = body;

    if (!reportName || !state || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'reportName, state, and userEmail are required' },
        { status: 400 }
      );
    }

    if (!SHEET_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS not configured' },
        { status: 500 }
      );
    }

    const sheets = getSheetsClient();

    // Find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A2:I`,
    });

    const rows = response.data.values || [];
    const normalizedReport = reportName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    const rowIndex = rows.findIndex((row) => {
      const rowReport = (row[2] || '').trim().toLowerCase();
      const rowState = (row[1] || '').trim().toUpperCase();
      return rowReport === normalizedReport && rowState === normalizedState;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Report "${reportName}" in ${state} not found` },
        { status: 404 }
      );
    }

    const actualRowNumber = rowIndex + 2;
    const now = new Date().toISOString().split('T')[0];

    const updates = [
      { range: `${TAB_NAME}!F${actualRowNumber}`, values: [[pdfDriveLink || '']] },
      { range: `${TAB_NAME}!G${actualRowNumber}`, values: [[pdfFileId || '']] },
      { range: `${TAB_NAME}!H${actualRowNumber}`, values: [[userEmail]] },
      { range: `${TAB_NAME}!I${actualRowNumber}`, values: [[now]] },
    ];

    // Also update report name in column C if changed
    if (updatedReportName && updatedReportName.trim() !== reportName.trim()) {
      updates.push({ range: `${TAB_NAME}!C${actualRowNumber}`, values: [[updatedReportName.trim()]] });
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'RAW', data: updates },
    });

    return NextResponse.json({
      success: true,
      message: `PDF info updated for "${reportName}" (${state})`,
    });
  } catch (error) {
    console.error('[investment-highlights API] PATCH error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/investment-highlights
 * Body: { reportName, state, userEmail }
 * Deletes the matching row from the sheet
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportName, state } = body;

    if (!reportName || !state) {
      return NextResponse.json(
        { success: false, error: 'reportName and state are required' },
        { status: 400 }
      );
    }

    if (!SHEET_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS not configured' },
        { status: 500 }
      );
    }

    const sheets = getSheetsClient();

    // Read all rows to find the matching one
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A2:I`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex(
      (row) =>
        (row[2] || '').trim().toLowerCase() === reportName.trim().toLowerCase() &&
        (row[1] || '').trim().toLowerCase() === state.trim().toLowerCase()
    );

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Report "${reportName}" (${state}) not found` },
        { status: 404 }
      );
    }

    // Row index in sheet (1-based, +2 for header row and 0-index offset)
    const sheetRowIndex = rowIndex + 2;

    // Get the spreadsheet to find the sheet ID (needed for deleteRows)
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === TAB_NAME
    );

    if (!sheet || !sheet.properties?.sheetId && sheet.properties?.sheetId !== 0) {
      return NextResponse.json(
        { success: false, error: 'Could not find sheet tab' },
        { status: 500 }
      );
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: sheetRowIndex - 1, // 0-based
                endIndex: sheetRowIndex, // exclusive
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted "${reportName}" (${state}) from sheet`,
    });
  } catch (error) {
    console.error('[investment-highlights API] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
