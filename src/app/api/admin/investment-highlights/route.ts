import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const TAB_NAME = 'Investment Highlights V2';

// V2 column mapping: A=Suburbs, B=State, C=LGA, D=Report Name, E=ValidFromMonth, F=ValidFromYear, G=ValidToMonth, H=ValidToYear, I=MainBody, J=PdfDriveLink, K=PdfFileId, L=UpdatedBy, M=UpdatedAt
function buildValidPeriod(row: any[]): string {
  const fromMonth = (row[4] || '').trim();
  const fromYear = (row[5] || '').trim();
  const toMonth = (row[6] || '').trim();
  const toYear = (row[7] || '').trim();
  if (!fromMonth || !toMonth) return '';
  if (fromYear === toYear) return `${fromMonth} - ${toMonth} ${toYear}`;
  return `${fromMonth} ${fromYear} - ${toMonth} ${toYear}`;
}

function parseValidPeriod(vp: string): { fromMonth: string; fromYear: string; toMonth: string; toYear: string } | null {
  const normalized = vp.trim();
  // "Month Year - Month Year"
  const full = normalized.match(/^([A-Za-z]+)\s+(\d{4})\s*-\s*([A-Za-z]+)\s+(\d{4})$/i);
  if (full) return { fromMonth: full[1], fromYear: full[2], toMonth: full[3], toYear: full[4] };
  // "Month - Month Year"
  const short = normalized.match(/^([A-Za-z]+)\s*-\s*([A-Za-z]+)\s+(\d{4})$/i);
  if (short) return { fromMonth: short[1], fromYear: short[3], toMonth: short[2], toYear: short[3] };
  return null;
}

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
        range: `'${TAB_NAME}'!A2:M`,
      });

      const rows = response.data.values || [];

      const reports = rows
        .filter((row) => row[2] && row[2].trim()) // LGA column C must exist
        .map((row) => ({
          suburbs: (row[0] || '').trim(),
          state: (row[1] || '').trim(),
          reportName: (row[3] || row[2] || '').trim(), // Report Name (D), fallback to LGA (C)
          lga: (row[2] || '').trim(),
          validPeriod: buildValidPeriod(row),
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
        range: `'${TAB_NAME}'!A2:M`,
      });

      const rows = response.data.values || [];
      const normalizedReport = reportName.trim().toLowerCase();
      const normalizedState = state.trim().toUpperCase();

      // Match on Report Name (D) or LGA (C)
      const matchingRow = rows.find((row) => {
        const rowState = (row[1] || '').trim().toUpperCase();
        if (rowState !== normalizedState) return false;
        const rowReportName = (row[3] || '').trim().toLowerCase();
        const rowLGA = (row[2] || '').trim().toLowerCase();
        return rowReportName === normalizedReport || rowLGA === normalizedReport;
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
          lga: matchingRow[2] || '',
          reportName: matchingRow[3] || matchingRow[2] || '',
          validPeriod: buildValidPeriod(matchingRow),
          mainBody: matchingRow[8] || '',
          pdfDriveLink: matchingRow[9] || '',
          pdfFileId: matchingRow[10] || '',
          lastEditedBy: matchingRow[11] || '',
          lastEditedDate: matchingRow[12] || '',
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
      range: `'${TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];
    const normalizedReport = reportName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    // Match on Report Name (D) or LGA (C)
    const rowIndex = rows.findIndex((row) => {
      const rowState = (row[1] || '').trim().toUpperCase();
      if (rowState !== normalizedState) return false;
      const rowReportName = (row[3] || '').trim().toLowerCase();
      const rowLGA = (row[2] || '').trim().toLowerCase();
      return rowReportName === normalizedReport || rowLGA === normalizedReport;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Report "${reportName}" in ${state} not found` },
        { status: 404 }
      );
    }

    const actualRowNumber = rowIndex + 2;
    const now = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // Update: column I (Main Body), L (Updated By), M (Updated At)
    const updates: { range: string; values: string[][] }[] = [
      { range: `'${TAB_NAME}'!I${actualRowNumber}`, values: [[mainBody.trim()]] },
      { range: `'${TAB_NAME}'!L${actualRowNumber}`, values: [[userEmail]] },
      { range: `'${TAB_NAME}'!M${actualRowNumber}`, values: [[now]] },
    ];

    // Optionally update suburbs (col A)
    if (suburbs !== undefined) {
      updates.push({ range: `'${TAB_NAME}'!A${actualRowNumber}`, values: [[suburbs.trim()]] });
    }

    // Optionally update report name (col D)
    if (editedReportName && editedReportName.trim()) {
      updates.push({ range: `'${TAB_NAME}'!D${actualRowNumber}`, values: [[editedReportName.trim()]] });
    }

    // Optionally update valid period (split into 4 columns E-H)
    if (validPeriod !== undefined && validPeriod.trim()) {
      const parsed = parseValidPeriod(validPeriod);
      if (parsed) {
        updates.push({ range: `'${TAB_NAME}'!E${actualRowNumber}`, values: [[parsed.fromMonth]] });
        updates.push({ range: `'${TAB_NAME}'!F${actualRowNumber}`, values: [[parsed.fromYear]] });
        updates.push({ range: `'${TAB_NAME}'!G${actualRowNumber}`, values: [[parsed.toMonth]] });
        updates.push({ range: `'${TAB_NAME}'!H${actualRowNumber}`, values: [[parsed.toYear]] });
      }
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
      range: `'${TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];
    const normalizedReport = reportName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    // Match on Report Name (D) or LGA (C)
    const rowIndex = rows.findIndex((row) => {
      const rowState = (row[1] || '').trim().toUpperCase();
      if (rowState !== normalizedState) return false;
      const rowReportName = (row[3] || '').trim().toLowerCase();
      const rowLGA = (row[2] || '').trim().toLowerCase();
      return rowReportName === normalizedReport || rowLGA === normalizedReport;
    });

    if (rowIndex === -1) {
      return NextResponse.json(
        { success: false, error: `Report "${reportName}" in ${state} not found` },
        { status: 404 }
      );
    }

    const actualRowNumber = rowIndex + 2;
    const now = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    const updates = [
      { range: `'${TAB_NAME}'!J${actualRowNumber}`, values: [[pdfDriveLink || '']] },
      { range: `'${TAB_NAME}'!K${actualRowNumber}`, values: [[pdfFileId || '']] },
      { range: `'${TAB_NAME}'!L${actualRowNumber}`, values: [[userEmail]] },
      { range: `'${TAB_NAME}'!M${actualRowNumber}`, values: [[now]] },
    ];

    // Also update report name in column D if changed
    if (updatedReportName && updatedReportName.trim() !== reportName.trim()) {
      updates.push({ range: `'${TAB_NAME}'!D${actualRowNumber}`, values: [[updatedReportName.trim()]] });
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
      range: `'${TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];
    const normalizedReport = reportName.trim().toLowerCase();
    const normalizedState = state.trim().toLowerCase();
    // Match on Report Name (D) or LGA (C)
    const rowIndex = rows.findIndex((row) => {
      const rowState = (row[1] || '').trim().toLowerCase();
      if (rowState !== normalizedState) return false;
      const rowReportName = (row[3] || '').trim().toLowerCase();
      const rowLGA = (row[2] || '').trim().toLowerCase();
      return rowReportName === normalizedReport || rowLGA === normalizedReport;
    });

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
