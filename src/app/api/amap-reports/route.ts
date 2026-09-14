import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

function getDriveClient() {
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;

  if (!credentialsJson) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-sheets-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      }
    } catch {
      // ignore
    }
  }

  if (!credentialsJson) {
    throw new Error('Google credentials not found');
  }

  const credentials = JSON.parse(credentialsJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * List AMAP report PDFs from Google Drive with names and modified dates.
 */
export async function GET() {
  try {
    const folderId = process.env.GOOGLE_DRIVE_INTERNAL_REPORTS_FOLDER_ID;
    const driveId = process.env.GOOGLE_DRIVE_INTERNAL_REPORTS_DRIVE_ID || '';

    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_DRIVE_INTERNAL_REPORTS_FOLDER_ID is not configured' },
        { status: 500 }
      );
    }

    const drive = getDriveClient();

    const listOptions: Record<string, unknown> = {
      q: `'${folderId}' in parents and trashed=false and mimeType='application/pdf'`,
      fields: 'files(id, name, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      pageSize: 100,
      supportsAllDrives: true,
    };

    if (driveId) {
      listOptions.includeItemsFromAllDrives = true;
      listOptions.driveId = driveId;
      listOptions.corpora = 'drive';
    }

    const response = await drive.files.list(listOptions);

    const reports = (response.data.files || []).map((file) => ({
      id: file.id || '',
      name: file.name || '',
      modifiedTime: file.modifiedTime || '',
      size: file.size ? parseInt(file.size, 10) : 0,
      viewUrl: `https://drive.google.com/file/d/${file.id}/view`,
    }));

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('Error listing AMAP reports:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list AMAP reports' },
      { status: 500 }
    );
  }
}
