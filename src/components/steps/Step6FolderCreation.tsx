'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';

// GHL Configuration
const GHL_LOCATION_ID = 'UJWYn4mrgGodB7KZUcHt';
const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export function Step6FolderCreation() {
  const { formData, updateAddress, updateFormData, setCurrentStep, resetForm } = useFormStore();
  const { address, decisionTree } = formData;
  
  const [folderName, setFolderName] = useState('');
  const [folderLink, setFolderLink] = useState(address?.folderLink || '');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ghlRecordId, setGhlRecordId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'pending' | 'sent' | 'failed'>('pending');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Determine folder name based on property type
  const getFolderName = (): string => {
    // Always use propertyAddress from Step 1 (not projectAddress)
    return address?.propertyAddress || '';
  };

  // Initialize folder name on mount and when dependencies change
  useEffect(() => {
    const name = getFolderName();
    if (name) {
      setFolderName(name);
    }
  }, [address?.propertyAddress]);

  // Checklist items
  const isNewProperty = decisionTree?.propertyType === 'New';
  const baseChecklist: ChecklistItem[] = [
    { id: 'cashflow', label: 'Set / check values in cashflow spreadsheet', checked: false },
    { id: 'photos', label: 'Pasted photos & the address of the property into the Photos doc', checked: false },
    { id: 'cma-rental', label: 'Saved the CMA Rental report to the folder', checked: false },
    { id: 'cma-property', label: 'Saved the CMA Property report', checked: false },
    { id: 'hotspotting', label: 'Saved the Hot-spotting report to the folder', checked: false },
  ];

  const newPropertyChecklist: ChecklistItem[] = [
    { id: 'site-docs', label: 'Saved the relevant documentation for the Site, Lot, inclusions etc if a new property', checked: false },
  ];

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    ...baseChecklist,
    ...(isNewProperty ? newPropertyChecklist : []),
  ]);

  // Create folder
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      setFolderError('Folder name is required');
      return;
    }

    setIsCreatingFolder(true);
    setFolderError(null);

    try {
      const response = await fetch('/api/create-property-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyAddress: folderName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const result = await response.json();
      
      if (result.success) {
        setFolderLink(result.folderLink);
        // Store folder link in form state
        updateAddress({ folderLink: result.folderLink, folderName: result.folderName });
      } else {
        throw new Error(result.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setFolderError(error instanceof Error ? error.message : 'Failed to create folder');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Handle checklist change
  const handleChecklistChange = (id: string) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  // Tick all checklist items
  const handleTickAll = () => {
    setChecklist(prev => prev.map(item => ({ ...item, checked: true })));
  };

  // Validate checklist
  const isChecklistComplete = () => {
    return checklist.every(item => item.checked);
  };

  // Submit to GHL and Make.com
  const handleSubmit = async () => {
    if (!isChecklistComplete()) {
      setSubmitError('Please complete all checklist items before submitting');
      return;
    }

    if (!folderLink) {
      setSubmitError('Please create the folder first');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

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
      // Numeric fields need 0 (not null) so GHL accepts them and Make.com can preserve number types
      const convertEmptyStringsToNull = (obj: any, parentKey?: string): any => {
        // If it's an array, process each element
        if (Array.isArray(obj)) {
          return obj.map(item => convertEmptyStringsToNull(item, parentKey));
        }
        
        // If it's an object, process each property
        if (typeof obj === 'object' && obj !== null) {
          const result: any = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              // Check if this key is numeric (for nested objects like purchasePrice.landPrice)
              const isNumericField = NUMERIC_FIELDS.includes(key);
              const value = obj[key];
              
              // Handle numeric fields: convert null, undefined, or empty string to '0'
              if (isNumericField && (value === null || value === undefined || value === '')) {
                result[key] = '0'; // Return as string "0" - Module 21's toInteger() will convert to number
              } else {
                // Recursively process non-numeric fields or non-empty numeric fields
                result[key] = convertEmptyStringsToNull(value, key);
              }
            }
          }
          return result;
        }
        
        // If it's an empty string for a numeric field, convert to '0'
        if (obj === '' && parentKey && NUMERIC_FIELDS.includes(parentKey)) {
          return '0';
        }
        
        // If it's an empty string for text field, convert to null
        if (obj === '') {
          return null;
        }
        
        // If it's null/undefined (and not a numeric field), return as-is
        if (obj === null || obj === undefined) {
          return obj;
        }
        
        // For primitive values (strings, numbers, booleans), return as-is
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
        folderLink: folderLink,
      };

      // Convert all empty strings to null (handles all fields automatically, including future fields)
      const processedSubmissionData = convertEmptyStringsToNull(submissionData);

      // Send all data to Make.com webhook (Make.com will create GHL record)
      const makeResponse = await fetch('https://hook.eu1.make.com/2xbtucntvnp3wfmkjk0ecuxj4q4c500h', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'form_app',
          action: 'submit_new_property',
          formData: processedSubmissionData,
          folderLink: folderLink,
        }),
      });

      if (!makeResponse.ok) {
        const errorData = await makeResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Make.com error: ${makeResponse.status} ${makeResponse.statusText}`);
      }

      const makeResult = await makeResponse.json().catch(() => ({}));
      
      // Extract GHL record ID from Make.com response (if provided)
      const recordId = makeResult.recordId || makeResult.id || makeResult.ghlRecordId;
      if (recordId) {
        setGhlRecordId(recordId);
      }

      // Email status - assume sent if Make.com succeeds
      setEmailStatus('sent');

      // Show success screen
      // TEMPORARILY DISABLED FOR TESTING - allows multiple submissions
      // setShowSuccess(true);
    } catch (error) {
      console.error('Error submitting property:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit property');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend email
  const handleResendEmail = async () => {
    if (!ghlRecordId) return;

    setEmailStatus('pending');
    setEmailError(null);

    try {
      const response = await fetch('https://hook.eu1.make.com/bkq23g13n4ae6qpkdbdwpnu7h1ac16d', {
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

  // Success screen
  if (showSuccess) {
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
              {folderLink && (
                <a
                  href={folderLink}
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
              onClick={() => {
                resetForm();
                setShowSuccess(false);
                setCurrentStep(1);
              }}
              className="btn-primary w-full"
            >
              Clear Form and Create a New Property Package
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Folder Creation for Supporting Documentation</h2>
      
      {/* Folder Creation Section */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Create Property Folder</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label-field">Folder Name</label>
            <input
              type="text"
              value={folderName}
              readOnly
              disabled
              className="input-field bg-gray-100 cursor-not-allowed"
              placeholder="Property address"
            />
            <p className="text-xs text-gray-500 mt-1">
              Uses property address from Step 1
            </p>
          </div>

          {!folderLink ? (
            <button
              onClick={handleCreateFolder}
              disabled={isCreatingFolder || !folderName.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingFolder ? 'Creating Folder...' : 'Create Folder'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-900 mb-2">✓ Folder created successfully</p>
                <a
                  href={folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {folderLink}
                </a>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Instructions:</strong> Add/edit documents as necessary in the folder above.
                </p>
              </div>

              <button
                onClick={() => setShowChecklist(true)}
                className="btn-primary"
              >
                Confirm & Continue to Checklist
              </button>
            </div>
          )}

          {folderError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{folderError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Checklist Section */}
      {showChecklist && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Pre-Submission Checklist</h3>

          <div className="space-y-3 mb-4">
            {checklist.map((item) => (
              <label key={item.id} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => handleChecklistChange(item.id)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className={`text-sm ${item.checked ? 'text-gray-700' : 'text-gray-600'}`}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>

          {submitError && (
            <div className="mt-4 mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}

          {/* Tick All button - moved to bottom, just above Submit button */}
          <div className="mb-4">
            <button
              onClick={handleTickAll}
              className="btn-secondary text-sm"
            >
              Tick All
            </button>
          </div>

          {/* Attachments Additional Dialogue Section */}
          <div className="mb-6">
            <label className="label-field">Attachments Additional Dialogue (Optional)</label>
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
          <div className="mb-6">
            <label className="label-field">Message for BA (Optional)</label>
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

          {/* Submit button - shown after folder is created and checklist is displayed */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isChecklistComplete()}
              className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Property'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
