// Google Sheets API integration for Market Performance data
// Sheet Name: "Property Review Static Data - Market Performance"
// Investment Highlights Sheet Name: "Property Review Static Data - Investment Highlights"
import { google } from 'googleapis';

const SHEET_ID = process.env.GOOGLE_SHEET_ID_MARKET_PERFORMANCE || '';
const TAB_NAME = 'Market Performance';
const LOG_TAB_NAME = 'Market Performance Log';

// Investment Highlights Sheet
const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

// Column mapping (0-indexed) - Column C (Data Source) removed
const COLUMNS = {
  SUBURB_NAME: 0, // A
  STATE: 1, // B
  DATE_COLLECTED_SPI: 2, // C (was D)
  DATE_COLLECTED_REI: 3, // D (was E)
  MEDIAN_PRICE_CHANGE_3M: 4, // E (was F)
  MEDIAN_PRICE_CHANGE_1Y: 5, // F (was G)
  MEDIAN_PRICE_CHANGE_3Y: 6, // G (was H)
  MEDIAN_PRICE_CHANGE_5Y: 7, // H (was I)
  MEDIAN_YIELD: 8, // I (was J)
  MEDIAN_RENT_CHANGE_1Y: 9, // J (was K)
  RENTAL_POPULATION: 10, // K (was L)
  VACANCY_RATE: 11, // L (was M)
};

export interface MarketPerformanceData {
  suburbName: string;
  state: string;
  dataSource: string;
  dateCollectedSPI: string;
  dateCollectedREI: string;
  medianPriceChange3Months: string;
  medianPriceChange1Year: string;
  medianPriceChange3Year: string;
  medianPriceChange5Year: string;
  medianYield: string;
  medianRentChange1Year: string;
  rentalPopulation: string;
  vacancyRate: string;
}

export interface MarketPerformanceLookupResult {
  found: boolean;
  data?: MarketPerformanceData;
  isMockData: boolean;
  daysSinceLastCheck?: number;
}

/**
 * Initialize Google Sheets API client
 */
