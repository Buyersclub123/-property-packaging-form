/**
 * Investment Highlights V2 - LGA-keyed Google Sheets integration
 * 
 * New sheet structure (tab: "Investment Highlights V2"):
 * A: Suburbs (comma-separated, auto-accumulated)
 * B: State
 * C: LGA (primary key with State)
 * D: Report Name (Hotspotting report name, may differ from LGA)
 * E: Valid From Month
 * F: Valid From Year
 * G: Valid To Month
 * H: Valid To Year
 * I: Main Body (AI-generated content)
 * J: PDF Drive Link
 * K: PDF File ID
 * L: Last Updated By (email)
 * M: Last Updated At (timestamp)
 */
import { google } from 'googleapis';
import { getSheetsClient } from './googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const V2_TAB_NAME = 'Investment Highlights V2';
const V2_LOG_TAB_NAME = 'Investment Highlights V2 Log';

// Column mapping (0-indexed)
const V2_COLUMNS = {
  SUBURBS: 0,         // A
  STATE: 1,           // B
  LGA: 2,             // C
  REPORT_NAME: 3,     // D
  VALID_FROM_MONTH: 4, // E
  VALID_FROM_YEAR: 5,  // F
  VALID_TO_MONTH: 6,   // G
  VALID_TO_YEAR: 7,    // H
  MAIN_BODY: 8,       // I
  PDF_DRIVE_LINK: 9,  // J
  PDF_FILE_ID: 10,    // K
  UPDATED_BY: 11,     // L
  UPDATED_AT: 12,     // M
};

export interface InvestmentHighlightsV2Data {
  suburbs: string;
  state: string;
  lga: string;
  reportName: string;
  validFromMonth: string;
  validFromYear: string;
  validToMonth: string;
  validToYear: string;
  mainBody: string;
  pdfDriveLink: string;
  pdfFileId: string;
  updatedBy: string;
  updatedAt: string;
}

export interface InvestmentHighlightsV2LookupResult {
  found: boolean;
  data?: InvestmentHighlightsV2Data;
  matchType?: 'exact' | 'fuzzy';
}

export interface InvestmentHighlightsV2SaveInput {
  lga: string;
  state: string;
  reportName?: string;
  suburb: string;
  validFromMonth: string;
  validFromYear: string;
  validToMonth: string;
  validToYear: string;
  mainBody: string;
  pdfDriveLink?: string;
  pdfFileId?: string;
  updatedBy: string;
}

/**
 * Normalise LGA name for fuzzy comparison
 * Strips common suffixes, lowercases, trims
 */
