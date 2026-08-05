import { NextResponse } from 'next/server';
import {
  findGoogleSheetsInFolder,
  copyFileToFolder,
  deleteFile,
} from '@/lib/googleDrive';
import { google } from 'googleapis';

// Template folder ID — contains the single new template spreadsheet
const TEMPLATE_FOLDER_ID = process.env.CASHFLOW_TEMPLATE_FOLDER_ID || '1N-pFL9A_bm6ue2-d3RxaGrLgQOADFQr_';

/**
 * Extract file/folder ID from Google Drive URL or raw ID
 */
function getIdFromUrl(url: string): string | null {
  if (!url) return null;

  // If it looks like a raw ID (no slashes, no protocol), return as-is
  if (/^[a-zA-Z0-9_-]{10,}$/.test(url.trim())) {
    return url.trim();
  }

  const foldersMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch) return foldersMatch[1];

  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const spreadsheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (spreadsheetMatch) return spreadsheetMatch[1];

  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
}

/**
 * Get a Sheets client from service account credentials
 */
function getSheetsClient() {
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;

  if (!credentialsJson) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsPath = path.join(process.cwd(), 'credentials', 'google-sheets-credentials.json');
      if (fs.existsSync(credentialsPath)) {
        credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      }
    } catch {
      // ignore
    }
  }

  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS not set');
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
  } catch {
    const cleanedJson = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    credentials = JSON.parse(cleanedJson);
  }

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  return google.sheets({ version: 'v4', auth });
}

const TAB_NAME = 'Autofill data';

/**
 * Read all data from the "Autofill data" tab (column A = field names, column B = values)
 */
async function readAutofillData(
  sheetsClient: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string
): Promise<Array<{ row: number; fieldName: string; value: string }>> {
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TAB_NAME}'!A:B`,
  });

  const rows = response.data.values || [];
  const data: Array<{ row: number; fieldName: string; value: string }> = [];

  rows.forEach((row, index) => {
    const fieldName = (row[0] || '').toString().trim();
    const value = (row[1] || '').toString();
    if (fieldName) {
      data.push({ row: index + 1, fieldName, value });
    }
  });

  return data;
}

/**
 * Write values into the "Autofill data" tab of the new sheet,
 * matching by field name in column A
 */
async function writeAutofillData(
  sheetsClient: ReturnType<typeof getSheetsClient>,
  spreadsheetId: string,
  sourceData: Array<{ row: number; fieldName: string; value: string }>
): Promise<{ matched: number; unmatched: string[] }> {
  // Read the new sheet's field names to get their row positions
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: `'${TAB_NAME}'!A:B`,
  });

  const newRows = response.data.values || [];
  if (newRows.length === 0) {
    throw new Error(`New template has no "${TAB_NAME}" tab or it is empty`);
  }

  // Build a map of fieldName → row number in the new sheet
  const newFieldMap = new Map<string, number>();
  newRows.forEach((row, index) => {
    const fieldName = (row[0] || '').toString().trim();
    if (fieldName) {
      newFieldMap.set(fieldName.toLowerCase(), index + 1);
    }
  });

  // Match source data to new sheet rows
  const updates: Array<{ range: string; values: string[][] }> = [];
  const unmatched: string[] = [];
  let matched = 0;

  for (const item of sourceData) {
    if (!item.value) continue; // skip empty values

    const newRow = newFieldMap.get(item.fieldName.toLowerCase());
    if (newRow !== undefined) {
      updates.push({
        range: `'${TAB_NAME}'!B${newRow}`,
        values: [[item.value]],
      });
      matched++;
    } else {
      unmatched.push(item.fieldName);
    }
  }

  // Write all matched values in one batch
  if (updates.length > 0) {
    await sheetsClient.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: updates,
      },
    });
  }

  return { matched, unmatched };
}

/**
 * Fetch the template spreadsheet ID from the configured template folder
 */
async function getTemplateId(sharedDriveId: string): Promise<{ id: string; name: string }> {
  const sheets = await findGoogleSheetsInFolder(TEMPLATE_FOLDER_ID, sharedDriveId);
  if (sheets.length === 0) {
    throw new Error(`No spreadsheet found in template folder (${TEMPLATE_FOLDER_ID})`);
  }
  return sheets[0];
}