export function getSheetsClient() {
  // Try to get credentials from environment variable first
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  // If not in env, try to read from file
  if (!credentialsJson) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-sheets-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      }
    } catch (error) {
      // File reading failed, will throw error below
    }
  }
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set and credentials file not found. Please check your .env.local file and restart the dev server.');
  }

  // Remove single quotes if present at start/end (from .env file)
  credentialsJson = credentialsJson.trim();
  if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
  if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
    credentialsJson = credentialsJson.slice(1, -1);
  }

  // Parse JSON - handle multi-line format
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    // If parsing fails, try to clean up newlines and parse again
    try {
      const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson);
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
    }
  }
  
  // Fix private key - handle both escaped newlines (\n) and actual newlines
  if (credentials.private_key) {
    // Normalize the private key:
    // 1. If it has escaped newlines (\n), convert them to actual newlines
    // 2. If it already has actual newlines, keep them
    // 3. Normalize any extra whitespace
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    // Trim any extra whitespace
    credentials.private_key = credentials.private_key.trim();
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Lookup market performance data by suburb and state
 */
export async function lookupMarketPerformance(
  suburbName: string,
  state: string
): Promise<MarketPerformanceLookupResult> {
  try {
    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID_MARKET_PERFORMANCE environment variable is not set');
    }
    
    const sheets = getSheetsClient();
    
    // Read all data from the Market Performance tab
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A2:L`, // Skip header row, Column C removed so now goes to L
    });

    const rows = response.data.values || [];
    
    // Normalize suburb name and state for comparison (case-insensitive, trimmed)
    const normalizedSuburb = suburbName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    // Find matching row
    const matchingRow = rows.find((row) => {
      const rowSuburb = (row[COLUMNS.SUBURB_NAME] || '').trim().toLowerCase();
      const rowState = (row[COLUMNS.STATE] || '').trim().toUpperCase();
      return rowSuburb === normalizedSuburb && rowState === normalizedState;
    });

    if (!matchingRow) {
      return { found: false, isMockData: false };
    }

    // Extract data (Column C removed, so dataSource is derived from dates)
    // Google Sheets might return dates as serial numbers or formatted strings
    // Convert serial numbers to date strings if needed
    const convertSheetDate = (value: any): string => {
      if (!value || value === 'Mock Data') return value || '';
      // If it's a number (serial date), convert it
      if (typeof value === 'number') {
        // Google Sheets serial date: days since December 30, 1899
        const date = new Date(1899, 11, 30);
        date.setDate(date.getDate() + value);
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
      return String(value);
    };
    
    const spiDate = convertSheetDate(matchingRow[COLUMNS.DATE_COLLECTED_SPI]) || '';
    const reiDate = convertSheetDate(matchingRow[COLUMNS.DATE_COLLECTED_REI]) || '';
    let dataSource = '';
    if (spiDate && spiDate !== 'Mock Data') {
      dataSource += 'smartpropertyinvestment.com.au';
    }
    if (reiDate && reiDate !== 'Mock Data') {
      if (dataSource) dataSource += ', ';
      dataSource += 'info.realestateinvestar.com.au';
    }
    if (!dataSource) dataSource = 'Mock Data';
    
    const data: MarketPerformanceData = {
      suburbName: matchingRow[COLUMNS.SUBURB_NAME] || '',
      state: matchingRow[COLUMNS.STATE] || '',
      dataSource: dataSource,
      dateCollectedSPI: spiDate,
      dateCollectedREI: reiDate,
      medianPriceChange3Months: matchingRow[COLUMNS.MEDIAN_PRICE_CHANGE_3M] || '',
      medianPriceChange1Year: matchingRow[COLUMNS.MEDIAN_PRICE_CHANGE_1Y] || '',
      medianPriceChange3Year: matchingRow[COLUMNS.MEDIAN_PRICE_CHANGE_3Y] || '',
      medianPriceChange5Year: matchingRow[COLUMNS.MEDIAN_PRICE_CHANGE_5Y] || '',
      medianYield: matchingRow[COLUMNS.MEDIAN_YIELD] || '',
      medianRentChange1Year: matchingRow[COLUMNS.MEDIAN_RENT_CHANGE_1Y] || '',
      rentalPopulation: matchingRow[COLUMNS.RENTAL_POPULATION] || '',
      vacancyRate: matchingRow[COLUMNS.VACANCY_RATE] || '',
    };

    // Check if data is mock data (if dates are "Mock Data" string)
    const isMockData = (data.dateCollectedSPI === 'Mock Data' || data.dateCollectedREI === 'Mock Data') ||
                       (data.dateCollectedSPI === '' && data.dateCollectedREI === '');
    
    // Calculate days since last check (use most recent of SPI or REI)
    let daysSinceLastCheck: number | undefined;
    
    // Helper to parse date from Google Sheets (handles various formats)
    const parseDate = (dateStr: string): Date | null => {
      if (!dateStr || dateStr === 'Mock Data' || dateStr === '') return null;
      
      // Try parsing directly first
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // If that fails, try common Google Sheets date formats
      // Google Sheets might return dates as serial numbers or formatted strings
      // Try DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD formats
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // DD/MM/YYYY or MM/DD/YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      ];
      
      for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
          if (format === formats[0]) {
            // DD/MM/YYYY or MM/DD/YYYY - try both
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const year = parseInt(match[3], 10);
            // Try MM/DD/YYYY first (US format)
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
            // Try DD/MM/YYYY (if month > 12, it's definitely DD/MM)
            if (month > 12) {
              date = new Date(year, day - 1, month);
              if (!isNaN(date.getTime())) return date;
            }
          } else {
            // YYYY-MM-DD
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            const day = parseInt(match[3], 10);
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
          }
        }
      }
      
      return null;
    };
    
    const spiDateParsed = parseDate(data.dateCollectedSPI);
    const reiDateParsed = parseDate(data.dateCollectedREI);
    
    if (spiDateParsed || reiDateParsed) {
      const dates = [spiDateParsed, reiDateParsed].filter(Boolean) as Date[];
      if (dates.length > 0) {
        const mostRecent = new Date(Math.max(...dates.map(d => d.getTime())));
        const now = new Date();
        daysSinceLastCheck = Math.floor((now.getTime() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      found: true,
      data,
      isMockData,
      daysSinceLastCheck,
    };
  } catch (error) {
    console.error('Error looking up market performance:', error);
    throw error;
  }
}

/**
 * Add or update market performance data
 */
export async function saveMarketPerformanceData(
  suburbName: string,
  state: string,
  data: Partial<MarketPerformanceData>,
  dataSource: 'SPI' | 'REI' | 'BOTH'
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    // First, check if row exists
    const lookupResult = await lookupMarketPerformance(suburbName, state);
    
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (lookupResult.found) {
      // Update existing row
      // Find the row number (need to read to find it)
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A2:L`, // Column C removed
      });

      const rows = response.data.values || [];
      const normalizedSuburb = suburbName.trim().toLowerCase();
      const normalizedState = state.trim().toUpperCase();
      
      const rowIndex = rows.findIndex((row) => {
        const rowSuburb = (row[COLUMNS.SUBURB_NAME] || '').trim().toLowerCase();
        const rowState = (row[COLUMNS.STATE] || '').trim().toUpperCase();
        return rowSuburb === normalizedSuburb && rowState === normalizedState;
      });

      if (rowIndex === -1) {
        throw new Error('Row not found for update');
      }

      const actualRowNumber = rowIndex + 2; // +2 because we skipped header and 0-indexed

      // Build update values
      const updates: { range: string; values: any[][] }[] = [];
      
      // Update dates based on data source (Column C removed, so dates are now C and D)
      if (dataSource === 'SPI' || dataSource === 'BOTH') {
        updates.push({
          range: `${TAB_NAME}!C${actualRowNumber}`, // Was D, now C
          values: [[now]],
        });
      }
      if (dataSource === 'REI' || dataSource === 'BOTH') {
        updates.push({
          range: `${TAB_NAME}!D${actualRowNumber}`, // Was E, now D
          values: [[now]],
        });
      }

      // Update data fields
      const fieldMappings = [
        { field: 'medianPriceChange3Months', col: COLUMNS.MEDIAN_PRICE_CHANGE_3M },
        { field: 'medianPriceChange1Year', col: COLUMNS.MEDIAN_PRICE_CHANGE_1Y },
        { field: 'medianPriceChange3Year', col: COLUMNS.MEDIAN_PRICE_CHANGE_3Y },
        { field: 'medianPriceChange5Year', col: COLUMNS.MEDIAN_PRICE_CHANGE_5Y },
        { field: 'medianYield', col: COLUMNS.MEDIAN_YIELD },
        { field: 'medianRentChange1Year', col: COLUMNS.MEDIAN_RENT_CHANGE_1Y },
        { field: 'rentalPopulation', col: COLUMNS.RENTAL_POPULATION },
        { field: 'vacancyRate', col: COLUMNS.VACANCY_RATE },
      ];

      fieldMappings.forEach(({ field, col }) => {
        if (data[field as keyof MarketPerformanceData] !== undefined) {
          const colLetter = String.fromCharCode(65 + col); // Convert to A, B, C, etc. (A=65)
          updates.push({
            range: `${TAB_NAME}!${colLetter}${actualRowNumber}`,
            values: [[data[field as keyof MarketPerformanceData]]],
          });
        }
      });

      // Batch update
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });
    } else {
      // Insert new row (Column C removed, so no data source column)
      const newRow = [
        suburbName,
        state,
        dataSource === 'SPI' || dataSource === 'BOTH' ? now : '', // Column C: Date Collected - SPI
        dataSource === 'REI' || dataSource === 'BOTH' ? now : '', // Column D: Date Collected - REI
        data.medianPriceChange3Months || '',
        data.medianPriceChange1Year || '',
        data.medianPriceChange3Year || '',
        data.medianPriceChange5Year || '',
        data.medianYield || '',
        data.medianRentChange1Year || '',
        data.rentalPopulation || '',
        data.vacancyRate || '',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `${TAB_NAME}!A:L`, // Column C removed, now goes to L
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [newRow],
        },
      });
    }
  } catch (error) {
    console.error('Error saving market performance data:', error);
    throw error;
  }
}

