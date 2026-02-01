'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';
import { ReportDropdown, type ReportOption } from './step5/ReportDropdown';

/**
 * Step 1A: Investment Highlights Check (Early Processing)
 * 
 * This step appears after Step 1 (Address) to:
 * 1. Auto-check for Investment Highlights match
 * 2. Show dropdown if no match found
 * 3. Allow PDF upload if not in dropdown
 * 4. Trigger background processing for Step 5
 * 
 * By the time user reaches Step 5, all data is ready!
 */

export function Step1AInvestmentHighlightsCheck() {
  const { formData, updateFormData } = useFormStore();
  const { address } = formData;

  const [loading, setLoading] = useState(true);
  const [matchStatus, setMatchStatus] = useState<'checking' | 'found' | 'not-found' | 'selected' | 'uploaded' | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [dateStatus, setDateStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // PDF upload states
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Auto-check on mount (NON-BLOCKING)
  useEffect(() => {
    if (address?.suburbName && address?.state) {
      // Fire and forget - user can proceed immediately
      checkForMatch();
    } else {
      // No address data, allow user to proceed
      setLoading(false);
      setMatchStatus(null);
    }
  }, []);

  const checkForMatch = async () => {
    // Set loading but don't block user from proceeding
    setLoading(true);
    setMatchStatus('checking');
    setError(null);

    try {
      const response = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburb: address?.suburbName || '',
          state: address?.state || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check for Investment Highlights');
      }

      const result = await response.json();

      if (result.found && result.data) {
        setMatchStatus('found');
        setReportData(result.data);
        setDateStatus(result.dateStatus || null);

        // Store in form state for Step 5
        updateFormData({
          earlyProcessing: {
            ...formData.earlyProcessing,
            investmentHighlights: {
              status: 'ready',
              data: result.data,
              dateStatus: result.dateStatus,
            },
          },
        });

        // Also populate contentSections for Step 5
        const mainBody = result.data.mainBody || '';
        updateFormData({
          contentSections: {
            ...formData.contentSections,
            investmentHighlights: mainBody,
          },
        });
      } else {
        setMatchStatus('not-found');
        updateFormData({
          earlyProcessing: {
            ...formData.earlyProcessing,
            investmentHighlights: {
              status: 'pending',
            },
          },
        });
      }
    } catch (err: any) {
      console.error('Investment Highlights check error:', err);
      setError(err.message || 'Failed to check for Investment Highlights');
      setMatchStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownSelect = async (report: ReportOption) => {
    setLoading(true);
    setMatchStatus('selected');

    try {
      // Fetch full report data
      const firstSuburb = report.suburbs[0] || '';
      const response = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburb: firstSuburb,
          state: report.state,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch report data');
      }

      const result = await response.json();

      if (result.found && result.data) {
        setReportData(result.data);
        setDateStatus(result.dateStatus || null);

        // Store in form state
        updateFormData({
          earlyProcessing: {
            ...formData.earlyProcessing,
            investmentHighlights: {
              status: 'ready',
              data: result.data,
              dateStatus: result.dateStatus || null,
              selectedFromDropdown: true,
            },
          },
        });

        // Populate contentSections
        const mainBody = result.data.mainBody || '';
        updateFormData({
          contentSections: {
            ...formData.contentSections,
            investmentHighlights: mainBody,
          },
        });
      }
    } catch (err: any) {
      console.error('Error fetching selected report:', err);
      setError('Failed to load selected report');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (file: File) => {
    setUploadingPdf(true);
    setError(null);
    setUploadedFileName(file.name);

    try {
      // Step 1: Upload PDF to Google Drive
      setUploadProgress('Uploading PDF...');
      
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('suburb', address?.suburbName || '');
      uploadFormData.append('state', address?.state || '');

      const uploadResponse = await fetch('/api/investment-highlights/upload-pdf', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload PDF');
      }

      console.log('✅ PDF uploaded:', uploadResult.fileId);

      // Step 2: Extract metadata with retry logic (wait 5 seconds first)
      setUploadProgress('Extracting report information...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      let extractResult: any = null;
      const maxRetries = 3;
      const retryDelays = [3000, 6000, 12000]; // 3s, 6s, 12s

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const extractResponse = await fetch('/api/investment-highlights/extract-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: uploadResult.fileId }),
          });

          extractResult = await extractResponse.json();

          if (extractResponse.ok && extractResult.reportName) {
            console.log('✅ Metadata extracted successfully');
            break;
          }

          if (attempt < maxRetries - 1) {
            console.log(`⏳ Retry ${attempt + 1}/${maxRetries} in ${retryDelays[attempt]/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          }
        } catch (err) {
          console.warn(`Extraction attempt ${attempt + 1} failed:`, err);
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          }
        }
      }

      // Step 3: Parse with ChatGPT for better formatting
      setUploadProgress('Formatting with AI...');
      
      let formattedMainBody = extractResult?.mainBody || '';
      
      console.log('📝 Preparing AI request:', {
        hasMainBody: !!extractResult?.mainBody,
        mainBodyLength: extractResult?.mainBody?.length,
        suburb: address?.suburbName,
        state: address?.state
      });
      
      try {
        const aiRequestBody = {
          type: 'investmentHighlights',
          rawText: extractResult?.mainBody || '',
          context: {
            suburb: address?.suburbName || '',
            state: address?.state || '',
            lga: address?.lga || '',
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
          
          // Parse the 7 sections from AI response (separated by "---")
          const sectionParts = aiContent.split('---').map((s: string) => s.trim());
          
          if (sectionParts.length >= 7) {
            // Extract each section (remove any section headers if present)
            const cleanSection = (text: string) => {
              // Remove lines that look like headers (e.g., "SECTION 1: POPULATION GROWTH")
              return text.replace(/^SECTION \d+:.*$/gm, '').trim();
            };
            
            // Create clean mainBody by joining sections without headers or separators
            const cleanedSections = sectionParts.map(cleanSection).filter((s: string) => s.length > 0);
            formattedMainBody = cleanedSections.join('\n\n');
            
            // Store sections for later use
            (window as any).__investmentHighlightsSections = {
              populationGrowthContext: cleanSection(sectionParts[0]),
              residential: cleanSection(sectionParts[1]),
              industrial: cleanSection(sectionParts[2]),
              commercialAndCivic: cleanSection(sectionParts[3]),
              healthAndEducation: cleanSection(sectionParts[4]),
              transport: cleanSection(sectionParts[5]),
              jobImplications: cleanSection(sectionParts[6]),
            };
            
            console.log('✅ Text formatted by AI into 7 sections');
          } else {
            console.warn(`AI returned ${sectionParts.length} sections instead of 7, using as-is`);
            formattedMainBody = aiContent;
          }
        } else {
          const errorText = await parseResponse.text();
          console.warn('AI formatting failed, using raw text. Error:', errorText);
        }
      } catch (err) {
        console.warn('AI formatting error, using raw text:', err);
      }

      const reportData = {
        reportName: extractResult?.reportName || '',
        validPeriod: extractResult?.validPeriod || '',
        mainBody: formattedMainBody,
      };

      // Step 4: Save to Google Sheet
      setUploadProgress('Saving to database...');
      
      // Get the parsed sections (if available)
      const sections = (window as any).__investmentHighlightsSections || {};
      
      const saveResponse = await fetch('/api/investment-highlights/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbs: address?.suburbName || '',
          state: address?.state || '',
          reportName: reportData.reportName,
          validPeriod: reportData.validPeriod,
          mainBody: reportData.mainBody,
          extraInfo: '',
          populationGrowthContext: sections.populationGrowthContext || '',
          residential: sections.residential || '',
          industrial: sections.industrial || '',
          commercialAndCivic: sections.commercialAndCivic || '',
          healthAndEducation: sections.healthAndEducation || '',
          transport: sections.transport || '',
          jobImplications: sections.jobImplications || '',
          pdfLink: uploadResult.webViewLink || '',
          fileId: uploadResult.fileId || '',
        }),
      });

      if (!saveResponse.ok) {
        console.warn('Failed to save to Google Sheet, but continuing...');
      }

      // Store in form state for Step 6
      setMatchStatus('uploaded');
      
      updateFormData({
        earlyProcessing: {
          ...formData.earlyProcessing,
          investmentHighlights: {
            status: 'ready',
            data: reportData,
            uploadedPdfFileId: uploadResult.fileId,
            uploadedPdfTimestamp: Date.now(),
            uploadedPdfFileName: uploadResult.fileName,
          },
        },
        contentSections: {
          ...formData.contentSections,
          investmentHighlights: reportData.mainBody,
        },
      });

      console.log('✅ Investment Highlights processed and ready for Step 6');
      setUploadProgress('');

    } catch (err: any) {
      console.error('PDF processing error:', err);
      setError(err.message || 'Failed to process PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      handlePdfUpload(file);
    } else {
      setError('Please select a PDF file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handlePdfUpload(file);
    } else {
      setError('Please drop a PDF file');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Investment Highlights Check</h2>

      {loading && matchStatus === 'checking' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-900 font-medium">Looking up Investment Highlights report...</span>
            </div>
            <p className="text-sm text-blue-700 ml-4">
              This is running in the background. You can proceed to the next step.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {matchStatus === 'found' && reportData && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Investment Highlights Report Found!</span>
            </div>
            <p className="text-sm text-gray-700">
              <strong>Report:</strong> {reportData.reportName}<br />
              {reportData.validPeriod && <><strong>Valid Period:</strong> {reportData.validPeriod}</>}
            </p>
          </div>

          {dateStatus && dateStatus.status === 'expiring-soon' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center space-x-2 text-yellow-600 mb-1">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-sm">Report Expiring Soon</span>
              </div>
              <p className="text-xs text-gray-700">{dateStatus.displayText}</p>
            </div>
          )}

          {dateStatus && dateStatus.status === 'expired' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2 text-red-600 mb-1">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-sm">Report Out of Date</span>
              </div>
              <p className="text-xs text-gray-700 mb-2">{dateStatus.displayText}</p>
              <a 
                href="https://membership.hotspotting.com.au/hotspotting-reports"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Check for updates →
              </a>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              ✓ I'm preparing this report for you. You'll review it on Step 5.
            </p>
          </div>
        </div>
      )}

      {matchStatus === 'not-found' && (
        <div className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center space-x-2 text-yellow-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">No Investment Highlights match found</span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              No existing report for {address?.suburbName}, {address?.state}.
            </p>
            <p className="text-sm text-gray-700 mb-3">
              Please review the list below to see if a report exists in our repository:
            </p>

            <ReportDropdown
              onSelect={handleDropdownSelect}
              disabled={loading}
              placeholder="Search for a Hotspotting report..."
            />
          </div>

          <div className="text-center text-sm text-gray-500">
            ─── OR ───
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-700 mb-3">
              <strong>Not in the list?</strong> Upload your Hotspotting PDF below:
            </p>

            <div 
              className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
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
                onChange={handleFileInput}
                className="hidden"
                id="pdf-upload-step1a"
                disabled={uploadingPdf}
              />
              <label htmlFor="pdf-upload-step1a" className={`cursor-pointer ${uploadingPdf ? 'opacity-50' : ''}`}>
                <div className="text-gray-600">
                  <div className="text-3xl mb-2">📄</div>
                  <div className="font-medium">Upload Hotspotting PDF</div>
                  <p className="text-sm mt-1">Drag & drop or click to browse</p>
                  <p className="text-xs text-gray-500 mt-1">(PDF files only, max 50MB)</p>
                </div>
              </label>
              {uploadingPdf && (
                <div className="mt-3 text-sm text-blue-600">
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{uploadProgress || 'Uploading...'}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              💡 Download from:{' '}
              <a 
                href="https://membership.hotspotting.com.au/hotspotting-reports"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Hotspotting Membership
              </a>
            </p>
          </div>
        </div>
      )}

      {matchStatus === 'selected' && reportData && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Report Selected!</span>
            </div>
            <p className="text-sm text-gray-700">
              <strong>Report:</strong> {reportData.reportName}
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900">
              ✓ I'm preparing this report for you. You'll review it on Step 5.
            </p>
          </div>
        </div>
      )}

      {matchStatus === 'uploaded' && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center space-x-2 text-green-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">PDF Uploaded Successfully!</span>
            </div>
            <p className="text-sm text-gray-700">
              <strong>File:</strong> {uploadedFileName}
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-900 font-medium mb-2">
              ✓ Processing Complete! You can continue to the next steps.
            </p>
            <p className="text-xs text-blue-800">
              The Investment Highlights will be ready for review on Step 6. Proximity and "Why This Property" will also be prepared in the background as you progress through the form.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
