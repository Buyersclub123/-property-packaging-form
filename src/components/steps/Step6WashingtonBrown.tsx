'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step6WashingtonBrown() {
  const { formData, updateFormData } = useFormStore();
  const [pastedText, setPastedText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [depreciation, setDepreciation] = useState<Record<string, string>>(
    formData.depreciation || {}
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load existing depreciation data on mount
  useEffect(() => {
    if (formData.depreciation) {
      setDepreciation(formData.depreciation);
      // Check if all 10 years are populated
      const allYearsPopulated = Array.from({ length: 10 }, (_, i) => i + 1).every(
        (year) => formData.depreciation?.[`year${year}` as keyof typeof formData.depreciation]
      );
      if (allYearsPopulated) {
        setSuccess(true);
      }
    }
  }, [formData.depreciation]);

  // Auto-save depreciation data to form store whenever it changes
  useEffect(() => {
    if (Object.keys(depreciation).length > 0) {
      updateFormData({
        depreciation: depreciation
      });
    }
  }, [depreciation, updateFormData]);

  const handleParse = () => {
    setParsing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const lines = pastedText.split('\n');
      const parsed: Record<string, string> = {};
      
      for (const line of lines) {
        // Match patterns like "Year 1: $12,345" or "1. $12,345" or "Year 1 $12,345"
        const match = line.match(/(?:Year\s*)?(\d+)[\s:.\-]+\$?([\d,]+(?:\.\d{2})?)/i);
        
        if (match) {
          const year = parseInt(match[1]);
          const value = match[2].replace(/,/g, ''); // Remove commas
          
          if (year >= 1 && year <= 10) {
            parsed[`year${year}`] = value;
          }
        }
      }
      
      // Validate: must have all 10 years
      const missingYears = [];
      for (let i = 1; i <= 10; i++) {
        if (!parsed[`year${i}`]) {
          missingYears.push(i);
        }
      }
      
      if (missingYears.length > 0) {
        setError(`Missing values for Year ${missingYears.join(', ')}. Please ensure all 10 years are included in the pasted text.`);
        setSuccess(false);
      } else {
        setDepreciation(parsed);
        setError(null);
        setSuccess(true);
      }
    } catch (err) {
      setError('Failed to parse. Please check the format and try again.');
      setSuccess(false);
    } finally {
      setParsing(false);
    }
  };

  const handleYearChange = (year: number, value: string) => {
    // Allow only numbers, commas, and decimals
    const sanitized = value.replace(/[^\d,.-]/g, '');
    
    setDepreciation((prev) => ({
      ...prev,
      [`year${year}`]: sanitized
    }));
    
    // Clear error if user is manually fixing
    if (error) {
      setError(null);
    }
    
    // Update success state
    const updatedDepreciation = {
      ...depreciation,
      [`year${year}`]: sanitized
    };
    const allYearsPopulated = Array.from({ length: 10 }, (_, i) => i + 1).every(
      (y) => updatedDepreciation[`year${y}`] && updatedDepreciation[`year${y}`].trim() !== ''
    );
    setSuccess(allYearsPopulated);
  };

  const isValid = () => {
    if (!depreciation) return false;
    
    for (let i = 1; i <= 10; i++) {
      const value = depreciation[`year${i}`];
      if (!value || value.trim() === '') return false;
      
      const numValue = parseFloat(value.replace(/,/g, ''));
      if (isNaN(numValue) || numValue < 0) return false;
    }
    
    return true;
  };

  const hasAnyData = Object.keys(depreciation).length > 0 && 
    Object.values(depreciation).some(v => v && v.trim() !== '');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Washington Brown Calculator</h2>
      
      <div className="space-y-6">
        {/* Property Details Summary */}
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Address</label>
              <p className="text-xl font-semibold text-gray-900">
                {formData.address?.propertyAddress || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                {formData.decisionTree?.propertyType === 'Established' 
                  ? 'Acceptable Acquisition To ($)' 
                  : 'Total Cost'}
              </label>
              <p className="text-xl font-semibold text-gray-900">
                {(() => {
                  const contractType = formData.decisionTree?.contractTypeSimplified;
                  const propertyType = formData.decisionTree?.propertyType;
                  
                  let totalCost = 0;
                  
                  if (contractType === 'Split Contract') {
                    const land = parseFloat(formData.purchasePrice?.landPrice || '0');
                    const build = parseFloat(formData.purchasePrice?.buildPrice || '0');
                    totalCost = land + build;
                  } else if (propertyType === 'New') {
                    totalCost = parseFloat(formData.purchasePrice?.totalPrice || '0');
                  } else {
                    // Established - use acceptableAcquisitionTo
                    totalCost = parseFloat(formData.purchasePrice?.acceptableAcquisitionTo || '0');
                  }
                  
                  return totalCost > 0 
                    ? `$${totalCost.toLocaleString()}` 
                    : 'Not provided';
                })()}
              </p>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Year Built</label>
              <p className="text-xl font-semibold text-gray-900">
                {formData.propertyDescription?.yearBuilt || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">Land Registration</label>
              <p className="text-xl font-semibold text-gray-900">
                {formData.propertyDescription?.landRegistration || 'Not provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Washington Brown Calculator Iframe */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Washington Brown Depreciation Calculator</h3>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <iframe
              ref={iframeRef}
              src="https://www.washingtonbrown.com.au/depreciation/calculator/"
              style={{ width: '100%', height: '800px', border: 0 }}
              title="Washington Brown Depreciation Calculator"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Manual Entry Instructions</h3>
          <p className="text-sm text-blue-800 mb-2">
            After using the calculator above, paste the depreciation report below. The parser will automatically extract depreciation values for Years 1-10.
          </p>
          <p className="text-sm text-blue-700">
            Expected format: Lines containing "Year 1: $12,345" or "1. $12,345" or similar patterns.
          </p>
        </div>

        {/* Textarea for pasting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste Washington Brown Report (Optional - for manual entry)
          </label>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste Washington Brown depreciation report here...&#10;&#10;Example:&#10;Year 1: $12,345&#10;Year 2: $11,234&#10;...&#10;Year 10: $5,678"
            className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Parse Button */}
        <div>
          <button
            onClick={handleParse}
            disabled={parsing || !pastedText.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {parsing ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Parsing...
              </>
            ) : (
              'Parse Depreciation Values'
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && !error && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p className="text-green-800 text-sm font-medium">All 10 years parsed successfully!</p>
          </div>
        )}

        {/* Results Table */}
        {hasAnyData && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Depreciation Values (Diminishing Value)</h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diminishing Value ($)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => {
                    const value = depreciation[`year${year}`] || '';
                    const isEmpty = !value || value.trim() === '';
                    
                    return (
                      <tr key={year} className={year % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          Year {year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleYearChange(year, e.target.value)}
                            placeholder="0"
                            className={`w-full px-3 py-2 text-right border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              isEmpty ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Validation hint */}
            {!isValid() && (
              <p className="mt-2 text-sm text-gray-600">
                <span className="text-red-600">*</span> All 10 years must have valid numeric values before proceeding to the next step.
              </p>
            )}
          </div>
        )}

        {/* Help Text */}
        {!hasAnyData && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Paste your Washington Brown report above and click "Parse Depreciation Values" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
