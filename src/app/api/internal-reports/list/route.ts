import { NextResponse } from 'next/server';
import { listFilesInFolder } from '@/lib/googleDrive';

/**
 * API route to list internal AMAP reports from the Google Drive folder.
 * Returns file name, id, and webViewLink for each PDF in the folder.
 */
export async function GET() {
  try {
    const FOLDER_ID = process.env.GOOGLE_DRIVE_INTERNAL_REPORTS_FOLDER_ID;
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_INTERNAL_REPORTS_DRIVE_ID || '';

    if (!FOLDER_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_DRIVE_INTERNAL_REPORTS_FOLDER_ID is not configured' },
        { status: 500 }
      );
    }

    const files = await listFilesInFolder(FOLDER_ID, SHARED_DRIVE_ID);

    // Filter to only PDFs and sort alphabetically by name
    const reports = files
      .filter(f => f.mimeType === 'application/pdf')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(f => ({
        id: f.id,
        name: f.name,
      }));

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error('Error listing internal reports:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to list internal reports' },
      { status: 500 }
    );
  }
}
