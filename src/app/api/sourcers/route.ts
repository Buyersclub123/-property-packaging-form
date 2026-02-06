import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ADMIN_SHEET_ID = process.env.GOOGLE_SHEET_ID_ADMIN || '';
const TAB_NAME = 'Packagers & Sourcers';

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
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return google.sheets({ version: 'v4', auth });
}

export async function GET() {
  try {
    if (!ADMIN_SHEET_ID) {
      console.error('GOOGLE_SHEET_ID_ADMIN environment variable is not set');
      return NextResponse.json(
        { error: 'Configuration error', sourcers: [] },
        { status: 500 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // Read from "Packagers & Sourcers" tab, Column C (Friendly Name)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `${TAB_NAME}!C2:C`, // Skip header row
    });

    const rows = response.data.values || [];
    
    // Extract friendly names (short names like "john.t")
    const sourcerNames = rows
      .map((row) => {
        const name = row[0]?.trim();
        return name || null;
      })
      .filter((name): name is string => name !== null && name !== '')
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })); // Alphabetical order

    return NextResponse.json({ sourcers: sourcerNames });
  } catch (error) {
    console.error('Error fetching sourcers from Google Sheet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && error.stack ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to fetch sourcers', 
        errorMessage,
        errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        sourcers: [] 
      },
      { status: 500 }
    );
  }
}