export function normaliseLGA(lga: string): string {
  return lga
    .trim()
    .toLowerCase()
    .replace(/\b(regional|council|city|shire|municipality|the corporation of the|the rural city of|town of|district)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two LGA names refer to the same place
 * First tries exact match (case-insensitive), then fuzzy match
 */
export function lgaMatches(inputLGA: string, sheetLGA: string): 'exact' | 'fuzzy' | false {
  const inputNorm = inputLGA.trim().toLowerCase();
  const sheetNorm = sheetLGA.trim().toLowerCase();
  
  // Exact match (case-insensitive)
  if (inputNorm === sheetNorm) {
    return 'exact';
  }
  
  // Fuzzy match (strip suffixes and compare)
  const inputStripped = normaliseLGA(inputLGA);
  const sheetStripped = normaliseLGA(sheetLGA);
  
  if (inputStripped === sheetStripped) {
    return 'fuzzy';
  }
  
  // Check if one contains the other (e.g., "Fraser Coast" matches "Fraser Coast Regional")
  if (inputStripped.length > 3 && sheetStripped.length > 3) {
    if (inputStripped.includes(sheetStripped) || sheetStripped.includes(inputStripped)) {
      return 'fuzzy';
    }
  }
  
  return false;
}

/**
 * Lookup investment highlights by LGA + State
 * Uses normalised matching with fuzzy fallback
 */
export async function lookupInvestmentHighlightsV2(
  lga: string,
  state: string
): Promise<InvestmentHighlightsV2LookupResult> {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set');
    }
    
    const sheets = getSheetsClient();
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `'${V2_TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];
    const normalizedState = state.trim().toUpperCase();

    // First pass: try exact match
    let matchingRow: any[] | undefined;
    let matchType: 'exact' | 'fuzzy' = 'exact';

    for (const row of rows) {
      const rowState = (row[V2_COLUMNS.STATE] || '').trim().toUpperCase();
      if (rowState !== normalizedState) continue;
      
      const rowLGA = (row[V2_COLUMNS.LGA] || '').trim();
      const match = lgaMatches(lga, rowLGA);
      
      if (match === 'exact') {
        matchingRow = row;
        matchType = 'exact';
        break;
      }
      
      if (match === 'fuzzy' && !matchingRow) {
        matchingRow = row;
        matchType = 'fuzzy';
        // Don't break - keep looking for exact match
      }
    }

    if (!matchingRow) {
      return { found: false };
    }

    const data: InvestmentHighlightsV2Data = {
      suburbs: matchingRow[V2_COLUMNS.SUBURBS] || '',
      state: matchingRow[V2_COLUMNS.STATE] || '',
      lga: matchingRow[V2_COLUMNS.LGA] || '',
      reportName: matchingRow[V2_COLUMNS.REPORT_NAME] || '',
      validFromMonth: matchingRow[V2_COLUMNS.VALID_FROM_MONTH] || '',
      validFromYear: matchingRow[V2_COLUMNS.VALID_FROM_YEAR] || '',
      validToMonth: matchingRow[V2_COLUMNS.VALID_TO_MONTH] || '',
      validToYear: matchingRow[V2_COLUMNS.VALID_TO_YEAR] || '',
      mainBody: matchingRow[V2_COLUMNS.MAIN_BODY] || '',
      pdfDriveLink: matchingRow[V2_COLUMNS.PDF_DRIVE_LINK] || '',
      pdfFileId: matchingRow[V2_COLUMNS.PDF_FILE_ID] || '',
      updatedBy: matchingRow[V2_COLUMNS.UPDATED_BY] || '',
      updatedAt: matchingRow[V2_COLUMNS.UPDATED_AT] || '',
    };

    return { found: true, data, matchType };
  } catch (error) {
    console.error('[InvestmentHighlightsV2] Lookup error:', error);
    throw error;
  }
}

/**
 * Save or update investment highlights (upsert by LGA + State)
 * - If row exists: updates content, valid period, PDF, appends suburb, logs change
 * - If row doesn't exist: creates new row, logs creation
 */
export async function saveInvestmentHighlightsV2(
  input: InvestmentHighlightsV2SaveInput
): Promise<{ action: 'created' | 'updated'; rowNumber: number }> {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set');
    }

    const sheets = getSheetsClient();
    const normalizedState = input.state.trim().toUpperCase();
    const now = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });

    // Read existing data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `'${V2_TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];

    // Find existing row by LGA + State
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      const rowState = (rows[i][V2_COLUMNS.STATE] || '').trim().toUpperCase();
      if (rowState !== normalizedState) continue;
      
      const rowLGA = (rows[i][V2_COLUMNS.LGA] || '').trim();
      if (lgaMatches(input.lga, rowLGA)) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex !== -1) {
      // UPDATE existing row
      const actualRowNumber = rowIndex + 2; // +2 for header + 0-index
      const existingRow = rows[rowIndex];

      // Merge suburbs - add new suburb if not already present
      let currentSuburbs = existingRow[V2_COLUMNS.SUBURBS] || '';
      const suburbList = currentSuburbs.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      const normalizedNewSuburb = input.suburb.trim().toLowerCase();
      
      if (normalizedNewSuburb && !suburbList.some((s: string) => s.toLowerCase() === normalizedNewSuburb)) {
        suburbList.push(input.suburb.trim());
        currentSuburbs = suburbList.join(', ');
      }

      // Build update
      const rowData = [
        currentSuburbs,
        normalizedState,
        existingRow[V2_COLUMNS.LGA] || input.lga.trim(), // Keep existing LGA name
        input.reportName || existingRow[V2_COLUMNS.REPORT_NAME] || '', // Keep existing report name if not provided
        input.validFromMonth,
        input.validFromYear,
        input.validToMonth,
        input.validToYear,
        input.mainBody,
        input.pdfDriveLink || existingRow[V2_COLUMNS.PDF_DRIVE_LINK] || '',
        input.pdfFileId || existingRow[V2_COLUMNS.PDF_FILE_ID] || '',
        input.updatedBy,
        now,
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `'${V2_TAB_NAME}'!A${actualRowNumber}:M${actualRowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] },
      });

      // Log the update
      await logInvestmentHighlightsChange({
        action: 'UPDATED',
        lga: input.lga,
        state: normalizedState,
        updatedBy: input.updatedBy,
        timestamp: now,
        details: `Valid period: ${input.validFromMonth} ${input.validFromYear} - ${input.validToMonth} ${input.validToYear}`,
      });

      return { action: 'updated', rowNumber: actualRowNumber };
    } else {
      // CREATE new row
      const newRow = [
        input.suburb.trim(), // Start suburbs list with current suburb
        normalizedState,
        input.lga.trim(),
        input.reportName || input.lga.trim(), // Default report name to LGA if not provided
        input.validFromMonth,
        input.validFromYear,
        input.validToMonth,
        input.validToYear,
        input.mainBody,
        input.pdfDriveLink || '',
        input.pdfFileId || '',
        input.updatedBy,
        now,
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `'${V2_TAB_NAME}'!A:M`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [newRow] },
      });

      // Log the creation
      await logInvestmentHighlightsChange({
        action: 'CREATED',
        lga: input.lga,
        state: normalizedState,
        updatedBy: input.updatedBy,
        timestamp: now,
        details: `New LGA report. Valid period: ${input.validFromMonth} ${input.validFromYear} - ${input.validToMonth} ${input.validToYear}`,
      });

      return { action: 'created', rowNumber: rows.length + 2 };
    }
  } catch (error) {
    console.error('[InvestmentHighlightsV2] Save error:', error);
    throw error;
  }
}

/**
 * Log changes to the V2 log tab
 */
interface LogEntry {
  action: 'CREATED' | 'UPDATED';
  lga: string;
  state: string;
  updatedBy: string;
  timestamp: string;
  details: string;
}

async function logInvestmentHighlightsChange(entry: LogEntry): Promise<void> {
  try {
    const sheets = getSheetsClient();

    const logRow = [
      entry.timestamp,
      entry.action,
      entry.lga,
      entry.state,
      entry.updatedBy,
      entry.details,
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `'${V2_LOG_TAB_NAME}'!A:F`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [logRow] },
    });
  } catch (error) {
    console.error('[InvestmentHighlightsV2] Log error (non-fatal):', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * List all reports (for admin/test view)
 */
export async function listAllInvestmentHighlightsV2(): Promise<InvestmentHighlightsV2Data[]> {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set');
    }

    const sheets = getSheetsClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `'${V2_TAB_NAME}'!A2:M`,
    });

    const rows = response.data.values || [];

    return rows
      .filter(row => row[V2_COLUMNS.LGA]) // Must have LGA
      .map(row => ({
        suburbs: row[V2_COLUMNS.SUBURBS] || '',
        state: row[V2_COLUMNS.STATE] || '',
        lga: row[V2_COLUMNS.LGA] || '',
        reportName: row[V2_COLUMNS.REPORT_NAME] || '',
        validFromMonth: row[V2_COLUMNS.VALID_FROM_MONTH] || '',
        validFromYear: row[V2_COLUMNS.VALID_FROM_YEAR] || '',
        validToMonth: row[V2_COLUMNS.VALID_TO_MONTH] || '',
        validToYear: row[V2_COLUMNS.VALID_TO_YEAR] || '',
        mainBody: row[V2_COLUMNS.MAIN_BODY] || '',
        pdfDriveLink: row[V2_COLUMNS.PDF_DRIVE_LINK] || '',
        pdfFileId: row[V2_COLUMNS.PDF_FILE_ID] || '',
        updatedBy: row[V2_COLUMNS.UPDATED_BY] || '',
        updatedAt: row[V2_COLUMNS.UPDATED_AT] || '',
      }));
  } catch (error) {
    console.error('[InvestmentHighlightsV2] List error:', error);
    throw error;
  }
}
