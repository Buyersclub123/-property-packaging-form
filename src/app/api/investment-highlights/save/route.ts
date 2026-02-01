import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

/**
 * Save investment highlights with 7 columns (A-G)
 * Structure: A:Suburbs, B:State, C:ReportName, D:ValidPeriod, E:MainBody, F:PDFLink, G:FileID
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      suburbs, 
      state, 
      reportName, 
      validPeriod, 
      mainBody, 
      // PDF info
      pdfLink,
      fileId,
    } = body;

    if (!suburbs || !state) {
      return NextResponse.json(
        { error: 'Suburbs and state are required' },
        { status: 400 }
      );
    }

    if (!reportName || !validPeriod) {
      return NextResponse.json(
        { error: 'Report name and valid period are required' },
        { status: 400 }
      );
    }

    // Extract first suburb for lookup purposes
    const suburbList = suburbs.split(',').map((s: string) => s.trim());
    const firstSuburb = suburbList[0] || '';

    await saveInvestmentHighlightsDataWithSections(
      '',
      firstSuburb,
      state,
      {
        suburbs,
        state,
        reportName,
        validPeriod,
        mainBody: mainBody || '',
        pdfLink: pdfLink || '',
        fileId: fileId || '',
      }
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving investment highlights data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save investment highlights data' },
      { status: 500 }
    );
  }
}

/**
 * Save investment highlights data with 7 columns (A-G)
 * Google Sheet Structure:
 * A: Suburbs (comma-separated)
 * B: State
 * C: Report Name
 * D: Valid Period
 * E: Main Body
 * F: PDF Drive Link
 * G: PDF File ID
 */
async function saveInvestmentHighlightsDataWithSections(
  lga: string,
  suburb: string,
  state: string,
  data: {
    suburbs: string;
    state: string;
    reportName: string;
    validPeriod: string;
    mainBody: string;
    extraInfo?: string;
    populationGrowthContext?: string;
    residential?: string;
    industrial?: string;
    commercialAndCivic?: string;
    healthAndEducation?: string;
    transport?: string;
    jobImplications?: string;
    pdfLink: string;
    fileId: string;
  }
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    // Check if row exists (by report name and state) - read 7 columns: A-G
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:G`,
    });

    const rows = response.data.values || [];
    const normalizedReportName = data.reportName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    // Find existing row by report name and state
    let rowIndex = -1;
    rowIndex = rows.findIndex((row) => {
      const rowReportName = (row[2] || '').trim().toLowerCase(); // Column C
      const rowState = (row[1] || '').trim().toUpperCase(); // Column B
      return rowReportName === normalizedReportName && rowState === normalizedState;
    });

    // Prepare row data (7 columns: A-G)
    const rowData = [
      data.suburbs || '', // A: Suburbs (comma-separated)
      data.state, // B: State
      data.reportName, // C: Report Name
      data.validPeriod, // D: Valid Period
      data.mainBody || '', // E: Main Body
      data.pdfLink || '', // F: PDF Drive Link
      data.fileId || '', // G: PDF File ID
    ];

    if (rowIndex >= 0) {
      // EXISTING ROW - Append suburb if not already in list
      const existingRow = rows[rowIndex];
      const existingSuburbs = (existingRow[0] || '').trim();
      
      // Parse existing suburbs
      const suburbList = existingSuburbs
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      
      // Add new suburb if not already in list
      const newSuburb = (suburb || '').trim();
      if (newSuburb && !suburbList.includes(newSuburb)) {
        suburbList.push(newSuburb);
      }
      
      // Combine back into comma-separated string
      const updatedSuburbs = suburbList.join(', ');
      rowData[0] = updatedSuburbs;
      
      // Get existing PDF link and file ID if not provided in data
      const existingPdfLink = existingRow[5] || ''; // Column F
      const existingFileId = existingRow[6] || ''; // Column G
      
      // Use existing PDF info if not provided in update
      if (!data.pdfLink && existingPdfLink) {
        rowData[5] = existingPdfLink;
      }
      if (!data.fileId && existingFileId) {
        rowData[6] = existingFileId;
      }
      
      // Update existing row (7 columns: A-G)
      const actualRowNumber = rowIndex + 2; // +2 for header row and 0-index
      await sheets.spreadsheets.values.update({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A${actualRowNumber}:G${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row (7 columns: A-G)
      await sheets.spreadsheets.values.append({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A:G`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    }
  } catch (error) {
    console.error('Error saving investment highlights data with sections:', error);
    throw error;
  }
}
