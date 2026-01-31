import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

  // Remove single quotes if present at start/end (from .env file)
  let cleanedJson = credentialsJson.trim();
  if (cleanedJson.startsWith("'") && cleanedJson.endsWith("'")) {
    cleanedJson = cleanedJson.slice(1, -1);
  }
  if (cleanedJson.startsWith('"') && cleanedJson.endsWith('"')) {
    cleanedJson = cleanedJson.slice(1, -1);
  }

  // Parse JSON - handle multi-line format
  let credentials;
  try {
    credentials = JSON.parse(cleanedJson);
  } catch (error) {
    // If parsing fails, try to clean up newlines and parse again
    try {
      const cleanedJson2 = cleanedJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      credentials = JSON.parse(cleanedJson2);
    } catch (parseError) {
      throw new Error(`Failed to parse GOOGLE_SHEETS_CREDENTIALS: ${parseError instanceof Error ? parseError.message : 'Invalid JSON format'}`);
    }
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

    // Load and embed the Buyers Club logo (for all pages)
    let logoImage: any = null;
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.jpg');
      const logoBytes = readFileSync(logoPath);
      logoImage = await pdfDoc.embedJpg(logoBytes);
    } catch (logoError) {
      console.warn('Failed to load logo, continuing without it:', logoError);
      // Continue without logo if it fails to load
    }
    
    // Load nicer font for address (Helvetica-Bold)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Process images - detect portrait vs landscape to determine images per page
    let currentPage: any = null;
    let imagesOnCurrentPage = 0;
    let imagesPerPage = 2; // Default: 2 landscape images per page
    let currentPageImagesPerPage = 2; // Track images per page for current page
    
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

      // Detect if image is portrait (height > width) - check BEFORE creating page
      const imageDims = embeddedImage.scale(1);
      const isPortrait = imageDims.height > imageDims.width;
      const imagesPerPageForThis = isPortrait ? 1 : 2;

      // Create a new page if needed (first image, or when page is full)
      const needsNewPage = i === 0 || imagesOnCurrentPage >= currentPageImagesPerPage;
      
      if (needsNewPage) {
        currentPage = pdfDoc.addPage([595, 842]); // A4 in points (72 DPI)
        imagesOnCurrentPage = 0;
        currentPageImagesPerPage = imagesPerPageForThis; // Set images per page for this page
        
        const { width, height } = currentPage.getSize();
        
        // Draw Buyers Club logo on top center of every page (larger, prominent branding)
        let scaledLogoWidth = 0;
        let logoHeight = 0;
        if (logoImage) {
          const logoDims = logoImage.scale(1);
          const logoWidth = logoDims.width;
          logoHeight = logoDims.height;
          
          // Larger logo (250px width max)
          const maxLogoWidth = 250;
          const maxLogoHeight = 90;
          const widthRatio = maxLogoWidth / logoWidth;
          const heightRatio = maxLogoHeight / logoHeight;
          const logoScale = Math.min(widthRatio, heightRatio, 1);
          
          scaledLogoWidth = logoWidth * logoScale;
          logoHeight = logoHeight * logoScale;
          
          // Position in top center
          const logoMargin = 20;
          const logoX = (width - scaledLogoWidth) / 2; // Center horizontally
          const logoY = height - logoHeight - logoMargin;
          
          currentPage.drawImage(logoImage, {
            x: logoX,
            y: logoY,
            width: scaledLogoWidth,
            height: logoHeight,
          });
        }
        
        // Add property address on every page (bottom center, larger, nicer font) for symmetry
        {
          const addressMaxWidth = width - 80; // Full width minus side margins (40px each side)
          
          // Professional address formatting - split into logical lines
          const addressLines = [];
          const words = propertyAddress.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            // More accurate text width: 20pt font, roughly 0.6pt per character
            const estimatedWidth = testLine.length * 20 * 0.6;
            
            if (estimatedWidth > addressMaxWidth && currentLine) {
              addressLines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) {
            addressLines.push(currentLine);
          }
          
          // Draw address lines centered at bottom with nicer font
          // Match logo spacing exactly: logo has 20px margin from top + 15px spacing below
          // Address should have 20px margin from bottom + 15px spacing above
          const lineHeight = 24; // Larger line height for better spacing
          const fontSize = 20; // Larger font size
          const totalAddressHeight = addressLines.length * lineHeight;
          const addressBottomMargin = 20; // Match logo top margin (20px) for symmetry
          const addressSpacingAbove = 15; // Match header bottom space (15px) for symmetry
          const startY = addressBottomMargin + totalAddressHeight; // Y position from bottom of page
          
          addressLines.forEach((line, index) => {
            // Calculate text width for centering
            const textWidth = helveticaBoldFont.widthOfTextAtSize(line, fontSize);
            const textX = (width - textWidth) / 2; // Center horizontally
            
            currentPage.drawText(line, {
              x: textX,
              y: startY - (index * lineHeight),
              size: fontSize,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0),
            });
          });
        }
      }

      const { width, height } = currentPage.getSize();
      
      // Calculate margins and spacing - maximize photo size while maintaining symmetry
      const sideMargin = 20; // Minimal side margins to maximize photo width
      const logoTopMargin = 20; // Logo margin from top (matches address bottom margin)
      const logoHeight = 90; // Logo height
      const topMargin = logoHeight + logoTopMargin + 15; // Logo + margin + spacing below logo
      const addressBottomMargin = 20; // Address margin from bottom (matches logo top margin for symmetry)
      const addressHeight = 60; // Approximate address height (max 3 lines * 24px)
      const bottomMargin = addressHeight + addressBottomMargin + 15; // Address + margin + spacing above address
      const headerBottomSpace = 15; // Spacing below header (matches spacing above address)
      const spacingBetweenImages = 25; // Space between two images on same page
      
      // Calculate available height for images
      const availableHeight = height - topMargin - headerBottomSpace - bottomMargin;
      
      // If 2 images on page, need space between them
      const totalSpacing = (currentPageImagesPerPage > 1 && imagesOnCurrentPage > 0) ? spacingBetweenImages : 0;
      const imageHeight = (availableHeight - totalSpacing) / currentPageImagesPerPage;
      const maxWidth = width - (sideMargin * 2);

      // Calculate image dimensions to fit while maintaining aspect ratio
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
      
      // Calculate Y position (from bottom of page) - equal spacing
      let y;
      if (imagesOnCurrentPage === 0) {
        // First image on page - position from top with equal spacing
        y = height - topMargin - headerBottomSpace - scaledHeight;
      } else {
        // Second image on page - position below first image with equal spacing
        y = height - topMargin - headerBottomSpace - imageHeight - spacingBetweenImages - scaledHeight;
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
