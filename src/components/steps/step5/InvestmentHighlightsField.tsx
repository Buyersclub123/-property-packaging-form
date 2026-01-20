'use client';

import { useState, useEffect } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';

/**
 * InvestmentHighlightsField Component (Phase 4C)
 * 
 * Purpose: Display and manage investment highlights/hotspotting reports
 * 
 * Phase 4C Features:
 * - Google Sheets lookup by LGA/suburb + state
 * - Auto-lookup on page load
 * - Match found / No match UI
 * - Save new reports to Google Sheet
 * - Auto-growing textarea
 * - Manual paste functionality with smart quote cleanup
 */

interface InvestmentHighlightsFieldProps {
  value: string;
  onChange: (value: string) => void;
  lga?: string;
  suburb?: string;
  state?: string;
  streetAddress?: string; // For logging
  userEmail?: string; // For logging
  disabled?: boolean;
}

export function InvestmentHighlightsField({ 
  value, 
  onChange, 
  lga,
  suburb,
  state,
  streetAddress,
  userEmail,
  disabled = false 
}: InvestmentHighlightsFieldProps) {
  const textareaRef = useAutoResize(value);
  
  const [loading, setLoading] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'checking' | 'found' | 'not-found' | null>(null);
  const [reportName, setReportName] = useState('');
  const [validPeriod, setValidPeriod] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Form fields for saving new report
  const [newReportName, setNewReportName] = useState('');
  const [newValidPeriod, setNewValidPeriod] = useState('');
  const [newMainBody, setNewMainBody] = useState('');
  const [newExtraInfo, setNewExtraInfo] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  
  // PDF upload states
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extractedReportName, setExtractedReportName] = useState('');
  const [extractedValidPeriod, setExtractedValidPeriod] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Auto-lookup on mount
  useEffect(() => {
    if ((lga || suburb) && state && !value) {
      lookupReport();
    }
  }, [lga, suburb, state]);

  const lookupReport = async () => {
    if ((!lga && !suburb) || !state) return;
    
    setLoading(true);
    setMatchStatus('checking');
    setError(null);
    
    try {
      const response = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lga: lga || '', 
          suburb: suburb || '', 
          state 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lookup failed');
      }
      
      const result = await response.json();
      
      if (result.found && result.data) {
        setMatchStatus('found');
        setReportName(result.data.reportName || '');
        setValidPeriod(result.data.validPeriod || '');
        // Combine Main Body and Extra Info for display
        const mainBody = result.data.mainBody || '';
        const extraInfo = result.data.extraInfo || '';
        const combined = mainBody + (extraInfo ? '\n\n' + extraInfo : '');
        onChange(combined);
      } else {
        setMatchStatus('not-found');
      }
    } catch (err) {
      console.error('Investment highlights lookup error:', err);
      setError('Failed to lookup investment highlights. Please enter manually.');
      setMatchStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if ((!lga && !suburb) || !state || !newReportName || !newValidPeriod || !newMainBody) {
      alert('Please fill in Report Name, Valid Period, and Main Body');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/investment-highlights/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburbs: suburb || '', // Comma-separated suburbs (start with current)
          state, 
          reportName: newReportName,
          validPeriod: newValidPeriod,
          mainBody: newMainBody,
          extraInfo: newExtraInfo || '',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }
      
      alert('Investment highlights saved successfully!');
      setShowSaveForm(false);
      setMatchStatus('found');
      setReportName(newReportName);
      setValidPeriod(newValidPeriod);
      // Update display with saved content
      const combined = newMainBody + (newExtraInfo ? '\n\n' + newExtraInfo : '');
      onChange(combined);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save investment highlights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }
    
    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 50MB.');
      return;
    }
    
    setUploadingPdf(true);
    setUploadProgress('Uploading PDF...');
    setError(null);
    
    try {
      // Step 1: Upload PDF to Google Drive
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/investment-highlights/upload-pdf', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      
      const uploadResult = await uploadResponse.json();
      setUploadedFileId(uploadResult.fileId);
      setUploadedFileName(uploadResult.fileName);
      
      // Step 2: Extract metadata from PDF
      setUploadProgress('Extracting metadata...');
      
      const extractResponse = await fetch('/api/investment-highlights/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadResult.fileId }),
      });
      
      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || 'Metadata extraction failed');
      }
      
      const extractResult = await extractResponse.json();
      setExtractedReportName(extractResult.reportName || '');
      setExtractedValidPeriod(extractResult.validPeriod || '');
      
      // Show verification UI
      setShowVerification(true);
      setMatchStatus(null);
    } catch (err: any) {
      console.error('PDF upload error:', err);
      setError(err.message || 'Failed to upload PDF. Please try again.');
    } finally {
      setUploadingPdf(false);
      setUploadProgress('');
    }
  };

  const handleConfirmMetadata = async () => {
    if (!extractedReportName || !extractedValidPeriod) {
      alert('Please fill in Report Name and Valid Period');
      return;
    }
    
    setLoading(true);
    setUploadProgress('Organizing PDF...');
    
    try {
      // Organize PDF into CURRENT/LEGACY folders and save to sheet
      const response = await fetch('/api/investment-highlights/organize-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploadedFileId,
          reportName: extractedReportName,
          validPeriod: extractedValidPeriod,
          suburbs: suburb || '',
          state,
          userEmail: userEmail || 'unknown',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to organize PDF');
      }
      
      const result = await response.json();
      
      // Success - update UI
      setMatchStatus('found');
      setReportName(extractedReportName);
      setValidPeriod(extractedValidPeriod);
      setShowVerification(false);
      
      alert('PDF uploaded and organized successfully!');
      
      // Note: Main body will be populated in Phase 4C-2 with AI summary
      onChange('PDF uploaded. AI summary generation will be available in Phase 4C-2.');
    } catch (err: any) {
      console.error('PDF organization error:', err);
      setError(err.message || 'Failed to organize PDF. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const handleCancelUpload = () => {
    setShowVerification(false);
    setUploadedFileId('');
    setUploadedFileName('');
    setExtractedReportName('');
    setExtractedValidPeriod('');
    setUploadProgress('');
  };

  /**
   * Handle paste event - clean up quotes from clipboard
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Clean up smart quotes and extra whitespace
    let cleaned = pastedText.trim();
    cleaned = cleaned.replace(/^["""''']+/, '');
    cleaned = cleaned.replace(/["""''']+$/, '');
    cleaned = cleaned.trim();
    
    // Insert cleaned text at cursor position or replace selection
    const target = e.target as HTMLTextAreaElement;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const currentValue = target.value;
    
    const newValue = currentValue.substring(0, start) + cleaned + currentValue.substring(end);
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="label-field mb-1">Investment Highlights *</label>
        <p className="text-sm text-gray-600">
          Key investment highlights and infrastructure developments.
        </p>
        {(lga || suburb) && state && (
          <p className="text-xs text-gray-500 mt-1">
            {suburb ? `Suburb: ${suburb}` : `LGA: ${lga}`} ({state})
          </p>
        )}
        
        {loading && matchStatus === 'checking' && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center space-x-2 text-blue-600">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Looking up {suburb || lga}, {state}...</span>
            </div>
          </div>
        )}
        
        {matchStatus === 'found' && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Match Found!</span>
            </div>
            <p className="text-sm text-gray-700">
              <strong>Report:</strong> {reportName}<br />
              {validPeriod && <><strong>Valid Period:</strong> {validPeriod}</>}
            </p>
          </div>
        )}
        
        {matchStatus === 'not-found' && !showVerification && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center space-x-2 text-yellow-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">No Match Found</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              No existing report for {suburb || lga}, {state}.
            </p>
            
            {/* PDF Upload Option */}
            <div className="mt-3 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center bg-white">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
                id="pdf-upload"
                disabled={uploadingPdf}
              />
              <label htmlFor="pdf-upload" className={`cursor-pointer ${uploadingPdf ? 'opacity-50' : ''}`}>
                <div className="text-gray-600">
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-medium">Upload Hotspotting PDF</div>
                  <p className="text-sm mt-1">Drag & drop or click to browse</p>
                  <p className="text-xs text-gray-500 mt-1">(PDF files only, max 50MB)</p>
                </div>
              </label>
              {uploadingPdf && (
                <div className="mt-3 text-sm text-blue-600">
                  {uploadProgress}
                </div>
              )}
            </div>
            
            <div className="my-3 text-center text-sm text-gray-500">
              ─── OR ───
            </div>
            
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {showSaveForm ? 'Hide Manual Entry Form' : 'Show Manual Entry Form'}
            </button>
            
            <div className="mt-3 text-sm text-gray-600">
              💡 Check for latest reports:{' '}
              <a 
                href="https://membership.hotspotting.com.au/hotspotting-reports"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Hotspotting Membership
              </a>
            </div>
          </div>
        )}
        
        {/* PDF Verification UI */}
        {showVerification && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              PDF Uploaded: {uploadedFileName}
            </h4>
            <p className="text-sm text-blue-800 mb-3">📋 Extracted Information:</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={extractedReportName}
                  onChange={(e) => setExtractedReportName(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., SUNSHINE COAST"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Period *
                </label>
                <input
                  type="text"
                  value={extractedValidPeriod}
                  onChange={(e) => setExtractedValidPeriod(e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., October 2025 - January 2026"
                />
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mt-3">
              ⚠️ Please verify the information above is correct
            </p>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleConfirmMetadata}
                disabled={!extractedReportName || !extractedValidPeriod || loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? uploadProgress || 'Processing...' : '✓ Confirm & Continue'}
              </button>
              <button
                onClick={handleCancelUpload}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                ✗ Cancel
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={lookupReport}
              className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
        
        {showSaveForm && matchStatus === 'not-found' && (
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name *
              </label>
              <input
                type="text"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                placeholder="e.g., SUNSHINE COAST"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Period *
              </label>
              <input
                type="text"
                value={newValidPeriod}
                onChange={(e) => setNewValidPeriod(e.target.value)}
                placeholder="e.g., October 2025 - January 2026"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main Body *
              </label>
              <textarea
                value={newMainBody}
                onChange={(e) => setNewMainBody(e.target.value)}
                placeholder="Key investment highlights and infrastructure developments"
                className="w-full p-2 border rounded-md"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Info (Optional)
              </label>
              <textarea
                value={newExtraInfo}
                onChange={(e) => setNewExtraInfo(e.target.value)}
                placeholder="Additional information (optional)"
                className="w-full p-2 border rounded-md"
                rows={2}
              />
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !newReportName || !newValidPeriod || !newMainBody}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Saving...' : 'Save to Google Sheet'}
            </button>
          </div>
        )}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled || loading}
        className="input-field"
        style={{ 
          overflow: 'hidden', 
          resize: 'none',
          minHeight: '150px'
        }}
        placeholder="Investment highlights will appear here, or paste manually..."
        spellCheck={true}
        required
      />
      
      <p className="text-xs text-gray-500">
        You can edit the content above as needed.
      </p>
    </div>
  );
}