/**
 * Update timestamp for existing market performance data (mark as checked)
 * Updates both SPI and REI date columns to current date if they have data
 */
export async function updateMarketPerformanceTimestamp(
  suburbName: string,
  state: string
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    // Find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A2:L`,
    });

    const rows = response.data.values || [];
    const normalizedSuburb = suburbName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();
    
    const rowIndex = rows.findIndex((row) => {
      const rowSuburb = (row[COLUMNS.SUBURB_NAME] || '').trim().toLowerCase();
      const rowState = (row[COLUMNS.STATE] || '').trim().toUpperCase();
      return rowSuburb === normalizedSuburb && rowState === normalizedState;
    });

    if (rowIndex === -1) {
      throw new Error('Row not found');
    }

    const actualRowNumber = rowIndex + 2;
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check if row has SPI data (3-year or 5-year price change)
    const hasSPIData = rows[rowIndex][COLUMNS.MEDIAN_PRICE_CHANGE_3Y] || rows[rowIndex][COLUMNS.MEDIAN_PRICE_CHANGE_5Y];
    // Check if row has REI data (any of the other fields)
    const hasREIData = rows[rowIndex][COLUMNS.MEDIAN_PRICE_CHANGE_3M] || 
                       rows[rowIndex][COLUMNS.MEDIAN_PRICE_CHANGE_1Y] ||
                       rows[rowIndex][COLUMNS.MEDIAN_YIELD] ||
                       rows[rowIndex][COLUMNS.MEDIAN_RENT_CHANGE_1Y] ||
                       rows[rowIndex][COLUMNS.RENTAL_POPULATION] ||
                       rows[rowIndex][COLUMNS.VACANCY_RATE];

    const updates: { range: string; values: any[][] }[] = [];
    
    // Update SPI date if SPI data exists
    if (hasSPIData) {
      updates.push({
        range: `${TAB_NAME}!C${actualRowNumber}`, // Date Collected - SPI
        values: [[now]],
      });
    }
    
    // Update REI date if REI data exists
    if (hasREIData) {
      updates.push({
        range: `${TAB_NAME}!D${actualRowNumber}`, // Date Collected - REI
        values: [[now]],
      });
    }

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates,
        },
      });
    }
  } catch (error) {
    console.error('Error updating market performance timestamp:', error);
    throw error;
  }
}

