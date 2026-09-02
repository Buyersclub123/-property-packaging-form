import { NextRequest, NextResponse } from 'next/server';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights V2';

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

    // Read all data from Investment Highlights V2 sheet (13 columns: A-M)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `'${INVESTMENT_HIGHLIGHTS_TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];

    // Parse rows into ReportOption objects
    // V2 columns: A:Suburbs, B:State, C:LGA, D:ReportName, E:ValidFromMonth, F:ValidFromYear, G:ValidToMonth, H:ValidToYear, I:MainBody, J:PDFLink, K:FileID, L:UpdatedBy, M:UpdatedAt
    const reports: ReportOption[] = rows
      .filter(row => {
        // Filter out rows with empty LGA (column C, index 2)
        const lga = (row[2] || '').trim();
        return lga.length > 0;
      })
      .map(row => {
        const reportName = (row[3] || '').trim(); // Column D (Report Name)
        const lga = (row[2] || '').trim(); // Column C (LGA)
        const validFromMonth = (row[4] || '').trim();
        const validFromYear = (row[5] || '').trim();
        const validToMonth = (row[6] || '').trim();
        const validToYear = (row[7] || '').trim();

        // Build combined validPeriod string
        let validPeriod = '';
        if (validFromMonth && validToMonth && validToYear) {
          if (validFromYear === validToYear) {
            validPeriod = `${validFromMonth} - ${validToMonth} ${validToYear}`;
          } else {
            validPeriod = `${validFromMonth} ${validFromYear} - ${validToMonth} ${validToYear}`;
          }
        }

        return {
          reportName: reportName || lga, // Use Report Name, fall back to LGA
          validPeriod,
          state: (row[1] || '').trim(), // Column B
          suburbs: (row[0] || '').trim(), // Column A (comma-separated)
          pdfLink: (row[9] || '').trim(), // Column J
          fileId: (row[10] || '').trim(), // Column K
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
