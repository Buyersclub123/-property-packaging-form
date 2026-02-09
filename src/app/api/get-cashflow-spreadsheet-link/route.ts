import { NextResponse } from 'next/server';
import { findGoogleSheetsInFolder } from '@/lib/googleDrive';
import { serverLog } from '@/lib/serverLogger';

/**
 * Extract file/folder ID from Google Drive URL
 */
function getFileIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  const foldersMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch) return foldersMatch[1];
  
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  
  return null;
}

/**
 * API route to get the cashflow spreadsheet link from a folder
 * Returns the Google Sheets URL for editing
 */
export async function POST(request: Request) {
  try {
    const { folderLink, contractType } = await request.json();
    
    if (!folderLink) {
      return NextResponse.json(
        { success: false, error: 'Folder link is required' },
        { status: 400 }
      );
    }

    // Shared Drive ID (Packaging Shared Drive)
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';
    
    if (!SHARED_DRIVE_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Google Drive configuration is missing. Required environment variable: GOOGLE_DRIVE_SHARED_DRIVE_ID' 
        },
        { status: 500 }
      );
    }

    serverLog('[get-cashflow-spreadsheet-link] Getting spreadsheet link...');
    serverLog('[get-cashflow-spreadsheet-link] Folder link:', folderLink);

    // Extract folder ID from folder link
    const folderId = getFileIdFromUrl(folderLink);
    
    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'Invalid folder link. Could not extract folder ID.' },
        { status: 400 }
      );
    }

    serverLog('[get-cashflow-spreadsheet-link] Folder ID:', folderId);

    // Find all Google Sheets in the folder
    const sheets = await findGoogleSheetsInFolder(folderId, SHARED_DRIVE_ID);
    serverLog(`[get-cashflow-spreadsheet-link] Found ${sheets.length} Google Sheets in folder:`, sheets.map(s => s.name));

    if (sheets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Google Sheets found in folder' },
        { status: 404 }
      );
    }

    // Find the correct sheet based on contract type (if provided)
    let sheetToOpen = null;
    
    if (contractType) {
      const contractTypeLower = contractType.toLowerCase().trim();
      const splitContractSheet = sheets.find(s => 
        s.name.toLowerCase().includes('split contract')
      );
      const singleContractSheet = sheets.find(s => 
        s.name.toLowerCase().includes('single contract')
      );
      
      if (contractTypeLower === 'split contract' && splitContractSheet) {
        sheetToOpen = splitContractSheet;
      } else if (contractTypeLower === 'single contract' && singleContractSheet) {
        sheetToOpen = singleContractSheet;
      }
    }
    
    // Fallback: use first sheet found (since there should only be one)
    if (!sheetToOpen) {
      sheetToOpen = sheets[0];
      serverLog('[get-cashflow-spreadsheet-link] Using first sheet found:', sheetToOpen.name);
    }

    // Generate Google Sheets edit URL
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${sheetToOpen.id}/edit`;

    serverLog('[get-cashflow-spreadsheet-link] Spreadsheet URL:', spreadsheetUrl);

    return NextResponse.json({
      success: true,
      spreadsheetUrl,
      sheetName: sheetToOpen.name,
      sheetId: sheetToOpen.id,
    });

  } catch (error) {
    serverLog('[get-cashflow-spreadsheet-link] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get spreadsheet link';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
