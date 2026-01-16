import { NextResponse } from 'next/server';
import { findGoogleSheetsInFolder, populateSpreadsheet } from '@/lib/googleDrive';

const SHARED_DRIVE_ID = '0AFVxBPJiTmjPUk9PVA';

/**
 * Test API route to populate Google Sheets in a folder
 * Used by the standalone test page
 */
export async function POST(request: Request) {
  try {
    const { folderId, formData } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { success: false, error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    console.log('=== TEST POPULATE SHEETS ===');
    console.log('Folder ID:', folderId);
    console.log('Form data keys:', Object.keys(formData));

    // Find all Google Sheets in folder
    const sheets = await findGoogleSheetsInFolder(folderId, SHARED_DRIVE_ID);
    console.log(`Found ${sheets.length} Google Sheets in folder`);
    
    if (sheets.length === 0) {
      return NextResponse.json({
        success: true,
        sheetsFound: 0,
        results: [],
        message: 'No Google Sheets found in folder',
      });
    }

    const results = [];
    
    // Populate ALL sheets found
    for (const sheet of sheets) {
      try {
        console.log(`Populating sheet: ${sheet.name} (${sheet.id})`);
        await populateSpreadsheet(sheet.id, formData, SHARED_DRIVE_ID);
        results.push({ 
          sheet: sheet.name, 
          sheetId: sheet.id,
          success: true,
          message: 'Sheet populated successfully',
        });
        console.log(`✓ Successfully populated: ${sheet.name}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`✗ Error populating ${sheet.name}:`, errorMessage);
        results.push({ 
          sheet: sheet.name,
          sheetId: sheet.id,
          success: false, 
          error: errorMessage,
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: failCount === 0,
      sheetsFound: sheets.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('Error in test-populate-sheets:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to populate sheets' 
      },
      { status: 500 }
    );
  }
}
