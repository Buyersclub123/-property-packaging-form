import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Upload PDF to Hotspotting folder
 * 
 * POST /api/investment-highlights/upload-pdf
 * Body: FormData with 'file' (PDF file), 'suburb', 'state'
 */

export async function POST(request: NextRequest) {
  try {
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File; // Changed from 'pdf' to 'file' to match old code
    const suburb = formData.get('suburb') as string;
    const state = formData.get('state') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided. Please select a PDF file to upload.' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF. Please select a valid PDF file.' },
        { status: 400 }
      );
    }

    // Check file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 50MB limit. Please select a smaller file.' },
        { status: 400 }
      );
    }

    // Initialize Google Drive API (using same credentials as organize-pdf)
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      console.error('❌ GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_SHEETS_CREDENTIALS');
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Get Hotspotting folder ID (using same env var as organize-pdf)
    const HOTSPOTTING_FOLDER_ID = process.env.GOOGLE_HOTSPOTTING_FOLDER_ID || '1RjWQxIAgn89aTL5diT3BmiY_uwlgoG1-';
    
    if (!HOTSPOTTING_FOLDER_ID) {
      console.error('❌ GOOGLE_HOTSPOTTING_FOLDER_ID environment variable is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Convert File to Buffer, then to Stream (Google Drive API needs a stream)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    // Generate filename with suburb/state prefix
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const originalName = file.name.replace(/\.pdf$/i, '');
    const fileName = `${suburb}-${state}-${originalName}-${timestamp}.pdf`;

    // Upload to Hotspotting folder
    const uploadResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [HOTSPOTTING_FOLDER_ID],
        mimeType: 'application/pdf',
      },
      media: {
        mimeType: 'application/pdf',
        body: stream, // Use stream instead of buffer
      },
      supportsAllDrives: true,
      fields: 'id, name, webViewLink',
    });

    const fileId = uploadResponse.data.id;
    const webViewLink = uploadResponse.data.webViewLink;

    console.log(`✅ PDF uploaded to Hotspotting folder: ${fileName} (${fileId})`);

    return NextResponse.json({
      success: true,
      fileId,
      fileName,
      webViewLink,
      message: 'PDF uploaded successfully to Hotspotting folder',
    });

  } catch (error: any) {
    console.error('❌ PDF upload error:', error);
    
    // Provide user-friendly error messages
    let userMessage = 'Failed to upload PDF. Please try again.';
    
    if (error.message?.includes('credentials')) {
      userMessage = 'Google Drive authentication error. Please contact support.';
    } else if (error.message?.includes('permission')) {
      userMessage = 'Permission denied. Unable to upload to Google Drive.';
    } else if (error.message?.includes('quota')) {
      userMessage = 'Google Drive storage quota exceeded. Please contact support.';
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: userMessage,
        details: error.message || error.toString(),
      },
      { status: 500 }
    );
  }
}
