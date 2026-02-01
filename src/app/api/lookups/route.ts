import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const ADMIN_SHEET_ID = process.env.GOOGLE_SHEET_ID_ADMIN || '1uxhNYe9Qx8g-ZCTOGP27_DS9SdoYe6CVmG1J4fxPsLQ';
const STAGE_LOOKUP_TAB_NAME = 'Pipeline Stage Names'; // Tab for stage ID to name mappings
const BA_TAB_NAME = 'Packagers & Sourcers'; // Existing BA tab

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
        { error: 'Configuration error', baLookup: {}, stageLookup: {} },
        { status: 500 }
      );
    }
    
    const sheets = getSheetsClient();
    
    // Initialize lookup objects
    const baLookup: Record<string, string> = {};
    const stageLookup: Record<string, string> = {};
    
    // Read Stage ID to Name mappings from "Pipeline Stage Names" tab
    try {
      const stageResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: ADMIN_SHEET_ID,
        range: `${STAGE_LOOKUP_TAB_NAME}!A:Z`,
      });
      
      const stageRows = stageResponse.data.values || [];
      if (stageRows.length > 0) {
        const headers = stageRows[0];
        
        // Find "Pipeline Stage ID" and "Stage" columns
        const stageIdIndex = headers.findIndex(h => 
          h && (h.toString().toLowerCase() === 'pipeline stage id' || 
               h.toString().toLowerCase() === 'pipeline_stage_id' ||
               h.toString().toLowerCase() === 'stage_id' ||
               h.toString().toLowerCase() === 'stage id')
        );
        const stageNameIndex = headers.findIndex(h => 
          h && (h.toString().toLowerCase() === 'stage' ||
               h.toString().toLowerCase() === 'stage_name' || 
               h.toString().toLowerCase() === 'stage name' ||
               h.toString().toLowerCase() === 'pipeline_stage')
        );
        
        // Process Stage mappings
        if (stageIdIndex !== -1 && stageNameIndex !== -1) {
          stageRows.slice(1).forEach(row => {
            const id = (row[stageIdIndex] || '').toString().trim();
            const name = (row[stageNameIndex] || '').toString().trim();
            if (id && name) {
              stageLookup[id] = name;
            }
          });
        } else {
          console.warn(`Stage columns not found in "${STAGE_LOOKUP_TAB_NAME}" tab. Available columns: ${headers.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`Error reading "${STAGE_LOOKUP_TAB_NAME}" tab:`, error);
    }
    
    // Read BA ID to Name mappings from "Packagers & Sourcers" tab
    try {
      const baResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: ADMIN_SHEET_ID,
        range: `${BA_TAB_NAME}!A:Z`,
      });
      
      const baRows = baResponse.data.values || [];
      if (baRows.length > 0) {
        const headers = baRows[0];
        
        // Find "GHL user ID" and "Friendly Name" columns
        const baIdIndex = headers.findIndex(h => 
          h && (h.toString().toLowerCase() === 'ghl user id' || 
               h.toString().toLowerCase() === 'ghl_user_id' ||
               h.toString().toLowerCase() === 'user_id' ||
               h.toString().toLowerCase() === 'user id' ||
               h.toString().toLowerCase() === 'ba_id' ||
               h.toString().toLowerCase() === 'ba id' ||
               h.toString().toLowerCase() === 'assigned_to')
        );
        const baNameIndex = headers.findIndex(h => 
          h && (h.toString().toLowerCase() === 'friendly name' || 
               h.toString().toLowerCase() === 'friendly_name' ||
               h.toString().toLowerCase() === 'ba_name' || 
               h.toString().toLowerCase() === 'ba name' ||
               h.toString().toLowerCase() === 'name')
        );
        
        if (baIdIndex !== -1 && baNameIndex !== -1) {
          baRows.slice(1).forEach(row => {
            const id = (row[baIdIndex] || '').toString().trim();
            const name = (row[baNameIndex] || '').toString().trim();
            if (id && name) {
              baLookup[id] = name;
            }
          });
        } else {
          console.warn(`BA columns not found in "${BA_TAB_NAME}" tab. Available columns: ${headers.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`Error reading "${BA_TAB_NAME}" tab for BA ID mappings:`, error);
    }
    
    return NextResponse.json({
      baLookup,
      stageLookup,
    });
  } catch (error) {
    console.error('Error loading lookups from Google Sheet:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to load lookup data', 
        errorMessage,
        baLookup: {},
        stageLookup: {}
      },
      { status: 500 }
    );
  }
}
