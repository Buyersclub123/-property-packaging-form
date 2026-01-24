'use client';

import { useState, useEffect, useRef } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';
import { ReportDropdown, type ReportOption } from './ReportDropdown';

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
  const [dateStatus, setDateStatus] = useState<any>(null);
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);
  
  // Debug: Track render count
  const renderCountRef = useRef(0);
  renderCountRef.current++;
  console.log('[InvestmentHighlights] Component render #', renderCountRef.current);
  console.log('[InvestmentHighlights] Current value length:', value.length);
  
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
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [sections, setSections] = useState({
    populationGrowthContext: '',
    residential: '',
    industrial: '',
    commercialAndCivic: '',
    healthAndEducation: '',
    transport: '',
    jobImplications: '',
  });

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
  }, [lga, suburb, state, value]);

  const handleDropdownSelect = async (report: ReportOption) => {
    console.log('[InvestmentHighlights] Dropdown selection:', report);
    
    setLoading(true);
    setSelectedFromDropdown(true);
    
    try {
      // Fetch full report data using the fileId
      // For now, we'll use the lookup API with the report's suburbs
      // In Phase 2, we'll add an API to fetch by fileId
      
      const firstSuburb = report.suburbs[0] || '';
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
        setDateStatus(report.dateStatus);
        
        // Use Main Body for display
        const mainBody = result.data.mainBody || '';
        const combined = mainBody;
        
        // Update parent form state
        onChange(combined);
        
        // TODO Phase 2: Add suburb to report's suburb list if not already there
        console.log('[InvestmentHighlights] TODO: Add suburb to report');
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
        const combined = mainBody;
        
        console.log('[InvestmentHighlights] Combined length:', combined.length);
        console.log('[InvestmentHighlights] Calling onChange with combined text...');
        
        // Update parent form state
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
      setExtractedReportName(extractResult.reportName || '');
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
      
      // Step 2: Organize PDF into CURRENT/LEGACY folders and save to sheet
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
      setReportNameVerified(false);
      setValidPeriodVerified(false);
      
      // Show appropriate confirmation message
      if (isNewReportForExistingLGA) {
        alert('✅ PDF uploaded successfully!\n\n📋 This report and its content will be used moving forward for this LGA.\n\n🤖 Next Step: Click "Generate AI Summary" to extract infrastructure information.');
      } else {
        alert('✅ PDF uploaded successfully!\n\n🤖 Next Step: Click "Generate AI Summary" to extract infrastructure information.');
      }
    } catch (err: any) {
      console.error('PDF organization error:', err);
      setError(err.message || 'Failed to organize PDF. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };
  
  const handleGenerateSummary = async () => {
    if (!uploadedFileId) {
      alert('No PDF file uploaded');
      return;
    }
    
    setGeneratingSummary(true);
    setError(null);
    
    try {
      const response = await fetch('/api/investment-highlights/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadedFileId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }
      
      const result = await response.json();
      
      // Update sections with AI-generated content
      setSections(result.sections);
      
      // Update main body display
      onChange(result.mainBody);
      
      // Show section editor
      setShowSectionEditor(true);
      
      alert('AI summary generated successfully! You can now edit individual sections below.');
    } catch (err: any) {
      console.error('AI summary generation error:', err);
      setError(err.message || 'Failed to generate AI summary. Please try again or enter manually.');
    } finally {
      setGeneratingSummary(false);
    }
  };
  
  const handleSectionChange = (sectionName: string, newValue: string) => {
    setSections(prev => ({
      ...prev,
      [sectionName]: newValue,
    }));
    
    // Regenerate main body when any section changes
    const updatedSections = {
      ...sections,
      [sectionName]: newValue,
    };
    
    const newMainBody = generateMainBodyFromSections(updatedSections);
    onChange(newMainBody);
  };
  
  const generateMainBodyFromSections = (secs: typeof sections): string => {
    const parts: string[] = [];
    
    if (secs.populationGrowthContext) {
      parts.push(secs.populationGrowthContext);
    }
    
    if (secs.residential) {
      parts.push(`**Residential:**\n${secs.residential}`);
    }
    
    if (secs.industrial) {
      parts.push(`**Industrial:**\n${secs.industrial}`);
    }
    
    if (secs.commercialAndCivic) {
      parts.push(`**Commercial and Civic:**\n${secs.commercialAndCivic}`);
    }
    
    if (secs.healthAndEducation) {
      parts.push(`**Health and Education:**\n${secs.healthAndEducation}`);
    }
    
    if (secs.transport) {
      parts.push(`**Transport:**\n${secs.transport}`);
    }
    
    if (secs.jobImplications) {
      parts.push(`**Job Implications:**\n${secs.jobImplications}`);
    }
    
    return parts.join('\n\n');
  };
  
  const handleSaveSections = async () => {
    if ((!lga && !suburb) || !state || !reportName || !validPeriod) {
      alert('Missing required information. Please ensure report name and valid period are set.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Generate main body from sections
      const mainBody = generateMainBodyFromSections(sections);
      
      const response = await fetch('/api/investment-highlights/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbs: suburb || '',
          state,
          reportName: reportName || extractedReportName,
          validPeriod: validPeriod || extractedValidPeriod,
          mainBody,
          extraInfo: '', // Extra info is optional
          // Individual sections (for columns G-M)
          populationGrowthContext: sections.populationGrowthContext,
          residential: sections.residential,
          industrial: sections.industrial,
          commercialAndCivic: sections.commercialAndCivic,
          healthAndEducation: sections.healthAndEducation,
          transport: sections.transport,
          jobImplications: sections.jobImplications,
          // PDF info (for columns N-O)
          pdfLink: '', // Will be preserved from organize-pdf step
          fileId: uploadedFileId,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }
      
      alert('Investment highlights and sections saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Failed to save investment highlights. Please try again.');
    } finally {
      setLoading(false);
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
            </div>
            
            {/* Date Status Warning */}
            {dateStatus && dateStatus.status === 'expired' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center space-x-2 text-red-600 mb-2">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Report Out of Date</span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {dateStatus.displayText}. Check if a new report is available:
                </p>
                <a 
                  href="https://membership.hotspotting.com.au/hotspotting-reports"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Hotspotting Membership →
                </a>
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
            
            <p className="text-xs text-gray-600 mt-3">
              ⚠️ Please verify both fields above before continuing
            </p>
            
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
        
        {/* AI Summary Generation Button (Phase 4C-2) */}
        {matchStatus === 'found' && uploadedFileId && !showSectionEditor && (
          <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-md">
            <h4 className="font-medium text-purple-900 mb-2">🤖 AI Summary Generation</h4>
            <p className="text-sm text-gray-700 mb-3">
              Generate infrastructure summary from the uploaded PDF using AI.
            </p>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {generatingSummary ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Summary...
                </>
              ) : (
                '✨ Generate AI Summary'
              )}
            </button>
          </div>
        )}
        
        {/* Section Editor (Phase 4C-2) */}
        {showSectionEditor && (
          <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-md space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-900">📝 Edit Infrastructure Sections</h4>
              <button
                onClick={() => setShowSectionEditor(false)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Hide Editor
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              Edit individual sections below. The Main Body will update automatically.
            </p>
            
            {/* Section 1: Population Growth Context */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1. Population Growth Context
              </label>
              <textarea
                value={sections.populationGrowthContext}
                onChange={(e) => handleSectionChange('populationGrowthContext', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={3}
                placeholder="Plain paragraph describing population growth trends..."
              />
            </div>
            
            {/* Section 2: Residential */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2. Residential
              </label>
              <textarea
                value={sections.residential}
                onChange={(e) => handleSectionChange('residential', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={4}
                placeholder="**$500 million** Residential project description..."
              />
            </div>
            
            {/* Section 3: Industrial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                3. Industrial
              </label>
              <textarea
                value={sections.industrial}
                onChange={(e) => handleSectionChange('industrial', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={4}
                placeholder="**$250 million** Industrial project description..."
              />
            </div>
            
            {/* Section 4: Commercial and Civic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                4. Commercial and Civic
              </label>
              <textarea
                value={sections.commercialAndCivic}
                onChange={(e) => handleSectionChange('commercialAndCivic', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={4}
                placeholder="**$180 million** Commercial project description..."
              />
            </div>
            
            {/* Section 5: Health and Education */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                5. Health and Education
              </label>
              <textarea
                value={sections.healthAndEducation}
                onChange={(e) => handleSectionChange('healthAndEducation', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={4}
                placeholder="**$120 million** Health/Education project description..."
              />
            </div>
            
            {/* Section 6: Transport */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                6. Transport
              </label>
              <textarea
                value={sections.transport}
                onChange={(e) => handleSectionChange('transport', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={4}
                placeholder="**$2.5 billion** Transport project description..."
              />
            </div>
            
            {/* Section 7: Job Implications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                7. Job Implications
              </label>
              <textarea
                value={sections.jobImplications}
                onChange={(e) => handleSectionChange('jobImplications', e.target.value)}
                className="w-full p-2 border rounded-md text-sm"
                rows={2}
                placeholder="5,000 construction jobs and 2,000 ongoing jobs..."
              />
            </div>
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleSaveSections}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Saving...' : '💾 Save All Sections'}
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
              >
                {generatingSummary ? 'Regenerating...' : '🔄 Regenerate from PDF'}
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