/**
 * Update timestamp for a specific data source (SPI or REI)
 */
export async function updateMarketPerformanceTimestampForSource(
  suburbName: string,
  state: string,
  source: 'SPI' | 'REI'
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    // Find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!A2:L`,
    });

    const rows = response.data.values || [];
    const normalizedSuburb = suburbName.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();
    
    const rowIndex = rows.findIndex((row) => {
      const rowSuburb = (row[COLUMNS.SUBURB_NAME] || '').trim().toLowerCase();
      const rowState = (row[COLUMNS.STATE] || '').trim().toUpperCase();
      return rowSuburb === normalizedSuburb && rowState === normalizedState;
    });

    if (rowIndex === -1) {
      throw new Error('Row not found');
    }

    const actualRowNumber = rowIndex + 2;
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Determine which column to update
    const column = source === 'SPI' ? COLUMNS.DATE_COLLECTED_SPI : COLUMNS.DATE_COLLECTED_REI;
    const columnLetter = String.fromCharCode(65 + column); // Convert to A, B, C, etc.
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${TAB_NAME}!${columnLetter}${actualRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[now]],
      },
    });
  } catch (error) {
    console.error(`Error updating ${source} timestamp:`, error);
    throw error;
  }
}

/**
 * Log market performance changes to the log tab
 * Groups all changes from a single update session into one row
 */
export interface MarketPerformanceLogEntry {
  suburbName: string;
  state: string;
  actionType: 'COLLECTED' | 'UPDATED' | 'VERIFIED';
  changedBy: string;
  timestamp: string;
  // Only fields that changed (others will be blank)
  medianPriceChange3Months?: string;
  medianPriceChange1Year?: string;
  medianPriceChange3Year?: string;
  medianPriceChange5Year?: string;
  medianYield?: string;
  medianRentChange1Year?: string;
  rentalPopulation?: string;
  vacancyRate?: string;
  notes?: string;
}

