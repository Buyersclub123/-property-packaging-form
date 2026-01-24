import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

/**
 * Save investment highlights with all 15 columns (A-O)
 * Phase 4C-2: Now includes individual sections (G-M) and PDF info (N-O)
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
      extraInfo,
      // Individual sections (Phase 4C-2)
      populationGrowthContext,
      residential,
      industrial,
      commercialAndCivic,
      healthAndEducation,
      transport,
      jobImplications,
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
        extraInfo: extraInfo || '',
        populationGrowthContext: populationGrowthContext || '',
        residential: residential || '',
        industrial: industrial || '',
        commercialAndCivic: commercialAndCivic || '',
        healthAndEducation: healthAndEducation || '',
        transport: transport || '',
        jobImplications: jobImplications || '',
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
 * Save investment highlights data with all 15 columns (A-O)
 * Google Sheet Structure:
 * A: Suburbs (comma-separated)
 * B: State
 * C: Report Name
 * D: Valid Period
 * E: Main Body (combined text of sections G-M)
 * F: Extra Info
 * G: Population Growth Context
 * H: Residential
 * I: Industrial
 * J: Commercial and Civic
 * K: Health and Education
 * L: Transport
 * M: Job Implications
 * N: PDF Drive Link
 * O: PDF File ID
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
    extraInfo: string;
    populationGrowthContext: string;
    residential: string;
    industrial: string;
    commercialAndCivic: string;
    healthAndEducation: string;
    transport: string;
    jobImplications: string;
    pdfLink: string;
    fileId: string;
  }
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    // Check if row exists (by report name and state)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:O`,
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

    // Prepare row data (15 columns: A-O)
    const rowData = [
      data.suburbs || '', // A: Suburbs (comma-separated)
      data.state, // B: State
      data.reportName, // C: Report Name
      data.validPeriod, // D: Valid Period
      data.mainBody || '', // E: Main Body (combined text)
      data.extraInfo || '', // F: Extra Info
      data.populationGrowthContext || '', // G: Population Growth Context
      data.residential || '', // H: Residential
      data.industrial || '', // I: Industrial
      data.commercialAndCivic || '', // J: Commercial and Civic
      data.healthAndEducation || '', // K: Health and Education
      data.transport || '', // L: Transport
      data.jobImplications || '', // M: Job Implications
      data.pdfLink || '', // N: PDF Drive Link
      data.fileId || '', // O: PDF File ID
    ];

    if (rowIndex >= 0) {
      // Update existing row
      const actualRowNumber = rowIndex + 2; // +2 for header row and 0-index
      
      // Get existing PDF link and file ID if not provided in data
      const existingRow = rows[rowIndex];
      const existingPdfLink = existingRow[13] || ''; // Column N
      const existingFileId = existingRow[14] || ''; // Column O
      
      // Use existing PDF info if not provided in update
      if (!data.pdfLink && existingPdfLink) {
        rowData[13] = existingPdfLink;
      }
      if (!data.fileId && existingFileId) {
        rowData[14] = existingFileId;
      }
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A${actualRowNumber}:O${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A:O`,
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
