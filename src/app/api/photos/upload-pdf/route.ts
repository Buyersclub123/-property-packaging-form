/**
 * AI_GENERATED_TAG: PHOTO_PDF_UPLOAD_ROUTE
 * Last Modified: 2026-02-03
 * 
 * This route handles uploading photo PDFs to Google Drive.
 * 
 * CURRENT BEHAVIOR:
 * - Generates filename from propertyAddress: "Photos {address}.pdf"
 * - Checks for duplicates and adds timestamp if duplicate found
 * - Does NOT use client-provided filename (client may send fileName in FormData but it's ignored)
 * 
 * KNOWN ISSUE:
 * - If multiple PDFs are uploaded simultaneously with same address, they may overwrite each other
 *   because duplicate check happens before upload completes
 * 
 * FUTURE AI SESSIONS: If modifying this file, ensure you understand the duplicate checking logic
 * and consider race conditions with simultaneous uploads.
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Configure route to allow larger body sizes (up to 50MB to match other uploads)
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for large uploads

// Helper function to initialize Google Drive client (reuse from generate-pdf route)
function getDriveClient() {
  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }

  // Remove single quotes if present at start/end (from .env file)
  let cleanedJson = credentialsJson.trim();
  if (cleanedJson.startsWith("'") && cleanedJson.endsWith("'")) {
    cleanedJson = cleanedJson.slice(1, -1);
  }
  if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
    cleanedJson = cleanedJson.slice(1, -1);
  }

  // Parse JSON - handle multi-line format
  let credentials;
  try {
    credentials = JSON.parse(cleanedJson);
  } catch (error) {
    // If parsing fails, try to clean up newlines and parse again
    try {
      const cleanedJson2 = cleanedJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson2);
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
    }
  }

  // Fix private key newlines
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

function sanitizeFileName(name: string): string {
  // Remove invalid characters for file names
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  console.log('[API] /api/photos/upload-pdf - Request received');
  try {
    // Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const propertyAddress = formData.get('propertyAddress') as string;
    const folderId = formData.get('folderId') as string;
    
    console.log('[API] /api/photos/upload-pdf - FormData parsed', {
      hasFile: !!file,
      fileSize: file?.size,
      fileType: file?.type,
      fileName: file?.name?.substring(0, 50),
      propertyAddress: propertyAddress?.substring(0, 50),
      folderId: folderId?.substring(0, 20)
    });

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    if (!propertyAddress || !propertyAddress.trim()) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    if (!folderId || !folderId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Check file size - Vercel has a 4.5MB body limit for serverless functions
    // However, we've seen document uploads work with 5.8MB files, so this may be a soft limit
    // We'll let Vercel enforce the actual limit and handle errors gracefully
    // If file is too large, Vercel will return a 413 error which we'll catch
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB theoretical max (matching other upload routes)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: 'PDF file exceeds 50MB limit' },
        { status: 413 }
      );
    }
    
    // Note: Files between 4.5MB and 50MB may fail at Vercel level with 413 error
    // The client-side split logic should handle this by splitting large PDFs before upload

    // Initialize Google Drive client
    const drive = getDriveClient();
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';

    // AI_GENERATED_TAG: FILENAME_GENERATION
    // Use client-provided filename from FormData (includes PDF number for split PDFs)
    // Fall back to generating from propertyAddress if filename not provided
    let fileName: string;
    if (file.name && file.name.trim()) {
      // Client provided filename (e.g., "Photos {address} 1.pdf" or "Photos {address}.pdf")
      fileName = sanitizeFileName(file.name);
    } else {
      // Fallback: generate from property address
      const sanitizedAddress = sanitizeFileName(propertyAddress);
      fileName = `Photos ${sanitizedAddress}.pdf`;
    }

    // AI_GENERATED_TAG: DUPLICATE_CHECK
    // Check for duplicates (reuse logic from generate-pdf route)
    // NOTE: For split PDFs with numbers (#1, #2, etc.), duplicate check should rarely trigger
    // since filenames are already unique. This check is mainly for single PDFs.
    let finalFileName = fileName;
    try {
      // Escape single quotes in filename for query
      const escapedFileName = fileName.replace(/'/g, "\\'");
      const listOptions: any = {
        q: `name='${escapedFileName}' and parents in '${folderId}' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };

      // If shared drive ID is provided, must also set corpora
      if (SHARED_DRIVE_ID) {
        listOptions.driveId = SHARED_DRIVE_ID;
        listOptions.corpora = 'drive';
      }

      const existingFiles = await drive.files.list(listOptions);

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        // File exists - append timestamp to make it unique
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
        finalFileName = `${nameWithoutExt}-${timestamp}.pdf`;
      }
    } catch (error) {
      // If duplicate check fails, just use original filename and continue
      console.warn('Failed to check for duplicate files, using original filename:', error);
    }

    // Convert File to stream for upload
    const fileBuffer = await file.arrayBuffer();
    const fileStream = Readable.from(Buffer.from(fileBuffer));

    // Upload to Google Drive
    const fileMetadata = {
      name: finalFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: fileStream,
    };

    const uploadOptions: any = {
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    };

    if (SHARED_DRIVE_ID) {
      uploadOptions.driveId = SHARED_DRIVE_ID;
    }

    const uploadResponse = await drive.files.create(uploadOptions);

    // Note: File permissions are inherited from parent folder
    // No explicit permission setting needed - files inherit "Anyone with the link" = Viewer from folder

    return NextResponse.json({
      success: true,
      fileName: finalFileName,
      fileId: uploadResponse.data.id,
      wasRenamed: finalFileName !== fileName,
      originalFileName: fileName,
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      // Google Drive API errors
      if (error.message.includes('credentials') || error.message.includes('authentication')) {
        return NextResponse.json(
          { success: false, error: 'Google Drive authentication failed. Please contact support.' },
          { status: 401 }
        );
      }

      // File size errors
      if (error.message.includes('size') || error.message.includes('413')) {
        return NextResponse.json(
          { success: false, error: 'File is too large. Maximum size is 4.5MB.' },
          { status: 413 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload PDF to Google Drive',
      },
      { status: 500 }
    );
  }
}
