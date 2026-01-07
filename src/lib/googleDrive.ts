// Google Drive API integration for folder and file management
import { google } from 'googleapis';

/**
 * Initialize Google Drive API client
 */
function getDriveClient() {
  // Try to get credentials from environment variable first
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  // If not in env, try to read from file
  if (!credentialsJson) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-sheets-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      }
    } catch (error) {
      // File reading failed, will throw error below
    }
  }
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set and credentials file not found. Please check your .env.local file and restart the dev server.');
  }

  // Remove single quotes if present at start/end (from .env file)
  credentialsJson = credentialsJson.trim();
  if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
  if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
    credentialsJson = credentialsJson.slice(1, -1);
  }

  // Parse JSON - handle multi-line format
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    // If parsing fails, try to clean up newlines and parse again
    try {
      const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson);
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
    }
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Create a folder in Google Drive
 */
export async function createFolder(
  folderName: string,
  parentFolderId?: string,
  driveId?: string
): Promise<{ id: string; webViewLink: string; name: string }> {
  try {
    const drive = getDriveClient();
    
    const fileMetadata: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const requestOptions: any = {
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    };

    // If driveId is provided, create in Shared Drive
    if (driveId) {
      requestOptions.supportsAllDrives = true;
      requestOptions.driveId = driveId;
    }

    const response = await drive.files.create(requestOptions);

    if (!response.data.id) {
      throw new Error('Failed to create folder: No ID returned');
    }

    return {
      id: response.data.id,
      webViewLink: response.data.webViewLink || '',
      name: response.data.name || folderName,
    };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

/**
 * Set folder permissions (share with viewers)
 */
export async function setFolderPermissions(
  folderId: string,
  role: 'reader' | 'writer' = 'reader'
): Promise<void> {
  try {
    const drive = getDriveClient();
    
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: role,
        type: 'anyone', // Anyone with the link can access
      },
    });
  } catch (error) {
    console.error('Error setting folder permissions:', error);
    throw error;
  }
}

/**
 * Copy file from source to destination folder
 */
export async function copyFileToFolder(
  fileId: string,
  destinationFolderId: string,
  driveId?: string,
  newFileName?: string
): Promise<{ id: string; name: string }> {
  try {
    const drive = getDriveClient();
    
    const copyOptions: any = {
      fileId: fileId,
      requestBody: {
        name: newFileName,
        parents: [destinationFolderId],
      },
      fields: 'id, name',
    };
    if (driveId) {
      copyOptions.supportsAllDrives = true;
    }
    
    const copiedFile = await drive.files.copy(copyOptions);

    if (!copiedFile.data.id) {
      throw new Error('Failed to copy file: No ID returned');
    }

    return {
      id: copiedFile.data.id,
      name: copiedFile.data.name || '',
    };
  } catch (error) {
    console.error('Error copying file:', error);
    throw error;
  }
}

/**
 * List files in a folder
 */
export async function listFilesInFolder(folderId: string, driveId?: string): Promise<Array<{ id: string; name: string; mimeType: string }>> {
  try {
    const drive = getDriveClient();
    
    const listOptions: any = {
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
    };
    if (driveId) {
      listOptions.supportsAllDrives = true;
      listOptions.includeItemsFromAllDrives = true;
      listOptions.driveId = driveId;
      listOptions.corpora = 'drive';
    }
    
    const response = await drive.files.list(listOptions);

    return (response.data.files || []).map(file => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
    }));
  } catch (error) {
    console.error('Error listing files in folder:', error);
    throw error;
  }
}

/**
 * Copy entire folder structure (recursively copy folder and all contents)
 */
export async function copyFolderStructure(
  sourceFolderId: string,
  destinationParentFolderId: string,
  newFolderName: string,
  driveId?: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  try {
    const drive = getDriveClient();
    
    // Get source folder metadata
    const getOptions: any = {
      fileId: sourceFolderId,
      fields: 'name, mimeType',
    };
    if (driveId) {
      getOptions.supportsAllDrives = true;
    }
    const sourceFolder = await drive.files.get(getOptions);
    
    // Create new folder in destination
    const newFolder = await createFolder(newFolderName, destinationParentFolderId, driveId);
    
    // List all items in source folder
    const items = await listFilesInFolder(sourceFolderId, driveId);
    
    // Copy each item
    for (const item of items) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        // Recursively copy subfolders
        await copyFolderStructure(item.id, newFolder.id, item.name, driveId);
      } else {
        // Copy files
        await copyFileToFolder(item.id, newFolder.id, driveId);
      }
    }
    
    // Get the webViewLink for the new folder
    const folderDetailsOptions: any = {
      fileId: newFolder.id,
      fields: 'webViewLink',
    };
    if (driveId) {
      folderDetailsOptions.supportsAllDrives = true;
    }
    const folderDetails = await drive.files.get(folderDetailsOptions);
    
    return {
      id: newFolder.id,
      name: newFolder.name,
      webViewLink: folderDetails.data.webViewLink || '',
    };
  } catch (error) {
    console.error('Error copying folder structure:', error);
    throw error;
  }
}

