import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

export interface ReportOption {
  reportName: string;
  validPeriod: string;
  state: string;
  suburbs: string; // comma-separated
  pdfLink: string;
  fileId: string;
}

/**
 * GET /api/investment-highlights/get-reports
 * 
 * Returns all Investment Highlights reports from Google Sheet
 * Sorted alphabetically by Report Name
 * Structure: A:Suburbs, B:State, C:ReportName, D:ValidPeriod, E:MainBody, F:PDFLink, G:FileID
 */
export async function GET(request: NextRequest) {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      return NextResponse.json(
        { error: 'GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set' },
        { status: 500 }
      );
    }

    const sheets = getSheetsClient();

    // Read all data from Investment Highlights sheet (7 columns: A-G)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:G`,
    });

    const rows = response.data.values || [];

    // Parse rows into ReportOption objects
    const reports: ReportOption[] = rows
      .filter(row => {
        // Filter out rows with empty Report Name (column C, index 2)
        const reportName = (row[2] || '').trim();
        return reportName.length > 0;
      })
      .map(row => {
        return {
          reportName: (row[2] || '').trim(), // Column C
          validPeriod: (row[3] || '').trim(), // Column D
          state: (row[1] || '').trim(), // Column B
          suburbs: (row[0] || '').trim(), // Column A (comma-separated)
          pdfLink: (row[5] || '').trim(), // Column F
          fileId: (row[6] || '').trim(), // Column G
        };
      });

    // Sort alphabetically by Report Name
    reports.sort((a, b) => 
      a.reportName.localeCompare(b.reportName, undefined, { sensitivity: 'base' })
    );

    return NextResponse.json({
      reports,
    });

  } catch (error: any) {
    console.error('Error getting investment highlights reports:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get reports',
        details: error?.message || error?.toString() 
      },
      { status: 500 }
    );
  }
}
