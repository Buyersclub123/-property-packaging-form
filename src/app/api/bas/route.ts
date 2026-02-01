import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ADMIN_SHEET_ID = process.env.GOOGLE_SHEET_ID_ADMIN || '1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ';
const TAB_NAME = 'Packagers & Sourcers'; // Or create new "BAs" tab if needed

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
        { error: 'Configuration error', bas: [] },
        { status: 500 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // Read BA data from Admin Sheet
    // Assumes columns: BA_Name (or Name) and BA_Email (or Email)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `${TAB_NAME}!A:Z`, // Read all columns to find BA_Name and BA_Email
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ bas: [] });
    }

    // First row is headers - find Friendly Name, Email, and GHL user ID columns
    const headers = rows[0];
    const nameIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'friendly name' || 
           h.toString().toLowerCase() === 'friendly_name' ||
           h.toString().toLowerCase() === 'ba_name' || 
           h.toString().toLowerCase() === 'name' ||
           h.toString().toLowerCase() === 'ba name')
    );
    const emailIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'enter bc email below' ||
           h.toString().toLowerCase() === 'ba_email' || 
           h.toString().toLowerCase() === 'email' ||
           h.toString().toLowerCase() === 'ba email')
    );
    const ghlUserIdIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'ghl user id' || 
           h.toString().toLowerCase() === 'ghl_user_id' ||
           h.toString().toLowerCase() === 'ghl userid')
    );

    if (nameIndex === -1 || emailIndex === -1) {
      // If required columns not found, return empty array
      console.warn(`BA columns not found. Available columns: ${headers.join(', ')}`);
      return NextResponse.json({ bas: [] });
    }

    // Process rows (skip header row)
    const bas = rows.slice(1)
      .map(row => ({
        name: (row[nameIndex] || '').toString().trim(),
        email: (row[emailIndex] || '').toString().trim(),
        ghlUserId: ghlUserIdIndex !== -1 ? (row[ghlUserIdIndex] || '').toString().trim() : '',
      }))
      .filter(ba => ba.name && ba.email) // Only include rows with both name and email
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

    return NextResponse.json({ bas });
  } catch (error) {
    console.error('Error loading BAs from Google Sheet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error && error.stack ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to load BA data', 
        errorMessage,
        errorDetails: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        bas: [] 
      },
      { status: 500 }
    );
  }
}
