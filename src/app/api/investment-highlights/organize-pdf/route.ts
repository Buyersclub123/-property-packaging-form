import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { logInvestmentHighlightsActivity } from '@/lib/investmentHighlightsLogger';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

/**
 * Organize PDF into CURRENT/LEGACY folder structure
 * and save metadata to Google Sheet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, reportName, validPeriod, suburbs, state, userEmail } = body;
    
    if (!fileId || !reportName || !validPeriod || !state) {
      return NextResponse.json(
        { error: 'File ID, report name, valid period, and state are required' },
        { status: 400 }
      );
    }
    
    // Initialize Google Drive API
    const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (error) {
      throw new Error('Failed to parse GOOGLE_SHEETS_CREDENTIALS');
    }
    
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Get parent folder ID
    const parentFolderId = process.env.GOOGLE_PARENT_FOLDER_ID;
    if (!parentFolderId) {
      throw new Error('GOOGLE_PARENT_FOLDER_ID environment variable is not set');
    }
    
    // Step 1: Find or create "Hotspotting Reports" folder
    const hotspottingFolderId = await findOrCreateFolder(
      drive,
      'Hotspotting Reports',
      parentFolderId
    );
    
    // Step 2: Find or create "[Report Name]" folder
    const reportFolderId = await findOrCreateFolder(
      drive,
      reportName,
      hotspottingFolderId
    );
    
    // Step 3: Find or create "CURRENT" and "LEGACY" subfolders
    const currentFolderId = await findOrCreateFolder(
      drive,
      'CURRENT',
      reportFolderId
    );
    
    const legacyFolderId = await findOrCreateFolder(
      drive,
      'LEGACY',
      reportFolderId
    );
    
    // Step 4: Check if CURRENT folder has existing file
    const currentFiles = await drive.files.list({
      q: `'${currentFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, webViewLink)',
    });
    
    let oldPdfLink = '';
    let oldPdfName = '';
    
    // Step 5: If CURRENT has existing file, move it to LEGACY
    if (currentFiles.data.files && currentFiles.data.files.length > 0) {
      for (const file of currentFiles.data.files) {
        if (file.id) {
          oldPdfLink = file.webViewLink || '';
          oldPdfName = file.name || '';
          
          // Move to LEGACY
          await drive.files.update({
            fileId: file.id,
            addParents: legacyFolderId,
            removeParents: currentFolderId,
            fields: 'id, parents',
          });
          
          // Log superseded action
          if (userEmail && oldPdfLink) {
            await logInvestmentHighlightsActivity({
              actionType: 'Superseded',
              reportName,
              validPeriod: 'Previous version',
              userEmail,
              pdfLink: oldPdfLink,
              details: `Moved to legacy folder: ${oldPdfName}`,
            });
          }
        }
      }
    }
    
    // Step 6: Move new file to CURRENT
    const newFileName = `${reportName} - ${validPeriod}.pdf`;
    
    await drive.files.update({
      fileId: fileId,
      addParents: currentFolderId,
      removeParents: parentFolderId,
      requestBody: {
        name: newFileName,
      },
      fields: 'id, name, webViewLink',
    });
    
    // Get updated file info
    const updatedFile = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink',
    });
    
    const webViewLink = updatedFile.data.webViewLink || '';
    
    // Step 7: Save to Google Sheet
    await saveToGoogleSheet(
      suburbs || '',
      state,
      reportName,
      validPeriod,
      webViewLink,
      fileId
    );
    
    // Step 8: Log upload action
    if (userEmail) {
      await logInvestmentHighlightsActivity({
        actionType: 'Uploaded',
        reportName,
        validPeriod,
        userEmail,
        pdfLink: webViewLink,
        details: `New report uploaded: ${newFileName}`,
      });
    }
    
    return NextResponse.json({
      success: true,
      webViewLink,
      fileId,
      fileName: newFileName,
    });
  } catch (error: any) {
    console.error('PDF organization error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to organize PDF' },
      { status: 500 }
    );
  }
}

/**
 * Find or create a folder in Google Drive
 */
async function findOrCreateFolder(
  drive: any,
  folderName: string,
  parentId: string
): Promise<string> {
  // Search for existing folder
  const query = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
  });
  
  if (response.data.files && response.data.files.length > 0) {
    return response.data.files[0].id;
  }
  
  // Create new folder
  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  };
  
  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });
  
  return folder.data.id;
}

/**
 * Save PDF metadata to Google Sheet
 */
async function saveToGoogleSheet(
  suburbs: string,
  state: string,
  reportName: string,
  validPeriod: string,
  pdfLink: string,
  fileId: string
): Promise<void> {
  const sheets = getSheetsClient();
  
  // Check if row exists for this report
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
    range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A2:O`,
  });
  
  const rows = response.data.values || [];
  const normalizedReportName = reportName.trim().toLowerCase();
  const normalizedState = state.trim().toUpperCase();
  
  // Find existing row by report name and state
  let rowIndex = -1;
  rowIndex = rows.findIndex((row) => {
    const rowReportName = (row[2] || '').trim().toLowerCase(); // Column C
    const rowState = (row[1] || '').trim().toUpperCase(); // Column B
    return rowReportName === normalizedReportName && rowState === normalizedState;
  });
  
  // Prepare row data (15 columns: A-O)
  const rowData = [
    suburbs || '', // A: Suburbs (comma-separated)
    state, // B: State
    reportName, // C: Report Name
    validPeriod, // D: Valid Period
    '', // E: Main Body (will be populated in Phase 4C-2)
    '', // F: Extra Info
    '', // G: Population Growth Context
    '', // H: Residential
    '', // I: Industrial
    '', // J: Commercial and Civic
    '', // K: Health and Education
    '', // L: Transport
    '', // M: Job Implications
    pdfLink, // N: PDF Drive Link
    fileId, // O: PDF File ID
  ];
  
  if (rowIndex >= 0) {
    // Update existing row (only update columns A-D, N, O)
    const actualRowNumber = rowIndex + 2; // +2 for header row and 0-index
    await sheets.spreadsheets.values.update({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A${actualRowNumber}:D${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[suburbs || '', state, reportName, validPeriod]],
      },
    });
    
    // Update PDF link and file ID
    await sheets.spreadsheets.values.update({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!N${actualRowNumber}:O${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[pdfLink, fileId]],
      },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A:O`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });
  }
}
