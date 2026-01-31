import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { PDFDocument, rgb } from 'pdf-lib';
import { Readable } from 'stream';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ImageData {
  name: string;
  data: string; // base64
  type: string;
}

function getDriveClient() {
  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  
  if (!credentialsJson) {
    throw new Error('GOOGLE_SHEETS_CREDENTIALS environment variable is not set');
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error('Failed to parse GOOGLE_SHEETS_CREDENTIALS');
  }

  // Fix private key newlines
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
  // Remove invalid characters for file names
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: Request) {
  try {
    const { images, propertyAddress, folderId } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    if (!propertyAddress || !propertyAddress.trim()) {
      return NextResponse.json(
        { error: 'Property address is required' },
        { status: 400 }
      );
    }

    if (!folderId || !folderId.trim()) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }
    
    // Get shared drive ID
    const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID || '';
    
    // Create PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();

    // Load and embed the Buyers Club logo (for first page only)
    let logoImage: any = null;
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.jpg');
      const logoBytes = readFileSync(logoPath);
      logoImage = await pdfDoc.embedJpg(logoBytes);
    } catch (logoError) {
      console.warn('Failed to load logo, continuing without it:', logoError);
      // Continue without logo if it fails to load
    }

    // Process images - 2 per page
    let currentPage: any = null;
    let imagesOnCurrentPage = 0;
    const imagesPerPage = 2;
    
    for (let i = 0; i < images.length; i++) {
      const imageData = images[i];
      
      // Decode base64 image
      const imageBytes = Buffer.from(imageData.data, 'base64');
      
      // Embed image based on type
      let embeddedImage;
      try {
        if (imageData.type.includes('png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (imageData.type.includes('webp')) {
          // pdf-lib doesn't support webp directly, try to convert or use as PNG
          // First try as PNG (sometimes works)
          try {
            embeddedImage = await pdfDoc.embedPng(imageBytes);
          } catch (pngError) {
            // If PNG fails, try as JPEG (webp can sometimes be decoded as JPEG)
            try {
              embeddedImage = await pdfDoc.embedJpg(imageBytes);
            } catch (jpgError) {
              // If both fail, log the error and throw
              console.error(`Failed to embed webp image ${imageData.name}:`, { pngError, jpgError });
              throw new Error(`Unable to process WebP image "${imageData.name}". Please convert it to JPEG or PNG format.`);
            }
          }
        } else if (imageData.type.includes('jpeg') || imageData.type.includes('jpg')) {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          // Default to JPEG for unknown types
          try {
            embeddedImage = await pdfDoc.embedJpg(imageBytes);
          } catch (jpgError) {
            // If JPEG fails, try PNG
            try {
              embeddedImage = await pdfDoc.embedPng(imageBytes);
            } catch (pngError) {
              console.error(`Failed to embed image ${imageData.name} (type: ${imageData.type}):`, { jpgError, pngError });
              throw new Error(`Unable to process image "${imageData.name}" (type: ${imageData.type}). Please use JPEG or PNG format.`);
            }
          }
        }
      } catch (embedError) {
        console.error(`Error embedding image ${imageData.name}:`, embedError);
        throw embedError;
      }

      // Create a new page if needed (first image or every 2 images)
      if (i % imagesPerPage === 0) {
        currentPage = pdfDoc.addPage([595, 842]); // A4 in points (72 DPI)
        imagesOnCurrentPage = 0;
        
        // Add property address header and logo on first page only
        if (i === 0) {
          const { width, height } = currentPage.getSize();
          
          // Draw property address header (left side)
          currentPage.drawText(`Property Photos: ${propertyAddress}`, {
            x: 50,
            y: height - 50 - 30, // 30px space below header
            size: 16,
            color: rgb(0, 0, 0),
          });

          // Draw Buyers Club logo (top right) - maintain aspect ratio
          if (logoImage) {
            const logoDims = logoImage.scale(1);
            const logoWidth = logoDims.width;
            const logoHeight = logoDims.height;
            
            // Set maximum logo size (e.g., 180px width max, maintain aspect ratio)
            const maxLogoWidth = 180;
            const maxLogoHeight = 60;
            const widthRatio = maxLogoWidth / logoWidth;
            const heightRatio = maxLogoHeight / logoHeight;
            const logoScale = Math.min(widthRatio, heightRatio, 1); // Don't scale up
            
            const scaledLogoWidth = logoWidth * logoScale;
            const scaledLogoHeight = logoHeight * logoScale;
            
            // Position in top right with margin
            const logoMargin = 50;
            const logoX = width - scaledLogoWidth - logoMargin;
            const logoY = height - scaledLogoHeight - logoMargin;
            
            currentPage.drawImage(logoImage, {
              x: logoX,
              y: logoY,
              width: scaledLogoWidth,
              height: scaledLogoHeight,
            });
          }
        }
      }

      const { width, height } = currentPage.getSize();
      
      // Calculate margins and spacing
      const margin = 50;
      const headerHeight = i === 0 ? 50 : 0; // Space for header on first page
      const headerBottomSpace = i === 0 ? 30 : 0; // Space below header on first page
      const spacingBetweenImages = 20; // Space between two images on same page
      
      // Calculate available height for images
      // For first page: account for header + space below header
      // For other pages: just margins
      const availableHeight = height - (margin * 2) - headerHeight - headerBottomSpace;
      
      // If 2 images on page, need space between them
      const totalSpacing = imagesOnCurrentPage > 0 ? spacingBetweenImages : 0;
      const imageHeight = (availableHeight - totalSpacing) / imagesPerPage;
      const maxWidth = width - (margin * 2);

      // Calculate image dimensions to fit while maintaining aspect ratio
      const imageDims = embeddedImage.scale(1);
      const imageWidth = imageDims.width;
      const imageHeightActual = imageDims.height;
      
      // Scale to fit within available space
      const widthRatio = maxWidth / imageWidth;
      const heightRatio = imageHeight / imageHeightActual;
      const scale = Math.min(widthRatio, heightRatio, 1); // Don't scale up
      
      const scaledWidth = imageWidth * scale;
      const scaledHeight = imageHeightActual * scale;
      
      // Center horizontally
      const x = (width - scaledWidth) / 2;
      
      // Calculate Y position
      // For first image on page: from top (accounting for header if first page)
      // For second image on page: below first image with spacing
      let y;
      if (imagesOnCurrentPage === 0) {
        // First image on page
        y = height - margin - headerHeight - headerBottomSpace - scaledHeight;
      } else {
        // Second image on page - position below first image
        y = height - margin - headerHeight - headerBottomSpace - imageHeight - spacingBetweenImages - scaledHeight;
      }

      // Draw the image
      currentPage.drawImage(embeddedImage, {
        x: x,
        y: y,
        width: scaledWidth,
        height: scaledHeight,
      });

      imagesOnCurrentPage++;
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Upload to Google Drive
    const drive = getDriveClient();
    const sanitizedAddress = sanitizeFileName(propertyAddress);
    const fileName = `Photos ${sanitizedAddress}.pdf`;

    // Check if file with same name already exists
    let finalFileName = fileName;
    try {
      // Escape single quotes in filename for query
      const escapedFileName = fileName.replace(/'/g, "\\'");
      const listOptions: any = {
        q: `name='${escapedFileName}' and parents in '${folderId}' and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };

      // If shared drive ID is provided, must also set corpora
      if (SHARED_DRIVE_ID) {
        listOptions.driveId = SHARED_DRIVE_ID;
        listOptions.corpora = 'drive';
      }

      const existingFiles = await drive.files.list(listOptions);

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        // File exists - append timestamp to make it unique
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
        finalFileName = `${nameWithoutExt}-${timestamp}.pdf`;
      }
    } catch (error) {
      // If duplicate check fails, just use original filename and continue
      console.warn('Failed to check for duplicate files, using original filename:', error);
    }

    const fileMetadata = {
      name: finalFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: 'application/pdf',
      body: Readable.from(Buffer.from(pdfBytes)),
    };

    const uploadOptions: any = {
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
      supportsAllDrives: true, // Required for Shared Drive compatibility
    };

    // If shared drive ID is provided, include it
    if (SHARED_DRIVE_ID) {
      uploadOptions.driveId = SHARED_DRIVE_ID;
    }

    const uploadResponse = await drive.files.create(uploadOptions);

    // Note: File permissions are inherited from parent folder
    // No explicit permission setting needed - files inherit "Anyone with the link" = Viewer from folder

    return NextResponse.json({
      success: true,
      fileId: uploadResponse.data.id,
      fileName: uploadResponse.data.name,
      folderLink: `https://drive.google.com/drive/folders/${folderId}`,
      fileLink: uploadResponse.data.webViewLink,
      wasRenamed: finalFileName !== fileName, // Indicate if filename was changed due to duplicate
      originalFileName: fileName,
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}
