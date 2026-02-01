/**
 * Date Validation Utility for Investment Highlights Reports
 * 
 * Parses "Valid Period" field from Hotspotting reports and determines if report is current.
 * 
 * Examples of Valid Period formats:
 * - "SEPTEMBER - DECEMBER 2025"
 * - "October 2025 - January 2026"
 * - "Q4 2025"
 * - "2025"
 */

export interface DateValidationResult {
  isValid: boolean;
  startDate: Date | null;
  endDate: Date | null;
  daysUntilExpiry: number | null;
  status: 'current' | 'expiring-soon' | 'expired' | 'invalid';
  displayText: string;
}

/**
 * Parse a "Valid Period" string and return validation result
 */
export function validateReportDate(validPeriod: string): DateValidationResult {
  if (!validPeriod || validPeriod.trim() === '') {
    return {
      isValid: false,
      startDate: null,
      endDate: null,
      daysUntilExpiry: null,
      status: 'invalid',
      displayText: 'No valid period specified',
    };
  }

  const normalized = validPeriod.trim().toUpperCase();
  
  // Strategy 1: "MONTH - MONTH YEAR" (e.g., "SEPTEMBER - DECEMBER 2025")
  const monthRangeMatch = normalized.match(/^([A-Z]+)\s*-\s*([A-Z]+)\s+(\d{4})$/);
  if (monthRangeMatch) {
    const [, startMonth, endMonth, year] = monthRangeMatch;
    return parseMonthRange(startMonth, endMonth, year);
  }

  // Strategy 2: "MONTH YEAR - MONTH YEAR" (e.g., "October 2025 - January 2026")
  const fullRangeMatch = normalized.match(/^([A-Z]+)\s+(\d{4})\s*-\s*([A-Z]+)\s+(\d{4})$/);
  if (fullRangeMatch) {
    const [, startMonth, startYear, endMonth, endYear] = fullRangeMatch;
    return parseFullRange(startMonth, startYear, endMonth, endYear);
  }

  // Strategy 3: "Q[1-4] YEAR" (e.g., "Q4 2025")
  const quarterMatch = normalized.match(/^Q([1-4])\s+(\d{4})$/);
  if (quarterMatch) {
    const [, quarter, year] = quarterMatch;
    return parseQuarter(quarter, year);
  }

  // Strategy 4: Single year (e.g., "2025")
  const yearMatch = normalized.match(/^(\d{4})$/);
  if (yearMatch) {
    const [, year] = yearMatch;
    return parseYear(year);
  }

  // Strategy 5: Single month and year (e.g., "DECEMBER 2025")
  const singleMonthMatch = normalized.match(/^([A-Z]+)\s+(\d{4})$/);
  if (singleMonthMatch) {
    const [, month, year] = singleMonthMatch;
    return parseSingleMonth(month, year);
  }

  // Unable to parse
  return {
    isValid: false,
    startDate: null,
    endDate: null,
    daysUntilExpiry: null,
    status: 'invalid',
    displayText: `Unable to parse: "${validPeriod}"`,
  };
}

/**
 * Parse "MONTH - MONTH YEAR" format
 */
function parseMonthRange(startMonth: string, endMonth: string, year: string): DateValidationResult {
  const startMonthNum = getMonthNumber(startMonth);
  const endMonthNum = getMonthNumber(endMonth);
  
  if (startMonthNum === -1 || endMonthNum === -1) {
    return {
      isValid: false,
      startDate: null,
      endDate: null,
      daysUntilExpiry: null,
      status: 'invalid',
      displayText: 'Invalid month name',
    };
  }

  const startDate = new Date(parseInt(year), startMonthNum, 1);
  const endDate = getLastDayOfMonth(parseInt(year), endMonthNum);

  return calculateStatus(startDate, endDate);
}

/**
 * Parse "MONTH YEAR - MONTH YEAR" format
 */
