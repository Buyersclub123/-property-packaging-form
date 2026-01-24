/**
 * Extract text from a PDF buffer (server-side)
 * Uses unpdf library which works reliably in Next.js 14 App Router
 * 
 * @param buffer - The PDF file buffer
 * @returns Promise<string> - The extracted text
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for Next.js compatibility
    const { getDocumentProxy, extractText } = await import('unpdf');
    
    // Convert Node.js Buffer to Uint8Array
    const uint8 = new Uint8Array(buffer);
    
    // Load PDF document
    const pdf = await getDocumentProxy(uint8 as any);
    
    // Extract text from the entire document
    const { totalPages, text } = await extractText(pdf, {
      mergePages: true,
    });
    
    console.log(`✅ Extracted text from PDF (${totalPages} pages, ${text.length} chars)`);
    
    // Return full text for AI processing
    return text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract metadata (Report Name and Valid Period) from PDF text
 * 
 * @param text - The extracted PDF text
 * @returns Object with reportName, validPeriod, mainBody, and confidence levels
 */
export function extractMetadataFromText(text: string): { 
  reportName: string; 
  validPeriod: string; 
  mainBody: string;
  confidence: {
    reportName: 'high' | 'low';
    validPeriod: 'high' | 'low';
    mainBody: 'high' | 'low';
  };
} {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // Extract SHORT report name (e.g., "Fraser Coast", "Sunshine Coast")
  // Note: User will verify this, so extraction doesn't need to be perfect
  let reportName = '';
  const regionPattern = /([\w\s]+(?:Coast|Region|Valley|Highlands|Rivers|City))/i;
  
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    const match = line.match(regionPattern);
    if (match) {
      reportName = match[1].trim();
      break;
    }
  }
  
  // Fallback: Use first reasonable line
  if (!reportName) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 10 && line.length < 50 && !line.toLowerCase().includes('hotspotting')) {
        reportName = line;
        break;
      }
    }
  }
  
  // Look for date pattern (e.g., "October 2025 - January 2026", "Jan 2025 - Apr 2026", "January - April 2026")
  const datePatterns = [
    /([A-Za-z]+\s+\d{4})\s*[-–—]\s*([A-Za-z]+\s+\d{4})/,  // "October 2025 - January 2026"
    /([A-Za-z]+)\s*[-–—]\s*([A-Za-z]+\s+\d{4})/,          // "January - April 2026"
  ];
  
  let validPeriod = '';
  for (const pattern of datePatterns) {
    const dateMatch = text.match(pattern);
    if (dateMatch) {
      validPeriod = dateMatch[0];
      break;
    }
  }
  
  // Main body is the FULL extracted text
  const mainBody = text;
  
  // IMPORTANT: Keep extracted values even if uncertain - user will verify
  return {
    reportName: reportName || '', // Empty string, not error message
    validPeriod: validPeriod || '', // Empty string, not error message
    mainBody: mainBody || '', // Keep whatever we extracted
    confidence: {
      reportName: reportName ? 'high' : 'low',
      validPeriod: validPeriod ? 'high' : 'low',
      mainBody: mainBody && mainBody.length > 100 ? 'high' : 'low',
    },
  };
}
