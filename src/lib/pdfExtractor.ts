// PDF text extraction and metadata parsing utilities
import pdf from 'pdf-parse';

export interface ExtractedMetadata {
  reportName: string;
  validPeriod: string;
  confidence: 'high' | 'low';
}

/**
 * Extract text from PDF buffer
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract metadata from PDF front page text
 * Uses agile parsing to handle various formats
 */
export function extractMetadataFromText(text: string): ExtractedMetadata {
  // Get first 30 lines for front page analysis
  const lines = text.split('\n').slice(0, 30);
  const firstPageText = lines.join('\n');
  
  const reportName = extractReportName(lines);
  const validPeriod = extractValidPeriod(firstPageText);
  
  const confidence = (reportName && validPeriod) ? 'high' : 'low';
  
  return {
    reportName,
    validPeriod,
    confidence,
  };
}

/**
 * Extract Report Name from front page
 * Looks for large text patterns (usually all-caps or title case)
 */
function extractReportName(lines: string[]): string {
  // Common headers to exclude
  const excludePatterns = [
    'LOCATION REPORT',
    'HOTSPOTTING',
    'BY RYDER',
    'REPORT',
    'LOCATION',
    'INVESTMENT',
    'ANALYSIS',
    'PROPERTY',
  ];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines or very short text
    if (trimmed.length < 3 || trimmed.length > 60) continue;
    
    // Check if mostly uppercase (potential report name)
    const uppercaseRatio = (trimmed.match(/[A-Z]/g) || []).length / trimmed.length;
    
    if (uppercaseRatio > 0.6) {
      // Check if it's not a common header
      const isExcluded = excludePatterns.some(pattern => 
        trimmed.toUpperCase().includes(pattern)
      );
      
      if (!isExcluded) {
        // Clean up the report name
        let cleaned = trimmed.toUpperCase().trim();
        
        // Remove common prefixes/suffixes
        cleaned = cleaned.replace(/^(THE\s+|A\s+)/i, '');
        cleaned = cleaned.replace(/(\s+REPORT|\s+AREA|\s+REGION)$/i, '');
        
        return cleaned;
      }
    }
    
    // Also check for title case patterns (e.g., "Sunshine Coast")
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(trimmed)) {
      const isExcluded = excludePatterns.some(pattern => 
        trimmed.toUpperCase().includes(pattern)
      );
      
      if (!isExcluded && trimmed.length > 5) {
        return trimmed.toUpperCase();
      }
    }
  }
  
  return '';
}

/**
 * Extract Valid Period from front page
 * Handles multiple date range formats
 */
function extractValidPeriod(text: string): string {
  // Pattern 1: October 2025 - January 2026
  const pattern1 = /([A-Z][a-z]+\s+\d{4})\s*[-–—]\s*([A-Z][a-z]+\s+\d{4})/i;
  const match1 = text.match(pattern1);
  if (match1) {
    return match1[0];
  }
  
  // Pattern 2: Oct 2025 - Jan 2026
  const pattern2 = /([A-Z][a-z]{2}\s+\d{4})\s*[-–—]\s*([A-Z][a-z]{2}\s+\d{4})/i;
  const match2 = text.match(pattern2);
  if (match2) {
    // Expand abbreviated months
    return expandMonthAbbreviations(match2[0]);
  }
  
  // Pattern 3: 10/2025 - 01/2026
  const pattern3 = /(\d{2}\/\d{4})\s*[-–—]\s*(\d{2}\/\d{4})/;
  const match3 = text.match(pattern3);
  if (match3) {
    // Convert to Month YYYY format
    return convertNumericToMonthYear(match3[0]);
  }
  
  // Pattern 4: Q1 2025, Q2 2025, etc.
  const pattern4 = /(Q[1-4]\s+\d{4})/i;
  const match4 = text.match(pattern4);
  if (match4) {
    return match4[0];
  }
  
  return '';
}

/**
 * Expand month abbreviations to full names
 */
function expandMonthAbbreviations(dateRange: string): string {
  const monthMap: { [key: string]: string } = {
    'Jan': 'January',
    'Feb': 'February',
    'Mar': 'March',
    'Apr': 'April',
    'May': 'May',
    'Jun': 'June',
    'Jul': 'July',
    'Aug': 'August',
    'Sep': 'September',
    'Oct': 'October',
    'Nov': 'November',
    'Dec': 'December',
  };
  
  let expanded = dateRange;
  Object.entries(monthMap).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    expanded = expanded.replace(regex, full);
  });
  
  return expanded;
}

/**
 * Convert numeric date format to Month YYYY format
 */
function convertNumericToMonthYear(dateRange: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Extract dates: MM/YYYY - MM/YYYY
  const parts = dateRange.split(/\s*[-–—]\s*/);
  
  const convertDate = (dateStr: string): string => {
    const [month, year] = dateStr.split('/');
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${year}`;
    }
    return dateStr;
  };
  
  if (parts.length === 2) {
    return `${convertDate(parts[0])} - ${convertDate(parts[1])}`;
  }
  
  return dateRange;
}
