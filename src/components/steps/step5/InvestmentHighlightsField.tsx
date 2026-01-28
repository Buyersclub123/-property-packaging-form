'use client';

import { useState, useEffect, useRef } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';
import { ReportDropdown, type ReportOption } from './ReportDropdown';
import { useFormStore } from '@/store/formStore';

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
  const { updateFormData } = useFormStore();
  
  const [loading, setLoading] = useState(false);
  const [matchStatus, setMatchStatus] = useState<'checking' | 'found' | 'not-found' | null>(null);
  const [reportName, setReportName] = useState('');
  const [validPeriod, setValidPeriod] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dateStatus, setDateStatus] = useState<any>(null);
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);
  
  // Debug logging removed - was causing excessive logs on every render
  
  // Form fields for saving new report
  const [newReportName, setNewReportName] = useState('');
  const [newValidPeriod, setNewValidPeriod] = useState('');
  const [newMainBody, setNewMainBody] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  
  // PDF upload states
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extractedReportName, setExtractedReportName] = useState('');
  const [extractedValidPeriod, setExtractedValidPeriod] = useState('');
  const [extractedMainBody, setExtractedMainBody] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [reportNameVerified, setReportNameVerified] = useState(false);
  const [validPeriodVerified, setValidPeriodVerified] = useState(false);
  const [extractionConfidence, setExtractionConfidence] = useState<any>(null);
  
  // AI Summary states (Phase 4C-2)
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Track if we've already done a lookup (prevent multiple calls)
  const hasLookedUpRef = useRef(false);
  
  // Check for pre-loaded data from Step 1A
  useEffect(() => {
    // First, check if we have pre-loaded data from Step 1A
    const earlyProcessing = (window as any).__formStore?.getState?.()?.formData?.earlyProcessing;
    
    if (earlyProcessing?.investmentHighlights?.status === 'ready' && !hasLookedUpRef.current) {
      console.log('[InvestmentHighlights] Using pre-loaded data from Step 1A');
      hasLookedUpRef.current = true;
      
      const ihData = earlyProcessing.investmentHighlights;
      
      // Set the match status
      setMatchStatus('found');
      setReportName(ihData.data?.reportName || '');
      setValidPeriod(ihData.data?.validPeriod || '');
      setDateStatus(ihData.dateStatus || null);
      
      // If data is already populated, don't trigger another lookup
      if (value && value.trim() !== '') {
        console.log('[InvestmentHighlights] Value already populated, skipping lookup');
        return;
      }
      
      // Value is already set in formData by Step 1A, just update UI
      return;
    }
    
    // Fallback: If no pre-loaded data, do the lookup as before
    if ((lga || suburb) && state && !value && !hasLookedUpRef.current) {
      console.log('[InvestmentHighlights] No pre-loaded data, triggering lookup...');
      hasLookedUpRef.current = true;
      lookupReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lga, suburb, state]); // Removed 'value' to prevent infinite loop

  const handleDropdownSelect = async (report: ReportOption) => {
    console.log('[InvestmentHighlights] Dropdown selection:', report);
    
    setLoading(true);
    setSelectedFromDropdown(true);
    
    try {
      // Fetch full report data using the fileId
      // For now, we'll use the lookup API with the report's suburbs
      // In Phase 2, we'll add an API to fetch by fileId
      
      // Parse suburbs string (comma-separated) into array
      const suburbsArray = report.suburbs.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      const firstSuburb = suburbsArray[0] || '';
      
      const response = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suburb: firstSuburb,
          state: report.state 
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }
      
      const result = await response.json();
      
      if (result.found && result.data) {
        setMatchStatus('found');
        setReportName(result.data.reportName || '');
        setValidPeriod(result.data.validPeriod || '');
        setDateStatus(result.dateStatus || null);
        
        // Use Main Body for display
        const mainBody = result.data.mainBody || '';
        const combined = mainBody;
        
        // Update parent form state
        onChange(combined);
        
        // Store PDF link, fileId, and reportName in form state (for folder creation and submission)
        // Note: Lookup API returns pdfDriveLink and pdfFileId (matching column headers F&G)
        updateFormData({
          hotspottingPdfLink: result.data.pdfDriveLink || report.pdfLink || '',
          hotspottingPdfFileId: result.data.pdfFileId || report.fileId || '',
          hotspottingReportName: result.data.reportName || report.reportName || '',
          hotspottingValidPeriod: result.data.validPeriod || report.validPeriod || '',
        });
        
        console.log('[InvestmentHighlights] Dropdown report object:', {
          pdfLink: report.pdfLink,
          fileId: report.fileId,
          reportName: report.reportName,
        });
        
        console.log('[InvestmentHighlights] Lookup result data:', {
          pdfDriveLink: result.data.pdfDriveLink,
          pdfFileId: result.data.pdfFileId,
          reportName: result.data.reportName,
        });
        
        console.log('[InvestmentHighlights] PDF link and report info stored:', {
          pdfLink: result.data.pdfDriveLink || report.pdfLink,
          fileId: result.data.pdfFileId || report.fileId,
          reportName: result.data.reportName || report.reportName,
          validPeriod: result.data.validPeriod || report.validPeriod,
        });
      }
    } catch (err) {
      console.error('Error fetching selected report:', err);
      setError('Failed to load selected report');
    } finally {
      setLoading(false);
    }
  };

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
        setDateStatus(result.dateStatus || null);
        
        // Debug logging
        console.log('[InvestmentHighlights] Match found!');
        console.log('[InvestmentHighlights] Report Name:', result.data.reportName);
        console.log('[InvestmentHighlights] Valid Period:', result.data.validPeriod);
        console.log('[InvestmentHighlights] Date Status:', result.dateStatus);
        console.log('[InvestmentHighlights] Main Body length:', (result.data.mainBody || '').length);
        console.log('[InvestmentHighlights] Main Body preview:', (result.data.mainBody || '').substring(0, 100));
        
        // Use Main Body for display
        const mainBody = result.data.mainBody || '';
        
        // Update parent form state with main body
        onChange(mainBody);
        
        // Store PDF link, fileId, and reportName in form state (for folder creation and submission)
        // Note: Lookup API returns pdfDriveLink and pdfFileId (matching column headers F&G)
        updateFormData({
          hotspottingPdfLink: result.data.pdfDriveLink || '',
          hotspottingPdfFileId: result.data.pdfFileId || '',
          hotspottingReportName: result.data.reportName || '',
          hotspottingValidPeriod: result.data.validPeriod || '',
        });
        
        console.log('[InvestmentHighlights] Main body loaded');
        console.log('[InvestmentHighlights] PDF link and report info stored:', {
          pdfLink: result.data.pdfDriveLink,
          fileId: result.data.pdfFileId,
          reportName: result.data.reportName,
          validPeriod: result.data.validPeriod,
        });
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
          extraInfo: '',
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
      const combined = newMainBody;
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
      
      // Step 2: Wait for Google Drive to process the file
      setUploadProgress('Waiting for file to be ready...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      // Step 3: Extract metadata from PDF
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
      
      // Check if report already exists for this LGA/suburb/state
      // If it does, pre-populate with existing report name (but keep editable)
      let reportNameToUse = extractResult.reportName || '';
      try {
        const lookupResponse = await fetch('/api/investment-highlights/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lga: lga || '', 
            suburb: suburb || '', 
            state 
          }),
        });
        
        if (lookupResponse.ok) {
          const lookupResult = await lookupResponse.json();
          if (lookupResult.found && lookupResult.data?.reportName) {
            // Use existing report name from sheet instead of extracted one
            reportNameToUse = lookupResult.data.reportName;
            console.log('[InvestmentHighlights] Using existing report name from sheet:', reportNameToUse);
          }
        }
      } catch (lookupErr) {
        // Non-critical - continue with extracted name if lookup fails
        console.warn('[InvestmentHighlights] Could not check for existing report:', lookupErr);
      }
      
      setExtractedReportName(reportNameToUse);
      setExtractedValidPeriod(extractResult.validPeriod || '');
      setExtractedMainBody(extractResult.mainBody || '');
      setExtractionConfidence(extractResult.confidence || null);
      
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

  // Drag & drop handlers
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Create a synthetic event to reuse handlePdfUpload logic
      const syntheticEvent = {
        target: { files: [file] }
      } as any;
      handlePdfUpload(syntheticEvent);
    }
  };

  const handleConfirmMetadata = async () => {
    if (!extractedReportName || !extractedValidPeriod) {
      alert('Please fill in Report Name and Valid Period');
      return;
    }
    
    if (!reportNameVerified || !validPeriodVerified) {
      alert('Please verify both Report Name and Valid Period by checking the boxes');
      return;
    }
    
    setLoading(true);
    setUploadProgress('Checking for existing reports...');
    
    try {
      // Step 1: Check if report already exists for this LGA
      const lookupResponse = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lga: lga || '', 
          suburb: suburb || '', 
          state 
        }),
      });
      
      const lookupResult = await lookupResponse.json();
      const isNewReportForExistingLGA = lookupResult.found;
      
      // Step 2: Format with ChatGPT (match Production workflow)
      setUploadProgress('Formatting with AI...');
      
      let formattedMainBody = extractedMainBody || '';
      
      console.log('📝 Preparing AI request:', {
        hasMainBody: !!extractedMainBody,
        mainBodyLength: extractedMainBody?.length,
        suburb: suburb || '',
        state: state
      });
      
      try {
        const aiRequestBody = {
          type: 'investmentHighlights',
          rawText: extractedMainBody || '',
          context: {
            suburb: suburb || '',
            state: state || '',
            lga: lga || '',
          },
        };
        
        console.log('📤 Sending to AI:', {
          type: aiRequestBody.type,
          rawTextLength: aiRequestBody.rawText.length,
          hasRawText: !!aiRequestBody.rawText
        });
        
        const parseResponse = await fetch('/api/ai/generate-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aiRequestBody),
        });
        
        if (parseResponse.ok) {
          const parseResult = await parseResponse.json();
          const aiContent = parseResult.content || formattedMainBody;
          
          // Use ChatGPT's response directly - it should already include all section headers
          // ChatGPT is instructed to provide the complete formatted output with headers
          // No parsing, no splitting, no header removal - use exactly as ChatGPT provides it
          formattedMainBody = aiContent;
          
          // Optional: Validate that all required section headers are present
          const requiredHeadings = [
            'Population growth context',
            'Residential',
            'Industrial',
            'Commercial and civic',
            'Health and education',
            'Transport',
            'Job implications (construction + ongoing)'
          ];
          
          const missingSections = requiredHeadings.filter(
            heading => !aiContent.includes(heading)
          );
          
          if (missingSections.length > 0) {
            console.warn('⚠️ Some section headers may be missing:', missingSections);
            // Non-blocking - still use the content, user can review/edit
          } else {
            console.log('✅ All required section headers present in AI response');
          }
          
          console.log('✅ Text formatted by AI');
          console.log('📊 Formatted Main Body length:', formattedMainBody.length);
        } else {
          const errorText = await parseResponse.text();
          console.warn('AI formatting failed, using raw text. Error:', errorText);
          // Continue with raw text if AI fails
        }
      } catch (err) {
        console.warn('AI formatting error, using raw text:', err);
        // Continue with raw text if AI fails
      }
      
      // Step 3: Organize PDF into CURRENT/LEGACY folders and save to sheet
      setUploadProgress('Organizing PDF...');
      
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
          mainBody: formattedMainBody, // Pass formatted Main Body (not raw text)
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to organize PDF');
      }
      
      const result = await response.json();
      
      // Store PDF link and file ID in form state
      updateFormData({
        hotspottingPdfLink: result.webViewLink || '',
        hotspottingPdfFileId: result.fileId || '',
      });
      
      // Populate the form field with formatted content
      onChange(formattedMainBody);
      
      // Success - update UI
      setMatchStatus('found');
      setReportName(extractedReportName);
      setValidPeriod(extractedValidPeriod);
      setDateStatus(null); // Clear date status warning since we have a new/updated report
      setShowVerification(false);
      setReportNameVerified(false);
      setValidPeriodVerified(false);
      
      // Show appropriate confirmation message
      if (isNewReportForExistingLGA) {
        alert('✅ PDF uploaded and processed successfully!\n\n📋 This report and its content will be used moving forward for this LGA.\n\n✅ Investment Highlights have been formatted with AI and saved to the database.');
      } else {
        alert('✅ PDF uploaded and processed successfully!\n\n✅ Investment Highlights have been formatted with AI and saved to the database.');
      }
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Investment Highlights *</h3>
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
          <div className="mt-3 space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
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
              {suburb && (
                <p className="text-xs text-gray-600 mt-2">
                  ℹ️ <strong>{suburb}</strong> will be associated with this report for future lookups.
                </p>
              )}
              <div className="mt-3 pt-3 border-t border-green-300">
                <button
                  onClick={() => {
                    setMatchStatus('not-found');
                    setSelectedFromDropdown(false);
                    setReportName('');
                    setValidPeriod('');
                    setDateStatus(null);
                    onChange(''); // Clear the content
                    updateFormData({
                      hotspottingPdfLink: '',
                      hotspottingPdfFileId: '',
                      hotspottingReportName: '',
                      hotspottingValidPeriod: '',
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Change Selection or Enter Manually
                </button>
              </div>
            </div>
            
            {/* Date Status Warning */}
            {dateStatus && dateStatus.status === 'expired' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 text-red-600 mb-3">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Report Out of Date</span>
                </div>
                <p className="text-sm text-gray-700 mb-4">
                  This report is outside its valid period. Please check if a new report is available at{' '}
                  <a 
                    href="https://membership.hotspotting.com.au/hotspotting-reports"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    https://membership.hotspotting.com.au/hotspotting-reports
                  </a>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      // Continue with existing report - just keep the current state
                      // User can proceed with the existing report
                    }}
                    className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    No new report available, continue with existing
                  </button>
                  <button
                    onClick={() => {
                      setMatchStatus('not-found');
                      setShowVerification(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Yes, new report available, upload here
                  </button>
                </div>
              </div>
            )}
            
            {dateStatus && dateStatus.status === 'expiring-soon' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center space-x-2 text-yellow-600 mb-2">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Report Expiring Soon</span>
                </div>
                <p className="text-sm text-gray-700">
                  {dateStatus.displayText}
                </p>
              </div>
            )}
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
            
            <p className="text-sm text-gray-700 mb-3">
              Please review the dropdown below to see if a report exists in the repository:
            </p>
            
            {/* Searchable Dropdown */}
            <div className="mb-4">
              <ReportDropdown
                onSelect={handleDropdownSelect}
                disabled={loading}
                placeholder="Search for a Hotspotting report..."
              />
            </div>
            
            <div className="my-3 text-center text-sm text-gray-500">
              ─── OR ───
            </div>
            
            {/* PDF Upload Option */}
            <div 
              className={`mt-3 p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 bg-white'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
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
          <div className="mt-3 p-4 bg-blue-50 border-2 border-blue-300 rounded-md">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              PDF Uploaded: {uploadedFileName}
            </h4>
            <p className="text-sm text-blue-800 mb-3">
              📋 <strong>Please verify the extracted information below:</strong>
            </p>
            
            <div className="space-y-4">
              {/* Report Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Report Name should match the name when downloaded from Hotspotting
                </p>
                {extractionConfidence?.reportName === 'low' && (
                  <p className="text-sm text-amber-600 mb-2 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    We couldn't automatically extract the Report Name. Please copy from the front page.
                  </p>
                )}
                <input
                  type="text"
                  value={extractedReportName}
                  onChange={(e) => {
                    setExtractedReportName(e.target.value);
                    setReportNameVerified(false); // Reset verification when edited
                  }}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Fraser Coast, Sunshine Coast"
                />
                <label className="flex items-center mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={reportNameVerified}
                    onChange={(e) => setReportNameVerified(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-700">
                    ✓ I have verified this Report Name is correct
                  </span>
                </label>
              </div>
              
              {/* Valid Period Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Period *
                </label>
                {extractionConfidence?.validPeriod === 'low' && (
                  <p className="text-sm text-amber-600 mb-2 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    We couldn't automatically extract the Valid Period. Please copy from the front page.
                  </p>
                )}
                <input
                  type="text"
                  value={extractedValidPeriod}
                  onChange={(e) => {
                    setExtractedValidPeriod(e.target.value);
                    setValidPeriodVerified(false); // Reset verification when edited
                  }}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., October 2025 - January 2026"
                />
                <label className="flex items-center mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={validPeriodVerified}
                    onChange={(e) => setValidPeriodVerified(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-700">
                    ✓ I have verified this Valid Period is correct
                  </span>
                </label>
              </div>
              
              {/* Main Body Status */}
              {(!extractedMainBody || extractedMainBody.trim().length < 100) && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-md">
                  <p className="text-sm text-amber-800 font-medium mb-1">
                    ⚠️ Main Body Content Not Found
                  </p>
                  <p className="text-sm text-gray-700">
                    Please run ChatGPT manually and paste the main body content so we can store it for next time.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
              <p className="text-xs text-gray-700">
                <strong>⚠️ Important:</strong> Please check both fields carefully. If the extracted values are incorrect, copy the correct information from the front page of the PDF, then check both verification boxes before confirming.
              </p>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleConfirmMetadata}
                disabled={
                  !extractedReportName || 
                  !extractedValidPeriod || 
                  !reportNameVerified || 
                  !validPeriodVerified || 
                  loading
                }
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
        disabled={disabled || loading || showSaveForm}
        className={`input-field ${showSaveForm ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        style={{ 
          overflow: 'hidden', 
          resize: 'none',
          minHeight: '150px'
        }}
        placeholder="Investment highlights will appear here automatically when a report is found or selected..."
        spellCheck={true}
        required
      />
      
      <p className="text-xs text-gray-500">
        You can edit the content above as needed.
      </p>
    </div>
  );
}
