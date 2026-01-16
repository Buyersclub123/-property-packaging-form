import { NextResponse } from 'next/server';
import { copyFolderStructure, findGoogleSheetsInFolder, populateSpreadsheet } from '@/lib/googleDrive';

const SHARED_DRIVE_ID = '0AFVxBPJiTmjPUk9PVA';

/**
 * Test API route to copy a folder and populate Google Sheets in it
 * Used by the standalone test page
 */
export async function POST(request: Request) {
  console.log('\n\n=== API ROUTE HIT: test-populate-sheets ===');
  console.log('Time:', new Date().toISOString());
  
  try {
    const body = await request.json();
    console.log('Request body received:', {
      hasSourceFolderId: !!body.sourceFolderId,
      hasDestinationParentFolderId: !!body.destinationParentFolderId,
      hasNewFolderName: !!body.newFolderName,
      hasFormData: !!body.formData,
    });
    
    const { sourceFolderId, destinationParentFolderId, newFolderName, formData } = body;
    
    if (!sourceFolderId) {
      console.error('ERROR: Source folder ID is missing');
      return NextResponse.json(
        { success: false, error: 'Source folder ID is required' },
        { status: 400 }
      );
    }

    if (!destinationParentFolderId) {
      console.error('ERROR: Destination parent folder ID is missing');
      return NextResponse.json(
        { success: false, error: 'Destination parent folder ID is required' },
        { status: 400 }
      );
    }

    if (!newFolderName) {
      console.error('ERROR: New folder name is missing');
      return NextResponse.json(
        { success: false, error: 'New folder name is required' },
        { status: 400 }
      );
    }

    if (!formData) {
      console.error('ERROR: Form data is missing');
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    console.log('=== TEST COPY FOLDER & POPULATE SHEETS ===');
    console.log('Source Folder ID:', sourceFolderId);
    console.log('Destination Parent Folder ID:', destinationParentFolderId);
    console.log('New Folder Name:', newFolderName);
    console.log('Form data keys:', Object.keys(formData));

    // Step 1: Copy the folder
    console.log('Copying folder...');
    const newFolder = await copyFolderStructure(
      sourceFolderId,
      destinationParentFolderId,
      newFolderName,
      SHARED_DRIVE_ID
    );
    console.log('✓ Folder copied successfully:', newFolder.id, newFolder.name);

    // Step 2: Find all Google Sheets in the new folder
    const sheets = await findGoogleSheetsInFolder(newFolder.id, SHARED_DRIVE_ID);
    console.log(`Found ${sheets.length} Google Sheets in new folder`);
    
    if (sheets.length === 0) {
      return NextResponse.json({
        success: true,
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
          sheet: sheet.name, 
          sheetId: sheet.id,
          success: true,
          message: 'Sheet populated successfully',
        });
        console.log(`✓ Successfully populated: ${sheet.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`✗ Error populating ${sheet.name}:`, errorMessage);
        results.push({ 
          sheet: sheet.name,
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
    console.error('\n❌ ERROR in test-populate-sheets API route:');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to populate sheets' 
      },
      { status: 500 }
    );
  }
}