export async function logMarketPerformanceUpdate(
  entry: MarketPerformanceLogEntry
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    const logRow = [
      entry.timestamp, // Timestamp
      entry.suburbName, // Suburb
      entry.state, // State
      entry.actionType, // Action Type (COLLECTED, UPDATED, VERIFIED)
      entry.changedBy, // Changed By (user email)
      entry.medianPriceChange3Months || '', // Median price change - 3 months (only if changed)
      entry.medianPriceChange1Year || '', // Median price change - 1 year (only if changed)
      entry.medianPriceChange3Year || '', // Median price change - 3 year (only if changed)
      entry.medianPriceChange5Year || '', // Median price change - 5 year (only if changed)
      entry.medianYield || '', // Median yield (only if changed)
      entry.medianRentChange1Year || '', // Median rent change - 1 year (only if changed)
      entry.rentalPopulation || '', // Rental Population (only if changed)
      entry.vacancyRate || '', // Vacancy Rate (only if changed)
      entry.notes || '', // Notes
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${LOG_TAB_NAME}!A:N`, // 14 columns total (removed Date Collected columns)
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [logRow],
      },
    });
  } catch (error) {
    console.error('Error logging market performance update:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

// ============================================================================
// Investment Highlights Functions
// ============================================================================

export interface InvestmentHighlightsData {
  lga: string;
  state: string;
  reportName?: string;
  validFrom?: string;
  validTo?: string;
  investmentHighlights: string; // Main Body
  extras?: string[]; // Array of 7 strings
  suburbs?: string; // Comma separated list
}

export interface InvestmentHighlightsLookupResult {
  found: boolean;
  data?: InvestmentHighlightsData;
}

/**
 * Lookup investment highlights data by LGA and Suburb
 */
export async function lookupInvestmentHighlights(
  lga: string,
  suburb: string,
  state: string
): Promise<InvestmentHighlightsLookupResult> {
  try {
    if (!INVESTMENT_HIGHLIGHTS_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS environment variable is not set');
    }
    
    const sheets = getSheetsClient();
    
    // Read all data from the Investment Highlights tab
    // Expected columns: A:LGA, B:State, C:ReportName, D:ValidFrom, E:ValidTo, F:Content, G-M:Extras, N:Suburbs
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:N`, 
    });

    const rows = response.data.values || [];
    
    const normalizedLGA = lga.trim().toLowerCase();
    const normalizedSuburb = suburb ? suburb.trim().toLowerCase() : '';
    const normalizedState = state.trim().toUpperCase();

    // 1. Try to find by Suburb match in Column N (Index 13)
    let matchingRow = undefined;
    if (normalizedSuburb) {
        matchingRow = rows.find((row) => {
            const rowSuburbs = (row[13] || '').toLowerCase();
            // Check if suburb appears in the list (comma separated)
            const suburbList = rowSuburbs.split(',').map((s: string) => s.trim());
            return suburbList.includes(normalizedSuburb);
        });
    }

    // 2. If not found, try to find by LGA match in Column A (Index 0)
    if (!matchingRow) {
        matchingRow = rows.find((row) => {
            const rowLGA = (row[0] || '').trim().toLowerCase();
            const rowState = (row[1] || '').trim().toUpperCase();
            return rowLGA === normalizedLGA && rowState === normalizedState;
        });
    }

    if (!matchingRow) {
      return { found: false };
    }

    // Extract data
    const data: InvestmentHighlightsData = {
        lga: matchingRow[0] || '',
        state: matchingRow[1] || '',
        reportName: matchingRow[2] || '',
        validFrom: matchingRow[3] || '',
        validTo: matchingRow[4] || '',
        investmentHighlights: matchingRow[5] || '',
        extras: [
            matchingRow[6] || '',
            matchingRow[7] || '',
            matchingRow[8] || '',
            matchingRow[9] || '',
            matchingRow[10] || '',
            matchingRow[11] || '',
            matchingRow[12] || '',
        ],
        suburbs: matchingRow[13] || '',
    };

    return {
      found: true,
      data,
    };
  } catch (error) {
    console.error('Error looking up investment highlights:', error);
    throw error;
  }
}

