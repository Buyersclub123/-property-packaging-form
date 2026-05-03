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
  const { formData, setCurrentStep, updateFormData, updateLotCashflowOverrides } = useFormStore();
  const [creating, setCreating] = useState(false);
  const [folderLink, setFolderLink] = useState<string | null>(formData.address?.folderLink || null);
  const [error, setError] = useState<string | null>(null);
  const [openingSpreadsheet, setOpeningSpreadsheet] = useState(false);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);
  
  // AMAP internal report state
  const [amapReports, setAmapReports] = useState<Array<{ id: string; name: string }>>([]);
  const [amapLoading, setAmapLoading] = useState(false);
  const [amapError, setAmapError] = useState<string | null>(null);
  const [amapSearch, setAmapSearch] = useState('');
  const [amapDropdownOpen, setAmapDropdownOpen] = useState(false);
  const [selectedAmap, setSelectedAmap] = useState<{ id: string; name: string } | null>(
    formData.amapReportFileId && formData.amapReportName
      ? { id: formData.amapReportFileId, name: formData.amapReportName }
      : null
  );
  const [amapNotAvailable, setAmapNotAvailable] = useState(false);
  const amapResolved = !!selectedAmap || amapNotAvailable;
  
  // Check if in edit mode
  const isEditMode = formData.editMode === true || !!formData.ghlRecordId;

  // Sync folderLink from formData when it changes (e.g., after loading from GHL)
  useEffect(() => {
    if (formData.address?.folderLink) {
      setFolderLink(formData.address.folderLink);
    }
  }, [formData.address?.folderLink]);

  const isProject = formData.decisionTree?.propertyType === 'New' && formData.decisionTree?.lotType === 'Multiple';
  const lots = formData.lots || [];
  const [selectedLotIndex, setSelectedLotIndex] = useState(0);
  
  useEffect(() => {
    if (selectedLotIndex >= lots.length) {
      setSelectedLotIndex(0);
    }
  }, [lots.length, selectedLotIndex]);

  // Editable fields state (Project defaults)
  const [councilWaterRates, setCouncilWaterRates] = useState(formData.councilWaterRates || '');
  // Pre-populate insurance from Step 6 Insurance Calculator, fallback to saved insuranceAmount
  const [insuranceAmount, setInsuranceAmount] = useState(formData.insurance || formData.insuranceAmount || '');

  const { address, decisionTree, depreciation } = formData;

  const selectedLot = isProject ? lots[selectedLotIndex] : null;
  const councilOverrideEnabled = !!selectedLot?.cashflowOverrides?.overrideCouncilWaterRates;
  const insuranceOverrideEnabled = !!selectedLot?.cashflowOverrides?.overrideInsurance;
  const depreciationOverrideEnabled = !!selectedLot?.cashflowOverrides?.overrideDepreciation;
  const lotOverridesEnabled = councilOverrideEnabled || insuranceOverrideEnabled || depreciationOverrideEnabled;
  const effectiveCouncilWaterRates = isProject && councilOverrideEnabled
    ? (selectedLot?.cashflowOverrides?.councilWaterRates && selectedLot.cashflowOverrides.councilWaterRates.trim() !== ''
        ? selectedLot.cashflowOverrides.councilWaterRates
        : councilWaterRates)
    : councilWaterRates;
  const effectiveInsuranceAmount = isProject && insuranceOverrideEnabled
    ? (selectedLot?.cashflowOverrides?.insurance && selectedLot.cashflowOverrides.insurance.trim() !== ''
        ? selectedLot.cashflowOverrides.insurance
        : insuranceAmount)
    : insuranceAmount;

  const effectiveDepreciation = (() => {
    if (!isProject) return depreciation;
    if (!depreciationOverrideEnabled) return depreciation;
    const lotDep = selectedLot?.cashflowOverrides?.depreciation;
    if (!lotDep) return depreciation;
    return {
      ...(depreciation || {}),
      ...lotDep,
    };
  })();

  // Sync councilWaterRates and insurance to formData when they change (Project defaults + single-property fields)
  useEffect(() => {
    updateFormData({
      councilWaterRates,
      insurance: insuranceAmount, // Map insuranceAmount to insurance field
    });
  }, [councilWaterRates, insuranceAmount, updateFormData]);
  const [buildWindow, setBuildWindow] = useState(formData.buildWindow || '09 mo');
  const [cashback1Month, setCashback1Month] = useState(formData.cashback1Month || '5');
  const [cashback2Month, setCashback2Month] = useState(formData.cashback2Month || '7');
  const effectivePropertyDescription = isProject ? (selectedLot?.propertyDescription || {}) : (formData.propertyDescription || {});
  const effectivePurchasePrice = isProject ? (selectedLot?.purchasePrice || {}) : (formData.purchasePrice || {});
  const effectiveRentalAssessment = isProject ? (selectedLot?.rentalAssessment || {}) : (formData.rentalAssessment || {});
  const isDualOccupancy = decisionTree?.dualOccupancy === 'Yes';
  const isSplitContract = decisionTree?.contractTypeSimplified === 'Split Contract';
  const isStrata = ['strata', 'owners_corp_community', 'survey_strata', 'built_strata'].includes(effectivePropertyDescription?.title || '');

  // Calculate values
  const calculateTotalCost = () => {
    const contractType = decisionTree?.contractTypeSimplified;
    const propertyType = decisionTree?.propertyType;
    
    if (contractType === 'Split Contract') {
      const land = parseFloat(effectivePurchasePrice?.landPrice || '0');
      const build = parseFloat(effectivePurchasePrice?.buildPrice || '0');
      const total = land + build;
      return total;
    } else if (propertyType === 'New') {
      const total = parseFloat(effectivePurchasePrice?.totalPrice || '0');
      return total;
    } else {
      // Established property - use acceptableAcquisitionTo (NOT acceptedAcquisitionPriceTo)
      const total = parseFloat(effectivePurchasePrice?.acceptableAcquisitionTo || '0');
      return total;
    }
  };

  const calculateInsuranceTotal = () => {
    if (isStrata) {
      const bodyCorpPerQuarter = parseFloat(effectivePropertyDescription?.bodyCorpPerQuarter || '0');
      const annualisedBodyCorp = bodyCorpPerQuarter * 4;
      const insurance = parseFloat(effectiveInsuranceAmount || '0');
      return { annualisedBodyCorp, insurance, total: annualisedBodyCorp + insurance };
    }
    return { insurance: parseFloat(effectiveInsuranceAmount || '0') };
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
    if (!effectiveCouncilWaterRates || effectiveCouncilWaterRates.trim() === '') {
      setError('Council/Water Rates $ is required');
      return false;
    }
    
    if (!effectiveInsuranceAmount || effectiveInsuranceAmount.trim() === '') {
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

  // Fetch AMAP reports from Google Drive folder
  const fetchAmapReports = async () => {
    if (amapReports.length > 0) {
      setAmapDropdownOpen(true);
      return;
    }
    setAmapLoading(true);
    setAmapError(null);
    try {
      const response = await fetch('/api/internal-reports/list');
      const result = await response.json();
      if (result.success && result.reports) {
        setAmapReports(result.reports);
        setAmapDropdownOpen(true);
      } else {
        setAmapError(result.error || 'Failed to load reports');
      }
    } catch (err) {
      setAmapError('Failed to fetch internal reports');
    } finally {
      setAmapLoading(false);
    }
  };

  const handleAmapSelect = (report: { id: string; name: string }) => {
    setSelectedAmap(report);
    setAmapDropdownOpen(false);
    setAmapSearch('');
    updateFormData({
      amapReportFileId: report.id,
      amapReportName: report.name,
    });
  };

  const handleAmapClear = () => {
    setSelectedAmap(null);
    setAmapSearch('');
    updateFormData({
      amapReportFileId: '',
      amapReportName: '',
    });
  };

  const filteredAmapReports = amapReports.filter(r =>
    r.name.toLowerCase().includes(amapSearch.toLowerCase())
  );

  const handleCreateFolder = async () => {
    // Validate fields first
    if (!validateFields()) {
      return;
    }

    // Save editable fields to store
    updateFormData({
      councilWaterRates: effectiveCouncilWaterRates,
      insuranceAmount: effectiveInsuranceAmount,
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
            cashflowSelectedLotNumber: isProject ? selectedLot?.lotNumber : undefined,
            propertyDescription: effectivePropertyDescription,
            purchasePrice: effectivePurchasePrice,
            rentalAssessment: effectiveRentalAssessment,
            councilWaterRates: effectiveCouncilWaterRates,
            insuranceAmount: effectiveInsuranceAmount,
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

        // Log AMAP gap if "Not available" was ticked
        if (amapNotAvailable && formData.address?.suburbName && formData.address?.state) {
          try {
            await fetch('/api/internal-reports/log-gap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                suburb: formData.address.suburbName,
                state: formData.address.state,
                propertyAddress: constructFolderName(formData.address),
              }),
            });
          } catch (logErr) {
            console.warn('[AMAP Gap] Failed to log gap (non-blocking):', logErr);
          }
        }
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
    effectiveRentalAssessment?.rentAppraisalPrimaryFrom || '0',
    effectiveRentalAssessment?.rentAppraisalPrimaryTo || '0',
    effectiveRentalAssessment?.rentAppraisalSecondaryFrom,
    effectiveRentalAssessment?.rentAppraisalSecondaryTo
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Cashflow Spreadsheet Review</h2>
        <p className="text-sm text-gray-600">
          Property Address: <span className="font-semibold">{address?.propertyAddress || 'N/A'}</span>
        </p>
      </div>

      {isProject && lots.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Project cashflow defaults + per-lot overrides</h3>
              <p className="text-xs text-gray-600">Defaults apply to all lots unless a lot override is enabled.</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Lot</label>
              <select
                value={selectedLotIndex}
                onChange={(e) => setSelectedLotIndex(parseInt(e.target.value, 10))}
                className="input-field"
              >
                {lots.map((lot, idx) => (
                  <option key={idx} value={idx}>
                    Lot {lot.lotNumber || idx + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={councilOverrideEnabled}
                  onChange={(e) => {
                    updateLotCashflowOverrides(selectedLotIndex, {
                      overrideCouncilWaterRates: e.target.checked,
                      ...(e.target.checked ? {} : { councilWaterRates: '' }),
                    } as any);
                  }}
                />
                Override Council/Water Rates for this lot
              </label>
              {councilOverrideEnabled && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={selectedLot?.cashflowOverrides?.councilWaterRates || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      updateLotCashflowOverrides(selectedLotIndex, { councilWaterRates: value } as any);
                    }}
                    className="input-field"
                    placeholder="Enter annual council/water rates"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={insuranceOverrideEnabled}
                  onChange={(e) => {
                    updateLotCashflowOverrides(selectedLotIndex, {
                      overrideInsurance: e.target.checked,
                      ...(e.target.checked ? {} : { insurance: '' }),
                    } as any);
                  }}
                />
                Override Insurance for this lot
              </label>
              {insuranceOverrideEnabled && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={selectedLot?.cashflowOverrides?.insurance || ''}
                    onChange={(e) => {
                      const sanitized = e.target.value.replace(/[^\d,.-]/g, '');
                      updateLotCashflowOverrides(selectedLotIndex, { insurance: sanitized } as any);
                    }}
                    className="input-field"
                    placeholder="e.g., 1250"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        <div className="py-3 px-4 border-b border-gray-200 hover:bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-1">Subject Line</div>
          <div className="text-sm text-gray-900">{formData.subjectLine || 'Not yet computed'}</div>
        </div>

        {/* 2. Financial Details */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">2. Financial Details</h3>
        </div>

        {isSplitContract && (
          <>
            <Field label="Land Cost" value={formatCurrency(effectivePurchasePrice?.landPrice)} />
            <Field label="Build Cost" value={formatCurrency(effectivePurchasePrice?.buildPrice)} />
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
        {effectivePurchasePrice?.cashbackRebateType === 'cashback' && (
          <Field label="Cashback Value" value={formatCurrency(effectivePurchasePrice?.cashbackRebateValue)} />
        )}

        {/* 3. Property Features */}
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 mt-4">
          <h3 className="text-sm font-semibold text-gray-700">3. Property Features</h3>
        </div>

        <Field 
          label="Total Bed" 
          value={(() => {
            const bedsPrimaryStr = isProject ? selectedLot?.propertyDescription?.bedsPrimary : effectivePropertyDescription?.bedsPrimary;
            const bedsSecondaryStr = isProject ? selectedLot?.propertyDescription?.bedsSecondary : effectivePropertyDescription?.bedsSecondary;
            const bedsPrimary = parseInt(bedsPrimaryStr || '0');
            const bedsSecondary = parseInt(bedsSecondaryStr || '0');
            const total = bedsPrimary + bedsSecondary;
            return total > 0 ? total : 'N/A';
          })()} 
        />

        <Field 
          label="Total Bath" 
          value={(() => {
            const bathPrimaryStr = isProject ? selectedLot?.propertyDescription?.bathPrimary : effectivePropertyDescription?.bathPrimary;
            const bathSecondaryStr = isProject ? selectedLot?.propertyDescription?.bathSecondary : effectivePropertyDescription?.bathSecondary;
            const bathPrimary = parseInt(bathPrimaryStr || '0');
            const bathSecondary = parseInt(bathSecondaryStr || '0');
            const total = bathPrimary + bathSecondary;
            return total > 0 ? total : 'N/A';
          })()} 
        />

        <Field 
          label="Total Garage" 
          value={(() => {
            const garagePrimaryStr = isProject ? selectedLot?.propertyDescription?.garagePrimary : effectivePropertyDescription?.garagePrimary;
            const garageSecondaryStr = isProject ? selectedLot?.propertyDescription?.garageSecondary : effectivePropertyDescription?.garageSecondary;
            const carspacePrimaryStr = isProject ? selectedLot?.propertyDescription?.carspacePrimary : effectivePropertyDescription?.carspacePrimary;
            const carspaceSecondaryStr = isProject ? selectedLot?.propertyDescription?.carspaceSecondary : effectivePropertyDescription?.carspaceSecondary;
            const carportPrimaryStr = isProject ? selectedLot?.propertyDescription?.carportPrimary : effectivePropertyDescription?.carportPrimary;
            const carportSecondaryStr = isProject ? selectedLot?.propertyDescription?.carportSecondary : effectivePropertyDescription?.carportSecondary;

            const garagePrimary = parseInt(garagePrimaryStr || '0');
            const garageSecondary = parseInt(garageSecondaryStr || '0');
            const carspacePrimary = parseInt(carspacePrimaryStr || '0');
            const carspaceSecondary = parseInt(carspaceSecondaryStr || '0');
            const carportPrimary = parseInt(carportPrimaryStr || '0');
            const carportSecondary = parseInt(carportSecondaryStr || '0');
            const total = garagePrimary + garageSecondary + carspacePrimary + carspaceSecondary + carportPrimary + carportSecondary;
            return total > 0 ? total : 'N/A';
          })()} 
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
            value={effectiveCouncilWaterRates ? parseInt(effectiveCouncilWaterRates).toLocaleString() : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/[^0-9]/g, '');
              if (isProject && councilOverrideEnabled) {
                updateLotCashflowOverrides(selectedLotIndex, { councilWaterRates: value } as any);
              } else {
                setCouncilWaterRates(value);
              }
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
            <span className="text-sm text-gray-900">{formatCurrency(insuranceCalc.insurance || parseFloat(effectiveInsuranceAmount || '0'))}</span>
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
            value={formatCurrency(effectiveDepreciation?.[`year${year}` as keyof typeof effectiveDepreciation] || '0')} 
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

      {/* Internal AMAP Report Section */}
      <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Internal AMAP Report</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select an internal AMAP report to attach to the property folder, or confirm not available.
        </p>

        {selectedAmap ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-sm font-medium text-green-900">{selectedAmap.name}</span>
                </div>
                <button
                  onClick={handleAmapClear}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : amapNotAvailable ? (
          <div className="space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-800">No AMAP report available for this property</span>
                <button
                  onClick={() => setAmapNotAvailable(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <button
                onClick={fetchAmapReports}
                disabled={amapLoading}
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {amapLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Reports...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Browse AMAP Reports
                  </>
                )}
              </button>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={amapNotAvailable}
                  onChange={(e) => setAmapNotAvailable(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="text-sm text-gray-600">Not available</span>
              </label>
            </div>

            {amapDropdownOpen && (
              <div className="border border-gray-300 rounded-lg bg-white shadow-lg">
                <div className="p-2 border-b border-gray-200">
                  <input
                    type="text"
                    value={amapSearch}
                    onChange={(e) => setAmapSearch(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredAmapReports.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">
                      {amapSearch ? 'No matching reports found' : 'No reports available'}
                    </div>
                  ) : (
                    filteredAmapReports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => handleAmapSelect(report)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        {report.name}
                      </button>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-gray-200 flex justify-end">
                  <button
                    onClick={() => setAmapDropdownOpen(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {amapError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{amapError}</p>
          </div>
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
              disabled={creating || !amapResolved}
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
            {!amapResolved && (
              <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                Please select an AMAP report or tick "Not available" above before creating the folder.
              </p>
            )}
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
