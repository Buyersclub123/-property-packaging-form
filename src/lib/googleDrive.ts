// Google Drive API integration for folder and file management
import { google } from 'googleapis';

/**
 * Initialize Google Drive API client
 */
function getDriveClient() {
  const debugInfo: string[] = [];
  debugInfo.push('[getDriveClient] Starting...');
  
  // Try to get credentials from environment variable first
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  debugInfo.push(`Credentials from env: ${credentialsJson ? `Found (length: ${credentialsJson.length})` : 'NOT FOUND'}`);
  console.error('[getDriveClient] Starting...');
  console.error('[getDriveClient] Credentials from env:', credentialsJson ? `Found (length: ${credentialsJson.length})` : 'NOT FOUND');
  
  // If not in env, try to read from file
  if (!credentialsJson) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-sheets-credentials.json');
      console.error('[getDriveClient] Checking file:', credentialsPath);
      if (fs.existsSync(credentialsPath)) {
        credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
        console.error('[getDriveClient] Credentials from file:', credentialsJson ? `Found (length: ${credentialsJson.length})` : 'NOT FOUND');
      } else {
        console.error('[getDriveClient] File does not exist');
      }
    } catch (error) {
      console.error('[getDriveClient] File read error:', error);
      // File reading failed, will throw error below
    }
  }
  
  if (!credentialsJson) {
    const errorMsg = 'GOOGLE_SHEETS_CREDENTIALS environment variable is not set and credentials file not found. Please check your .env.local file and restart the dev server.';
    debugInfo.push(`ERROR: ${errorMsg}`);
    console.error('[getDriveClient]', errorMsg);
    throw new Error(errorMsg);
  }
  
  // Store debug info globally so we can access it in error handlers
  (global as any).__lastDriveClientDebug = debugInfo;

  // Remove single quotes if present at start/end (from .env file)
  credentialsJson = credentialsJson.trim();
  const hadQuotes = credentialsJson.startsWith("'") || credentialsJson.startsWith('"');
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
  
  // Fix private key - handle both escaped newlines (\n) and actual newlines
  if (credentials.private_key) {
    const beforeLength = credentials.private_key.length;
    const beforeHasEscapedNewline = credentials.private_key.includes('\\n');
    const beforeHasActualNewline = credentials.private_key.includes('\n');
    
    debugInfo.push(`Private key BEFORE fix: length=${beforeLength}, hasEscapedNewline=${beforeHasEscapedNewline}, hasActualNewline=${beforeHasActualNewline}`);
    debugInfo.push(`Starts with: ${credentials.private_key.substring(0, 50)}`);
    
    console.error('[getDriveClient] Private key BEFORE fix:');
    console.error('  Length:', beforeLength);
    console.error('  Starts with:', credentials.private_key.substring(0, 50));
    console.error('  Contains \\n (escaped):', beforeHasEscapedNewline);
    console.error('  Contains actual newline:', beforeHasActualNewline);
    
    // Normalize the private key:
    // 1. If it has escaped newlines (\n), convert them to actual newlines
    // 2. If it already has actual newlines, keep them
    // 3. Normalize any extra whitespace
    if (beforeHasEscapedNewline) {
      // Replace escaped newlines with actual newlines
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    
    // Normalize: ensure proper line breaks and remove any trailing/leading whitespace
    credentials.private_key = credentials.private_key.trim();
    
    // Ensure the key has proper line breaks (should have newlines between BEGIN/END markers)
    // If somehow it's all on one line, try to detect and fix (though this shouldn't happen)
    if (!credentials.private_key.includes('\n') && credentials.private_key.includes('-----BEGIN') && credentials.private_key.includes('-----END')) {
      // Key is on one line - this is unusual but handle it
      console.error('[getDriveClient] WARNING: Private key appears to be on a single line');
    }
    
    const afterLength = credentials.private_key.length;
    const afterHasEscapedNewline = credentials.private_key.includes('\\n');
    const afterHasActualNewline = credentials.private_key.includes('\n');
    
    debugInfo.push(`Private key AFTER fix: length=${afterLength}, hasEscapedNewline=${afterHasEscapedNewline}, hasActualNewline=${afterHasActualNewline}`);
    debugInfo.push(`Starts with: ${credentials.private_key.substring(0, 50)}`);
    
    console.error('[getDriveClient] Private key AFTER fix:');
    console.error('  Length:', afterLength);
    console.error('  Starts with:', credentials.private_key.substring(0, 50));
    console.error('  Contains \\n (escaped):', afterHasEscapedNewline);
    console.error('  Contains actual newline:', afterHasActualNewline);
    
    // Validate the key format
    if (!credentials.private_key.startsWith('-----BEGIN')) {
      const warning = 'WARNING: Private key does not start with -----BEGIN';
      debugInfo.push(warning);
      console.error('[getDriveClient]', warning);
    }
    if (!credentials.private_key.includes('-----END')) {
      const warning = 'WARNING: Private key does not contain -----END';
      debugInfo.push(warning);
      console.error('[getDriveClient]', warning);
    }
  } else {
    const error = 'ERROR: private_key is missing from credentials!';
    debugInfo.push(error);
    console.error('[getDriveClient]', error);
  }
  
  (global as any).__lastDriveClientDebug = debugInfo;
  
  // Validate credentials before using
  if (!credentials.private_key || !credentials.client_email) {
    console.error('[getDriveClient] Missing fields - private_key:', !!credentials.private_key, 'client_email:', !!credentials.client_email);
    throw new Error('GOOGLE_SHEETS_CREDENTIALS missing required fields: private_key or client_email');
  }
  
  console.error('[getDriveClient] Service account email:', credentials.client_email);
  console.error('[getDriveClient] About to create GoogleAuth...');
  
  try {
    console.error('[getDriveClient] Creating GoogleAuth with credentials...');
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });
    console.error('[getDriveClient] GoogleAuth created successfully');
    
    console.error('[getDriveClient] Creating Drive client...');
    const drive = google.drive({ version: 'v3', auth });
    console.error('[getDriveClient] Drive client created successfully');
    return drive;
  } catch (authError) {
    const errorInfo = [
      `ERROR creating auth: ${authError instanceof Error ? authError.constructor.name : typeof authError}`,
      `Message: ${authError instanceof Error ? authError.message : String(authError)}`,
      ...debugInfo
    ];
    (global as any).__lastDriveClientDebug = errorInfo;
    
    console.error('[getDriveClient] ERROR creating auth:');
    console.error('  Type:', authError instanceof Error ? authError.constructor.name : typeof authError);
    console.error('  Message:', authError instanceof Error ? authError.message : String(authError));
    if (authError instanceof Error && authError.stack) {
      console.error('  Stack:', authError.stack);
    }
    
    // Attach debug info to error
    if (authError instanceof Error) {
      (authError as any).debugInfo = debugInfo;
    }
    throw authError;
  }
}

