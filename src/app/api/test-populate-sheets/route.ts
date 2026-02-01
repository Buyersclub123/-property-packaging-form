import { NextResponse } from 'next/server';
import { copyFolderStructure, findGoogleSheetsInFolder, populateSpreadsheet, deleteFile, renameFile, listFilesInFolder } from '@/lib/googleDrive';

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
    // Add small delay to ensure files are fully propagated after copy
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    
    // Step 2a: Delete opposite contract type sheet based on Contract Type field
    // Check both top-level and decisionTree locations
    const contractType = formData?.decisionTree?.contractTypeSimplified || formData?.contractTypeSimplified || '';
    const contractTypeLower = contractType.toLowerCase().trim();
    
    console.log('=== CONTRACT TYPE DELETION DEBUG ===');
    console.log('contractType from decisionTree:', formData?.decisionTree?.contractTypeSimplified);
    console.log('contractType from top level:', formData?.contractTypeSimplified);
    console.log('contractType final:', contractType);
    console.log('contractTypeLower:', contractTypeLower);
    
    const splitContractSheet = sheets.find(s => 
      s.name.toLowerCase().includes('split contract')
    );
    const singleContractSheet = sheets.find(s => 
      s.name.toLowerCase().includes('single contract')
    );
    
    console.log('Contract Type:', contractType);
    console.log('Split contract sheet found:', splitContractSheet ? `${splitContractSheet.name} (ID: "${splitContractSheet.id}")` : 'NOT FOUND');
    console.log('Single contract sheet found:', singleContractSheet ? `${singleContractSheet.name} (ID: "${singleContractSheet.id}")` : 'NOT FOUND');
    
    // Log all sheet IDs to see if they have periods
    console.error('[DEBUG] All sheet IDs:', sheets.map(s => ({ name: s.name, id: s.id, idLength: s.id.length })));
    
    // Delete opposite sheet based on contract type
    let deletionAttempted = false;
    let deletionResult = null;
    
    if (contractTypeLower === 'single contract' && splitContractSheet) {
      deletionAttempted = true;
      try {
        console.error(`[DELETION] Attempting to delete: ${splitContractSheet.name} (ID: ${splitContractSheet.id})`);
        await deleteFile(splitContractSheet.id, SHARED_DRIVE_ID);
        console.error(`[DELETION] ✓ Successfully deleted: ${splitContractSheet.name}`);
        deletionResult = `Deleted: ${splitContractSheet.name}`;
        // Remove from sheets array so it doesn't get populated
        sheets.splice(sheets.indexOf(splitContractSheet), 1);
      } catch (deleteError) {
        const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError);
        console.error('[DELETION] ✗ Error deleting split contract sheet:', errorMsg);
        deletionResult = `Error: ${errorMsg}`;
      }
    } else if (contractTypeLower === 'split contract' && singleContractSheet) {
      deletionAttempted = true;
      try {
        console.error(`[DELETION] Attempting to delete: ${singleContractSheet.name} (ID: ${singleContractSheet.id})`);
        await deleteFile(singleContractSheet.id, SHARED_DRIVE_ID);
        console.error(`[DELETION] ✓ Successfully deleted: ${singleContractSheet.name}`);
        deletionResult = `Deleted: ${singleContractSheet.name}`;
        // Remove from sheets array so it doesn't get populated
        sheets.splice(sheets.indexOf(singleContractSheet), 1);
      } catch (deleteError) {
        const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError);
        console.error('[DELETION] ✗ Error deleting single contract sheet:', errorMsg);
        deletionResult = `Error: ${errorMsg}`;
      }
    } else {
      console.error('[DELETION] No deletion attempted. Reasons:');
      console.error(`  - contractTypeLower: "${contractTypeLower}"`);
      console.error(`  - Should be "single contract" or "split contract"`);
      console.error(`  - splitContractSheet found: ${splitContractSheet ? 'YES' : 'NO'}`);
      console.error(`  - singleContractSheet found: ${singleContractSheet ? 'YES' : 'NO'}`);
    }

    // Step 2b: Rename remaining sheet and Photos.docx
    // Format address: streetNumber + streetName + suburbName
    const addressParts = [
      formData.address?.streetNumber,
      formData.address?.streetName,
      formData.address?.suburbName
    ].filter(Boolean);
    const addressString = addressParts.join(' ');
    
    console.error(`[RENAME] Address string: "${addressString}"`);
    
    // Rename remaining spreadsheet to "CF spreadsheet [ADDRESS]"
    if (sheets.length > 0) {
      const remainingSheet = sheets[0]; // After deletion, only one sheet remains
      const newSheetName = `CF spreadsheet ${addressString}`;
      try {
        await renameFile(remainingSheet.id, newSheetName, SHARED_DRIVE_ID);
        console.error(`[RENAME] ✓ Renamed sheet to: ${newSheetName}`);
        remainingSheet.name = newSheetName; // Update name in array for results
      } catch (renameError) {
        console.error(`[RENAME] ✗ Error renaming sheet: ${renameError instanceof Error ? renameError.message : renameError}`);
      }
    }
    
    // Find and rename Photos.docx to "Photos [ADDRESS].docx"
    try {
      const allFiles = await listFilesInFolder(newFolder.id, SHARED_DRIVE_ID);
      const photosFile = allFiles.find(f => f.name.toLowerCase() === 'photos.docx');
      if (photosFile) {
        const newPhotosName = `Photos ${addressString}.docx`;
        await renameFile(photosFile.id, newPhotosName, SHARED_DRIVE_ID);
        console.error(`[RENAME] ✓ Renamed Photos.docx to: ${newPhotosName}`);
      } else {
        console.error(`[RENAME] Photos.docx not found in folder`);
      }
    } catch (renameError) {
      console.error(`[RENAME] ✗ Error renaming Photos.docx: ${renameError instanceof Error ? renameError.message : renameError}`);
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
      debug: {
        contractType,
        contractTypeLower,
        splitContractSheetFound: splitContractSheet ? splitContractSheet.name : null,
        singleContractSheetFound: singleContractSheet ? singleContractSheet.name : null,
        deletionAttempted,
        deletionResult,
      },
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
