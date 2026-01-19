import { NextResponse } from 'next/server';
import { copyFolderStructure, findGoogleSheetsInFolder, populateSpreadsheet } from '@/lib/googleDrive';

/**
 * Test API route to copy a folder and populate Google Sheets in it
 * Used by the standalone test page
 */
export async function POST(request: Request) {
  console.error('=== TEST POPULATE SHEETS ROUTE CALLED ===');
  console.error('Time:', new Date().toISOString());
  try {
    const { sourceFolderId, destinationParentFolderId, newFolderName, formData } = await request.json();
    console.error('Request body parsed successfully');
    
    if (!sourceFolderId || !destinationParentFolderId || !newFolderName) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get Shared Drive ID from environment variable
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';
    
    if (!SHARED_DRIVE_ID) {
      return NextResponse.json(
        { success: false, error: 'GOOGLE_DRIVE_SHARED_DRIVE_ID environment variable is missing' },
        { status: 500 }
      );
    }

    // Step 1: Copy the folder (EXACT same call as working endpoint)
    console.error('About to call copyFolderStructure...');
    const newFolder = await copyFolderStructure(
      sourceFolderId,
      destinationParentFolderId,
      newFolderName,
      SHARED_DRIVE_ID
    );
    console.error('copyFolderStructure completed successfully');
    
    console.log('Created property folder:', newFolder.id);

    // Step 2: Find all Google Sheets in the new folder
    const sheets = await findGoogleSheetsInFolder(newFolder.id, SHARED_DRIVE_ID);
    console.log(`Found ${sheets.length} Google Sheets in new folder`);
    
    if (sheets.length === 0) {
      return NextResponse.json({
        success: true,
        newFolderName: newFolder.name,
        folderLink: newFolder.webViewLink,
        folderId: newFolder.id,
        sheetsFound: 0,
        results: [],
        message: 'No Google Sheets found in folder',
      });
    }

    const results = [];
    
    // Populate ALL sheets found
    for (const sheet of sheets) {
      try {
        console.log(`Populating sheet: ${sheet.name} (${sheet.id})`);
        await populateSpreadsheet(sheet.id, formData, SHARED_DRIVE_ID);
        results.push({ 
          sheetName: sheet.name, 
          sheetId: sheet.id,
          success: true,
          message: 'Sheet populated successfully',
        });
        console.log(`✓ Successfully populated: ${sheet.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`✗ Error populating ${sheet.name}:`, errorMessage);
        results.push({ 
          sheetName: sheet.name,
          sheetId: sheet.id,
          success: false, 
          error: errorMessage,
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: failCount === 0,
      newFolderName: newFolder.name,
      folderLink: newFolder.webViewLink,
      folderId: newFolder.id,
      sheetsFound: sheets.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('=== ERROR CAUGHT IN ROUTE ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    
    // Get debug info from global if available
    const debugInfo = (global as any).__lastDriveClientDebug || [];
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to populate sheets',
        debugInfo: debugInfo.length > 0 ? debugInfo : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}
