'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useFormStore } from '@/store/formStore';

interface DocumentFile {
  file: File;
  id: string;
  originalName: string;
  suggestedName: string;
  finalName: string;
  isUploading: boolean;
  uploadError?: string;
  isUploaded?: boolean;
}

export function Step9PhotoDocuments() {
  const { formData } = useFormStore();
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [isDraggingDocs, setIsDraggingDocs] = useState(false);
  const [oversizedFileNotification, setOversizedFileNotification] = useState<string | null>(null);
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

  // Photo PDF generation removed - feature deferred to post-launch

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

  const MAX_UPLOAD_SIZE = 4.5 * 1024 * 1024; // 4.5MB

  const addDocuments = (files: File[]) => {
    const oversizedFiles: File[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      if (file.size > MAX_UPLOAD_SIZE) {
        oversizedFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    // Show friendly notification for oversized files (persists until acknowledged)
    if (oversizedFiles.length > 0) {
      setOversizedFileNotification('Unfortunately there is a max 4.5MB file upload limit. Please either compress or add that doc to the Google Drive directly, not via this tool');
    }

    const newDocs: DocumentFile[] = validFiles.map(file => {
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
    // Don't clear error if there are valid files - only clear if no files at all
    if (validFiles.length === 0 && oversizedFiles.length === 0) {
      setError(null);
    }
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

    // Check file size before upload
    if (doc.file.size > MAX_UPLOAD_SIZE) {
      const sizeMB = (doc.file.size / 1024 / 1024).toFixed(2);
      setDocuments(prev =>
        prev.map(d =>
          d.id === doc.id
            ? { ...d, isUploading: false, uploadError: `File too large (${sizeMB}MB). Maximum size is 4.5MB. Please upload directly to Google Drive.` }
            : d
        )
      );
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
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Check if error is due to file size
        if (response.status === 413 || errorData.error?.includes('4.5MB') || errorData.error?.includes('too large')) {
          const sizeMB = (doc.file.size / 1024 / 1024).toFixed(2);
          throw new Error(`File too large (${sizeMB}MB). Maximum size is 4.5MB. Please upload directly to Google Drive.`);
        }
        
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Remove file from list after successful upload (old functionality)
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setDocuments(prev =>
        prev.map(d =>
          d.id === doc.id
            ? { ...d, isUploading: false, uploadError: errorMessage }
            : d
        )
      );
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
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

    // Upload all documents - they will be removed from the list as they complete
    const docsToUpload = [...documents];
    for (const doc of docsToUpload) {
      await uploadDocument(doc);
    }
  };

  // Photo PDF generation removed - feature deferred to post-launch

  if (!folderLink || !folderId) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Document Upload</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            <strong>Please complete the previous steps first.</strong> The property folder must be created before you can upload documents.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Document Upload</h2>

      {/* Property Address Display */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Property Address:</span>
          <span className="text-sm text-gray-900 font-medium">{propertyAddress || 'Not set'}</span>
        </div>
      </div>

      {/* Google Drive Folder Link */}
      {folderLink && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-900 mb-1">Google Drive Folder</p>
              <a
                href={folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Open folder in Google Drive →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Document Upload</h3>
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 mb-2">
            <strong>File Size Limit:</strong> Maximum upload size is <strong>4.5MB</strong> per file.
          </p>
          <p className="text-sm text-blue-800">
            Files larger than 4.5MB must be uploaded directly to the Google Drive folder (link above). Files uploaded directly to the folder will automatically inherit the correct permissions.
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Upload documents to the property folder (reports, plans, PDFs, etc.)
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
                        onChange={(e) => {
                          setDocuments(prev =>
                            prev.map(d =>
                              d.id === doc.id ? { ...d, finalName: e.target.value } : d
                            )
                          );
                        }}
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600">
                        File size: <span className={doc.file.size > MAX_UPLOAD_SIZE ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                          {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        {doc.file.size > MAX_UPLOAD_SIZE && (
                          <span className="ml-2 text-red-600">⚠️ Exceeds 4.5MB limit</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => uploadDocument(doc)}
                          disabled={doc.isUploading || !propertyAddress.trim() || !folderId || doc.file.size > MAX_UPLOAD_SIZE}
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
                    </div>
                    {doc.uploadError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700 font-semibold mb-1">{doc.uploadError}</p>
                        {doc.uploadError.includes('too large') && folderLink && (
                          <a
                            href={folderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            Upload directly to Google Drive folder
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Oversized File Notification - Modal Pop-up */}
      {oversizedFileNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  {oversizedFileNotification}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setOversizedFileNotification(null)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
