import { NextRequest, NextResponse } from 'next/server';
import { syncFolderPermissions } from '@/lib/googleDrive';

/**
 * POST /api/google-drive/sync-folder-permissions
 * 
 * Syncs permissions for all files in a folder to ensure "anyone with link can view"
 * Useful for manually-added files that might not inherit folder permissions correctly
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { folderId, role = 'reader', driveId } = body;
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }
    
    const result = await syncFolderPermissions(folderId, role, driveId);
    
    return NextResponse.json({
      success: result.success,
      filesProcessed: result.filesProcessed,
      filesUpdated: result.filesUpdated,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error syncing folder permissions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync folder permissions',
        details: error?.message || error?.toString() 
      },
      { status: 500 }
    );
  }
}
