'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';
import { ContractType } from '@/types/form';

interface CashflowLinksSectionProps {
  className?: string;
}

export function CashflowLinksSection({ className = '' }: CashflowLinksSectionProps) {
  const { formData, updateFormData } = useFormStore();
  const { decisionTree, cashflowSheetLinkHL, cashflowSheetLinkGeneral } = formData;
  
  const [hlLink, setHlLink] = useState(cashflowSheetLinkHL || '');
  const [generalLink, setGeneralLink] = useState(cashflowSheetLinkGeneral || '');
  
  // Sync state with formData when it changes externally
  useEffect(() => {
    if (cashflowSheetLinkHL !== hlLink) {
      setHlLink(cashflowSheetLinkHL || '');
    }
    if (cashflowSheetLinkGeneral !== generalLink) {
      setGeneralLink(cashflowSheetLinkGeneral || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cashflowSheetLinkHL, cashflowSheetLinkGeneral]);
  
  // Determine which template(s) are needed based on contract type
  const contractType = decisionTree?.contractType;
  const needsHLTemplate = contractType === '01 H&L Comms';
  const needsGeneralTemplate = contractType === '02 Single Comms' || 
                               contractType === '03 Internal with Comms' || 
                               contractType === '04 Internal No-Comms' || 
                               contractType === '05 Established';
  
  // Update form data when links change
  useEffect(() => {
    updateFormData({
      cashflowSheetLinkHL: hlLink || undefined,
      cashflowSheetLinkGeneral: generalLink || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hlLink, generalLink]);
  
  // Validate Google Sheets copy URL format
  const isValidCopyUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (optional field)
    const copyUrlPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+\/copy/;
    return copyUrlPattern.test(url.trim());
  };
  
  const handleHlLinkChange = (value: string) => {
    setHlLink(value);
  };
  
  const handleGeneralLinkChange = (value: string) => {
    setGeneralLink(value);
  };
  
  return (
    <div className={className}>
      <h3 className="text-xl font-semibold mb-4">Cashflow Spreadsheets</h3>
      <p className="text-sm text-gray-600 mb-4">
        Add Google Sheets copy URLs for cashflow spreadsheet templates. Each client will get their own editable copy when they click the link.
      </p>
      
      <div className="space-y-4">
        {/* House & Land Template */}
        {needsHLTemplate && (
          <div>
            <label className="label-field mb-2">
              House & Land Cashflow Spreadsheet (Copy URL) *
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Copy URL format: <code className="bg-gray-100 px-1 rounded">https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy</code>
            </p>
            <input
              type="url"
              value={hlLink}
              onChange={(e) => handleHlLinkChange(e.target.value)}
              className={`input-field ${!isValidCopyUrl(hlLink) ? 'border-red-500' : ''}`}
              placeholder="https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy"
            />
            {!isValidCopyUrl(hlLink) && hlLink.trim() && (
              <p className="text-sm text-red-600 mt-1">
                Invalid copy URL format. Must be a Google Sheets copy URL.
              </p>
            )}
            {hlLink && isValidCopyUrl(hlLink) && (
              <a
                href={hlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-1 inline-block"
              >
                Test link (opens in new tab)
              </a>
            )}
          </div>
        )}
        
        {/* General/Single Contract Template */}
        {needsGeneralTemplate && (
          <div>
            <label className="label-field mb-2">
              General Cashflow Spreadsheet (Copy URL) *
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Copy URL format: <code className="bg-gray-100 px-1 rounded">https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy</code>
            </p>
            <input
              type="url"
              value={generalLink}
              onChange={(e) => handleGeneralLinkChange(e.target.value)}
              className={`input-field ${!isValidCopyUrl(generalLink) ? 'border-red-500' : ''}`}
              placeholder="https://docs.google.com/spreadsheets/d/[SHEET_ID]/copy"
            />
            {!isValidCopyUrl(generalLink) && generalLink.trim() && (
              <p className="text-sm text-red-600 mt-1">
                Invalid copy URL format. Must be a Google Sheets copy URL.
              </p>
            )}
            {generalLink && isValidCopyUrl(generalLink) && (
              <a
                href={generalLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-1 inline-block"
              >
                Test link (opens in new tab)
              </a>
            )}
          </div>
        )}
        
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
          <h4 className="font-semibold text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Create master templates in Google Sheets (in the property folder)</li>
            <li>Get the copy URL: Open the sheet → File → Share → Copy link → Change to "Anyone with the link can view" → Copy the link</li>
            <li>Replace <code className="bg-blue-100 px-1 rounded">/edit</code> with <code className="bg-blue-100 px-1 rounded">/copy</code> in the URL</li>
            <li>Paste the copy URL above. Clients will get their own editable copy when they click it.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