function parseFullRange(startMonth: string, startYear: string, endMonth: string, endYear: string): DateValidationResult {
  const startMonthNum = getMonthNumber(startMonth);
  const endMonthNum = getMonthNumber(endMonth);
  
  if (startMonthNum === -1 || endMonthNum === -1) {
    return {
      isValid: false,
      startDate: null,
      endDate: null,
      daysUntilExpiry: null,
      status: 'invalid',
      displayText: 'Invalid month name',
    };
  }

  const startDate = new Date(parseInt(startYear), startMonthNum, 1);
  const endDate = getLastDayOfMonth(parseInt(endYear), endMonthNum);

  return calculateStatus(startDate, endDate);
}

/**
 * Parse "Q[1-4] YEAR" format
 */
function parseQuarter(quarter: string, year: string): DateValidationResult {
  const quarterNum = parseInt(quarter);
  const startMonth = (quarterNum - 1) * 3; // Q1=0, Q2=3, Q3=6, Q4=9
  const endMonth = startMonth + 2;

  const startDate = new Date(parseInt(year), startMonth, 1);
  const endDate = getLastDayOfMonth(parseInt(year), endMonth);

  return calculateStatus(startDate, endDate);
}

/**
 * Parse single year format
 */
function parseYear(year: string): DateValidationResult {
  const startDate = new Date(parseInt(year), 0, 1); // Jan 1
  const endDate = new Date(parseInt(year), 11, 31); // Dec 31

  return calculateStatus(startDate, endDate);
}

/**
 * Parse single month format
 */
function parseSingleMonth(month: string, year: string): DateValidationResult {
  const monthNum = getMonthNumber(month);
  
  if (monthNum === -1) {
    return {
      isValid: false,
      startDate: null,
      endDate: null,
      daysUntilExpiry: null,
      status: 'invalid',
      displayText: 'Invalid month name',
    };
  }

  const startDate = new Date(parseInt(year), monthNum, 1);
  const endDate = getLastDayOfMonth(parseInt(year), monthNum);

  return calculateStatus(startDate, endDate);
}

/**
 * Calculate status based on start and end dates
 */
function calculateStatus(startDate: Date, endDate: Date): DateValidationResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate comparison

  const daysUntilExpiry = Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let status: 'current' | 'expiring-soon' | 'expired' | 'invalid';
  let displayText: string;

  if (daysUntilExpiry < 0) {
    status = 'expired';
    const daysExpired = Math.abs(daysUntilExpiry);
    displayText = `Expired ${daysExpired} day${daysExpired === 1 ? '' : 's'} ago`;
  } else if (daysUntilExpiry <= 3) {
    status = 'expiring-soon';
    displayText = `Expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}`;
  } else {
    status = 'current';
    const monthsRemaining = Math.floor(daysUntilExpiry / 30);
    displayText = `Valid until ${formatDate(endDate)} (${monthsRemaining} month${monthsRemaining === 1 ? '' : 's'} remaining)`;
  }

  return {
    isValid: true,
    startDate,
    endDate,
    daysUntilExpiry,
    status,
    displayText,
  };
}

/**
 * Get month number (0-11) from month name
 */
function getMonthNumber(monthName: string): number {
  const months: { [key: string]: number } = {
    'JANUARY': 0, 'JAN': 0,
    'FEBRUARY': 1, 'FEB': 1,
    'MARCH': 2, 'MAR': 2,
    'APRIL': 3, 'APR': 3,
    'MAY': 4,
    'JUNE': 5, 'JUN': 5,
    'JULY': 6, 'JUL': 6,
    'AUGUST': 7, 'AUG': 7,
    'SEPTEMBER': 8, 'SEP': 8, 'SEPT': 8,
    'OCTOBER': 9, 'OCT': 9,
    'NOVEMBER': 10, 'NOV': 10,
    'DECEMBER': 11, 'DEC': 11,
  };

  return months[monthName.toUpperCase()] ?? -1;
}

/**
 * Get last day of month
 */
function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0); // Day 0 of next month = last day of current month
}

/**
 * Format date as "MMM DD, YYYY"
 */
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Helper function to check if report is current (not expired)
 */
export function isReportCurrent(validPeriod: string): boolean {
  const result = validateReportDate(validPeriod);
  return result.isValid && result.status !== 'expired';
}

/**
 * Helper function to get user-friendly status message
 */
export function getReportStatusMessage(validPeriod: string): string {
  const result = validateReportDate(validPeriod);
  return result.displayText;
}
