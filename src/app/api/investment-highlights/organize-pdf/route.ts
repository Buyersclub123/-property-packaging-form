import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { logInvestmentHighlightsActivity } from '@/lib/investmentHighlightsLogger';
import { getSheetsClient } from '@/lib/googleSheets';

const INVESTMENT_HIGHLIGHTS_SHEET_ID = process.env.GOOGLE_SHEET_ID_INVESTMENT_HIGHLIGHTS || '';
const INVESTMENT_HIGHLIGHTS_TAB_NAME = 'Investment Highlights';

/**
 * Clean report name for filename
 * Removes:
 * - State prefix like "Point Vernon-QLD-" or "Suburb Name-STATE-"
 * - Date suffixes like "(6)-2026-01-22" or "-2026-01-22"
 * - Download counters like "(2)", "(3)"
 * - Extra whitespace
 */
function cleanReportNameForFilename(reportName: string): string {
  let cleaned = reportName.trim();
  
  // Remove state prefix pattern: "Point Vernon-QLD-" or "Suburb Name-STATE-"
  cleaned = cleaned.replace(/^.*?-[A-Z]{2,3}-/i, '');
  
  // Remove date suffix pattern: "(x)-YYYY-MM-DD" or "-YYYY-MM-DD"
  cleaned = cleaned.replace(/\s*\(\d+\)-\d{4}-\d{2}-\d{2}\s*$/i, '');
  cleaned = cleaned.replace(/\s*-\d{4}-\d{2}-\d{2}\s*$/i, '');
  
  // Remove download counter pattern: "(x)" at the end
  cleaned = cleaned.replace(/\s*\(\d+\)\s*$/i, '');
  
  // Remove multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Organize PDF into CURRENT/LEGACY folder structure
 * and save metadata to Google Sheet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, reportName, validPeriod, suburbs, state, userEmail, mainBody } = body;
    
    if (!fileId || !reportName || !validPeriod || !state) {
      return NextResponse.json(
        { error: 'File ID, report name, valid period, and state are required' },
        { status: 400 }
      );
    }
    
    // Initialize Google Drive API
    let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsJson) {
      throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
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
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Get Hotspotting Reports folder ID
    const parentFolderId = process.env.GOOGLE_HOTSPOTTING_FOLDER_ID;
    if (!parentFolderId) {
      throw new Error('GOOGLE_HOTSPOTTING_FOLDER_ID environment variable is not set');
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
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
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
            supportsAllDrives: true,
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
    // Clean report name (remove date suffix, download counter)
    const cleanedReportName = cleanReportNameForFilename(reportName);
    const newFileName = `${cleanedReportName} - ${validPeriod}.pdf`;
    
    console.log('[organize-pdf] Original report name:', reportName);
    console.log('[organize-pdf] Cleaned report name:', cleanedReportName);
    console.log('[organize-pdf] Final filename:', newFileName);
    
    await drive.files.update({
      fileId: fileId,
      addParents: currentFolderId,
      removeParents: parentFolderId,
      requestBody: {
        name: newFileName,
      },
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    
    // Get updated file info
    const updatedFile = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    
    const webViewLink = updatedFile.data.webViewLink || '';
    
    // Step 7: Save to Google Sheet
    await saveToGoogleSheet(
      suburbs || '',
      state,
      reportName,
      validPeriod,
      mainBody || '',
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
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
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
    supportsAllDrives: true,
  });
  
  return folder.data.id;
}

/**
 * Save PDF metadata to Google Sheet
 * Structure: A:Suburbs, B:State, C:ReportName, D:ValidPeriod, E:MainBody, F:ExtraInfo, G-M:Sections, N:PDFLink, O:FileID
 * Updated to support 15 columns (A-O) to match Production structure
 */
async function saveToGoogleSheet(
  suburbs: string,
  state: string,
  reportName: string,
  validPeriod: string,
  mainBody: string,
  pdfLink: string,
  fileId: string
): Promise<void> {
  const sheets = getSheetsClient();
  
  // Check if row exists for this report (read all 15 columns)
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
  // Columns G-M (sections) left empty for now - can be populated later if needed
  const rowData = [
    suburbs || '', // A: Suburbs (comma-separated)
    state, // B: State
    reportName, // C: Report Name
    validPeriod, // D: Valid Period
    mainBody || '', // E: Main Body
    '', // F: Extra Info (empty for now)
    '', // G: Population Growth Context (empty for now)
    '', // H: Residential (empty for now)
    '', // I: Industrial (empty for now)
    '', // J: Commercial and Civic (empty for now)
    '', // K: Health and Education (empty for now)
    '', // L: Transport (empty for now)
    '', // M: Job Implications (empty for now)
    pdfLink, // N: PDF Drive Link
    fileId, // O: PDF File ID
  ];
  
  if (rowIndex >= 0) {
    // EXISTING ROW - Append suburb if not already in list
    const existingRow = rows[rowIndex];
    const existingSuburbs = (existingRow[0] || '').trim();
    
    // Parse existing suburbs
    const suburbList = existingSuburbs
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    
    // Add new suburb if not already in list
    const newSuburb = (suburbs || '').trim();
    if (newSuburb && !suburbList.includes(newSuburb)) {
      suburbList.push(newSuburb);
    }
    
    // Combine back into comma-separated string
    const updatedSuburbs = suburbList.join(', ');
    
    console.log('[organize-pdf] Existing suburbs:', existingSuburbs);
    console.log('[organize-pdf] New suburb:', newSuburb);
    console.log('[organize-pdf] Updated suburbs:', updatedSuburbs);
    
    // Preserve existing Extra Info and sections if they exist
    const existingExtraInfo = existingRow[5] || ''; // Column F
    const existingSections = {
      populationGrowthContext: existingRow[6] || '', // G
      residential: existingRow[7] || '', // H
      industrial: existingRow[8] || '', // I
      commercialAndCivic: existingRow[9] || '', // J
      healthAndEducation: existingRow[10] || '', // K
      transport: existingRow[11] || '', // L
      jobImplications: existingRow[12] || '', // M
    };
    
    // Update row data with preserved values
    rowData[5] = existingExtraInfo; // F: Extra Info
    rowData[6] = existingSections.populationGrowthContext; // G
    rowData[7] = existingSections.residential; // H
    rowData[8] = existingSections.industrial; // I
    rowData[9] = existingSections.commercialAndCivic; // J
    rowData[10] = existingSections.healthAndEducation; // K
    rowData[11] = existingSections.transport; // L
    rowData[12] = existingSections.jobImplications; // M
    
    // Update existing row (all 15 columns: A-O)
    const actualRowNumber = rowIndex + 2; // +2 for header row and 0-index
    await sheets.spreadsheets.values.update({
      spreadsheetId: INVESTMENT_HIGHLIGHTS_SHEET_ID,
      range: `${INVESTMENT_HIGHLIGHTS_TAB_NAME}!A${actualRowNumber}:O${actualRowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });
  } else {
    // Append new row (all 15 columns: A-O)
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
