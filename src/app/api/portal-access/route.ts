import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ADMIN_SHEET_ID = process.env.GOOGLE_SHEET_ID_ADMIN || '1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ';
const PORTAL_ACCESS_TAB_NAME = 'Portal Access Log';

function getSheetsClient() {
  let credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
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

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// POST: Log portal access
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { friendlyName, ghlUserId, baEmail, timestamp } = body;
    
    if (!ADMIN_SHEET_ID) {
      console.error('GOOGLE_SHEET_ID_ADMIN environment variable is not set');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // Check if tab exists and has headers
    let headers: string[] = [];
    try {
      const readResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: ADMIN_SHEET_ID,
        range: `${PORTAL_ACCESS_TAB_NAME}!A1:Z1`,
      });
      headers = (readResponse.data.values?.[0] || []) as string[];
    } catch (error) {
      // Tab might not exist, will create headers
    }
    
    // Create headers if tab is empty or doesn't exist
    if (headers.length === 0) {
      try {
        await sheets.spreadsheets.values.update({
          spreadsheetId: ADMIN_SHEET_ID,
          range: `${PORTAL_ACCESS_TAB_NAME}!A1:D1`,
          valueInputOption: 'RAW',
          requestBody: {
            values: [['Timestamp', 'Friendly Name', 'GHL User ID', 'BA Email']]
          }
        });
        headers = ['Timestamp', 'Friendly Name', 'GHL User ID', 'BA Email'];
      } catch (error) {
        console.error('Error creating headers:', error);
      }
    }
    
    // Append access log entry
    const accessTimestamp = timestamp || new Date().toISOString();
    await sheets.spreadsheets.values.append({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `${PORTAL_ACCESS_TAB_NAME}!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[accessTimestamp, friendlyName || '', ghlUserId || '', baEmail || '']]
      }
    });
    
    console.log(`Portal access logged: ${friendlyName} (${ghlUserId}) at ${accessTimestamp}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Access logged successfully'
    });
  } catch (error) {
    console.error('Error logging portal access:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to log portal access', 
        errorMessage
      },
      { status: 500 }
    );
  }
}
