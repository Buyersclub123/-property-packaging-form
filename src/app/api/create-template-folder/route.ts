import { NextResponse } from 'next/server';
import { createFolder, setFolderPermissions } from '@/lib/googleDrive';

/**
 * API route to create the template folder structure
 * Run this once to set up the template folder
 */
export async function POST() {
  try {
    
    // Step 1: Create main template folder
    const mainFolder = await createFolder('Property Packaging Templates');
    console.log('Created main folder:', mainFolder.id);
    
    // Step 2: Create subfolders
    const cashflowFolder = await createFolder('Cashflow Templates', mainFolder.id);
    const cmiFolder = await createFolder('CMI Reports', mainFolder.id);
    const photosFolder = await createFolder('Photos', mainFolder.id);
    const locationFolder = await createFolder('Location Reports', mainFolder.id);
    
    console.log('Created subfolders');
    
    // Step 3: Set permissions (viewer only)
    await setFolderPermissions(mainFolder.id, 'reader');
    
    return NextResponse.json({
      success: true,
      templateFolderId: mainFolder.id,
      templateFolderLink: mainFolder.webViewLink,
      subfolders: {
        cashflow: cashflowFolder.id,
        cmi: cmiFolder.id,
        photos: photosFolder.id,
        location: locationFolder.id,
      },
      message: 'Template folder created. Upload cashflow templates to the Cashflow Templates subfolder.',
    });
  } catch (error) {
    console.error('Error creating template folder:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template folder' 
      },
      { status: 500 }
    );
  }
}

