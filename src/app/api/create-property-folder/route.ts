import { NextResponse } from 'next/server';
import { 
  createFolder, 
  copyFolderStructure, 
  setFolderPermissions, 
  findGoogleSheetsInFolder,
  renameFile,
  deleteFile,
  populateHLSpreadsheet,
  createShortcut,
  setFilePermissions,
  getFileName
} from '@/lib/googleDrive';
import { constructAndSanitizeFolderName } from '@/lib/addressFormatter';
import { serverLog } from '@/lib/serverLogger';

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
    
    // Step 1: Construct folder name using NEW naming convention from addressFormatter.ts
    // This ensures proper formatting with Lot/Unit numbers
    const folderName = formData?.address 
      ? constructAndSanitizeFolderName(formData.address)
      : propertyAddress; // Fallback to old naming if address data not available
    
    console.log('Creating folder with name:', folderName);
    
    // Step 2: Copy template folder to Properties folder (creates new property folder in Shared Drive)
    const propertyFolder = await copyFolderStructure(
      TEMPLATE_FOLDER_ID,
      PROPERTIES_FOLDER_ID,
      folderName,
      SHARED_DRIVE_ID
    );
    
    console.log('Created property folder:', propertyFolder.id);
    
    // Step 2.5: Explicitly set folder permissions to ensure "Anyone with the link" = Viewer
    // This is necessary because Shared Drive folders may not always inherit permissions correctly
    try {
      await setFolderPermissions(propertyFolder.id, 'reader', SHARED_DRIVE_ID);
      console.log('✓ Set folder permissions to "Anyone with the link" = Viewer');
    } catch (permError: any) {
      // Don't fail folder creation if permission setting fails (might already be set)
      console.warn('Warning: Could not set folder permissions (may already be set):', permError?.message);
    }
    
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
            folderName: folderName,
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
        
        // Format address for file naming: streetNumber + streetName + suburbName
        const addressParts = [
          formData.address?.streetNumber,
          formData.address?.streetName,
          formData.address?.suburbName
        ].filter(Boolean);
        const addressString = addressParts.join(' ');
        
        console.log('Address parts:', addressParts);
        console.log('Formatted address:', addressString);
        
        // Find and rename Photos.docx
        const { listFilesInFolder } = await import('@/lib/googleDrive');
        const allFiles = await listFilesInFolder(propertyFolder.id, SHARED_DRIVE_ID);
        const photosDoc = allFiles.find(f => 
          f.name.toLowerCase().includes('photos') && 
          f.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        
        if (photosDoc) {
          try {
            const newPhotosName = `Photos ${addressString}.docx`;
            await renameFile(photosDoc.id, newPhotosName, SHARED_DRIVE_ID);
            console.log(`✓ Renamed Photos document to: ${newPhotosName}`);
          } catch (renameError) {
            console.error('Error renaming Photos document:', renameError);
          }
        } else {
          console.warn('Photos.docx not found in folder');
        }
        
        // Find the kept spreadsheet (either Split Contract or Single Contract)
        const keptSheet = contractTypeLower === 'split contract' ? splitContractSheet : singleContractSheet;
        
        // Rename kept spreadsheet
        if (keptSheet) {
          try {
            const newName = `CF spreadsheet ${addressString}`;
            await renameFile(keptSheet.id, newName, SHARED_DRIVE_ID);
            console.log(`✓ Renamed CF spreadsheet to: ${newName}`);
            
            // Populate the sheet with form data
            console.log('Populating sheet with form data...');
            console.log('Property description:', formData.propertyDescription);
            console.log('Purchase price:', formData.purchasePrice);
            console.log('Address:', formData.address);
            
            await populateHLSpreadsheet(keptSheet.id, formData);
            console.log(`✓ Populated CF spreadsheet with form data`);
          } catch (populateError) {
            console.error('Error populating sheet:', populateError);
            throw populateError; // Re-throw so we can see it in logs
          }
        } else {
          console.warn('No spreadsheet found in folder - cannot rename or populate');
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
    
    // Note: Permissions are inherited from parent folder
    // - "Anyone with the link" = Viewer (inherited from Properties folder)
    // - Specific @buyersclub.com.au users = Content Manager (inherited from parent folder)
    
    // Step 4: Add PDF shortcut if hotspottingPdfFileId exists
    serverLog('[create-property-folder] Checking for PDF shortcut...');
    serverLog('[create-property-folder] formData?.hotspottingPdfFileId:', formData?.hotspottingPdfFileId);
    serverLog('[create-property-folder] formData?.hotspottingPdfLink:', formData?.hotspottingPdfLink);
    serverLog('[create-property-folder] formData?.hotspottingReportName:', formData?.hotspottingReportName);
    
    if (formData?.hotspottingPdfFileId) {
      try {
        serverLog('[create-property-folder] Adding PDF shortcut to property folder...');
        serverLog('[create-property-folder] File ID:', formData.hotspottingPdfFileId);
        serverLog('[create-property-folder] Folder ID:', propertyFolder.id);
        
        // Fetch original PDF file name to use for shortcut
        let shortcutName = 'Hotspotting Report.pdf'; // Fallback name
        const originalFileName = await getFileName(formData.hotspottingPdfFileId, SHARED_DRIVE_ID);
        if (originalFileName) {
          shortcutName = originalFileName;
          serverLog('[create-property-folder] Using original PDF name for shortcut:', shortcutName);
        } else {
          serverLog('[create-property-folder] Warning: Could not fetch original PDF name, using fallback:', shortcutName);
        }
        
        const pdfShortcut = await createShortcut(
          formData.hotspottingPdfFileId,
          propertyFolder.id,
          shortcutName,
          SHARED_DRIVE_ID
        );
        serverLog('[create-property-folder] PDF shortcut created successfully:', pdfShortcut.id);
        
        // Set permissions on the ORIGINAL PDF file (not the shortcut)
        // Google Drive API v3 does not support setting permissions directly on shortcuts
        // Shortcuts inherit access from the original file they point to
        try {
          await setFilePermissions(formData.hotspottingPdfFileId, 'reader', SHARED_DRIVE_ID);
          serverLog('[create-property-folder] Original PDF permissions set to "Anyone with the link"');
        } catch (permError: any) {
          serverLog('[create-property-folder] Warning: Failed to set permissions on original PDF (non-blocking):', {
            message: permError?.message,
            code: permError?.code,
          });
          // Don't fail - shortcut is created, permissions might already be set
          // Note: If this is a "Master" PDF file used for all shortcuts, permissions may already be set
        }
      } catch (error: any) {
        // Log detailed error information
        serverLog('[create-property-folder] Error creating PDF shortcut:', {
          message: error?.message || 'Unknown error',
          code: error?.code,
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          responseData: error?.response?.data,
          stack: error?.stack,
        });
        // Don't fail folder creation if shortcut creation fails
      }
    } else {
      serverLog('[create-property-folder] No PDF fileId found - skipping shortcut creation');
    }
    
    return NextResponse.json({
      success: true,
      folderId: propertyFolder.id,
      folderLink: propertyFolder.webViewLink,
      folderName: folderName,
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