/**
 * Save or update investment highlights data
 */
export async function saveInvestmentHighlightsData(
  lga: string,
  suburb: string,
  state: string,
  data: Partial<InvestmentHighlightsData>
): Promise<void> {
  try {
    const sheets = getSheetsClient();
    
    // Check if row exists (logic same as lookup)
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
        range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:N`,
    });

    const rows = response.data.values || [];
    const normalizedLGA = lga.trim().toLowerCase();
    const normalizedSuburb = suburb.trim().toLowerCase();
    const normalizedState = state.trim().toUpperCase();

    let rowIndex = -1;

    // 1. Try Suburb Match
    if (normalizedSuburb) {
        rowIndex = rows.findIndex((row) => {
            const rowSuburbs = (row[13] || '').toLowerCase();
            const suburbList = rowSuburbs.split(',').map((s: string) => s.trim());
            return suburbList.includes(normalizedSuburb);
        });
    }

    // 2. Try LGA Match
    if (rowIndex === -1) {
        rowIndex = rows.findIndex((row) => {
            const rowLGA = (row[0] || '').trim().toLowerCase();
            const rowState = (row[1] || '').trim().toUpperCase();
            return rowLGA === normalizedLGA && rowState === normalizedState;
        });
    }

    // Prepare row data
    const extras = data.extras || [];
    const mainBody = data.investmentHighlights || '';
    const reportName = data.reportName || '';
    const validFrom = data.validFrom || '';
    const validTo = data.validTo || '';

    if (rowIndex !== -1) {
        // Update existing
        const actualRowNumber = rowIndex + 2;
        const existingRow = rows[rowIndex];
        
        // Merge Suburbs
        let currentSuburbs = existingRow[13] || '';
        const suburbList = currentSuburbs.split(',').map((s: string) => s.trim()).filter((s: string) => s);
        let suburbUpdated = false;
        
        // Add current suburb if not present (case insensitive check)
        if (suburb && !suburbList.some((s: string) => s.toLowerCase() === normalizedSuburb)) {
            suburbList.push(suburb.trim()); // Use original case
            currentSuburbs = suburbList.join(', ');
            suburbUpdated = true;
        }

        const updates: { range: string; values: any[][] }[] = [];

        // Update fields if provided
        if (data.reportName !== undefined) updates.push({ range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!C${actualRowNumber}`, values: [[reportName]] });
        if (data.validFrom !== undefined) updates.push({ range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!D${actualRowNumber}`, values: [[validFrom]] });
        if (data.validTo !== undefined) updates.push({ range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!E${actualRowNumber}`, values: [[validTo]] });
        if (data.investmentHighlights !== undefined) updates.push({ range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!F${actualRowNumber}`, values: [[mainBody]] });
        
        // Extras G-M
        if (extras.length > 0) {
             const extrasRow = [
                 extras[0] || '', extras[1] || '', extras[2] || '', extras[3] || '', extras[4] || '', extras[5] || '', extras[6] || ''
             ];
             updates.push({ range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!G${actualRowNumber}`, values: [extrasRow] });
        }

        // Suburbs N
        if (suburbUpdated) {
            updates.push({ range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!N${actualRowNumber}`, values: [[currentSuburbs]] });
        }

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
                requestBody: { valueInputOption: 'RAW', data: updates },
            });
        }

    } else {
        // Create new
        const newRow = [
            lga,
            state,
            reportName,
            validFrom,
            validTo,
            mainBody,
            extras[0] || '',
            extras[1] || '',
            extras[2] || '',
            extras[3] || '',
            extras[4] || '',
            extras[5] || '',
            extras[6] || '',
            suburb, // Initial suburb
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
            range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A:N`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: [newRow] },
        });
    }

  } catch (error) {
    console.error('Error saving investment highlights data:', error);
    throw error;
  }
}
