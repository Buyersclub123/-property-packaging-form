export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Upload PDF + Process (testing without pdf-parse)
 */

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'GET works!',
  });
}

export async function POST(request: NextRequest) {
  console.log('🔵 POST endpoint hit!');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    console.log('File received:', file?.name);
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Just return success without PDF parsing
    return NextResponse.json({
      success: true,
      message: 'Route works without pdf-parse!',
      fileName: file.name,
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
