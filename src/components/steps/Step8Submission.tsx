'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';

// GHL Configuration (using NEXT_PUBLIC_ prefix for client-side access)
const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || '';
const GHL_OBJECT_ID = process.env.NEXT_PUBLIC_GHL_OBJECT_ID || '';

interface ChecklistItem {
  id: string;
  label: string;
}

export function Step8Submission() {
  const { formData, resetForm, setCurrentStep, updateFormData } = useFormStore();
  const { address, decisionTree } = formData;
  
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [noMessageNeeded, setNoMessageNeeded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghlRecordId, setGhlRecordId] = useState<string | null>(formData.ghlRecordId || null);
  const [emailStatus, setEmailStatus] = useState<'pending' | 'sent' | 'failed'>('pending');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Check if property has already been submitted (prevents duplicate submissions)
  // In edit mode, don't auto-show success screen - allow user to see form and submit changes
  const isEditMode = formData.editMode === true || !!formData.ghlRecordId;

  useEffect(() => {
    // Only auto-show success screen in create mode if record already exists
    // In edit mode, always show the form so user can make changes and see message to BA
    if (!isEditMode && (formData.ghlRecordId || formData.submissionAttempted)) {
      setSubmitted(true);
      if (formData.ghlRecordId) {
        setGhlRecordId(formData.ghlRecordId);
      }
      setEmailStatus('sent');
    } else {
      if (formData.ghlRecordId) {
        setGhlRecordId(formData.ghlRecordId);
      }
    }
  }, [formData.ghlRecordId, formData.submissionAttempted, isEditMode]);

  // Generate dynamic checklist based on property type
  const checklistItems = useMemo((): ChecklistItem[] => {
    const items: ChecklistItem[] = [
      { id: 'cashflow', label: 'Cashflow spreadsheet created and populated' },
      { id: 'cmaReports', label: 'CMA reports and Hotspotting report added to the folder' },
    ];

    // Conditional items based on property type
    const propertyType = decisionTree?.propertyType;

    // New properties: Marketing Materials (stage plan, inclusions, etc.)
    // Established properties: Property photos
    if (propertyType === 'New') {
      items.push({ id: 'marketingMaterials', label: 'Marketing Materials uploaded' });
    } else {
      items.push({ id: 'photos', label: 'Property photos uploaded' });
    }

    // Note: Removed dual occupancy and split contract checkboxes as those fields are mandatory
    // Users can't proceed without filling them, so no need to check them here

    return items;
  }, [decisionTree]);

  // Initialize checklist state when items change
  useEffect(() => {
    const initialChecklist: Record<string, boolean> = {};
    checklistItems.forEach(item => {
      if (!(item.id in checklist)) {
        initialChecklist[item.id] = false;
      }
    });
    if (Object.keys(initialChecklist).length > 0) {
      setChecklist(prev => ({ ...prev, ...initialChecklist }));
    }
  }, [checklistItems]);

  const allChecked = useMemo(() => {
    return checklistItems.every(item => checklist[item.id] === true);
  }, [checklist, checklistItems]);

  // Check if Message for BA is valid (either has text OR "no message needed" is checked)
  const isMessageForBAValid = useMemo(() => {
    const hasMessage = formData.messageForBA && formData.messageForBA.trim() !== '';
    return hasMessage || noMessageNeeded;
  }, [formData.messageForBA, noMessageNeeded]);

  // Reset "no message needed" checkbox when user types in the field
  useEffect(() => {
    if (formData.messageForBA && formData.messageForBA.trim() !== '') {
      setNoMessageNeeded(false);
    }
  }, [formData.messageForBA]);

  const handleChecklistChange = (id: string) => {
    setChecklist(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleTickAll = () => {
    const allChecked: Record<string, boolean> = {};
    checklistItems.forEach(item => {
      allChecked[item.id] = true;
    });
    setChecklist(allChecked);
  };

  const handleSubmit = async () => {
    const editRecordId = formData.ghlRecordId;

    // In edit mode, skip duplicate submission check
    if (!isEditMode) {
      const hasRecordId = formData.ghlRecordId || ghlRecordId;
      const wasAttempted = formData.submissionAttempted;

      if (submitted || hasRecordId || wasAttempted) {
        setError('This property has already been submitted. You cannot submit the same property twice.');
        return;
      }
    }

    // In edit mode, make checklist and BA message optional (record already exists)
    // In create mode, require both
    if (!isEditMode) {
      if (!allChecked) {
        setError('Please check all items before submitting.');
        return;
      }

      if (!isMessageForBAValid) {
        setError('Please either enter a message for BA or confirm "No message needed".');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    // Mark submission as attempted immediately to prevent duplicate clicks
    updateFormData({ submissionAttempted: true });

    try {
      // Fields that are internal/UI state and should NOT be sent to Make.com/GHL
      const INTERNAL_FIELDS = {
        address: ['addressVerified', 'addressFieldsEditable', 'stashPropertyAddress', 'latitude', 'longitude', 'addressSource', 'lotNumberNotApplicable', 'usePropertyAddressForProject', 'hasUnitNumbers'],
        marketPerformance: ['isSaved', 'isVerified', 'daysSinceLastCheck'],
      };

      // Function to remove internal fields from an object
      const removeInternalFields = (obj: any, fieldList: string[]): any => {
        if (!obj || typeof obj !== 'object') return obj;
        const result: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key) && !fieldList.includes(key)) {
            result[key] = obj[key];
          }
        }
        return result;
      };

      // List of numeric field names that should be converted to 0 instead of null
      const NUMERIC_FIELDS = [
        // Purchase Price numeric fields
        'acceptableAcquisitionFrom', 'acceptableAcquisitionTo', 'landPrice', 'buildPrice', 
        'totalPrice', 'cashbackRebateValue',
        // Rental Assessment numeric fields
        'currentRentPrimary', 'currentRentSecondary', 'rentAppraisalPrimaryFrom', 
        'rentAppraisalPrimaryTo', 'rentAppraisalSecondaryFrom', 'rentAppraisalSecondaryTo',
        // Market Performance numeric fields
        'medianPriceChange3Months', 'medianPriceChange1Year', 'medianPriceChange3Year', 
        'medianPriceChange5Year', 'medianYield', 'medianRentChange1Year', 
        'rentalPopulation', 'vacancyRate'
      ];

      // Generic function to convert empty strings: null for text fields, 0 for numeric fields
      const convertEmptyStringsToNull = (obj: any, parentKey?: string): any => {
        if (Array.isArray(obj)) {
          return obj.map(item => convertEmptyStringsToNull(item, parentKey));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const result: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const isNumericField = NUMERIC_FIELDS.includes(key);
              const value = obj[key];
              
              if (isNumericField && (value === null || value === undefined || value === '')) {
                result[key] = '0';
              } else {
                result[key] = convertEmptyStringsToNull(value, key);
              }
            }
          }
          return result;
        }
        
        if (obj === '' && parentKey && NUMERIC_FIELDS.includes(parentKey)) {
          return '0';
        }
        
        if (obj === '') {
          return null;
        }
        
        if (obj === null || obj === undefined) {
          return obj;
        }
        
        return obj;
      };

      // Combine selling agent fields before submission
      const sellingAgentParts: string[] = [
        formData.sellingAgentName?.trim(),
        formData.sellingAgentEmail?.trim(),
        formData.sellingAgentMobile?.trim(),
      ].filter((item): item is string => !!item && item.length > 0);

      // Remove internal/UI state fields before processing
      const cleanedFormData = {
        ...formData,
        address: formData.address ? removeInternalFields(formData.address, INTERNAL_FIELDS.address) : formData.address,
        marketPerformance: formData.marketPerformance ? removeInternalFields(formData.marketPerformance, INTERNAL_FIELDS.marketPerformance) : formData.marketPerformance,
      };

      const submissionData = {
        ...cleanedFormData,
        sellingAgent: sellingAgentParts.length > 0 ? sellingAgentParts.join(', ') : formData.sellingAgent || '',
        folderLink: address?.folderLink || '',
      };

      // Convert all empty strings to null
      const processedSubmissionData = convertEmptyStringsToNull(submissionData);
      
      // Ensure contractTypeSimplified always exists
      if (processedSubmissionData.decisionTree && !('contractTypeSimplified' in processedSubmissionData.decisionTree)) {
        processedSubmissionData.decisionTree.contractTypeSimplified = null;
      }

      // Prepare payload
      const payload = {
        source: 'form_app',
        action: 'submit_new_property',
        formData: processedSubmissionData,
        folderLink: address?.folderLink || '',
      };

      // Send to Make.com webhook
      const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION;
      if (!webhookUrl) {
        throw new Error('NEXT_PUBLIC_MAKE_WEBHOOK_FORM_SUBMISSION environment variable is not set');
      }

      const makeResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!makeResponse.ok) {
        const errorData = await makeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Make.com error: ${makeResponse.status} ${makeResponse.statusText}`);
      }

      const makeResult = await makeResponse.json().catch(() => ({}));
      
      // Extract GHL record ID from Make.com response
      const recordId = makeResult.recordId || makeResult.id || makeResult.ghlRecordId;
      if (recordId) {
        setGhlRecordId(recordId);
        updateFormData({
          ghlRecordId: recordId,
          submittedAt: new Date().toISOString(),
        });
      }

      // Add suburb to Investment Highlights Google Sheet if report was selected from dropdown
      // (Only if reportName exists and suburb exists - indicates dropdown selection, not upload)
      // Use getState() to get latest state values (avoids stale closure issue in async handler)
      const currentFormData = useFormStore.getState().formData;
      const conditionCheck = {
        hasReportName: !!currentFormData.hotspottingReportName,
        hasSuburbName: !!currentFormData.address?.suburbName,
        hasState: !!currentFormData.address?.state,
        reportName: currentFormData.hotspottingReportName,
        suburbName: currentFormData.address?.suburbName,
        state: currentFormData.address?.state,
      };
      
      // Log to both console and server for debugging
      console.log('[Step9] Checking suburb addition conditions:', conditionCheck);
      
      // Also log to server so we can see it in server-api.log
      try {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '[Step9] Checking suburb addition conditions',
            data: conditionCheck,
          }),
        }).catch(() => {}); // Don't fail if logging fails
      } catch (e) {
        // Ignore logging errors
      }
      
      if (currentFormData.hotspottingReportName && currentFormData.address?.suburbName && currentFormData.address?.state) {
        try {
          const addSuburbData = {
            suburb: currentFormData.address.suburbName,
            state: currentFormData.address.state,
            reportName: currentFormData.hotspottingReportName,
          };
          
          console.log('[Step9] Adding suburb to Investment Highlights report:', addSuburbData);
          
          // Log to server
          try {
            await fetch('/api/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: '[Step9] Adding suburb to Investment Highlights report',
                data: addSuburbData,
              }),
            }).catch(() => {}); // Don't fail if logging fails
          } catch (e) {
            // Ignore logging errors
          }
          
          const addSuburbResponse = await fetch('/api/investment-highlights/add-suburb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(addSuburbData),
          });
          
          console.log('[Step9] Suburb addition API response status:', addSuburbResponse.status);
          
          if (addSuburbResponse.ok) {
            const result = await addSuburbResponse.json();
            console.log('[Step9] Suburb added successfully:', result);
          } else {
            const errorText = await addSuburbResponse.text();
            console.warn('[Step9] Failed to add suburb to report (non-blocking):', {
              status: addSuburbResponse.status,
              error: errorText,
            });
          }
        } catch (error: any) {
          console.warn('[Step9] Error adding suburb to report (non-blocking):', {
            message: error?.message,
            stack: error?.stack,
            error: error,
          });
          // Non-blocking - don't fail submission if this fails
        }
      } else {
        const skipData = {
          hasReportName: !!currentFormData.hotspottingReportName,
          hasSuburb: !!currentFormData.address?.suburbName,
          hasState: !!currentFormData.address?.state,
        };
        
        console.log('[Step9] Skipping suburb addition - missing data:', skipData);
        
        // Log to server
        try {
          await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: '[Step9] Skipping suburb addition - missing data',
              data: skipData,
            }),
          }).catch(() => {}); // Don't fail if logging fails
        } catch (e) {
          // Ignore logging errors
        }
      }

      // Email status - assume sent if Make.com succeeds
      setEmailStatus('sent');
      
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting property:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit property');

      // Allow retry on failure (do not permanently lock submission)
      updateFormData({ submissionAttempted: false });
    } finally {
      setSubmitting(false);
    }
  };

  // Resend email
  const handleResendEmail = async () => {
    if (!ghlRecordId) return;

    setEmailStatus('pending');
    setEmailError(null);

    try {
      const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_RESEND_EMAIL;
      if (!webhookUrl) {
        setEmailError('NEXT_PUBLIC_MAKE_WEBHOOK_RESEND_EMAIL environment variable is not set');
        setEmailStatus('failed');
        return;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resend',
          ghlRecordId: ghlRecordId,
          emailType: 'packager',
        }),
      });

      if (response.ok) {
        setEmailStatus('sent');
      } else {
        setEmailStatus('failed');
        const errorData = await response.json().catch(() => ({}));
        setEmailError(errorData.error || 'Failed to resend email');
      }
    } catch (error) {
      console.error('Error resending email:', error);
      setEmailStatus('failed');
      setEmailError(error instanceof Error ? error.message : 'Failed to resend email');
    }
  };

  const handleReset = () => {
    resetForm();
    setSubmitted(false);
    setCurrentStep(1);
  };

  // Success screen
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Property Successfully Submitted!</h2>
            <p className="text-green-700">
              Your property has been packaged and submitted to GoHighLevel.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Email Status */}
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Email Status:</span>
                {emailStatus === 'sent' && (
                  <span className="text-green-600 font-semibold">✓ Email sent successfully</span>
                )}
                {emailStatus === 'failed' && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-semibold">✗ Email failed to send</span>
                    <button
                      onClick={handleResendEmail}
                      className="btn-primary text-sm px-4 py-1"
                    >
                      Resend Email
                    </button>
                  </div>
                )}
                {emailStatus === 'pending' && (
                  <span className="text-yellow-600 font-semibold">⏳ Sending email...</span>
                )}
              </div>
              {emailError && (
                <p className="text-sm text-red-600 mt-1">{emailError}</p>
              )}
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ghlRecordId && (
                <a
                  href={`https://app.gohighlevel.com/location/${GHL_LOCATION_ID}/custom-objects/${GHL_OBJECT_ID}/record/${ghlRecordId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View in GHL
                </a>
              )}
              {address?.folderLink && (
                <a
                  href={address.folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Open Folder
                </a>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-900">
                <strong>Next Steps:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
                <li>You will receive an email to check and confirm the content</li>
                <li>Review the property details in the email</li>
                <li>Click "Approve" if everything is correct, or "Needs Editing" to make changes</li>
                <li>If you don't receive the email, check your spam folder or use the "Resend Email" button above</li>
              </ul>
            </div>
          </div>

          {/* Clear Form Button */}
          <div className="mt-6 pt-6 border-t border-green-200">
            <button
              onClick={handleReset}
              className="btn-primary w-full"
            >
              Create Another Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Pre-Submission Checklist</h2>
      
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-700 mb-4">
          Please review and confirm all items below before submitting the property.
        </p>

        <div className="space-y-3 mb-4">
          {checklistItems.map((item) => (
            <label key={item.id} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist[item.id] || false}
                onChange={() => handleChecklistChange(item.id)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className={`text-sm ${checklist[item.id] ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {/* Tick All button */}
        <div className="mb-4">
          <button
            onClick={handleTickAll}
            className="btn-secondary text-sm"
          >
            Tick All
          </button>
        </div>

        {/* Validation Message */}
        {!allChecked && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Please check all items before submitting.
            </p>
          </div>
        )}

        {allChecked && isMessageForBAValid && !error && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              ✓ All items checked. Ready to submit!
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Attachments Additional Dialogue Section */}
      <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <label className="text-lg font-semibold mb-4 block">Attachments Additional Dialogue (Optional)</label>
        <p className="text-xs text-gray-500 mb-2">
          Additional notes or dialogue related to attachments and supporting documentation.
        </p>
        <textarea
          value={formData.attachmentsAdditionalDialogue || ''}
          onChange={(e) => updateFormData({ attachmentsAdditionalDialogue: e.target.value })}
          className="input-field min-h-[120px] resize-y"
          placeholder="Enter any additional notes about attachments..."
          spellCheck={true}
        />
      </div>

      {/* Message for BA Section */}
      <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <label className="text-lg font-semibold block">Message for BA (Optional)</label>
          {(!formData.messageForBA || formData.messageForBA.trim() === '') && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="noMessageNeeded"
                checked={noMessageNeeded}
                onChange={(e) => !submitted && setNoMessageNeeded(e.target.checked)}
                disabled={submitted}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="noMessageNeeded" className="text-sm text-gray-700 cursor-pointer">
                No message needed
              </label>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-2">
          This message will appear at the beginning of the email sent to the Business Analyst. Use it to provide any additional context or instructions.
        </p>
        <textarea
          value={formData.messageForBA || ''}
          onChange={(e) => updateFormData({ messageForBA: e.target.value })}
          className="input-field min-h-[120px] resize-y"
          placeholder="Enter any additional information or instructions for the BA..."
          spellCheck={true}
        />
      </div>

      {isEditMode && (
        <>
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <label className="text-lg font-semibold mb-4 block">Resubmit for testing?</label>
            <select
              value={formData.resubmitForTesting || ''}
              onChange={(e) => updateFormData({ resubmitForTesting: e.target.value as any })}
              className="input-field"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <label className="text-lg font-semibold mb-4 block">Packager Approved</label>
            <input
              value={formData.packagerApproved || ''}
              onChange={(e) => updateFormData({ packagerApproved: e.target.value })}
              className="input-field"
              placeholder="Please input"
            />
          </div>

          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <label className="text-lg font-semibold mb-4 block">QA Approved</label>
            <input
              value={formData.qaApproved || ''}
              onChange={(e) => updateFormData({ qaApproved: e.target.value })}
              className="input-field"
              placeholder="Please input"
            />
          </div>
        </>
      )}

      {/* Submit button */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={submitted || submitting || (!isEditMode && (!allChecked || !isMessageForBAValid))}
          className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitted ? 'Already Submitted' : submitting ? 'Submitting...' : (isEditMode ? 'Submit Change' : 'Submit Property')}
        </button>
      </div>
    </div>
  );
}
