import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ADMIN_SHEET_ID = process.env.GOOGLE_SHEET_ID_ADMIN || '1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ';
const BA_MESSAGES_TAB_NAME = 'BA friendly message for portal';

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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// GET: Read BA messages
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const friendlyName = searchParams.get('friendlyName');
    const ghlUserId = searchParams.get('ghlUserId');
    
    if (!ADMIN_SHEET_ID) {
      console.error('GOOGLE_SHEET_ID_ADMIN environment variable is not set');
      return NextResponse.json(
        { error: 'Configuration error', message: '' },
        { status: 500 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // Read BA messages from sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `${BA_MESSAGES_TAB_NAME}!A:Z`,
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) {
      return NextResponse.json({ message: '' });
    }
    
    const headers = rows[0];
    const friendlyNameIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'friendly name' || 
           h.toString().toLowerCase() === 'friendly_name')
    );
    const ghlUserIdIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'ghl user id' || 
           h.toString().toLowerCase() === 'ghl_user_id' ||
           h.toString().toLowerCase() === 'ghl userid')
    );
    const messageIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'generic message' || 
           h.toString().toLowerCase() === 'generic_message' ||
           h.toString().toLowerCase() === 'message')
    );
    
    if (friendlyNameIndex === -1 || ghlUserIdIndex === -1 || messageIndex === -1) {
      console.warn(`Required columns not found. Available: ${headers.join(', ')}`);
      return NextResponse.json({ message: '' });
    }
    
    // Find matching row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowFriendlyName = (row[friendlyNameIndex] || '').toString().trim();
      const rowGhlUserId = (row[ghlUserIdIndex] || '').toString().trim();
      
      // Match by friendly name or GHL user ID
      if ((friendlyName && rowFriendlyName.toLowerCase() === friendlyName.toLowerCase()) ||
          (ghlUserId && rowGhlUserId === ghlUserId)) {
        const message = (row[messageIndex] || '').toString().trim();
        return NextResponse.json({ message });
      }
    }
    
    // No match found
    return NextResponse.json({ message: '' });
  } catch (error) {
    console.error('Error reading BA messages from Google Sheet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to load BA message', 
        errorMessage,
        message: ''
      },
      { status: 500 }
    );
  }
}

// POST: Write/Update BA message
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { friendlyName, ghlUserId, message } = body;
    
    if (!friendlyName || !ghlUserId) {
      return NextResponse.json(
        { error: 'friendlyName and ghlUserId are required' },
        { status: 400 }
      );
    }
    
    if (!ADMIN_SHEET_ID) {
      console.error('GOOGLE_SHEET_ID_ADMIN environment variable is not set');
      return NextResponse.json(
        { error: 'Configuration error' },
        { status: 500 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // First, read existing data to find row or append
    const readResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: ADMIN_SHEET_ID,
      range: `${BA_MESSAGES_TAB_NAME}!A:Z`,
    });
    
    const rows = readResponse.data.values || [];
    const headers = rows.length > 0 ? rows[0] : [];
    
    // Ensure headers exist
    if (headers.length === 0) {
      // Create headers if tab is empty
      await sheets.spreadsheets.values.update({
        spreadsheetId: ADMIN_SHEET_ID,
        range: `${BA_MESSAGES_TAB_NAME}!A1:C1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Friendly Name', 'GHL user ID', 'Generic Message']]
        }
      });
      headers.push('Friendly Name', 'GHL user ID', 'Generic Message');
    }
    
    const friendlyNameIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'friendly name' || 
           h.toString().toLowerCase() === 'friendly_name')
    );
    const ghlUserIdIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'ghl user id' || 
           h.toString().toLowerCase() === 'ghl_user_id' ||
           h.toString().toLowerCase() === 'ghl userid')
    );
    const messageIndex = headers.findIndex(h => 
      h && (h.toString().toLowerCase() === 'generic message' || 
           h.toString().toLowerCase() === 'generic_message' ||
           h.toString().toLowerCase() === 'message')
    );
    
    if (friendlyNameIndex === -1 || ghlUserIdIndex === -1 || messageIndex === -1) {
      return NextResponse.json(
        { error: 'Required columns not found in sheet' },
        { status: 500 }
      );
    }
    
    // Find existing row
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowGhlUserId = (row[ghlUserIdIndex] || '').toString().trim();
      if (rowGhlUserId === ghlUserId) {
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }
    
    const messageValue = (message || '').toString().trim();
    
    if (rowIndex > 0) {
      // Update existing row
      await sheets.spreadsheets.values.update({
        spreadsheetId: ADMIN_SHEET_ID,
        range: `${BA_MESSAGES_TAB_NAME}!A${rowIndex}:C${rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[friendlyName, ghlUserId, messageValue]]
        }
      });
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: ADMIN_SHEET_ID,
        range: `${BA_MESSAGES_TAB_NAME}!A:C`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[friendlyName, ghlUserId, messageValue]]
        }
      });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Message saved successfully'
    });
  } catch (error) {
    console.error('Error saving BA message to Google Sheet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to save BA message', 
        errorMessage
      },
      { status: 500 }
    );
  }
}
