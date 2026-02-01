import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Force Node.js runtime (not Edge)
export const runtime = 'nodejs';

/**
 * Extract metadata (Report Name and Valid Period) from PDF front page
 * Uses dynamic imports to avoid Next.js static analysis dropping this route
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;
    
    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }
    
    // Initialize Google Drive API
    let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
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
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Download PDF from Google Drive
    const response = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    );
    
    if (!response.data) {
      throw new Error('Failed to download PDF from Google Drive');
    }
    
    // Dynamically import PDF extractor to avoid static analysis issues
    const { extractPdfText, extractMetadataFromText } = await import('@/lib/pdfExtractor');
    
    // Extract text from PDF
    const buffer = Buffer.from(response.data as ArrayBuffer);
    const text = await extractPdfText(buffer);
    
    // Extract metadata using agile parsing
    const metadata = extractMetadataFromText(text);
    
    console.log(`✅ Returning metadata with mainBody (${metadata.mainBody?.length || 0} chars)`);
    console.log(`✅ Confidence levels:`, metadata.confidence);
    
    return NextResponse.json({
      reportName: metadata.reportName,
      validPeriod: metadata.validPeriod,
      mainBody: metadata.mainBody,
      confidence: metadata.confidence,
    });
  } catch (error: any) {
    console.error('Metadata extraction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to extract metadata' },
      { status: 500 }
    );
  }
}
