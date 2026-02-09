import { NextResponse } from 'next/server';
import { 
  findGoogleSheetsInFolder,
  populateHLSpreadsheet
} from '@/lib/googleDrive';
import { serverLog } from '@/lib/serverLogger';

/**
 * Extract file/folder ID from Google Drive URL
 * Supports formats:
 * - https://drive.google.com/drive/folders/FOLDER_ID
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 */
function getFileIdFromUrl(url: string): string | null {
  if (!url) return null;
  
  // Extract from /folders/ID or /file/d/ID
  const foldersMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch) return foldersMatch[1];
  
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  
  // Extract from ?id=ID
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  
  return null;
}

/**
 * API route to update an existing property spreadsheet with current form data
 * Called when "Update Spreadsheet" is clicked in Step 7 (edit mode)
 */
export async function POST(request: Request) {
  try {
    const { folderLink, formData } = await request.json();
    
    if (!folderLink) {
      return NextResponse.json(
        { success: false, error: 'Folder link is required' },
        { status: 400 }
      );
    }

    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
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

    serverLog('[update-property-spreadsheet] Starting spreadsheet update...');
    serverLog('[update-property-spreadsheet] Folder link:', folderLink);

    // Extract folder ID from folder link
    const folderId = getFileIdFromUrl(folderLink);
    
    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'Invalid folder link. Could not extract folder ID.' },
        { status: 400 }
      );
    }

    serverLog('[update-property-spreadsheet] Folder ID:', folderId);

    // Find all Google Sheets in the folder
    const sheets = await findGoogleSheetsInFolder(folderId, SHARED_DRIVE_ID);
    serverLog(`[update-property-spreadsheet] Found ${sheets.length} Google Sheets in folder:`, sheets.map(s => s.name));

    if (sheets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Google Sheets found in folder' },
        { status: 404 }
      );
    }

    // Get contract type from form data
    const contractType = formData?.decisionTree?.contractTypeSimplified || '';
    
    // Find the correct sheet based on contract type
    const splitContractSheet = sheets.find(s => 
      s.name.toLowerCase().includes('split contract')
    );
    const singleContractSheet = sheets.find(s => 
      s.name.toLowerCase().includes('single contract')
    );

    serverLog('[update-property-spreadsheet] Contract Type:', contractType);
    serverLog('[update-property-spreadsheet] Split contract sheet found:', splitContractSheet ? splitContractSheet.name : 'NOT FOUND');
    serverLog('[update-property-spreadsheet] Single contract sheet found:', singleContractSheet ? singleContractSheet.name : 'NOT FOUND');

    // Determine which sheet to update
    let sheetToUpdate = null;
    const contractTypeLower = contractType.toLowerCase().trim();
    
    if (contractTypeLower === 'split contract' && splitContractSheet) {
      sheetToUpdate = splitContractSheet;
    } else if (contractTypeLower === 'single contract' && singleContractSheet) {
      sheetToUpdate = singleContractSheet;
    } else {
      // Fallback: use first sheet found
      sheetToUpdate = sheets[0];
      serverLog('[update-property-spreadsheet] Using fallback: first sheet found');
    }

    if (!sheetToUpdate) {
      return NextResponse.json(
        { success: false, error: 'Could not find appropriate spreadsheet to update' },
        { status: 404 }
      );
    }

    serverLog('[update-property-spreadsheet] Updating sheet:', sheetToUpdate.name);
    serverLog('[update-property-spreadsheet] Sheet ID:', sheetToUpdate.id);

    // Populate the sheet with updated form data
    try {
      await populateHLSpreadsheet(sheetToUpdate.id, formData);
      serverLog('[update-property-spreadsheet] ✓ Successfully updated spreadsheet with form data');
    } catch (populateError) {
      serverLog('[update-property-spreadsheet] Error populating sheet:', populateError);
      throw populateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Spreadsheet updated successfully',
      sheetName: sheetToUpdate.name,
    });

  } catch (error) {
    serverLog('[update-property-spreadsheet] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update spreadsheet';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}
