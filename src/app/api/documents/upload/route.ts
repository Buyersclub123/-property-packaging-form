/**
 * AI_GENERATED_TAG: DOCUMENT_UPLOAD_ROUTE
 * Last Modified: 2026-02-03
 * 
 * This route handles uploading documents (PDFs, etc.) to Google Drive.
 * 
 * CURRENT BEHAVIOR:
 * - Uses client-provided fileName from FormData
 * - Checks for duplicates and adds timestamp if duplicate found
 * - Timestamp only added AFTER duplicate is detected (race condition possible)
 * 
 * KNOWN ISSUE:
 * - If multiple documents are uploaded simultaneously with same name, they may overwrite each other
 *   because duplicate check happens before upload completes
 * 
 * FUTURE AI SESSIONS: If modifying this file, consider adding timestamp to ALL uploads
 * (not just duplicates) to prevent race conditions with simultaneous uploads.
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const propertyAddress = formData.get('propertyAddress') as string;
    const folderId = formData.get('folderId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!fileName || !fileName.trim()) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    if (!propertyAddress || !propertyAddress.trim()) {
      return NextResponse.json(
        { error: 'Property address is required' },
        { status: 400 }
      );
    }

    if (!folderId || !folderId.trim()) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Google Drive
    const drive = getDriveClient();
    const sanitizedFileName = sanitizeFileName(fileName);

    // AI_GENERATED_TAG: DUPLICATE_CHECK_WITH_RACE_CONDITION
    // Check if file with same name already exists
    // WARNING: This has a race condition - if two uploads happen simultaneously,
    // both may pass this check before either completes, causing one to overwrite the other
    // TODO: Consider adding timestamp to ALL uploads, not just detected duplicates
    let finalFileName = sanitizedFileName;
    try {
      // Escape single quotes in filename for query
      const escapedFileName = sanitizedFileName.replace(/'/g, "\\'");
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
        const nameWithoutExt = sanitizedFileName.replace(/\.[^.]+$/, '');
        const ext = sanitizedFileName.match(/\.[^.]+$/)?.[0] || '';
        finalFileName = `${nameWithoutExt}-${timestamp}${ext}`;
      }
    } catch (error) {
      // If duplicate check fails, just use original filename and continue
      console.warn('Failed to check for duplicate files, using original filename:', error);
    }

    const fileMetadata = {
      name: finalFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: file.type || 'application/octet-stream',
      body: Readable.from(buffer),
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
      fileId: uploadResponse.data.id,
      fileName: uploadResponse.data.name,
      folderLink: `https://drive.google.com/drive/folders/${folderId}`,
      fileLink: uploadResponse.data.webViewLink,
      wasRenamed: finalFileName !== sanitizedFileName, // Indicate if filename was changed due to duplicate
      originalFileName: sanitizedFileName,
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to upload document',
      },
      { status: 500 }
    );
  }
}
