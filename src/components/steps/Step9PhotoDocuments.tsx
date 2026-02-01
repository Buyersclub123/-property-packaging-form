'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useFormStore } from '@/store/formStore';

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface DocumentFile {
  file: File;
  id: string;
  originalName: string;
  suggestedName: string;
  finalName: string;
  isUploading: boolean;
  uploadError?: string;
}

export function Step9PhotoDocuments() {
  const { formData } = useFormStore();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [pdfCreated, setPdfCreated] = useState(false);
  const [existingPdfFileName, setExistingPdfFileName] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isDraggingDocs, setIsDraggingDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Get property address and folder link from form data
  const propertyAddress = formData.address?.propertyAddress || '';
  const folderLink = formData.address?.folderLink || '';

  // Extract folder ID from folder link
  const extractFolderIdFromLink = (link: string): string | null => {
    if (!link) return null;
    const match = link.match(/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    if (/^[a-zA-Z0-9_-]+$/.test(link.trim())) {
      return link.trim();
    }
    return null;
  };

  const folderId = extractFolderIdFromLink(folderLink);

  // Validate folder exists
  useEffect(() => {
    if (!folderLink) {
      setError('Property folder has not been created yet. Please complete the previous steps first.');
    } else if (!folderId) {
      setError('Invalid folder link. Please ensure the folder was created correctly.');
    } else {
      setError(null);
    }
  }, [folderLink, folderId]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (pdfCreated) return;

    const files = Array.from(e.dataTransfer.files);
    let imageFiles = files.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length === 0 && e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      const filePromises: Promise<File>[] = [];

      for (const item of items) {
        if (item.kind === 'file') {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              filePromises.push(Promise.resolve(file));
            }
          }
        } else if (item.kind === 'string' && item.type === 'text/uri-list') {
          item.getAsString(async (url) => {
            try {
              const file = await fetchImageFromUrl(url);
              addImages([file]);
            } catch (error) {
              setError('Failed to load image from URL. Please try copying the image directly instead.');
            }
          });
          return;
        }
      }

      if (filePromises.length > 0) {
        imageFiles = await Promise.all(filePromises);
      }
    }

    if (imageFiles.length === 0) {
      setError('Please drop image files only');
      return;
    }

    addImages(imageFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    addImages(imageFiles);
  };

  const addImages = (files: File[]) => {
    const newImages: ImageFile[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(7),
    }));

    setImages(prev => [...prev, ...newImages]);
    setError(null);
  };

  const fetchImageFromUrl = async (url: string): Promise<File> => {
    try {
      const response = await fetch('/api/photos/fetch-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image from URL');
      }

      const blob = await response.blob();
      const fileName = url.split('/').pop() || 'image.jpg';
      const file = new File([blob], fileName, { type: blob.type });
      return file;
    } catch (error) {
      const response = await fetch(url);
      const blob = await response.blob();
      const fileName = url.split('/').pop() || 'image.jpg';
      return new File([blob], fileName, { type: blob.type });
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    e.preventDefault();
    
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (blob) {
          const file = new File([blob], `pasted-image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`, { type: blob.type });
          addImages([file]);
          return;
        }
      }
    }

    const text = e.clipboardData?.getData('text');
    if (text) {
      const imageUrlPattern = /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i;
      if (imageUrlPattern.test(text.trim()) || text.trim().startsWith('http')) {
        try {
          setUploadStatus('Fetching image from URL...');
          const file = await fetchImageFromUrl(text.trim());
          addImages([file]);
          setUploadStatus('');
        } catch (error) {
          setError('Failed to load image from URL. Please try copying the image directly instead.');
          setUploadStatus('');
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  const removeImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  // Convert WebP to PNG/JPEG on client side (pdf-lib doesn't support WebP)
  const convertWebPToSupportedFormat = async (file: File): Promise<{ blob: Blob; type: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert WebP image'));
            return;
          }
          resolve({ blob, type: 'image/png' });
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('Failed to load WebP image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Helper: Upload PDF to server
  const uploadPDF = async (pdfBytes: Uint8Array, propertyAddress: string, folderId: string, pdfNumber: number | null = null) => {
    const sanitizedAddress = propertyAddress
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const fileName = pdfNumber !== null ? `Photos ${sanitizedAddress} ${pdfNumber}.pdf` : `Photos ${sanitizedAddress}.pdf`;
    
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
    formData.append('file', pdfBlob, fileName);
    formData.append('propertyAddress', propertyAddress.trim());
    formData.append('folderId', folderId);

    const response = await fetch('/api/photos/upload-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload PDF');
    }

    return await response.json();
  };

  // Helper: Combine multiple PDFs into one
  const combinePDFs = async (pdfBytesArray: Uint8Array[]): Promise<Uint8Array> => {
    const { PDFDocument } = await import('pdf-lib');
    const mergedPdf = await PDFDocument.create();

    for (const pdfBytes of pdfBytesArray) {
      const pdf = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    return await mergedPdf.save();
  };

  const handleGeneratePDF = async () => {
    if (images.length === 0) {
      setError('Please add at least one image');
      return;
    }

    if (!propertyAddress.trim()) {
      setError('Property address is required');
      return;
    }

    if (!folderId) {
      setError('Property folder link is required. Please complete the previous steps first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setUploadStatus('Loading logo...');

    try {
      // Dynamic import for pdf-lib (recommended for client components)
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      // Step 1: Create PDF document FIRST (required before embedding logo)
      const pdfDoc = await PDFDocument.create();
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Step 2: Load logo from public folder
      let logoImage: any = null;
      try {
        const logoResponse = await fetch('/logo.jpg');
        if (logoResponse.ok) {
          const logoBytes = await logoResponse.arrayBuffer();
          logoImage = await pdfDoc.embedJpg(new Uint8Array(logoBytes));
          setUploadStatus('Logo loaded');
        }
      } catch (logoError) {
        console.warn('Logo not found, continuing without it:', logoError);
        // Continue without logo - not critical
        setUploadStatus('Generating PDF (no logo)...');
      }

      // Step 3: Process images (reuse logic from server route)
      let currentPage: any = null;
      let imagesOnCurrentPage = 0;
      let currentPageImagesPerPage = 2;

      setUploadStatus('Processing images...');

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        
        // Convert WebP to PNG if needed (already handled in component, but ensure we have the right file)
        let fileToProcess = img.file;
        if (img.file.type.includes('webp')) {
          try {
            const converted = await convertWebPToSupportedFormat(img.file);
            fileToProcess = new File([converted.blob], img.file.name.replace(/\.webp$/i, '.png'), { type: converted.type });
          } catch (convertError) {
            throw new Error(`Failed to convert WebP image "${img.file.name}": ${convertError instanceof Error ? convertError.message : 'Unknown error'}`);
          }
        }

        // Convert File to ArrayBuffer for embedding
        const imageBytes = await fileToProcess.arrayBuffer();
        
        // Embed image based on type
        let embeddedImage;
        try {
          if (fileToProcess.type.includes('png')) {
            embeddedImage = await pdfDoc.embedPng(new Uint8Array(imageBytes));
          } else if (fileToProcess.type.includes('jpeg') || fileToProcess.type.includes('jpg')) {
            embeddedImage = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
          } else {
            // Try JPEG first, fallback to PNG
            try {
              embeddedImage = await pdfDoc.embedJpg(new Uint8Array(imageBytes));
            } catch {
              embeddedImage = await pdfDoc.embedPng(new Uint8Array(imageBytes));
            }
          }
        } catch (embedError) {
          throw new Error(`Failed to process image "${img.file.name}": ${embedError instanceof Error ? embedError.message : 'Unknown error'}`);
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
          currentPageImagesPerPage = imagesPerPageForThis;
          
          const { width, height } = currentPage.getSize();
          
          // Draw Buyers Club logo on top center of every page
          let scaledLogoWidth = 0;
          let logoHeight = 0;
          if (logoImage) {
            const logoDims = logoImage.scale(1);
            const logoWidth = logoDims.width;
            logoHeight = logoDims.height;
            
            const maxLogoWidth = 250;
            const maxLogoHeight = 90;
            const widthRatio = maxLogoWidth / logoWidth;
            const heightRatio = maxLogoHeight / logoHeight;
            const logoScale = Math.min(widthRatio, heightRatio, 1);
            
            scaledLogoWidth = logoWidth * logoScale;
            logoHeight = logoHeight * logoScale;
            
            const logoMargin = 20;
            const logoX = (width - scaledLogoWidth) / 2;
            const logoY = height - logoHeight - logoMargin;
            
            currentPage.drawImage(logoImage, {
              x: logoX,
              y: logoY,
              width: scaledLogoWidth,
              height: logoHeight,
            });
          }
          
          // Add property address on every page (bottom center)
          const addressMaxWidth = width - 80;
          const addressLines = [];
          const words = propertyAddress.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
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
          
          const lineHeight = 24;
          const fontSize = 20;
          const totalAddressHeight = addressLines.length * lineHeight;
          const addressBottomMargin = 20;
          const addressSpacingAbove = 15;
          const startY = addressBottomMargin + totalAddressHeight;
          
          addressLines.forEach((line, index) => {
            const textWidth = helveticaBoldFont.widthOfTextAtSize(line, fontSize);
            const textX = (width - textWidth) / 2;
            
            currentPage.drawText(line, {
              x: textX,
              y: startY - (index * lineHeight),
              size: fontSize,
              font: helveticaBoldFont,
              color: rgb(0, 0, 0),
            });
          });
        }

        // Draw image on page
        const { width, height } = currentPage.getSize();
        
        const sideMargin = 20;
        const logoTopMargin = 20;
        const logoHeight = 90;
        const topMargin = logoHeight + logoTopMargin + 15;
        const addressBottomMargin = 20;
        const addressHeight = 60;
        const bottomMargin = addressHeight + addressBottomMargin + 15;
        const headerBottomSpace = 15;
        const spacingBetweenImages = 25;
        
        const availableHeight = height - topMargin - headerBottomSpace - bottomMargin;
        const totalSpacing = (currentPageImagesPerPage > 1 && imagesOnCurrentPage > 0) ? spacingBetweenImages : 0;
        const imageHeight = (availableHeight - totalSpacing) / currentPageImagesPerPage;
        const maxWidth = width - (sideMargin * 2);

        const imageWidth = imageDims.width;
        const imageHeightActual = imageDims.height;
        
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

      // Step 4: Generate PDF bytes
      setUploadStatus('Generating PDF...');
      const pdfBytes = await pdfDoc.save();

      // Step 5: Check size and split if needed
      const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5MB
      const SAFE_SIZE = 4.0 * 1024 * 1024; // 4.0MB safety margin
      
      if (pdfBytes.length > MAX_SIZE) {
        // PDF too large - need to split (regenerate with fewer photos per PDF)
        setUploadStatus('PDF too large, splitting into multiple files...');
        
        // Start with more photos per PDF - only split if really needed
        // Calculate optimal photos per PDF based on total images and size
        // Aim for ~3-4MB per PDF (safe margin below 4.5MB limit)
        const estimatedSizePerPhoto = pdfBytes.length / images.length;
        const targetSizePerPDF = 3.5 * 1024 * 1024; // 3.5MB target
        let PHOTOS_PER_PDF = Math.max(15, Math.min(25, Math.floor(targetSizePerPDF / estimatedSizePerPhoto)));
        const totalImages = images.length;
        let numPDFs = Math.ceil(totalImages / PHOTOS_PER_PDF);
        
        let lastResult: any = null;
        const uploadedFiles: string[] = [];
        const uploadedFileIds: string[] = []; // Store file IDs for combining later
        
        for (let pdfIndex = 0; pdfIndex < numPDFs; pdfIndex++) {
          const startIndex = pdfIndex * PHOTOS_PER_PDF;
          const endIndex = Math.min(startIndex + PHOTOS_PER_PDF, totalImages);
          const imagesForThisPDF = images.slice(startIndex, endIndex);
          
          setUploadStatus(`Generating PDF ${pdfIndex + 1} of ${numPDFs}...`);
          
          // Generate PDF with subset of images (reuse same logic as above)
          const splitPdfDoc = await PDFDocument.create();
          const splitHelveticaBoldFont = await splitPdfDoc.embedFont(StandardFonts.HelveticaBold);
          
          // Load logo for split PDFs
          let splitLogoImage: any = null;
          if (logoImage) {
            try {
              const logoResponse = await fetch('/logo.jpg');
              if (logoResponse.ok) {
                const logoBytes = await logoResponse.arrayBuffer();
                splitLogoImage = await splitPdfDoc.embedJpg(new Uint8Array(logoBytes));
              }
            } catch (logoError) {
              // Continue without logo
            }
          }
          
          // Process images for this PDF (same logic as main PDF generation)
          let splitCurrentPage: any = null;
          let splitImagesOnCurrentPage = 0;
          let splitCurrentPageImagesPerPage = 2;
          
          for (let j = 0; j < imagesForThisPDF.length; j++) {
            const img = imagesForThisPDF[j];
            
            let fileToProcess = img.file;
            if (img.file.type.includes('webp')) {
              try {
                const converted = await convertWebPToSupportedFormat(img.file);
                fileToProcess = new File([converted.blob], img.file.name.replace(/\.webp$/i, '.png'), { type: converted.type });
              } catch (convertError) {
                throw new Error(`Failed to convert WebP image "${img.file.name}"`);
              }
            }
            
            const imageBytes = await fileToProcess.arrayBuffer();
            let embeddedImage;
            if (fileToProcess.type.includes('png')) {
              embeddedImage = await splitPdfDoc.embedPng(new Uint8Array(imageBytes));
            } else {
              embeddedImage = await splitPdfDoc.embedJpg(new Uint8Array(imageBytes));
            }
            
            const imageDims = embeddedImage.scale(1);
            const isPortrait = imageDims.height > imageDims.width;
            const imagesPerPageForThis = isPortrait ? 1 : 2;
            
            if (j === 0 || splitImagesOnCurrentPage >= splitCurrentPageImagesPerPage) {
              splitCurrentPage = splitPdfDoc.addPage([595, 842]);
              splitImagesOnCurrentPage = 0;
              splitCurrentPageImagesPerPage = imagesPerPageForThis;
              
              // Draw logo and address (same as main PDF)
              const { width, height } = splitCurrentPage.getSize();
              
              if (splitLogoImage) {
                const logoDims = splitLogoImage.scale(1);
                const logoWidth = logoDims.width;
                const logoHeight = logoDims.height;
                const maxLogoWidth = 250;
                const maxLogoHeight = 90;
                const widthRatio = maxLogoWidth / logoWidth;
                const heightRatio = maxLogoHeight / logoHeight;
                const logoScale = Math.min(widthRatio, heightRatio, 1);
                const scaledLogoWidth = logoWidth * logoScale;
                const scaledLogoHeight = logoHeight * logoScale;
                const logoMargin = 20;
                const logoX = (width - scaledLogoWidth) / 2;
                const logoY = height - scaledLogoHeight - logoMargin;
                
                splitCurrentPage.drawImage(splitLogoImage, {
                  x: logoX,
                  y: logoY,
                  width: scaledLogoWidth,
                  height: scaledLogoHeight,
                });
              }
              
              // Draw address
              const addressMaxWidth = width - 80;
              const addressLines = [];
              const words = propertyAddress.split(' ');
              let currentLine = '';
              for (const word of words) {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
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
              
              const lineHeight = 24;
              const fontSize = 20;
              const totalAddressHeight = addressLines.length * lineHeight;
              const addressBottomMargin = 20;
              const startY = addressBottomMargin + totalAddressHeight;
              
              addressLines.forEach((line, index) => {
                const textWidth = splitHelveticaBoldFont.widthOfTextAtSize(line, fontSize);
                const textX = (width - textWidth) / 2;
                splitCurrentPage.drawText(line, {
                  x: textX,
                  y: startY - (index * lineHeight),
                  size: fontSize,
                  font: splitHelveticaBoldFont,
                  color: rgb(0, 0, 0),
                });
              });
            }
            
            // Draw image
            const { width, height } = splitCurrentPage.getSize();
            const sideMargin = 20;
            const logoTopMargin = 20;
            const logoHeight = 90;
            const topMargin = logoHeight + logoTopMargin + 15;
            const addressBottomMargin = 20;
            const addressHeight = 60;
            const bottomMargin = addressHeight + addressBottomMargin + 15;
            const headerBottomSpace = 15;
            const spacingBetweenImages = 25;
            const availableHeight = height - topMargin - headerBottomSpace - bottomMargin;
            const totalSpacing = (splitCurrentPageImagesPerPage > 1 && splitImagesOnCurrentPage > 0) ? spacingBetweenImages : 0;
            const imageHeight = (availableHeight - totalSpacing) / splitCurrentPageImagesPerPage;
            const maxWidth = width - (sideMargin * 2);
            const imageWidth = imageDims.width;
            const imageHeightActual = imageDims.height;
            const widthRatio = maxWidth / imageWidth;
            const heightRatio = imageHeight / imageHeightActual;
            const scale = Math.min(widthRatio, heightRatio, 1);
            const scaledWidth = imageWidth * scale;
            const scaledHeight = imageHeightActual * scale;
            const x = (width - scaledWidth) / 2;
            let y;
            if (splitImagesOnCurrentPage === 0) {
              y = height - topMargin - headerBottomSpace - scaledHeight;
            } else {
              y = height - topMargin - headerBottomSpace - imageHeight - spacingBetweenImages - scaledHeight;
            }
            
            splitCurrentPage.drawImage(embeddedImage, {
              x: x,
              y: y,
              width: scaledWidth,
              height: scaledHeight,
            });
            
            splitImagesOnCurrentPage++;
          }
          
          let splitPdfBytes = await splitPdfDoc.save();
          
          // Check if this split PDF is still too large - if so, split it further
          // Also check if it exceeds MAX_SIZE (4.5MB) - if so, we MUST split further
          if (splitPdfBytes.length > MAX_SIZE && imagesForThisPDF.length > 1) {
            // PDF exceeds upload limit - must split further
            setUploadStatus(`PDF ${pdfIndex + 1} exceeds 4.5MB limit, splitting further...`);
            
            // Reduce photos per PDF and regenerate
            const photosPerSubPdf = Math.max(1, Math.floor(imagesForThisPDF.length / 2));
            const numSubPDFs = Math.ceil(imagesForThisPDF.length / photosPerSubPdf);
            
            for (let subPdfIndex = 0; subPdfIndex < numSubPDFs; subPdfIndex++) {
              const subStartIndex = subPdfIndex * photosPerSubPdf;
              const subEndIndex = Math.min(subStartIndex + photosPerSubPdf, imagesForThisPDF.length);
              const imagesForSubPdf = imagesForThisPDF.slice(subStartIndex, subEndIndex);
              
              setUploadStatus(`Generating PDF ${pdfIndex + 1}-${subPdfIndex + 1}...`);
              
              // Generate smaller PDF (reuse the same logic but with imagesForSubPdf)
              // ... (same generation code as above)
              // Then check size again before upload
            }
          } else if (splitPdfBytes.length > SAFE_SIZE && imagesForThisPDF.length > 1) {
            // This split PDF is still too large, need to split it further
            setUploadStatus(`PDF ${pdfIndex + 1} still too large, splitting further...`);
            
            // Split this subset into smaller chunks
            const photosPerSubPdf = Math.max(1, Math.floor(imagesForThisPDF.length / 2));
            const numSubPDFs = Math.ceil(imagesForThisPDF.length / photosPerSubPdf);
            
            for (let subPdfIndex = 0; subPdfIndex < numSubPDFs; subPdfIndex++) {
              const subStartIndex = subPdfIndex * photosPerSubPdf;
              const subEndIndex = Math.min(subStartIndex + photosPerSubPdf, imagesForThisPDF.length);
              const imagesForSubPdf = imagesForThisPDF.slice(subStartIndex, subEndIndex);
              
              setUploadStatus(`Generating PDF ${pdfIndex + 1}-${subPdfIndex + 1}...`);
              
              // Generate smaller PDF
              const subPdfDoc = await PDFDocument.create();
              const subHelveticaBoldFont = await subPdfDoc.embedFont(StandardFonts.HelveticaBold);
              
              let subLogoImage: any = null;
              if (logoImage) {
                try {
                  const logoResponse = await fetch('/logo.jpg');
                  if (logoResponse.ok) {
                    const logoBytes = await logoResponse.arrayBuffer();
                    subLogoImage = await subPdfDoc.embedJpg(new Uint8Array(logoBytes));
                  }
                } catch (logoError) {
                  // Continue without logo
                }
              }
              
              let subCurrentPage: any = null;
              let subImagesOnCurrentPage = 0;
              let subCurrentPageImagesPerPage = 2;
              
              for (let k = 0; k < imagesForSubPdf.length; k++) {
                const img = imagesForSubPdf[k];
                
                let fileToProcess = img.file;
                if (img.file.type.includes('webp')) {
                  try {
                    const converted = await convertWebPToSupportedFormat(img.file);
                    fileToProcess = new File([converted.blob], img.file.name.replace(/\.webp$/i, '.png'), { type: converted.type });
                  } catch (convertError) {
                    throw new Error(`Failed to convert WebP image "${img.file.name}"`);
                  }
                }
                
                const imageBytes = await fileToProcess.arrayBuffer();
                let embeddedImage;
                if (fileToProcess.type.includes('png')) {
                  embeddedImage = await subPdfDoc.embedPng(new Uint8Array(imageBytes));
                } else {
                  embeddedImage = await subPdfDoc.embedJpg(new Uint8Array(imageBytes));
                }
                
                const imageDims = embeddedImage.scale(1);
                const isPortrait = imageDims.height > imageDims.width;
                const imagesPerPageForThis = isPortrait ? 1 : 2;
                
                if (k === 0 || subImagesOnCurrentPage >= subCurrentPageImagesPerPage) {
                  subCurrentPage = subPdfDoc.addPage([595, 842]);
                  subImagesOnCurrentPage = 0;
                  subCurrentPageImagesPerPage = imagesPerPageForThis;
                  
                  const { width, height } = subCurrentPage.getSize();
                  
                  if (subLogoImage) {
                    const logoDims = subLogoImage.scale(1);
                    const logoWidth = logoDims.width;
                    const logoHeight = logoDims.height;
                    const maxLogoWidth = 250;
                    const maxLogoHeight = 90;
                    const widthRatio = maxLogoWidth / logoWidth;
                    const heightRatio = maxLogoHeight / logoHeight;
                    const logoScale = Math.min(widthRatio, heightRatio, 1);
                    const scaledLogoWidth = logoWidth * logoScale;
                    const scaledLogoHeight = logoHeight * logoScale;
                    const logoMargin = 20;
                    const logoX = (width - scaledLogoWidth) / 2;
                    const logoY = height - scaledLogoHeight - logoMargin;
                    
                    subCurrentPage.drawImage(subLogoImage, {
                      x: logoX,
                      y: logoY,
                      width: scaledLogoWidth,
                      height: scaledLogoHeight,
                    });
                  }
                  
                  const addressMaxWidth = width - 80;
                  const addressLines = [];
                  const words = propertyAddress.split(' ');
                  let currentLine = '';
                  for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
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
                  
                  const lineHeight = 24;
                  const fontSize = 20;
                  const totalAddressHeight = addressLines.length * lineHeight;
                  const addressBottomMargin = 20;
                  const startY = addressBottomMargin + totalAddressHeight;
                  
                  addressLines.forEach((line, index) => {
                    const textWidth = subHelveticaBoldFont.widthOfTextAtSize(line, fontSize);
                    const textX = (width - textWidth) / 2;
                    subCurrentPage.drawText(line, {
                      x: textX,
                      y: startY - (index * lineHeight),
                      size: fontSize,
                      font: subHelveticaBoldFont,
                      color: rgb(0, 0, 0),
                    });
                  });
                }
                
                const { width, height } = subCurrentPage.getSize();
                const sideMargin = 20;
                const logoTopMargin = 20;
                const logoHeight = 90;
                const topMargin = logoHeight + logoTopMargin + 15;
                const addressBottomMargin = 20;
                const addressHeight = 60;
                const bottomMargin = addressHeight + addressBottomMargin + 15;
                const headerBottomSpace = 15;
                const spacingBetweenImages = 25;
                const availableHeight = height - topMargin - headerBottomSpace - bottomMargin;
                const totalSpacing = (subCurrentPageImagesPerPage > 1 && subImagesOnCurrentPage > 0) ? spacingBetweenImages : 0;
                const imageHeight = (availableHeight - totalSpacing) / subCurrentPageImagesPerPage;
                const maxWidth = width - (sideMargin * 2);
                const imageWidth = imageDims.width;
                const imageHeightActual = imageDims.height;
                const widthRatio = maxWidth / imageWidth;
                const heightRatio = imageHeight / imageHeightActual;
                const scale = Math.min(widthRatio, heightRatio, 1);
                const scaledWidth = imageWidth * scale;
                const scaledHeight = imageHeightActual * scale;
                const x = (width - scaledWidth) / 2;
                let y;
                if (subImagesOnCurrentPage === 0) {
                  y = height - topMargin - headerBottomSpace - scaledHeight;
                } else {
                  y = height - topMargin - headerBottomSpace - imageHeight - spacingBetweenImages - scaledHeight;
                }
                
                subCurrentPage.drawImage(embeddedImage, {
                  x: x,
                  y: y,
                  width: scaledWidth,
                  height: scaledHeight,
                });
                
                subImagesOnCurrentPage++;
              }
              
              const subPdfBytes = await subPdfDoc.save();
              
              // Check size one more time - if still too large, use single photo per PDF
              if (subPdfBytes.length > SAFE_SIZE && imagesForSubPdf.length > 1) {
                // Still too large - upload one photo at a time
                for (let singleIndex = 0; singleIndex < imagesForSubPdf.length; singleIndex++) {
                  const singleImg = imagesForSubPdf[singleIndex];
                  setUploadStatus(`Generating single-photo PDF ${pdfIndex + 1}-${subPdfIndex + 1}-${singleIndex + 1}...`);
                  
                  const singlePdfDoc = await PDFDocument.create();
                  const singleHelveticaBoldFont = await singlePdfDoc.embedFont(StandardFonts.HelveticaBold);
                  
                  let singleLogoImage: any = null;
                  if (logoImage) {
                    try {
                      const logoResponse = await fetch('/logo.jpg');
                      if (logoResponse.ok) {
                        const logoBytes = await logoResponse.arrayBuffer();
                        singleLogoImage = await singlePdfDoc.embedJpg(new Uint8Array(logoBytes));
                      }
                    } catch (logoError) {
                      // Continue without logo
                    }
                  }
                  
                  const singlePage = singlePdfDoc.addPage([595, 842]);
                  const { width, height } = singlePage.getSize();
                  
                  if (singleLogoImage) {
                    const logoDims = singleLogoImage.scale(1);
                    const logoWidth = logoDims.width;
                    const logoHeight = logoDims.height;
                    const maxLogoWidth = 250;
                    const maxLogoHeight = 90;
                    const widthRatio = maxLogoWidth / logoWidth;
                    const heightRatio = maxLogoHeight / logoHeight;
                    const logoScale = Math.min(widthRatio, heightRatio, 1);
                    const scaledLogoWidth = logoWidth * logoScale;
                    const scaledLogoHeight = logoHeight * logoScale;
                    const logoMargin = 20;
                    const logoX = (width - scaledLogoWidth) / 2;
                    const logoY = height - scaledLogoHeight - logoMargin;
                    
                    singlePage.drawImage(singleLogoImage, {
                      x: logoX,
                      y: logoY,
                      width: scaledLogoWidth,
                      height: scaledLogoHeight,
                    });
                  }
                  
                  const addressMaxWidth = width - 80;
                  const addressLines = [];
                  const words = propertyAddress.split(' ');
                  let currentLine = '';
                  for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
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
                  
                  const lineHeight = 24;
                  const fontSize = 20;
                  const totalAddressHeight = addressLines.length * lineHeight;
                  const addressBottomMargin = 20;
                  const startY = addressBottomMargin + totalAddressHeight;
                  
                  addressLines.forEach((line, index) => {
                    const textWidth = singleHelveticaBoldFont.widthOfTextAtSize(line, fontSize);
                    const textX = (width - textWidth) / 2;
                    singlePage.drawText(line, {
                      x: textX,
                      y: startY - (index * lineHeight),
                      size: fontSize,
                      font: singleHelveticaBoldFont,
                      color: rgb(0, 0, 0),
                    });
                  });
                  
                  let fileToProcess = singleImg.file;
                  if (singleImg.file.type.includes('webp')) {
                    try {
                      const converted = await convertWebPToSupportedFormat(singleImg.file);
                      fileToProcess = new File([converted.blob], singleImg.file.name.replace(/\.webp$/i, '.png'), { type: converted.type });
                    } catch (convertError) {
                      throw new Error(`Failed to convert WebP image "${singleImg.file.name}"`);
                    }
                  }
                  
                  const imageBytes = await fileToProcess.arrayBuffer();
                  let embeddedImage;
                  if (fileToProcess.type.includes('png')) {
                    embeddedImage = await singlePdfDoc.embedPng(new Uint8Array(imageBytes));
                  } else {
                    embeddedImage = await singlePdfDoc.embedJpg(new Uint8Array(imageBytes));
                  }
                  
                  const imageDims = embeddedImage.scale(1);
                  const sideMargin = 20;
                  const logoTopMargin = 20;
                  const logoHeight = 90;
                  const topMargin = logoHeight + logoTopMargin + 15;
                  const addressHeight = 60;
                  const bottomMargin = addressHeight + addressBottomMargin + 15;
                  const headerBottomSpace = 15;
                  const availableHeight = height - topMargin - headerBottomSpace - bottomMargin;
                  const maxWidth = width - (sideMargin * 2);
                  const imageWidth = imageDims.width;
                  const imageHeightActual = imageDims.height;
                  const widthRatio = maxWidth / imageWidth;
                  const heightRatio = availableHeight / imageHeightActual;
                  const scale = Math.min(widthRatio, heightRatio, 1);
                  const scaledWidth = imageWidth * scale;
                  const scaledHeight = imageHeightActual * scale;
                  const x = (width - scaledWidth) / 2;
                  const y = height - topMargin - headerBottomSpace - scaledHeight;
                  
                  singlePage.drawImage(embeddedImage, {
                    x: x,
                    y: y,
                    width: scaledWidth,
                    height: scaledHeight,
                  });
                  
                  const singlePdfBytes = await singlePdfDoc.save();
                  
                  // Final safety check - single photo PDFs should always be small
                  if (singlePdfBytes.length > MAX_SIZE) {
                    console.error(`Single photo PDF still exceeds ${MAX_SIZE / 1024 / 1024}MB - this is unusual`);
                    setUploadStatus(`Photo too large, skipping...`);
                    continue; // Skip this photo
                  }
                  
                  const singlePdfNumber = uploadedFiles.length + 1;
                  setUploadStatus(`Uploading PDF ${singlePdfNumber}...`);
                  try {
                    lastResult = await uploadPDF(singlePdfBytes, propertyAddress, folderId, singlePdfNumber);
                    uploadedFiles.push(lastResult.fileName);
                    if (lastResult.fileId) {
                      uploadedFileIds.push(lastResult.fileId);
                    }
                  } catch (uploadError) {
                    // Even single photo PDFs can fail if image is extremely large
                    if (uploadError instanceof Error && (uploadError.message.includes('4.5MB') || uploadError.message.includes('413'))) {
                      console.error('Single photo PDF too large - image may need compression:', uploadError);
                      setUploadStatus(`Photo too large to upload, skipping...`);
                      continue;
                    }
                    throw uploadError;
                  }
                }
              } else {
                // Sub PDF is small enough - verify size before upload
                if (subPdfBytes.length > MAX_SIZE) {
                  // Still too large - split further (shouldn't happen, but safety check)
                  setUploadStatus(`PDF ${pdfIndex + 1}-${subPdfIndex + 1} still too large, splitting to single photos...`);
                  // Fall through to single photo logic - handled above
                  continue;
                }
                
                const subPdfNumber = uploadedFiles.length + 1;
                setUploadStatus(`Uploading PDF ${subPdfNumber}...`);
                try {
                  lastResult = await uploadPDF(subPdfBytes, propertyAddress, folderId, subPdfNumber);
                  uploadedFiles.push(lastResult.fileName);
                  if (lastResult.fileId) {
                    uploadedFileIds.push(lastResult.fileId);
                  }
                } catch (uploadError) {
                  // If upload fails due to size, handle gracefully
                  if (uploadError instanceof Error && (uploadError.message.includes('4.5MB') || uploadError.message.includes('413'))) {
                    setUploadStatus(`PDF too large for upload, splitting further...`);
                    console.error('Upload failed due to size, will split further:', uploadError);
                    // This PDF will need to be split further - for now, skip and continue
                    continue;
                  }
                  throw uploadError;
                }
              }
            }
          } else {
            // Split PDF is small enough - verify size before upload
            if (splitPdfBytes.length > MAX_SIZE) {
              // Still too large - this means our calculation was wrong
              setUploadStatus(`PDF ${pdfIndex + 1} still too large (calculation error), splitting further...`);
              // Reduce photos per PDF and continue to next iteration
              // The recursive splitting logic above should handle this, but as a fallback:
              console.warn(`PDF ${pdfIndex + 1} exceeds ${MAX_SIZE / 1024 / 1024}MB, calculation may be incorrect`);
              // Skip this PDF - it will need manual splitting
              continue;
            }
            
            const pdfNumber = uploadedFiles.length + 1;
            setUploadStatus(`Uploading PDF ${pdfNumber}...`);
            try {
              lastResult = await uploadPDF(splitPdfBytes, propertyAddress, folderId, pdfNumber);
              uploadedFiles.push(lastResult.fileName);
              if (lastResult.fileId) {
                uploadedFileIds.push(lastResult.fileId);
              }
            } catch (uploadError) {
              // If upload fails due to size, handle gracefully
              if (uploadError instanceof Error && (uploadError.message.includes('4.5MB') || uploadError.message.includes('413'))) {
                setUploadStatus(`PDF too large for upload, will split further...`);
                console.error('Upload failed due to size:', uploadError);
                // This shouldn't happen if our size checks are correct, but handle it
                continue;
              }
              throw uploadError;
            }
          }
        }
        
        // Combine all PDFs into one (server-side, no size limit)
        if (uploadedFileIds.length > 1) {
          setUploadStatus(`Combining ${uploadedFileIds.length} PDFs into one document...`);
          
          try {
            const combineResponse = await fetch('/api/photos/combine-pdfs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileIds: uploadedFileIds,
                propertyAddress: propertyAddress.trim(),
                folderId: folderId,
                deleteOriginals: true, // Delete individual PDFs after combining
              }),
            });
            
            if (combineResponse.ok) {
              const combineResult = await combineResponse.json();
              setUploadStatus('PDFs combined successfully!');
              setPdfCreated(true);
              setExistingPdfFileName(combineResult.fileName);
            } else {
              const errorData = await combineResponse.json();
              console.error('Failed to combine PDFs:', errorData);
              // If combine fails, just keep the split versions
              const totalUploaded = uploadedFiles.length;
              setUploadStatus(`Created ${totalUploaded} PDF file(s) (combine failed)`);
              setPdfCreated(true);
              setExistingPdfFileName(totalUploaded > 0 ? uploadedFiles.join(', ') : null);
            }
          } catch (combineError) {
            console.error('Failed to combine PDFs:', combineError);
            // If combine fails, just keep the split versions
            const totalUploaded = uploadedFiles.length;
            setUploadStatus(`Created ${totalUploaded} PDF file(s)`);
            setPdfCreated(true);
            setExistingPdfFileName(totalUploaded > 0 ? uploadedFiles.join(', ') : null);
          }
        } else {
          // Only one PDF was created
          const totalUploaded = uploadedFiles.length;
          setUploadStatus(`Successfully created ${totalUploaded} PDF file(s)`);
          setPdfCreated(true);
          setExistingPdfFileName(totalUploaded > 0 ? uploadedFiles.join(', ') : null);
        }
      } else {
        // Step 6: Upload single PDF
        setUploadStatus('Uploading PDF...');
        const result = await uploadPDF(pdfBytes, propertyAddress, folderId, null);
        
        if (result.wasRenamed) {
          setUploadStatus(`PDF generated successfully! (Renamed from "${result.originalFileName}" to avoid duplicate)`);
        } else {
          setUploadStatus('PDF generated successfully!');
        }
        
        setPdfCreated(true);
        setExistingPdfFileName(result.fileName || null);
      }
      
      setTimeout(() => {
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        setUploadStatus('');
      }, 5000);
    } catch (err) {
      // Specific error handling
      if (err instanceof Error) {
        if (err.message.includes('Failed to process image')) {
          setError(`Image processing error: ${err.message}. Please try a different image.`);
        } else if (err.message.includes('Failed to upload')) {
          setError(`Upload failed: ${err.message}. Please try again.`);
        } else if (err.message.includes('exceeds')) {
          setError(`PDF is too large. The system will split it into multiple files.`);
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('PDF generation error:', err);
      setUploadStatus('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClear = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setError(null);
    setUploadStatus('');
  };

  const handleImageDragStart = (e: React.DragEvent, imageId: string) => {
    setDraggedImageId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', imageId);
  };

  const handleImageDragOver = (e: React.DragEvent, imageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedImageId && draggedImageId !== imageId) {
      setDragOverImageId(imageId);
    }
  };

  const handleImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverImageId(null);
  };

  const handleImageDrop = (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverImageId(null);

    if (!draggedImageId || draggedImageId === targetImageId) {
      setDraggedImageId(null);
      return;
    }

    setImages((prevImages) => {
      const draggedIndex = prevImages.findIndex(img => img.id === draggedImageId);
      const targetIndex = prevImages.findIndex(img => img.id === targetImageId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prevImages;
      }

      const newImages = [...prevImages];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, removed);

      return newImages;
    });

    setDraggedImageId(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const suggestCleanFileName = (fileName: string): string => {
    let cleaned = fileName.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
    cleaned = cleaned.replace(/--+/g, '-');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.trim();
    cleaned = cleaned.replace(/[- ]+\.([^.]+)$/, '.$1');
    return cleaned || fileName;
  };

  const handleDocumentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDocs(false);

    const files = Array.from(e.dataTransfer.files);
    addDocuments(files);
  };

  const handleDocumentFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addDocuments(files);
  };

  const addDocuments = (files: File[]) => {
    const newDocs: DocumentFile[] = files.map(file => {
      const suggestedName = suggestCleanFileName(file.name);
      return {
        file,
        id: Math.random().toString(36).substring(7),
        originalName: file.name,
        suggestedName: suggestedName,
        finalName: suggestedName,
        isUploading: false,
      };
    });

    setDocuments(prev => [...prev, ...newDocs]);
    setError(null);
  };

  const updateDocumentName = (id: string, newName: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === id ? { ...doc, finalName: newName } : doc
      )
    );
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const uploadDocument = async (doc: DocumentFile) => {
    if (!propertyAddress.trim()) {
      setError('Property address is required');
      return;
    }

    if (!folderId) {
      setError('Property folder link is required. Please complete the previous steps first.');
      return;
    }

    setDocuments(prev =>
      prev.map(d =>
        d.id === doc.id ? { ...d, isUploading: true, uploadError: undefined } : d
      )
    );

    try {
      const formData = new FormData();
      formData.append('file', doc.file);
      formData.append('fileName', doc.finalName);
      formData.append('propertyAddress', propertyAddress.trim());
      formData.append('folderId', folderId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload document');
      }

      const result = await response.json();
      
      if (result.wasRenamed) {
        setUploadStatus(`Document uploaded! (Renamed from "${result.originalFileName}" to avoid duplicate)`);
        setTimeout(() => setUploadStatus(''), 5000);
      }

      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (error) {
      setDocuments(prev =>
        prev.map(d =>
          d.id === doc.id
            ? { ...d, isUploading: false, uploadError: error instanceof Error ? error.message : 'Upload failed' }
            : d
        )
      );
    }
  };

  const uploadAllDocuments = async () => {
    if (documents.length === 0) return;
    if (!propertyAddress.trim()) {
      setError('Property address is required');
      return;
    }
    if (!folderId) {
      setError('Property folder link is required. Please complete the previous steps first.');
      return;
    }

    for (const doc of documents) {
      await uploadDocument(doc);
    }
  };

  const handleStartOver = () => {
    images.forEach(img => URL.revokeObjectURL(img.preview));
    setImages([]);
    setPdfCreated(false);
    setExistingPdfFileName(null);
    setUploadStatus('');
    setError(null);
  };

  // Show error if folder not created
  if (!folderLink) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Photo & Document Upload</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            <strong>Please complete the previous steps first.</strong> The property folder must be created before you can upload photos and documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Photo & Document Upload</h2>

      {/* Property Address Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Property Address:</span>
          <span className="text-sm text-gray-900 font-medium">{propertyAddress || 'Not set'}</span>
        </div>
      </div>

      {/* PDF Created Status */}
      {pdfCreated && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-green-800 mb-2">
              ✓ PDF Created Successfully!
            </p>
            {existingPdfFileName && (
              <p className="text-sm text-green-700 mb-2">
                File: <strong>{existingPdfFileName}</strong>
              </p>
            )}
            {folderLink && (
              <div className="mb-3">
                <a
                  href={folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Open folder in Google Drive →
                </a>
              </div>
            )}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Want to create a new PDF?</strong> First delete the existing PDF file "{existingPdfFileName}" from the folder above.
              </p>
              <p className="text-sm text-blue-800">
                <strong>How to delete:</strong> Click on the 3 dots at the end of the file name and select: "Move to trash". Then click "Start Over" below.
              </p>
            </div>
            <div>
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Property Photos</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload photos to create a PDF document. Photos will be arranged 2 per page with the property address as a header.
        </p>

        {/* Drag & Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${
            pdfCreated
              ? 'border-gray-200 bg-gray-50 opacity-60'
              : isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-white'
          }`}
          onDragOver={pdfCreated ? undefined : handleDragOver}
          onDragEnter={pdfCreated ? undefined : handleDragOver}
          onDragLeave={pdfCreated ? undefined : handleDragLeave}
          onDrop={pdfCreated ? undefined : handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer"
          >
            <div className="text-gray-600">
              <div className="text-4xl mb-4">📷</div>
              <div className="font-medium text-lg mb-2">
                Drag & drop images here
              </div>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse, or paste (Ctrl+V / Cmd+V)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pdfCreated}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Select Images
              </button>
              {pdfCreated && (
                <p className="text-sm text-gray-500 mt-2">
                  PDF already created. Click "Start Over" above to add more photos.
                </p>
              )}
            </div>
          </label>
        </div>

        {/* Image Thumbnails */}
        {images.length > 0 && !pdfCreated && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold">
                Images ({images.length} selected)
              </h4>
              <button
                onClick={handleClear}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={(e) => handleImageDragStart(e, img.id)}
                  onDragOver={(e) => handleImageDragOver(e, img.id)}
                  onDragLeave={handleImageDragLeave}
                  onDrop={(e) => handleImageDrop(e, img.id)}
                  onDragEnd={handleImageDragEnd}
                  className={`relative group cursor-move ${
                    draggedImageId === img.id ? 'opacity-50' : ''
                  } ${
                    dragOverImageId === img.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                >
                  <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center z-10">
                    {index + 1}
                  </div>
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="w-full h-32 object-cover rounded-md border border-gray-200"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    ×
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {img.file.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Status Message */}
        {uploadStatus && (
          <div className={`mb-4 p-4 rounded-md ${
            uploadStatus.includes('successfully')
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm ${
              uploadStatus.includes('successfully')
                ? 'text-green-700'
                : 'text-blue-700'
            }`}>
              {uploadStatus}
            </p>
          </div>
        )}

        {/* Generate PDF Button */}
        {!pdfCreated && (
          <div className="flex gap-4">
            <button
              onClick={handleGeneratePDF}
              disabled={isGenerating || images.length === 0 || !propertyAddress.trim() || !folderId}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isGenerating ? 'Generating PDF...' : 'Generate PDF & Upload to Drive'}
            </button>
          </div>
        )}
      </div>

      {/* Additional Document Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Additional Document Upload</h3>
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ⚠️ <strong>Important:</strong> Please use the automated upload function below for additional docs. As manually moving files into the property folder can "break" permission inheritance, so clients might not be able to see documents, or might even be able to edit documents.
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Upload other documents to the property folder (reports, plans, etc.)
        </p>

        {/* Document Drag & Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors mb-6 ${
            isDraggingDocs
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-white'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingDocs(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingDocs(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingDocs(false);
          }}
          onDrop={handleDocumentDrop}
        >
          <input
            ref={docInputRef}
            type="file"
            multiple
            onChange={handleDocumentFileSelect}
            className="hidden"
          />
          <label htmlFor="doc-upload" className="cursor-pointer">
            <div className="text-gray-600">
              <div className="text-4xl mb-4">📄</div>
              <div className="font-medium text-lg mb-2">
                Drag & drop documents here
              </div>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse
              </p>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Select Documents
              </button>
            </div>
          </label>
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold">
                Documents ({documents.length} selected)
              </h4>
              <button
                onClick={uploadAllDocuments}
                disabled={!propertyAddress.trim() || !folderId}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload All to Drive
              </button>
            </div>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Original File Name
                      </label>
                      <textarea
                        readOnly
                        value={doc.originalName}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-600 resize-none overflow-y-auto break-all"
                        style={{ minHeight: '60px', maxHeight: '200px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        File Name (<span className="font-bold underline">This is the name the file will be saved with</span>)
                      </label>
                      <textarea
                        value={doc.finalName}
                        onChange={(e) => updateDocumentName(doc.id, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none overflow-y-auto"
                        placeholder="Enter file name"
                        style={{ minHeight: '60px', maxHeight: '200px' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={() => uploadDocument(doc)}
                        disabled={doc.isUploading || !propertyAddress.trim() || !folderId}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {doc.isUploading ? 'Uploading...' : 'Upload to Drive'}
                      </button>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        disabled={doc.isUploading}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    {doc.uploadError && (
                      <p className="text-sm text-red-600">{doc.uploadError}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
