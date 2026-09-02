import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { logInvestmentHighlightsActivity } from '@/lib/investmentHighlightsLogger';
import { saveInvestmentHighlightsV2 } from '@/lib/investmentHighlightsV2';
import fs from 'fs';
import path from 'path';

function logOrganizePdf(msg: string) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}\n`;
  try { fs.appendFileSync(path.join(process.cwd(), 'logs', 'organize-pdf.log'), line); } catch {}
  console.log(`[organize-pdf] ${msg}`);
}


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
    const { fileId, reportName, validPeriod, suburbs, state, userEmail, mainBody, skipSheetWrite } = body;
    
    logOrganizePdf(`REQUEST: fileId="${fileId||''}" reportName="${reportName||''}" validPeriod="${validPeriod||''}" state="${state||''}" suburbs="${suburbs||''}" skipSheetWrite=${!!skipSheetWrite} mainBodyLen=${(mainBody||'').length}`);
    
    // Log input values for debugging
    console.log('[organize-pdf] Input values:', {
      reportName,
      validPeriod,
      hasValidPeriod: !!validPeriod,
      validPeriodLength: validPeriod?.length || 0,
      suburbs,
      state,
    });
    
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
    
    // Set file permissions: anyone with link can view (read-only)
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });
      console.log('[organize-pdf] File permissions set: anyone with link can view');
    } catch (permError: any) {
      console.warn('[organize-pdf] Failed to set file permissions:', permError.message);
      // Continue even if permissions fail - file will inherit folder permissions
    }
    
    // Get updated file info
    const updatedFile = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    });
    
    const webViewLink = updatedFile.data.webViewLink || '';
    
    // Log final filename for debugging (to verify valid period is included)
    console.log('[organize-pdf] Final file name in Drive:', updatedFile.data.name);
    console.log('[organize-pdf] Valid period used:', validPeriod);
    console.log('[organize-pdf] Expected filename:', newFileName);
    if (updatedFile.data.name !== newFileName) {
      console.warn('[organize-pdf] WARNING: File name mismatch! Expected:', newFileName, 'Got:', updatedFile.data.name);
    }
    
    // Step 7: Save to V2 Google Sheet (skip if called from editor which manages its own sheet writes)
    logOrganizePdf(`Step 7: skipSheetWrite=${!!skipSheetWrite} reportName="${reportName}" state="${state}" validPeriod="${validPeriod}" mainBodyLen=${(mainBody||'').length}`);
    if (!skipSheetWrite) {
      // Parse validPeriod into split fields for V2
      let validFromMonth = '', validFromYear = '', validToMonth = '', validToYear = '';
      const fullMatch = validPeriod.match(/^([A-Za-z]+)\s+(\d{4})\s*-\s*([A-Za-z]+)\s+(\d{4})$/i);
      const shortMatch = validPeriod.match(/^([A-Za-z]+)\s*-\s*([A-Za-z]+)\s+(\d{4})$/i);
      if (fullMatch) {
        validFromMonth = fullMatch[1]; validFromYear = fullMatch[2]; validToMonth = fullMatch[3]; validToYear = fullMatch[4];
      } else if (shortMatch) {
        validFromMonth = shortMatch[1]; validFromYear = shortMatch[3]; validToMonth = shortMatch[2]; validToYear = shortMatch[3];
      }
      logOrganizePdf(`Parsed period: from=${validFromMonth} ${validFromYear} to=${validToMonth} ${validToYear}`);

      try {
        const saveResult = await saveInvestmentHighlightsV2({
          lga: reportName, // Use reportName as LGA fallback
          state,
          suburb: suburbs || '',
          validFromMonth,
          validFromYear,
          validToMonth,
          validToYear,
          mainBody: mainBody || '',
          pdfDriveLink: webViewLink,
          pdfFileId: fileId,
          updatedBy: userEmail || 'organize-pdf',
        });
        logOrganizePdf(`Sheet save OK: ${JSON.stringify(saveResult)}`);
      } catch (saveErr: any) {
        logOrganizePdf(`Sheet save FAILED: ${saveErr.message}`);
        throw saveErr;
      }
    } else {
      logOrganizePdf('Sheet write skipped (skipSheetWrite=true)');
    }
    
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
    logOrganizePdf(`FATAL ERROR: ${error.message}`);
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

