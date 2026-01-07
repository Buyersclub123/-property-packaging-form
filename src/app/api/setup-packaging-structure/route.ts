import { NextResponse } from 'next/server';
import { createFolder, setFolderPermissions } from '@/lib/googleDrive';

/**
 * API route to create the Packaging folder structure
 * Run this once to set up:
 * - Packaging/ (parent folder)
 * - Packaging/Properties/ (subfolder for property folders)
 * - Packaging/Templates/ (template folder to copy for each property)
 */
export async function POST() {
  try {
    // Step 1: Create main "Packaging" folder
    const packagingFolder = await createFolder('Packaging');
    console.log('Created Packaging folder:', packagingFolder.id);
    
    // Step 2: Create "Properties" subfolder inside Packaging
    const propertiesFolder = await createFolder('Properties', packagingFolder.id);
    console.log('Created Properties folder:', propertiesFolder.id);
    
    // Step 3: Create "Templates" subfolder inside Packaging (for template structure)
    const templatesFolder = await createFolder('Templates', packagingFolder.id);
    console.log('Created Templates folder:', templatesFolder.id);
    
    // Step 4: Create template subfolders inside Templates
    const cashflowTemplateFolder = await createFolder('Cashflow Template', templatesFolder.id);
    const locationTemplateFolder = await createFolder('Location Report Template', templatesFolder.id);
    const photosTemplateFolder = await createFolder('Photos', templatesFolder.id);
    
    console.log('Created template subfolders');
    
    // Step 5: Set permissions (viewer only for Packaging folder)
    await setFolderPermissions(packagingFolder.id, 'reader');
    
    return NextResponse.json({
      success: true,
      packagingFolderId: packagingFolder.id,
      packagingFolderLink: packagingFolder.webViewLink,
      propertiesFolderId: propertiesFolder.id,
      templatesFolderId: templatesFolder.id,
      templateSubfolders: {
        cashflow: cashflowTemplateFolder.id,
        location: locationTemplateFolder.id,
        photos: photosTemplateFolder.id,
      },
      message: 'Packaging folder structure created successfully. Upload templates to Templates folder.',
    });
  } catch (error) {
    console.error('Error creating Packaging folder structure:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create folder structure' 
      },
      { status: 500 }
    );
  }
}

