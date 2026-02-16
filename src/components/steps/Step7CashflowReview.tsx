'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';
import { constructFolderName } from '@/lib/addressFormatter';

// Field component for consistent styling - MUST be outside main component to prevent re-renders
const Field = ({ label, value, editable = false, children }: { 
  label: string; 
  value?: string | number; 
  editable?: boolean;
  children?: React.ReactNode;
}) => (
  <div className="flex items-center py-3 border-b border-gray-200 hover:bg-gray-50">
    <div className="w-1/2 px-4">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {editable && <span className="text-red-500 ml-1">*</span>}
      </span>
    </div>
    <div className="w-1/2 px-4">
      {children || (
        <span className="text-sm text-gray-900">{value || 'N/A'}</span>
      )}
    </div>
  </div>
);

export function Step7CashflowReview() {
  const { formData, setCurrentStep, updateFormData } = useFormStore();
  const [creating, setCreating] = useState(false);
  const [folderLink, setFolderLink] = useState<string | null>(formData.address?.folderLink || null);
  const [error, setError] = useState<string | null>(null);
  const [openingSpreadsheet, setOpeningSpreadsheet] = useState(false);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  
  // Check if in edit mode
  const isEditMode = formData.editMode === true || !!formData.ghlRecordId;

  // Sync folderLink from formData when it changes (e.g., after loading from GHL)
  useEffect(() => {
    if (formData.address?.folderLink) {
      setFolderLink(formData.address.folderLink);
    }
  }, [formData.address?.folderLink]);

  // Editable fields state
  const [councilWaterRates, setCouncilWaterRates] = useState(formData.councilWaterRates || '');
  // Pre-populate insurance from Step 6 Insurance Calculator, fallback to saved insuranceAmount
  const [insuranceAmount, setInsuranceAmount] = useState(formData.insurance || formData.insuranceAmount || '');

  // Sync councilWaterRates and insurance to formData when they change (for edit mode)
  useEffect(() => {
    updateFormData({
      councilWaterRates,
      insurance: insuranceAmount, // Map insuranceAmount to insurance field
    });
  }, [councilWaterRates, insuranceAmount, updateFormData]);
  const [buildWindow, setBuildWindow] = useState(formData.buildWindow || '09 mo');
  const [cashback1Month, setCashback1Month] = useState(formData.cashback1Month || '5');
  const [cashback2Month, setCashback2Month] = useState(formData.cashback2Month || '7');

  const { address, decisionTree, propertyDescription, purchasePrice, rentalAssessment, depreciation } = formData;
  const isDualOccupancy = decisionTree?.dualOccupancy === 'Yes';
  const isSplitContract = decisionTree?.contractTypeSimplified === 'Split Contract';
  const isStrata = ['strata', 'owners_corp_community', 'survey_strata', 'built_strata'].includes(propertyDescription?.title || '');

  // Calculate values
  const calculateTotalCost = () => {
    const contractType = decisionTree?.contractTypeSimplified;
    const propertyType = decisionTree?.propertyType;
    
    if (contractType === 'Split Contract') {
      const land = parseFloat(purchasePrice?.landPrice || '0');
      const build = parseFloat(purchasePrice?.buildPrice || '0');
      const total = land + build;
      return total;
    } else if (propertyType === 'New') {
      const total = parseFloat(purchasePrice?.totalPrice || '0');
      return total;
    } else {
      // Established property - use acceptableAcquisitionTo (NOT acceptedAcquisitionPriceTo)
      const total = parseFloat(purchasePrice?.acceptableAcquisitionTo || '0');
      return total;
    }
  };

  const calculateInsuranceTotal = () => {
    if (isStrata) {
      const bodyCorpPerQuarter = parseFloat(propertyDescription?.bodyCorpPerQuarter || '0');
      const annualisedBodyCorp = bodyCorpPerQuarter * 4;
      const insurance = parseFloat(insuranceAmount || '0');
      return { annualisedBodyCorp, insurance, total: annualisedBodyCorp + insurance };
    }
    return { insurance: parseFloat(insuranceAmount || '0') };
  };

  const calculateRent = (from: string, to: string, secondaryFrom?: string, secondaryTo?: string) => {
    const primaryFrom = parseFloat(from || '0');
    const primaryTo = parseFloat(to || '0');
    
    if (isDualOccupancy && secondaryFrom && secondaryTo) {
      const secFrom = parseFloat(secondaryFrom);
      const secTo = parseFloat(secondaryTo);
      return {
        low: primaryFrom + secFrom,
        high: primaryTo + secTo
      };
    }
    return { low: primaryFrom, high: primaryTo };
  };

  // Format currency
  const formatCurrency = (value: number | string | undefined) => {
    if (!value) return 'N/A';
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    return isNaN(num) || num === 0 ? 'N/A' : `$${num.toLocaleString()}`;
  };

  // Validation
  const validateFields = () => {
    if (!councilWaterRates || councilWaterRates.trim() === '') {
      setError('Council/Water Rates $ is required');
      return false;
    }
    
    if (!insuranceAmount || insuranceAmount.trim() === '') {
      setError('Insurance Amount is required');
      return false;
    }
    
    if (isSplitContract) {
      if (!buildWindow || buildWindow.trim() === '') {
        setError('Build Window is required for Split Contract properties');
        return false;
      }
      if (!cashback1Month || cashback1Month.trim() === '') {
        setError('Cashback 1 month is required for Split Contract properties');
        return false;
      }
      if (!cashback2Month || cashback2Month.trim() === '') {
        setError('Cashback 2 month is required for Split Contract properties');
        return false;
      }
    }
    
    return true;
  };

  const handleCreateFolder = async () => {
    // Validate fields first
    if (!validateFields()) {
      return;
    }

    // Save editable fields to store
    updateFormData({
      councilWaterRates,
      insuranceAmount,
      buildWindow: isSplitContract ? buildWindow : undefined,
      cashback1Month: isSplitContract ? cashback1Month : undefined,
      cashback2Month: isSplitContract ? cashback2Month : undefined,
    });

    setCreating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/create-property-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          propertyAddress: constructFolderName(formData.address),
          formData: {
            ...formData,
            councilWaterRates,
            insuranceAmount,
            buildWindow: isSplitContract ? buildWindow : undefined,
            cashback1Month: isSplitContract ? cashback1Month : undefined,
            cashback2Month: isSplitContract ? cashback2Month : undefined,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const result = await response.json();
      
      if (result.success) {
        setFolderLink(result.folderLink);
        // Store folder link in form state
        useFormStore.getState().updateAddress({ 
          folderLink: result.folderLink, 
          folderName: result.folderName 
        });
      } else {
        throw new Error(result.error || 'Failed to create folder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setCreating(false);
    }
  };

  const handleEditSpreadsheet = async () => {
    if (!folderLink && !formData.address?.folderLink) {
      alert('Folder link is required to open the spreadsheet');
      return;
    }

    setOpeningSpreadsheet(true);
    setSpreadsheetError(null);
    
    try {
      const response = await fetch('/api/get-cashflow-spreadsheet-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          folderLink: folderLink || formData.address?.folderLink,
          contractType: formData.decisionTree?.contractTypeSimplified,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get spreadsheet link');
      }

      const result = await response.json();
      
      if (result.success && result.spreadsheetUrl) {
        // Open the spreadsheet in a new tab
        window.open(result.spreadsheetUrl, '_blank', 'noopener,noreferrer');
      } else {
        throw new Error(result.error || 'Failed to get spreadsheet link');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open spreadsheet';
      setSpreadsheetError(errorMessage);
      alert(errorMessage);
    } finally {
      setOpeningSpreadsheet(false);
    }
  };

  const totalCost = calculateTotalCost();
  const insuranceCalc = calculateInsuranceTotal();
  const rentCalc = calculateRent(
    rentalAssessment?.rentAppraisalPrimaryFrom || '0',
    rentalAssessment?.rentAppraisalPrimaryTo || '0',
    rentalAssessment?.rentAppraisalSecondaryFrom,
    rentalAssessment?.rentAppraisalSecondaryTo
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Cashflow Spreadsheet Review</h2>
        <p className="text-sm text-gray-600">
          Property Address: <span className="font-semibold">{address?.propertyAddress || 'N/A'}</span>
        </p>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Review all fields that will be populated in the cashflow spreadsheet. Fields marked with * are editable on this page.
      </p>

      {/* All Fields in Vertical List */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-6">
        
        {/* 1. Property Information */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
          <h3 className="text-sm font-semibold text-gray-700">1. Property Information</h3>
        </div>
        
        <Field label="Address" value={address?.propertyAddress} />
        <Field label="State" value={address?.state} />

        {/* 2. Financial Details */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">2. Financial Details</h3>
        </div>

        {isSplitContract && (
          <>
            <Field label="Land Cost" value={formatCurrency(purchasePrice?.landPrice)} />
            <Field label="Build Cost" value={formatCurrency(purchasePrice?.buildPrice)} />
          </>
        )}
        <Field 
          label={
            decisionTree?.propertyType === 'Established' 
              ? 'Acceptable Acquisition To ($)' 
              : 'Total Cost'
          } 
          value={formatCurrency(totalCost)} 
        />
        {purchasePrice?.cashbackRebateType === 'cashback' && (
          <Field label="Cashback Value" value={formatCurrency(purchasePrice?.cashbackRebateValue)} />
        )}

        {/* 3. Property Features */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">3. Property Features</h3>
        </div>

        <Field 
          label="Total Bed" 
          value={isDualOccupancy 
            ? `${propertyDescription?.bedsPrimary || 0} + ${propertyDescription?.bedsSecondary || 0}`
            : propertyDescription?.bedsPrimary || 'N/A'
          } 
        />
        <Field 
          label="Total Bath" 
          value={isDualOccupancy 
            ? `${propertyDescription?.bathPrimary || 0} + ${propertyDescription?.bathSecondary || 0}`
            : propertyDescription?.bathPrimary || 'N/A'
          } 
        />
        <Field 
          label="Total Garage" 
          value={isDualOccupancy 
            ? `${propertyDescription?.garagePrimary || 0} + ${propertyDescription?.garageSecondary || 0}`
            : propertyDescription?.garagePrimary || 'N/A'
          } 
        />

        {/* 4. Rental Income */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">4. Rental Income</h3>
        </div>

        <Field label="Low Rent (Weekly)" value={formatCurrency(rentCalc.low)} />
        <Field label="High Rent (Weekly)" value={formatCurrency(rentCalc.high)} />

        {/* 5. Costs & Reports (EDITABLE) */}
        <div className="bg-blue-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">5. Costs & Reports (Editable *)</h3>
        </div>

        <Field label="Council/Water Rates $" editable>
          <input
            type="text"
            value={councilWaterRates ? parseInt(councilWaterRates).toLocaleString() : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              setCouncilWaterRates(value);
            }}
            className="w-full px-3 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter annual council/water rates"
          />
        </Field>

        <Field label="Insurance Type" value={isStrata ? 'Insurance & Strata' : 'Insurance'} />

        <Field label="Insurance or Insurance & Strata $">
          {isStrata ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Annualised Body Corp:</span>
                <span className="font-medium text-gray-900">{formatCurrency(insuranceCalc.annualisedBodyCorp)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Insurance:</span>
                <span className="font-medium text-gray-900">{formatCurrency(insuranceCalc.insurance)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-300 pt-2">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(insuranceCalc.total)}</span>
              </div>
            </div>
          ) : (
            <span className="text-sm text-gray-900">{formatCurrency(insuranceCalc.insurance || parseFloat(insuranceAmount || '0'))}</span>
          )}
        </Field>

        <Field 
          label="P&B / PCI Report" 
          value={decisionTree?.propertyType === 'New' ? 'P&B + PCI Reports' : 'Pest & Build (P&B) report'} 
        />

        {/* 6. Depreciation Schedule */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">6. Depreciation Schedule (Years 1-10) <span className="text-gray-500 font-normal">(editable on previous page)</span></h3>
        </div>

        {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => (
          <Field 
            key={year}
            label={`Year ${year}`} 
            value={formatCurrency(depreciation?.[`year${year}` as keyof typeof depreciation] || '0')} 
          />
        ))}

        {/* 7. Split Contract Fields (EDITABLE) */}
        {isSplitContract && (
          <>
            <div className="bg-blue-100 px-4 py-2 border-b border-gray-300 mt-4">
              <h3 className="text-sm font-semibold text-gray-700">7. Split Contract Fields (Editable *)</h3>
            </div>

            <Field label="Build Window" editable>
              <select
                value={buildWindow}
                onChange={(e) => setBuildWindow(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select build window</option>
                <option value="09 mo">09 mo</option>
                <option value="12 mo">12 mo</option>
                <option value="15 mo">15 mo</option>
                <option value="18 mo">18 mo</option>
              </select>
            </Field>

            <Field label="Cashback 1 month" editable>
              <select
                value={cashback1Month}
                onChange={(e) => setCashback1Month(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select month</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={String(month)}>{month}</option>
                ))}
              </select>
            </Field>

            <Field label="Cashback 2 month" editable>
              <select
                value={cashback2Month}
                onChange={(e) => setCashback2Month(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select month</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={String(month)}>{month}</option>
                ))}
              </select>
            </Field>
          </>
        )}
      </div>

      {/* Folder Creation Section */}
      <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">
          {isEditMode ? 'Property Folder' : 'Create Property Folder'}
        </h3>
        
        {isEditMode ? (
          // Edit mode: Show View Folder button (folder should exist, but handle missing folderLink gracefully)
          folderLink ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <p className="text-sm font-medium text-green-900">Folder exists</p>
                </div>
                <a
                  href={folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm break-all"
                >
                  {folderLink}
                </a>
              </div>
              
              <div className="flex gap-3">
                <a
                  href={folderLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Folder in Google Drive
                </a>
                
                <button
                  onClick={handleEditSpreadsheet}
                  disabled={openingSpreadsheet}
                  className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {openingSpreadsheet ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Opening...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Cashflow Spreadsheet
                    </>
                  )}
                </button>
              </div>
              
              {spreadsheetError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">{spreadsheetError}</p>
                </div>
              )}
            </div>
          ) : null
        ) : !folderLink ? (
          // Create mode: Show Create Folder button
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Click the button below to create the Google Drive folder and populate the cashflow spreadsheet with all the data above.
            </p>
            <button
              onClick={handleCreateFolder}
              disabled={creating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Folder...
                </>
              ) : (
                'Create Folder & Populate Spreadsheet'
              )}
            </button>
          </div>
        ) : (
          // Create mode: Folder created successfully
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <p className="text-sm font-medium text-green-900">Folder created successfully!</p>
              </div>
              <a
                href={folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm break-all"
              >
                {folderLink}
              </a>
            </div>
            
            <div className="flex gap-3">
              <a
                href={folderLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Folder in Google Drive
              </a>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={handleCreateFolder}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