/**
 * Get Sheets client using the same credentials as Drive client
 */
function getSheetsClientFromCredentials() {
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  if (!credentialsJson) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-sheets-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      }
    } catch (error) {
      // File reading failed
    }
  }
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }
  
  credentialsJson = credentialsJson.trim();
  if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
  if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
    credentialsJson = credentialsJson.slice(1, -1);
  }
  
  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    try {
      const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson);
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
    }
  }
  
  // Fix private key - replace escaped newlines with actual newlines
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Diagnostic function to check service account access to Shared Drive
 * This can help identify permission issues
 */
export async function checkServiceAccountAccess(driveId: string): Promise<{ hasAccess: boolean; error?: string; serviceAccountEmail?: string }> {
  let serviceAccountEmail = 'unknown';
  
  try {
    // Get service account email from credentials
    let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (credentialsJson) {
      credentialsJson = credentialsJson.trim();
      if (credentialsJson.startsWith("'") && credentialsJson.endsWith("'")) {
        credentialsJson = credentialsJson.slice(1, -1);
      }
      if (credentialsJson.startsWith('"') && credentialsJson.endsWith('"')) {
        credentialsJson = credentialsJson.slice(1, -1);
      }
      try {
        const credentials = JSON.parse(credentialsJson);
        serviceAccountEmail = credentials.client_email || 'unknown';
      } catch {
        // Ignore parse errors
      }
    }
    
    const drive = getDriveClient();
    
    // Try to list files in the Shared Drive
    const response = await drive.files.list({
      q: 'trashed=false',
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: driveId,
      corpora: 'drive',
      pageSize: 1, // Just check if we can access, don't need all files
    });
    
    return {
      hasAccess: true,
      serviceAccountEmail,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      hasAccess: false,
      error: errorMessage,
      serviceAccountEmail,
    };
  }
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
    
    // For Shared Drives, specify parent directly in parents field
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const requestOptions: any = {
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true, // Always set for Shared Drive compatibility
    };

    // If driveId is provided, include it in the request for Shared Drives
    if (driveId) {
      requestOptions.driveId = driveId;
      requestOptions.includeItemsFromAllDrives = true;
      requestOptions.corpora = 'drive';
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
      supportsAllDrives: true, // Always set for Shared Drive compatibility
    };
    
    // For Shared Drives, add additional parameters
    if (driveId) {
      copyOptions.driveId = driveId;
      copyOptions.includeItemsFromAllDrives = true;
      copyOptions.corpora = 'drive';
    }
    
    console.log('[copyFileToFolder] Copying file:', fileId, 'to folder:', destinationFolderId);
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
      supportsAllDrives: true, // Always set for Shared Drive compatibility
    };
    if (driveId) {
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
    
    console.log('[copyFolderStructure] Attempting to access source folder:', sourceFolderId);
    console.log('[copyFolderStructure] Shared Drive ID:', driveId);
    
    // Get source folder metadata
    const getOptions: any = {
      fileId: sourceFolderId,
      fields: 'name, mimeType',
    };
    if (driveId) {
      getOptions.supportsAllDrives = true;
      console.log('[copyFolderStructure] Using Shared Drive mode');
    }
    
    console.log('[copyFolderStructure] Calling drive.files.get...');
    const sourceFolder = await drive.files.get(getOptions);
    console.log('[copyFolderStructure] Successfully got source folder:', sourceFolder.data.name);
    
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

/**
 * Find all Google Sheets in a folder
 */
export async function findGoogleSheetsInFolder(
  folderId: string,
  driveId?: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const items = await listFilesInFolder(folderId, driveId);
    return items
      .filter(item => item.mimeType === 'application/vnd.google-apps.spreadsheet')
      .map(item => ({ 
        id: item.id ? item.id.trim().replace(/\.+$/, '') : '', 
        name: item.name || '' 
      }));
  } catch (error) {
    console.error('Error finding Google Sheets in folder:', error);
    throw error;
  }
}

