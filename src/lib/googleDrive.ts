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
    
    // For Shared Drives, specify parent directly in parents field
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const requestOptions: any = {
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    };

    // If driveId is provided, include it in the request
    if (driveId) {
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
      .map(item => ({ id: item.id, name: item.name }));
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
    
    const updateOptions: any = {
      fileId,
      requestBody: {
        name: newName,
      },
    };
    
    if (driveId) {
      updateOptions.supportsAllDrives = true;
    }
    
    await drive.files.update(updateOptions);
  } catch (error) {
    console.error('Error renaming file:', error);
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
    
    const deleteOptions: any = {
      fileId,
    };
    
    if (driveId) {
      deleteOptions.supportsAllDrives = true;
    }
    
    await drive.files.delete(deleteOptions);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
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
    // Import getSheetsClient from googleSheets.ts
    const { getSheetsClient } = await import('./googleSheets');
    const sheets = getSheetsClient();
    
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
    
    // Calculate values based on CSV mapping
    const calculateValue = (fieldName: string): string => {
      const fieldLower = fieldName.toLowerCase().trim();
      
      // Address mapping
      if (fieldLower.includes('address') && !fieldLower.includes('state')) {
        return formData.address?.propertyAddress || '';
      }
      
      // State mapping
      if (fieldLower.includes('state')) {
        return formData.address?.state || '';
      }
      
      // Land Cost mapping
      if (fieldLower.includes('land cost')) {
        return formData.purchasePrice?.landPrice || '';
      }
      
      // Build Cost mapping
      if (fieldLower.includes('build cost')) {
        return formData.purchasePrice?.buildPrice || '';
      }
      
      // Total Cost (calculated)
      if (fieldLower.includes('total cost')) {
        const land = parseFloat(formData.purchasePrice?.landPrice || '0');
        const build = parseFloat(formData.purchasePrice?.buildPrice || '0');
        if (land && build) {
          return String(land + build);
        }
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
    
    // Step 5: Write values to column B
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates.map(update => ({
          range: update.range,
          values: [[update.value]],
        })),
      },
    });
    
    console.log(`✓ Successfully populated ${updates.length} fields`);
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
    // Import getSheetsClient from googleSheets.ts
    const { getSheetsClient } = await import('./googleSheets');
    const sheets = getSheetsClient();
    
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
    
    // Calculate values based on CSV mapping
    const calculateValue = (fieldName: string): string => {
      const fieldLower = fieldName.toLowerCase().trim();
      
      // Address mapping
      if (fieldLower.includes('address') && !fieldLower.includes('state')) {
        return formData.address?.propertyAddress || '';
      }
      
      // State mapping
      if (fieldLower.includes('state')) {
        return formData.address?.state || '';
      }
      
      // Land Cost mapping
      if (fieldLower.includes('land cost')) {
        return formData.purchasePrice?.landPrice || '';
      }
      
      // Build Cost mapping
      if (fieldLower.includes('build cost')) {
        return formData.purchasePrice?.buildPrice || '';
      }
      
      // Total Cost (calculated)
      if (fieldLower.includes('total cost')) {
        const land = parseFloat(formData.purchasePrice?.landPrice || '0');
        const build = parseFloat(formData.purchasePrice?.buildPrice || '0');
        if (land && build) {
          return String(land + build);
        }
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
    
    // Step 5: Write values to column B
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates.map(update => ({
          range: update.range,
          values: [[update.value]],
        })),
      },
    });
    
    console.log(`✓ Successfully populated ${updates.length} fields`);
  } catch (error) {
    console.error('Error populating spreadsheet:', error);
    throw error;
  }
}

