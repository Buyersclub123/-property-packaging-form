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
    setUploadStatus('Preparing images...');

    try {
      const imageData = await Promise.all(
        images.map(async (img) => {
          let fileToProcess = img.file;
          let fileType = img.file.type;

          // Convert WebP to PNG on client side
          if (img.file.type.includes('webp')) {
            setUploadStatus(`Converting WebP image: ${img.file.name}...`);
            try {
              const converted = await convertWebPToSupportedFormat(img.file);
              fileToProcess = new File([converted.blob], img.file.name.replace(/\.webp$/i, '.png'), { type: converted.type });
              fileType = converted.type;
            } catch (convertError) {
              throw new Error(`Failed to convert WebP image "${img.file.name}": ${convertError instanceof Error ? convertError.message : 'Unknown error'}`);
            }
          }

          return new Promise<{ name: string; data: string; type: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1] || result;
              resolve({
                name: fileToProcess.name,
                data: base64,
                type: fileType,
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(fileToProcess);
          });
        })
      );

      setUploadStatus('Generating PDF...');

      const response = await fetch('/api/photos/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageData,
          propertyAddress: propertyAddress.trim(),
          folderId: folderId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      const result = await response.json();
      
      if (result.wasRenamed) {
        setUploadStatus(`PDF generated successfully! (Renamed from "${result.originalFileName}" to avoid duplicate)`);
      } else {
        setUploadStatus('PDF generated successfully!');
      }
      
      setPdfCreated(true);
      setExistingPdfFileName(result.fileName || null);
      
      setTimeout(() => {
        images.forEach(img => URL.revokeObjectURL(img.preview));
        setImages([]);
        setUploadStatus('');
      }, 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
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