/**
 * POST /api/admin/swap-cashflow-template
 *
 * Body: {
 *   action: 'preview' | 'swap' | 'delete',
 *   folderLink: string,              // Google Drive property folder URL or ID
 *   selectedSheetId?: string,        // Which sheet in the folder to swap (required if multiple)
 *   oldSheetId?: string,             // For delete action — the old sheet to remove
 * }
 *
 * Actions:
 *   preview — Lists sheets in folder, reads data, validates against template
 *   swap    — Copies template in, migrates data (does NOT delete old sheet)
 *   delete  — Deletes the specified old sheet
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, folderLink, selectedSheetId, oldSheetId } = body;

    if (!action || !['preview', 'swap', 'delete'].includes(action)) {
      return NextResponse.json({ success: false, error: 'action must be preview, swap, or delete' }, { status: 400 });
    }

    if (!folderLink) {
      return NextResponse.json({ success: false, error: 'folderLink is required' }, { status: 400 });
    }

    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';
    if (!SHARED_DRIVE_ID) {
      return NextResponse.json({ success: false, error: 'GOOGLE_DRIVE_SHARED_DRIVE_ID not configured' }, { status: 500 });
    }

    const folderId = getIdFromUrl(folderLink);
    if (!folderId) {
      return NextResponse.json({ success: false, error: 'Could not extract folder ID from folderLink' }, { status: 400 });
    }

    const log: string[] = [];
    log.push(`Action: ${action}`);
    log.push(`Folder ID: ${folderId}`);

    // === PREVIEW ===
    if (action === 'preview') {
      // Find sheets in property folder
      const sheets = await findGoogleSheetsInFolder(folderId, SHARED_DRIVE_ID);
      log.push(`Found ${sheets.length} sheet(s) in folder`);

      if (sheets.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No Google Sheets found in this property folder',
          log,
        }, { status: 404 });
      }

      // If multiple sheets, return list for user to choose
      if (sheets.length > 1 && !selectedSheetId) {
        log.push('Multiple sheets found — user must select one');
        return NextResponse.json({
          success: true,
          action: 'preview',
          multipleSheets: true,
          sheets: sheets.map(s => ({ id: s.id, name: s.name })),
          log,
        });
      }

      // Determine which sheet to preview
      const targetSheet = selectedSheetId
        ? sheets.find(s => s.id === selectedSheetId) || sheets[0]
        : sheets[0];

      log.push(`Target sheet: "${targetSheet.name}" (${targetSheet.id})`);

      // Read data from old sheet
      const sheetsClient = getSheetsClient();
      let sourceData: Array<{ row: number; fieldName: string; value: string }>;
      try {
        sourceData = await readAutofillData(sheetsClient, targetSheet.id);
        const withValues = sourceData.filter(d => d.value);
        log.push(`Read ${sourceData.length} field rows, ${withValues.length} have values`);
      } catch (readError: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to read sheet: ${readError.message}`,
          log,
        }, { status: 500 });
      }

      // Get template and validate match
      let template: { id: string; name: string };
      let matchPreview = { matched: 0, unmatched: [] as string[] };
      try {
        template = await getTemplateId(SHARED_DRIVE_ID);
        log.push(`Template: "${template.name}" (${template.id})`);

        const newResponse = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: template.id,
          range: `'${TAB_NAME}'!A:B`,
        });
        const newRows = newResponse.data.values || [];
        const newFieldMap = new Map<string, number>();
        newRows.forEach((row, index) => {
          const fieldName = (row[0] || '').toString().trim();
          if (fieldName) newFieldMap.set(fieldName.toLowerCase(), index + 1);
        });

        for (const item of sourceData) {
          if (!item.value) continue;
          if (newFieldMap.has(item.fieldName.toLowerCase())) {
            matchPreview.matched++;
          } else {
            matchPreview.unmatched.push(item.fieldName);
          }
        }
        log.push(`Template has ${newRows.length} rows in "${TAB_NAME}" tab`);
        log.push(`Match: ${matchPreview.matched} fields will transfer, ${matchPreview.unmatched.length} unmatched`);
      } catch (templateError: any) {
        log.push(`Could not read template: ${templateError.message}`);
        return NextResponse.json({
          success: false,
          error: `Template error: ${templateError.message}`,
          log,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'preview',
        multipleSheets: false,
        targetSheet: { name: targetSheet.name, id: targetSheet.id },
        template: { name: template.name, id: template.id },
        dataFields: sourceData.filter(d => d.value).map(d => ({ field: d.fieldName, value: d.value })),
        matchPreview,
        log,
      });
    }

    // === SWAP ===
    if (action === 'swap') {
      if (!selectedSheetId) {
        return NextResponse.json({ success: false, error: 'selectedSheetId is required for swap' }, { status: 400 });
      }

      // Get the old sheet info
      const sheets = await findGoogleSheetsInFolder(folderId, SHARED_DRIVE_ID);
      const oldSheet = sheets.find(s => s.id === selectedSheetId);
      if (!oldSheet) {
        return NextResponse.json({ success: false, error: 'Selected sheet not found in folder', log }, { status: 404 });
      }

      log.push(`Old sheet: "${oldSheet.name}" (${oldSheet.id})`);

      // Read data from old sheet
      const sheetsClient = getSheetsClient();
      let sourceData: Array<{ row: number; fieldName: string; value: string }>;
      try {
        sourceData = await readAutofillData(sheetsClient, oldSheet.id);
        log.push(`Read ${sourceData.filter(d => d.value).length} field values from old sheet`);
      } catch (readError: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to read old sheet: ${readError.message}`,
          log,
        }, { status: 500 });
      }

      // Get template
      let template: { id: string; name: string };
      try {
        template = await getTemplateId(SHARED_DRIVE_ID);
        log.push(`Template: "${template.name}" (${template.id})`);
      } catch (templateError: any) {
        return NextResponse.json({
          success: false,
          error: `Template error: ${templateError.message}`,
          log,
        }, { status: 500 });
      }

      // Copy template into property folder with old sheet's name
      let newSheet: { id: string; name: string };
      try {
        newSheet = await copyFileToFolder(template.id, folderId, SHARED_DRIVE_ID, oldSheet.name);
        log.push(`Copied template into folder as "${newSheet.name}" (${newSheet.id})`);
      } catch (copyError: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to copy template: ${copyError.message}`,
          log,
        }, { status: 500 });
      }

      // Write old data into new sheet
      let writeResult: { matched: number; unmatched: string[] };
      try {
        writeResult = await writeAutofillData(sheetsClient, newSheet.id, sourceData);
        log.push(`Transferred ${writeResult.matched} field values into new sheet`);
        if (writeResult.unmatched.length > 0) {
          log.push(`Unmatched fields: ${writeResult.unmatched.join(', ')}`);
        }
      } catch (writeError: any) {
        log.push(`ERROR writing data: ${writeError.message}`);
        log.push('New sheet created but data migration failed. Old sheet NOT deleted.');
        return NextResponse.json({
          success: false,
          error: `Data migration failed: ${writeError.message}`,
          newSheet: { name: newSheet.name, id: newSheet.id },
          oldSheet: { name: oldSheet.name, id: oldSheet.id },
          log,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'swap',
        oldSheet: { name: oldSheet.name, id: oldSheet.id },
        newSheet: { name: newSheet.name, id: newSheet.id },
        fieldsTransferred: writeResult.matched,
        unmatchedFields: writeResult.unmatched,
        log,
      });
    }

    // === DELETE ===
    if (action === 'delete') {
      if (!oldSheetId) {
        return NextResponse.json({ success: false, error: 'oldSheetId is required for delete' }, { status: 400 });
      }

      log.push(`Deleting old sheet: ${oldSheetId}`);

      try {
        await deleteFile(oldSheetId, SHARED_DRIVE_ID);
        log.push(`Successfully deleted old sheet (${oldSheetId})`);
      } catch (deleteError: any) {
        log.push(`Failed to delete: ${deleteError.message}`);
        return NextResponse.json({
          success: false,
          error: `Failed to delete old sheet: ${deleteError.message}`,
          log,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'delete',
        deletedSheetId: oldSheetId,
        log,
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[swap-cashflow-template] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