/**
 * Rename a file in Google Drive
 */
export async function renameFile(
  fileId: string,
  newName: string,
  driveId?: string
): Promise<void> {
  try {
    const drive = getDriveClient();
    
    // Clean file ID - remove any trailing periods or whitespace
    const cleanFileId = fileId.trim().replace(/\.+$/, '');
    
    const updateOptions: any = {
      fileId: cleanFileId,
      requestBody: {
        name: newName,
      },
      supportsAllDrives: true, // Always set for Shared Drive compatibility
    };
    
    if (driveId) {
      updateOptions.includeItemsFromAllDrives = true;
      updateOptions.driveId = driveId;
      updateOptions.corpora = 'drive';
    }
    
    console.error(`[RENAME] Renaming file ${cleanFileId} to "${newName}"${driveId ? ` in drive ${driveId}` : ''}`);
    await drive.files.update(updateOptions);
    console.error(`[RENAME] ✓ Successfully renamed file to "${newName}"`);
  } catch (error: any) {
    console.error('[RENAME] ✗ Error renaming file:', error?.message || error);
    console.error('[RENAME] File ID:', fileId);
    console.error('[RENAME] New name:', newName);
    throw error;
  }
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFile(
  fileId: string,
  driveId?: string
): Promise<void> {
  try {
    const drive = getDriveClient();
    
    // Clean file ID - remove any trailing periods or whitespace
    const cleanFileId = fileId.trim().replace(/\.+$/, '');
    
    // First verify file exists and is accessible
    const getOptions: any = {
      fileId: cleanFileId,
      fields: 'id,name',
      supportsAllDrives: true,
    };
    
    if (driveId) {
      getOptions.includeItemsFromAllDrives = true;
      getOptions.driveId = driveId;
      getOptions.corpora = 'drive';
    }
    
    // Verify file exists before attempting delete
    try {
      const fileInfo = await drive.files.get(getOptions);
      console.error(`[DELETION] File verified: ${fileInfo.data.name} (ID: ${fileInfo.data.id})`);
    } catch (getError: any) {
      console.error(`[DELETION] File verification failed: ${getError?.message || getError}`);
      throw new Error(`Cannot access file ${cleanFileId}: ${getError?.message || 'File not found'}`);
    }
    
    // Try trashing first (safer, works with Content Manager role)
    const trashOptions: any = {
      fileId: cleanFileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    };
    
    if (driveId) {
      trashOptions.includeItemsFromAllDrives = true;
      trashOptions.driveId = driveId;
      trashOptions.corpora = 'drive';
    }
    
    console.error(`[DELETION] Attempting to trash file ${cleanFileId}${driveId ? ` from drive ${driveId}` : ''}`);
    
    try {
      // Try trashing first (works with Content Manager role)
      await drive.files.update(trashOptions);
      console.error(`[DELETION] ✓ Successfully trashed file ${cleanFileId}`);
    } catch (trashError: any) {
      // If trashing fails, try permanent delete (requires Manager/Organizer role)
      console.error(`[DELETION] Trashing failed, trying permanent delete: ${trashError?.message || trashError}`);
      
      const deleteOptions: any = {
        fileId: cleanFileId,
        supportsAllDrives: true,
      };
      
      if (driveId) {
        deleteOptions.includeItemsFromAllDrives = true;
        deleteOptions.driveId = driveId;
        deleteOptions.corpora = 'drive';
      }
      
      await drive.files.delete(deleteOptions);
      console.error(`[DELETION] ✓ Successfully permanently deleted file ${cleanFileId}`);
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code;
    const errorResponse = error?.response?.data;
    
    console.error('[DELETION] ✗ Error deleting file');
    console.error('[DELETION] Error message:', errorMessage);
    console.error('[DELETION] Error code:', errorCode);
    console.error('[DELETION] Error response:', JSON.stringify(errorResponse, null, 2));
    console.error('[DELETION] File ID (original):', fileId);
    console.error('[DELETION] File ID (cleaned):', fileId.trim().replace(/\.+$/, ''));
    console.error('[DELETION] Drive ID:', driveId);
    
    // Re-throw with cleaned error message (remove period if it's from our error format)
    const cleanedErrorMsg = errorMessage.replace(/\.$/, '');
    throw new Error(cleanedErrorMsg);
  }
}

/**
 * Populate Spreadsheet with form data (uses "Autofill data" tab)
 * Finds field names in column A and writes values to column B
 */
export async function populateSpreadsheet(
  spreadsheetId: string,
  formData: any,
  driveId?: string
): Promise<void> {
  try {
    // Use the same credentials to create Sheets client
    const sheets = getSheetsClientFromCredentials();
    
    const TAB_NAME = 'Autofill data';
    
    console.log(`Populating spreadsheet ${spreadsheetId} on tab "${TAB_NAME}"`);
    
    // Step 1: Read the "Autofill data" tab to get field names and find their row numbers
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${TAB_NAME}'!A:B`,
    });
    
    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in "${TAB_NAME}" tab`);
    
    if (rows.length === 0) {
      throw new Error(`Tab "${TAB_NAME}" is empty or doesn't exist`);
    }
    
    // Step 2: Build field-to-row mapping (field name in column A, value goes to column B)
    const fieldRowMap = new Map<number, { fieldName: string; value: string }>();
    
    // Check if dual occupancy
    const isDual = formData.decisionTree?.dualOccupancy === 'Yes' || 
                   formData.propertyDescription?.bedsSecondary || 
                   formData.propertyDescription?.bathSecondary || 
                   formData.propertyDescription?.garageSecondary;
    
    // Helper function to convert state to uppercase 3-letter format (for cashflow spreadsheet formulas)
    const convertStateToCode = (state: string): string => {
      if (!state) return '';
      
      const stateUpper = state.toUpperCase().trim();
      
      // If already 3-letter code, return as-is
      if (stateUpper.length === 3 && /^[A-Z]{3}$/.test(stateUpper)) {
        return stateUpper;
      }
      
      // Map full state names to codes
      const stateMap: Record<string, string> = {
        'VICTORIA': 'VIC',
        'NEW SOUTH WALES': 'NSW',
        'QUEENSLAND': 'QLD',
        'SOUTH AUSTRALIA': 'SA',
        'WESTERN AUSTRALIA': 'WA',
        'TASMANIA': 'TAS',
        'NORTHERN TERRITORY': 'NT',
        'AUSTRALIAN CAPITAL TERRITORY': 'ACT',
        'ACT': 'ACT',
      };
      
      // Check if it's a full state name
      if (stateMap[stateUpper]) {
        return stateMap[stateUpper];
      }
      
      // If it's already a valid code (2-3 letters), return uppercase
      if (stateUpper.length >= 2 && stateUpper.length <= 3) {
        return stateUpper;
      }
      
      // Return as-is if we can't determine
      return stateUpper;
    };
    
    // Calculate values based on CSV mapping
    const calculateValue = (fieldName: string): string => {
      const fieldLower = fieldName.toLowerCase().trim();
      
      // Address mapping
      if (fieldLower.includes('address') && !fieldLower.includes('state')) {
        return formData.address?.propertyAddress || '';
      }
      
      // State mapping - convert to uppercase 3-letter format for cashflow spreadsheet formulas
      if (fieldLower.includes('state')) {
        const state = formData.address?.state || '';
        return convertStateToCode(state);
      }
      
      // Land Cost mapping - ONLY populate if split contract
      if (fieldLower.includes('land cost')) {
        const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
        if (isSplitContract) {
          return formData.purchasePrice?.landPrice || '';
        }
        return '';
      }
      
      // Build Cost mapping - ONLY populate if split contract
      if (fieldLower.includes('build cost')) {
        const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
        if (isSplitContract) {
          return formData.purchasePrice?.buildPrice || '';
        }
        return '';
      }
      
      // Total Cost mapping
      if (fieldLower.includes('total cost')) {
        // For split contracts, calculate from land + build
        const isSplitContract = formData.decisionTree?.contractTypeSimplified === 'Split Contract';
        if (isSplitContract) {
          const land = parseFloat(formData.purchasePrice?.landPrice || '0');
          const build = parseFloat(formData.purchasePrice?.buildPrice || '0');
          if (land && build) {
            return String(land + build);
          }
        }
        // For single contracts or if calculation fails, use totalPrice
        return formData.purchasePrice?.totalPrice || '';
      }
      
      // Cashback Value (only if type is cashback)
      if (fieldLower.includes('cashback value')) {
        if (formData.purchasePrice?.cashbackRebateType === 'cashback') {
          return formData.purchasePrice?.cashbackRebateValue || '';
        }
        return '';
      }
      
      // Total Bed (with dual occupancy logic)
      if (fieldLower.includes('total bed')) {
        const primary = formData.propertyDescription?.bedsPrimary || '0';
        const secondary = formData.propertyDescription?.bedsSecondary || '0';
        return isDual ? `${primary} + ${secondary}` : String(primary);
      }
      
      // Total Bath (with dual occupancy logic)
      if (fieldLower.includes('total bath')) {
        const primary = formData.propertyDescription?.bathPrimary || '0';
        const secondary = formData.propertyDescription?.bathSecondary || '0';
        return isDual ? `${primary} + ${secondary}` : String(primary);
      }
      
      // Total Garage (with dual occupancy logic)
      if (fieldLower.includes('total garage')) {
        const primary = formData.propertyDescription?.garagePrimary || '0';
        const secondary = formData.propertyDescription?.garageSecondary || '0';
        return isDual ? `${primary} + ${secondary}` : String(primary);
      }
      
      // Low Rent (total of FROM values if dual)
      if (fieldLower.includes('low rent')) {
        const primaryFrom = parseFloat(formData.rentalAssessment?.rentAppraisalPrimaryFrom || '0');
        const secondaryFrom = parseFloat(formData.rentalAssessment?.rentAppraisalSecondaryFrom || '0');
        if (isDual && secondaryFrom > 0) {
          return String(primaryFrom + secondaryFrom);
        }
        return formData.rentalAssessment?.rentAppraisalPrimaryFrom || '';
      }
      
      // High Rent (total of TO values if dual)
      if (fieldLower.includes('high rent')) {
        const primaryTo = parseFloat(formData.rentalAssessment?.rentAppraisalPrimaryTo || '0');
        const secondaryTo = parseFloat(formData.rentalAssessment?.rentAppraisalSecondaryTo || '0');
        if (isDual && secondaryTo > 0) {
          return String(primaryTo + secondaryTo);
        }
        return formData.rentalAssessment?.rentAppraisalPrimaryTo || '';
      }
      
      // Depreciation Years 1-10 (B18-B27)
      // Handle various field name patterns: "Depreciation Year 1", "Year 1 Depreciation", "Depreciation 1", etc.
      if (fieldLower.includes('depreciation')) {
        // Pattern 1: "Depreciation Year 1" or "Depreciation Year1"
        let yearMatch = fieldLower.match(/depreciation\s+year\s*(\d+)/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1 && year <= 10) {
            return formData.depreciation?.[`year${year}`] || '';
          }
        }
        
        // Pattern 2: "Year 1 Depreciation" or "Year1 Depreciation"
        yearMatch = fieldLower.match(/year\s*(\d+)\s+depreciation/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1 && year <= 10) {
            return formData.depreciation?.[`year${year}`] || '';
          }
        }
        
        // Pattern 3: "Depreciation 1" (just number after depreciation)
        yearMatch = fieldLower.match(/depreciation\s*(\d+)/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          if (year >= 1 && year <= 10) {
            return formData.depreciation?.[`year${year}`] || '';
          }
        }
      }

      // Note: Rates (B14), Insurance Type (B15), Insurance Amount (B16), and P&B/PCI (B17) 
      // are written directly to cells - NO COLUMN A CHECKING

      // Skip fields marked as "Yes" in CSV (new fields needed)
      // Skip Average Rent (auto-calc in sheet)
      if (fieldLower.includes('average rent')) {
        return ''; // Skip - auto-calculated in sheet
      }
      
      // Default: return empty string for unmapped fields
      return '';
    };
    
    // Step 3: Map each row to field value
    rows.forEach((row, index) => {
      const rowNumber = index + 1; // 1-based row number
      const fieldName = row[0] || ''; // Column A
      
      if (fieldName && fieldName.trim() !== '') {
        const value = calculateValue(fieldName);
        if (value !== '') {
          // Column B is index 1, but we'll write to column B (which is column index 1)
          fieldRowMap.set(rowNumber, { fieldName: fieldName.trim(), value });
        }
      }
    });
    
    console.log(`Mapped ${fieldRowMap.size} fields to populate`);
    
    // Step 4: Prepare batch update (write to column B for each row)
    const updates = Array.from(fieldRowMap.entries()).map(([rowNumber, { fieldName, value }]) => ({
      range: `'${TAB_NAME}'!B${rowNumber}`,
      value: value,
    }));
    
    if (updates.length === 0) {
      console.warn('No fields to populate - check field names match CSV mapping');
      return;
    }
    
    console.log('Updates to apply:', updates.map(u => `${u.range} = ${u.value}`));
    
    // Step 5: Add direct cell writes (B14-B27) - NO COLUMN A CHECKING
    // These fields are written directly to specific cells without checking column A
    const directWrites = [];
    
    // B14: Rates (quarterly council rates)
    if (formData.rates) {
      directWrites.push({
        range: `'${TAB_NAME}'!B14`,
        values: [[formData.rates]],
      });
    }
    
    // B15: Insurance Type (dropdown: "Insurance" or "Insurance + Strata")
    if (formData.insuranceType) {
      directWrites.push({
        range: `'${TAB_NAME}'!B15`,
        values: [[formData.insuranceType]],
      });
    } else {
      // Auto-determine insurance type based on title
      const title = formData.propertyDescription?.title?.toLowerCase() || '';
      const hasBodyCorp = title.includes('strata') || title.includes('owners corp');
      const insuranceType = hasBodyCorp ? 'Insurance + Strata' : 'Insurance';
      directWrites.push({
        range: `'${TAB_NAME}'!B15`,
        values: [[insuranceType]],
      });
    }
    
    // B16: Insurance Amount (annual insurance cost)
    if (formData.insuranceAmount) {
      directWrites.push({
        range: `'${TAB_NAME}'!B16`,
        values: [[formData.insuranceAmount]],
      });
    }
    
    // B17: P&B/PCI Report (dropdown: "P&B" for established, "PCI" for new builds)
    if (formData.pbPciReport) {
      directWrites.push({
        range: `'${TAB_NAME}'!B17`,
        values: [[formData.pbPciReport]],
      });
    } else {
      // Auto-determine report type based on property type
      const isNewProperty = formData.decisionTree?.propertyType === 'New';
      const reportType = isNewProperty ? 'PCI' : 'P&B';
      directWrites.push({
        range: `'${TAB_NAME}'!B17`,
        values: [[reportType]],
      });
    }
    
    // B18-B27: Depreciation Years 1-10 (Diminishing Value amounts)
    // Write depreciation values if they exist
    if (formData.depreciation) {
      for (let year = 1; year <= 10; year++) {
        const depreciationValue = formData.depreciation[`year${year}`];
        if (depreciationValue) {
          const rowNumber = 17 + year; // B18 = row 18, B19 = row 19, etc.
          directWrites.push({
            range: `'${TAB_NAME}'!B${rowNumber}`,
            values: [[depreciationValue]],
          });
        }
      }
    }
    
    // Step 6: Write all values (existing updates + direct writes)
    const allUpdates = [
      ...updates.map(update => ({
        range: update.range,
        values: [[update.value]],
      })),
      ...directWrites,
    ];
    
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: allUpdates,
      },
    });
    
    console.log(`✓ Successfully populated ${allUpdates.length} fields (${updates.length} from column A mapping + ${directWrites.length} direct writes)`);
  } catch (error) {
    console.error('Error populating spreadsheet:', error);
    throw error;
  }
}

/**
 * Populate HL Spreadsheet with form data (legacy function - now uses populateSpreadsheet)
 * @deprecated Use populateSpreadsheet instead
 */
export async function populateHLSpreadsheet(
  spreadsheetId: string,
  formData: any
): Promise<void> {
  // Delegate to new function
  return populateSpreadsheet(spreadsheetId, formData);
}

