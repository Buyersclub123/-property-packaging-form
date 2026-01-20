'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';

export function InvestmentHighlightsSection() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address } = formData;
  
  const [mainBody, setMainBody] = useState(contentSections?.investmentHighlights || '');
  const [reportName, setReportName] = useState(contentSections?.investmentHighlightsReportName || '');
  const [validFrom, setValidFrom] = useState(contentSections?.investmentHighlightsValidFrom || '');
  const [validTo, setValidTo] = useState(contentSections?.investmentHighlightsValidTo || '');
  const [extraSections, setExtraSections] = useState<string[]>([
    contentSections?.investmentHighlightsExtra1 || '',
    contentSections?.investmentHighlightsExtra2 || '',
    contentSections?.investmentHighlightsExtra3 || '',
    contentSections?.investmentHighlightsExtra4 || '',
    contentSections?.investmentHighlightsExtra5 || '',
    contentSections?.investmentHighlightsExtra6 || '',
    contentSections?.investmentHighlightsExtra7 || '',
  ]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ found: boolean; dataSource?: string; reportName?: string; validFrom?: string; validTo?: string } | null>(null);

  // Sync local state with store changes
  useEffect(() => {
    if (contentSections) {
      setMainBody(contentSections.investmentHighlights || '');
      setReportName(contentSections.investmentHighlightsReportName || '');
      setValidFrom(contentSections.investmentHighlightsValidFrom || '');
      setValidTo(contentSections.investmentHighlightsValidTo || '');
      setExtraSections([
        contentSections.investmentHighlightsExtra1 || '',
        contentSections.investmentHighlightsExtra2 || '',
        contentSections.investmentHighlightsExtra3 || '',
        contentSections.investmentHighlightsExtra4 || '',
        contentSections.investmentHighlightsExtra5 || '',
        contentSections.investmentHighlightsExtra6 || '',
        contentSections.investmentHighlightsExtra7 || '',
      ]);
    }
  }, [contentSections]);

  const updateStore = (field: string, value: string) => {
    updateFormData({
      contentSections: {
        ...contentSections,
        [field]: value,
      },
    });
  };

  const handleMainBodyChange = (value: string) => {
    setMainBody(value);
    updateStore('investmentHighlights', value);
  };

  const handleExtraChange = (index: number, value: string) => {
    const newExtras = [...extraSections];
    newExtras[index] = value;
    setExtraSections(newExtras);
    updateStore(`investmentHighlightsExtra${index + 1}`, value);
  };

  const handleReportDetailChange = (field: 'investmentHighlightsReportName' | 'investmentHighlightsValidFrom' | 'investmentHighlightsValidTo', value: string) => {
    if (field === 'investmentHighlightsReportName') setReportName(value);
    if (field === 'investmentHighlightsValidFrom') setValidFrom(value);
    if (field === 'investmentHighlightsValidTo') setValidTo(value);
    updateStore(field, value);
  };

  const lookupData = async () => {
    if (!address?.lga && !address?.suburbName) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/investment-highlights/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lga: address.lga,
          suburb: address.suburbName,
          state: address.state,
        }),
      });

      const result = await response.json();
      
      if (result.found && result.data) {
        setLookupResult({
          found: true,
          dataSource: result.data.dataSource,
          reportName: result.data.reportName,
          validFrom: result.data.validFrom,
          validTo: result.data.validTo,
        });

        // Only overwrite if current fields are empty? Or always?
        // Let's overwrite as it's a lookup for this specific property location
        handleMainBodyChange(result.data.investmentHighlights || '');
        handleReportDetailChange('investmentHighlightsReportName', result.data.reportName || '');
        handleReportDetailChange('investmentHighlightsValidFrom', result.data.validFrom || '');
        handleReportDetailChange('investmentHighlightsValidTo', result.data.validTo || '');
        
        // Handle extras
        const extras = result.data.extras || [];
        extras.forEach((val: string, i: number) => {
            if (i < 7) handleExtraChange(i, val);
        });

      } else {
        setLookupResult({ found: false });
      }
    } catch (error) {
      console.error('Error looking up highlights:', error);
      setLookupResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  // Auto-lookup on mount if fields are empty
  useEffect(() => {
    if (!mainBody && (address?.lga || address?.suburbName)) {
      lookupData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount (or when address becomes available if logic added)

  const handleSave = async () => {
    if (!address?.suburbName) {
        alert("Suburb name is required to save.");
        return;
    }
    
    if (confirm('Save changes to repository for future use?')) {
        setSaving(true);
        try {
            const response = await fetch('/api/investment-highlights/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lga: address.lga,
                    suburb: address.suburbName,
                    state: address.state,
                    reportName,
                    validFrom,
                    validTo,
                    investmentHighlights: mainBody,
                    extras: extraSections
                }),
            });
            
            if (response.ok) {
                alert('Saved successfully!');
                setLookupResult(prev => ({ ...prev, found: true, reportName, validFrom, validTo }));
            } else {
                alert('Failed to save.');
            }
        } catch (e) {
            alert('Error saving data.');
        } finally {
            setSaving(false);
        }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Investment Highlights *</h3>
          <p className="text-sm text-gray-600">
            Key investment highlights and infrastructure developments (Hotspotting Report).
          </p>
        </div>
        {(mainBody || reportName) && (
            <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-secondary text-sm px-3 py-2"
            >
                {saving ? 'Saving...' : 'Save to Repository'}
            </button>
        )}
      </div>

      {loading && <p className="text-sm text-blue-600">Checking repository...</p>}
      
      {lookupResult?.found && (
         <div className="bg-green-50 p-3 rounded-md text-sm text-green-800 border border-green-200">
             ✓ Data loaded from Hotspotting Report: <strong>{lookupResult.reportName}</strong> (Valid: {lookupResult.validFrom} - {lookupResult.validTo})
         </div>
      )}
      
      {lookupResult?.found === false && !loading && (
          <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-800 border border-yellow-200">
             No specific data found for this Suburb/LGA. Please enter details manually from a report or ChatGPT.
          </div>
      )}

      {/* Report Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <label className="label-field">Report Name</label>
              <input 
                type="text" 
                value={reportName} 
                onChange={(e) => handleReportDetailChange('investmentHighlightsReportName', e.target.value)}
                className="input-field" 
                placeholder="e.g. Belmont LGA"
              />
          </div>
          <div>
              <label className="label-field">Valid From</label>
              <input 
                type="text" 
                value={validFrom} 
                onChange={(e) => handleReportDetailChange('investmentHighlightsValidFrom', e.target.value)}
                className="input-field" 
                placeholder="e.g. Oct 2025"
              />
          </div>
          <div>
              <label className="label-field">Valid To</label>
              <input 
                type="text" 
                value={validTo} 
                onChange={(e) => handleReportDetailChange('investmentHighlightsValidTo', e.target.value)}
                className="input-field" 
                placeholder="e.g. Jan 2026"
              />
          </div>
      </div>

      {/* Main Body */}
      <div>
        <label className="label-field">Main Content (Paste from ChatGPT)</label>
        <textarea
            value={mainBody}
            onChange={(e) => handleMainBodyChange(e.target.value)}
            className="input-field min-h-[150px]"
            placeholder="Paste full text here..."
        />
      </div>

      {/* Extra Sections */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700">Extra Data Sections (7 Sections)</h4>
          <p className="text-xs text-gray-500 mb-2">Use these fields for additional specific notes per section.</p>
          
          {extraSections.map((text, i) => (
              <div key={i}>
                  <label className="text-xs font-medium text-gray-600">Section {i + 1}</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => handleExtraChange(i, e.target.value)}
                    className="input-field"
                    placeholder={`Extra notes for section ${i + 1}`}
                  />
              </div>
          ))}
      </div>
    </div>
  );
}
