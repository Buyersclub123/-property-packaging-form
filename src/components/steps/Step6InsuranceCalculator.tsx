'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step6InsuranceCalculator() {
  const { formData, updateFormData } = useFormStore();
  const [insuranceValue, setInsuranceValue] = useState(formData.insurance || '');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-save insurance value to form store whenever it changes
  useEffect(() => {
    if (insuranceValue.trim()) {
      updateFormData({
        insurance: insuranceValue
      });
    }
  }, [insuranceValue, updateFormData]);

  // Load existing insurance data on mount
  useEffect(() => {
    if (formData.insurance) {
      setInsuranceValue(formData.insurance);
    }
  }, [formData.insurance]);

  const handleInsuranceChange = (value: string) => {
    // Allow only numbers, commas, and decimals
    const sanitized = value.replace(/[^\d,.-]/g, '');
    setInsuranceValue(sanitized);
  };

  const isValid = () => {
    if (!insuranceValue || insuranceValue.trim() === '') return false;
    
    const numValue = parseFloat(insuranceValue.replace(/,/g, ''));
    if (isNaN(numValue) || numValue < 0) return false;
    
    return true;
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Insurance Calculator</h2>
      
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

        {/* Terri Scheer Insurance Calculator */}
        <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Terri Scheer Insurance Calculator</h3>
          <p className="text-sm text-gray-700 mb-4">
            Please use the Terri Scheer online calculator to get your insurance quote, then enter the annual insurance cost in the field below.
          </p>
          
          <a
            href="https://online.terrischeer.com.au/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mb-4"
          >
            Open Terri Scheer Calculator →
          </a>
          
          <p className="text-xs text-gray-600 italic">
            (Opens in a new tab. Complete the quote and return here to enter the value.)
          </p>
        </div>
        
        {/* Instructions Placeholder */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <h4 className="text-base font-semibold text-gray-900 mb-2">How to Use the Terri Scheer Calculator</h4>
          <p className="text-sm text-gray-600 italic">
            Instructions to be provided by the Property Team to add in later.
          </p>
        </div>

        {/* Insurance Value Input */}
        <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Enter Insurance Value</h3>
          <p className="text-sm text-blue-800 mb-4">
            After completing the insurance calculator above, enter the total insurance value below. This will be used in the Cashflow Review.
          </p>
          
          <div className="flex items-center gap-3">
            <label className="text-base font-medium text-gray-700 whitespace-nowrap">
              Annual Insurance Cost ($)
            </label>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={insuranceValue}
                onChange={(e) => handleInsuranceChange(e.target.value)}
                placeholder="e.g., 1250"
                className={`w-full px-4 py-3 text-lg text-right border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !isValid() && insuranceValue ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
          </div>
          
          {insuranceValue && isValid() && (
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm font-medium">
                Insurance value saved: ${parseFloat(insuranceValue.replace(/,/g, '')).toLocaleString()}
              </span>
            </div>
          )}
          
          {insuranceValue && !isValid() && (
            <p className="mt-2 text-sm text-red-600">
              Please enter a valid numeric value for insurance cost.
            </p>
          )}
          
          {!insuranceValue && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="text-red-600">*</span> Insurance value is required before proceeding to the next step.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
