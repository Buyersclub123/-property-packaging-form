// NOTE: This API route is not currently used in the frontend.
// Auto-delete functionality was removed - users now manually delete PDFs from Google Drive.
// Keeping this route for potential future use if needed.

import { NextResponse } from 'next/server';
import { google } from 'googleapis';

function getDriveClient() {
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

export async function POST(request: Request) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';
    const drive = getDriveClient();

    const deleteOptions: any = {
      fileId: fileId,
      supportsAllDrives: true,
    };

    if (SHARED_DRIVE_ID) {
      deleteOptions.driveId = SHARED_DRIVE_ID;
    }

    await drive.files.delete(deleteOptions);

    return NextResponse.json({
      success: true,
      message: 'PDF deleted successfully',
    });
  } catch (error) {
    console.error('PDF deletion error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete PDF',
      },
      { status: 500 }
    );
  }
}
