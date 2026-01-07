import { NextResponse } from 'next/server';
import { createFolder, copyFolderStructure, setFolderPermissions } from '@/lib/googleDrive';

/**
 * API route to create a property folder by copying the Master Folder Template
 * Called when "Continue with Packaging" is clicked in Step 0
 */
export async function POST(request: Request) {
  try {
    const { propertyAddress } = await request.json();
    
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    // Shared Drive ID (Packaging Shared Drive)
    const SHARED_DRIVE_ID = '0AFVxBPJiTmjPUk9PVA';
    
    // Template folder ID (Master Folder Template - now inside Properties in Shared Drive)
    const TEMPLATE_FOLDER_ID = '1kHZKwA_qLd8oDKtoLYD-wFeUBwurmcHZ';
    
    // Properties folder ID (where property folders go - inside Shared Drive)
    const PROPERTIES_FOLDER_ID = '1Bs9ndWkDSm5tFTiBbSNa4obAbJrNi4mQ';
    
    // Step 1: Copy template folder to Properties folder (creates new property folder in Shared Drive)
    const propertyFolder = await copyFolderStructure(
      TEMPLATE_FOLDER_ID,
      PROPERTIES_FOLDER_ID,
      propertyAddress,
      SHARED_DRIVE_ID
    );
    
    console.log('Created property folder:', propertyFolder.id);
    
    // Step 2: Permissions are inherited from Properties folder
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
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create property folder' 
      },
      { status: 500 }
    );
  }
}

