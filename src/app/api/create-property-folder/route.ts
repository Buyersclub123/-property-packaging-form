import { NextResponse } from 'next/server';
import { 
  createFolder, 
  copyFolderStructure, 
  setFolderPermissions, 
  findGoogleSheetsInFolder,
  renameFile,
  deleteFile,
  populateHLSpreadsheet
} from '@/lib/googleDrive';

/**
 * API route to create a property folder by copying the Master Folder Template
 * Called when "Continue with Packaging" is clicked in Step 0
 */
export async function POST(request: Request) {
  try {
    const { propertyAddress, formData } = await request.json();
    
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    // Shared Drive ID (Packaging Shared Drive)
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';
    
    // Template folder ID (00 - Master Folder Template - inside Properties in Shared Drive)
    const TEMPLATE_FOLDER_ID = process.env.GOOGLE_DRIVE_TEMPLATE_FOLDER_ID || '';
    
    // Properties folder ID (where property folders go - inside Shared Drive)
    const PROPERTIES_FOLDER_ID = process.env.GOOGLE_DRIVE_PROPERTIES_FOLDER_ID || '';

    if (!SHARED_DRIVE_ID || !TEMPLATE_FOLDER_ID || !PROPERTIES_FOLDER_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Google Drive configuration is missing. Required environment variables: GOOGLE_DRIVE_SHARED_DRIVE_ID, GOOGLE_DRIVE_TEMPLATE_FOLDER_ID, GOOGLE_DRIVE_PROPERTIES_FOLDER_ID' 
        },
        { status: 500 }
      );
    }
    
    // Step 1: Copy template folder to Properties folder (creates new property folder in Shared Drive)
    const propertyFolder = await copyFolderStructure(
      TEMPLATE_FOLDER_ID,
      PROPERTIES_FOLDER_ID,
      propertyAddress,
      SHARED_DRIVE_ID
    );
    
    console.log('Created property folder:', propertyFolder.id);
    
    // Step 2: Check if H&L + Split Contract condition applies
    // Log everything first to see what we're getting
    console.log('=== SHEET PROCESSING DEBUG ===');
    console.log('Full formData:', JSON.stringify(formData, null, 2));
    console.log('formData exists:', !!formData);
    console.log('decisionTree exists:', !!formData?.decisionTree);
    console.log('decisionTree:', formData?.decisionTree);
    console.log('lotType:', formData?.decisionTree?.lotType);
    console.log('contractType:', formData?.decisionTree?.contractType);
    console.log('contractTypeSimplified:', formData?.decisionTree?.contractTypeSimplified);
    console.log('propertyType:', formData?.decisionTree?.propertyType);
    
    const isHL = formData?.decisionTree?.lotType === 'Individual';
    // Check contractType directly first (more reliable), then contractTypeSimplified as fallback
    const isSplitContract = formData?.decisionTree?.contractType === '01_hl_comms' ||
                           formData?.decisionTree?.contractTypeSimplified === 'Split Contract';
    
    console.log('isHL (lotType === Individual):', isHL);
    console.log('isSplitContract:', isSplitContract);
    console.log('Will process sheets:', isHL && isSplitContract && formData);
    
    // TEMPORARY FOR TESTING: Process ALL properties to test if code works
    // TODO: Change back to only H&L + Split Contract after testing
    const shouldProcess = !!formData; // Process ALL properties for now
    
    console.log('=== DECISION ===');
    console.log('shouldProcess:', shouldProcess);
    console.log('formData exists:', !!formData);
    
    if (shouldProcess) {
      console.log('✓ PROCEEDING WITH SHEET PROCESSING');
      try {
        console.log('=== PROCESSING SHEETS ===');
        // Find all Google Sheets in the folder
        const sheets = await findGoogleSheetsInFolder(propertyFolder.id, SHARED_DRIVE_ID);
        console.log(`Found ${sheets.length} Google Sheets in folder:`, sheets.map(s => s.name));
        
        if (sheets.length === 0) {
          console.warn('No Google Sheets found in folder');
          return NextResponse.json({
            success: true,
            folderId: propertyFolder.id,
            folderLink: propertyFolder.webViewLink,
            folderName: propertyAddress,
          });
        }
        
        // Get contract type from form data
        const contractType = formData?.decisionTree?.contractTypeSimplified || '';
        
        // Find sheets by contract type in name
        const splitContractSheet = sheets.find(s => 
          s.name.toLowerCase().includes('split contract')
        );
        const singleContractSheet = sheets.find(s => 
          s.name.toLowerCase().includes('single contract')
        );
        
        console.log('Contract Type:', contractType);
        console.log('Split contract sheet found:', splitContractSheet ? splitContractSheet.name : 'NOT FOUND');
        console.log('Single contract sheet found:', singleContractSheet ? singleContractSheet.name : 'NOT FOUND');
        
        // Delete opposite sheet based on contract type
        const contractTypeLower = contractType.toLowerCase().trim();
        if (contractTypeLower === 'single contract' && splitContractSheet) {
          try {
            await deleteFile(splitContractSheet.id, SHARED_DRIVE_ID);
            console.log(`✓ Deleted split contract sheet: ${splitContractSheet.name}`);
          } catch (deleteError) {
            console.error('Error deleting split contract sheet:', deleteError);
          }
        }
        
        if (contractTypeLower === 'split contract' && singleContractSheet) {
          try {
            await deleteFile(singleContractSheet.id, SHARED_DRIVE_ID);
            console.log(`✓ Deleted single contract sheet: ${singleContractSheet.name}`);
          } catch (deleteError) {
            console.error('Error deleting single contract sheet:', deleteError);
          }
        }
        
        // Find HL sheet (has "HL" in title) for renaming (if still needed)
        const hlSheet = sheets.find(s => s.name.toLowerCase().includes('hl'));
        
        // Rename HL sheet if it exists
        if (hlSheet) {
          try {
            // Format address: streetNumber + streetName + suburbName
            const addressParts = [
              formData.address?.streetNumber,
              formData.address?.streetName,
              formData.address?.suburbName
            ].filter(Boolean);
            const addressString = addressParts.join(' ');
            
            console.log('Address parts:', addressParts);
            console.log('Formatted address:', addressString);
            
            const newName = `CF HL spreadsheet (${addressString})`;
            await renameFile(hlSheet.id, newName, SHARED_DRIVE_ID);
            console.log(`✓ Renamed HL sheet to: ${newName}`);
            
            // Populate the sheet with form data
            console.log('Populating sheet with form data...');
            console.log('Property description:', formData.propertyDescription);
            console.log('Purchase price:', formData.purchasePrice);
            console.log('Address:', formData.address);
            
            await populateHLSpreadsheet(hlSheet.id, formData);
            console.log(`✓ Populated HL spreadsheet with form data`);
          } catch (populateError) {
            console.error('Error populating sheet:', populateError);
            throw populateError; // Re-throw so we can see it in logs
          }
        } else {
          console.warn('HL sheet not found in folder - cannot rename or populate');
        }
      } catch (error) {
        console.error('=== ERROR PROCESSING SHEETS ===');
        console.error('Error details:', error);
        console.error('Error message:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        // Don't fail folder creation if sheet processing fails
      }
    } else {
      console.log('=== SHEET PROCESSING SKIPPED ===');
      console.log('Reason: Condition not met');
      console.log('isHL:', isHL);
      console.log('isSplitContract:', isSplitContract);
      console.log('formData exists:', !!formData);
    }
    
    // Step 3: Permissions are inherited from Properties folder
    // Properties folder already has:
    // - "Anyone with the link" = Viewer
    // - Specific @buyersclub.com.au users = Editor
    // New property folders inherit these permissions automatically
    
    return NextResponse.json({
      success: true,
      folderId: propertyFolder.id,
      folderLink: propertyFolder.webViewLink,
      folderName: propertyAddress,
    });
  } catch (error) {
    console.error('Error creating property folder:', error);
    
    // Get debug info from global if available
    const debugInfo = (global as any).__lastDriveClientDebug || [];
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create property folder',
        debugInfo: debugInfo.length > 0 ? debugInfo : undefined,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    );
  }
}

