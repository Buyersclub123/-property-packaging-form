import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ADMIN_SHEET_ID = '1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ';
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
    const sheets = getSheetsClient();
    
    // Read from "Packagers & Sourcers" tab, Column A (emails)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `${TAB_NAME}!A2:A`, // Skip header row
    });

    const rows = response.data.values || [];
    
    // Extract part before @ from each email
    const sourcerNames = rows
      .map((row) => {
        const email = row[0]?.trim();
        if (!email) return null;
        // Extract part before @
        const atIndex = email.indexOf('@');
        if (atIndex === -1) return email; // No @ found, return as-is
        return email.substring(0, atIndex);
      })
      .filter((name): name is string => name !== null && name !== '')
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })); // Alphabetical order

    return NextResponse.json({ sourcers: sourcerNames });
  } catch (error) {
    console.error('Error fetching sourcers from Google Sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sourcers', sourcers: [] },
      { status: 500 }
    );
  }
}
