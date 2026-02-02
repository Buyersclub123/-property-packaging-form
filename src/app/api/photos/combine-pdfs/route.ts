import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { PDFDocument } from 'pdf-lib';
import { Readable } from 'stream';

function getDriveClient() {
  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }

  let cleanedJson = credentialsJson.trim();
  if (cleanedJson.startsWith("'") && cleanedJson.endsWith("'")) {
    cleanedJson = cleanedJson.slice(1, -1);
  }
  if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
    cleanedJson = cleanedJson.slice(1, -1);
  }

  let credentials;
  try {
    credentials = JSON.parse(cleanedJson);
  } catch (error) {
    try {
      const cleanedJson2 = cleanedJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson2);
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
    }
  }

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const { fileIds, propertyAddress, folderId, deleteOriginals = false } = await request.json();

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File IDs are required' },
        { status: 400 }
      );
    }

    if (!propertyAddress || !propertyAddress.trim()) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    if (!folderId || !folderId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const drive = getDriveClient();
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';

    // Download all PDFs from Google Drive
    const pdfBuffers: Buffer[] = [];
    for (const fileId of fileIds) {
      try {
        const response = await drive.files.get(
          {
            fileId: fileId,
            alt: 'media',
            supportsAllDrives: true,
          },
          { responseType: 'arraybuffer' }
        );
        pdfBuffers.push(Buffer.from(response.data as ArrayBuffer));
      } catch (error) {
        console.error(`Failed to download PDF ${fileId}:`, error);
        throw new Error(`Failed to download PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Combine PDFs using pdf-lib
    const mergedPdf = await PDFDocument.create();
    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const combinedPdfBytes = await mergedPdf.save();

    // Upload combined PDF to Google Drive
    const sanitizedAddress = sanitizeFileName(propertyAddress);
    const fileName = `Photos ${sanitizedAddress}.pdf`;

    // Check for duplicates
    let finalFileName = fileName;
    try {
      const escapedFileName = fileName.replace(/'/g, "\\'");
      const listOptions: any = {
        q: `name='${escapedFileName}' and parents in '${folderId}' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };

      if (SHARED_DRIVE_ID) {
        listOptions.driveId = SHARED_DRIVE_ID;
        listOptions.corpora = 'drive';
      }

      const existingFiles = await drive.files.list(listOptions);
      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
        finalFileName = `${nameWithoutExt}-${timestamp}.pdf`;
      }
    } catch (error) {
      console.warn('Failed to check for duplicates, using original filename:', error);
    }

    // Convert Uint8Array to Buffer for Readable stream
    const combinedPdfBuffer = Buffer.from(combinedPdfBytes);

    const fileMetadata = {
      name: finalFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(combinedPdfBuffer),
    };

    const uploadOptions: any = {
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true,
    };

    if (SHARED_DRIVE_ID) {
      uploadOptions.driveId = SHARED_DRIVE_ID;
    }

    const uploadResponse = await drive.files.create(uploadOptions);

    // Optionally delete original PDFs
    const deletedFiles: string[] = [];
    if (deleteOriginals) {
      for (const fileId of fileIds) {
        try {
          await drive.files.delete({
            fileId: fileId,
            supportsAllDrives: true,
          });
          deletedFiles.push(fileId);
        } catch (error) {
          console.warn(`Failed to delete file ${fileId}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      fileName: finalFileName,
      fileId: uploadResponse.data.id,
      wasRenamed: finalFileName !== fileName,
      originalFileName: fileName,
      deletedFiles: deletedFiles.length,
      totalFiles: fileIds.length,
    });
  } catch (error) {
    console.error('Error combining PDFs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to combine PDFs',
      },
      { status: 500 }
    );
  }
}
