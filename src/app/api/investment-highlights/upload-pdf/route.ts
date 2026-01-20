import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Upload PDF to Google Drive (temporary location)
 * Returns file ID for metadata extraction
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }
    
    // Initialize Google Drive API
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Failed to parse GOOGLE_SHEETS_CREDENTIALS');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Get parent folder ID from environment
    const parentFolderId = process.env.GOOGLE_PARENT_FOLDER_ID;
    if (!parentFolderId) {
      throw new Error('GOOGLE_PARENT_FOLDER_ID environment variable is not set');
    }
    
    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const bufferStream = Readable.from(Buffer.from(buffer));
    
    // Upload to Google Drive (temporary location)
    const fileMetadata = {
      name: file.name,
      parents: [parentFolderId],
      mimeType: 'application/pdf',
    };
    
    const media = {
      mimeType: 'application/pdf',
      body: bufferStream,
    };
    
    const uploadedFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    });
    
    if (!uploadedFile.data.id) {
      throw new Error('Failed to get file ID from upload response');
    }
    
    // Make file accessible (anyone with link can view)
    await drive.permissions.create({
      fileId: uploadedFile.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
    
    return NextResponse.json({
      fileId: uploadedFile.data.id,
      fileName: uploadedFile.data.name,
      webViewLink: uploadedFile.data.webViewLink,
    });
  } catch (error: any) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload PDF' },
      { status: 500 }
    );
  }
}
