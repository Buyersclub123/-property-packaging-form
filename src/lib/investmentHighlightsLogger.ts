// Activity logging for Investment Highlights
import { google } from 'googleapis';
import { getSheetsClient } from './googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const ACTIVITY_LOG_TAB_NAME = 'Investment Highlights Activity Log';

export type ActionType = 
  | 'Uploaded' 
  | 'Used' 
  | 'Superseded' 
  | 'Edited Section' 
  | 'Edited Main Body' 
  | 'Deleted Extra Line' 
  | 'Confirmed Current' 
  | 'Expiry Warning Shown';

export interface ActivityLogEntry {
  actionType: ActionType;
  reportName: string;
  validPeriod: string;
  userEmail: string;
  pdfLink: string;
  details: string;
}

/**
 * Log an activity to the Investment Highlights Activity Log tab
 * 
 * Tab structure:
 * A: Timestamp
 * B: Action Type
 * C: Report Name
 * D: Valid Period
 * E: User/BA
 * F: PDF Link
 * G: Details
 */
export async function logInvestmentHighlightsActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set');
    }

    const sheets = getSheetsClient();
    
    // Format timestamp: YYYY-MM-DD HH:MM:SS
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Append row to Activity Log tab
    await sheets.spreadsheets.values.append({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${ACTIVITY_LOG_TAB_NAME}!A:G`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          timestamp,
          entry.actionType,
          entry.reportName,
          entry.validPeriod,
          entry.userEmail,
          entry.pdfLink,
          entry.details,
        ]],
      },
    });

    console.log(`[Activity Log] ${entry.actionType}: ${entry.reportName} - ${entry.validPeriod}`);
  } catch (error) {
    console.error('Failed to log investment highlights activity:', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}
