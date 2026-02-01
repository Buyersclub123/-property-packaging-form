import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { validateReportDate } from '@/lib/dateValidation';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

export interface ReportListItem {
  fileId: string;
  displayName: string;
  reportName: string;
  state: string;
  validPeriod: string;
  suburbs: string[];
  dateStatus: {
    isValid: boolean;
    status: 'current' | 'expiring-soon' | 'expired' | 'invalid';
    displayText: string;
    daysUntilExpiry: number | null;
  };
}

/**
 * GET /api/investment-highlights/list-reports
 * 
 * Returns all Investment Highlights reports from Google Sheet
 * Sorted alphabetically by display name, grouped by state
 */
export async function GET(request: NextRequest) {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      return NextResponse.json(
        { error: 'GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set' },
        { status: 500 }
      );
    }

    // Initialize Google Sheets client
    let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    
    if (!credentialsJson) {
      return NextResponse.json(
        { error: 'GOOGLE_SHEETS_CREDENTIALS not configured' },
        { status: 500 }
      );
    }

    // Parse credentials
    credentialsJson = credentialsJson.trim();
    if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
      credentialsJson = credentialsJson.slice(1, -1);
    }
    if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
      credentialsJson = credentialsJson.slice(1, -1);
    }

    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson);
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Read all data from Investment Highlights sheet
    // Columns: A:Suburbs, B:State, C:ReportName, D:ValidPeriod, E-N:Content, O:PDFDriveLink, P:PDFFileID, Q:DisplayName
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:Q`, // Include column Q (Display Name)
    });

    const rows = response.data.values || [];

    // Parse rows into ReportListItem objects
    const reports: ReportListItem[] = rows
      .filter(row => row[15]) // Filter rows with File ID (column P, index 15)
      .map(row => {
        const suburbs = row[0] ? row[0].split(',').map((s: string) => s.trim()) : [];
        const state = row[1] || '';
        const reportName = row[2] || '';
        const validPeriod = row[3] || '';
        const fileId = row[15] || ''; // Column P (PDF File ID)
        const displayName = row[16] || reportName; // Column Q (Display Name), fallback to Report Name

        // Validate date
        const dateValidation = validateReportDate(validPeriod);

        return {
          fileId,
          displayName,
          reportName,
          state,
          validPeriod,
          suburbs,
          dateStatus: {
            isValid: dateValidation.isValid,
            status: dateValidation.status,
            displayText: dateValidation.displayText,
            daysUntilExpiry: dateValidation.daysUntilExpiry,
          },
        };
      });

    // Group by state and sort alphabetically
    const groupedReports: { [state: string]: ReportListItem[] } = {};
    
    reports.forEach(report => {
      const state = report.state.toUpperCase() || 'UNKNOWN';
      if (!groupedReports[state]) {
        groupedReports[state] = [];
      }
      groupedReports[state].push(report);
    });

    // Sort each state's reports alphabetically by display name
    Object.keys(groupedReports).forEach(state => {
      groupedReports[state].sort((a, b) => 
        a.displayName.localeCompare(b.displayName)
      );
    });

    // Sort states alphabetically
    const sortedStates = Object.keys(groupedReports).sort();

    return NextResponse.json({
      success: true,
      reports: groupedReports,
      states: sortedStates,
      totalReports: reports.length,
    });

  } catch (error: any) {
    console.error('Error listing investment highlights reports:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list reports',
        details: error?.message || error?.toString() 
      },
      { status: 500 }
    );
  }
}
