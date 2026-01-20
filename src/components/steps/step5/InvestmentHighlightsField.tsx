'use client';

import { useState, useEffect } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';

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
  
  // Form fields for saving new report
  const [newReportName, setNewReportName] = useState('');
  const [newValidFrom, setNewValidFrom] = useState('');
  const [newValidTo, setNewValidTo] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  // Auto-lookup on mount
  useEffect(() => {
    if ((lga || suburb) && state && !value) {
      lookupReport();
    }
  }, [lga, suburb, state]);

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
        // Construct valid period from validFrom and validTo
        const validFrom = result.data.validFrom || '';
        const validTo = result.data.validTo || '';
        setValidPeriod(validFrom && validTo ? `${validFrom} - ${validTo}` : validFrom || validTo || '');
        onChange(result.data.investmentHighlights || '');
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
    if ((!lga && !suburb) || !state || !newReportName || !newValidFrom || !newValidTo || !value) {
      alert('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/investment-highlights/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lga: lga || suburb || '',
          suburb: suburb || '',
          state, 
          reportName: newReportName,
          validFrom: newValidFrom,
          validTo: newValidTo,
          investmentHighlights: value,
          suburbs: suburb || '', // Initial suburb
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
      setValidPeriod(`${newValidFrom} - ${newValidTo}`);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save investment highlights. Please try again.');
    } finally {
      setLoading(false);
    }
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
        <label className="label-field mb-1">Investment Highlights *</label>
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
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
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
        )}
        
        {matchStatus === 'not-found' && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center space-x-2 text-yellow-600 mb-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">No Match Found</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              No existing report for {suburb || lga}, {state}. Please paste highlights and save.
            </p>
            <button
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              {showSaveForm ? 'Hide Save Form' : 'Show Save Form'}
            </button>
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
                placeholder="e.g., Lewisham Investment Report Jan 2026"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid From *
              </label>
              <input
                type="text"
                value={newValidFrom}
                onChange={(e) => setNewValidFrom(e.target.value)}
                placeholder="e.g., October 2025"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid To *
              </label>
              <input
                type="text"
                value={newValidTo}
                onChange={(e) => setNewValidTo(e.target.value)}
                placeholder="e.g., January 2026"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={loading || !value}
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
        disabled={disabled || loading}
        className="input-field"
        style={{ 
          overflow: 'hidden', 
          resize: 'none',
          minHeight: '150px'
        }}
        placeholder="Investment highlights will appear here, or paste manually..."
        spellCheck={true}
        required
      />
      
      <p className="text-xs text-gray-500">
        You can edit the content above as needed.
      </p>
    </div>
  );
}
