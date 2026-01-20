'use client';

import { useState, useEffect } from 'react';
import { useAutoResize } from '@/hooks/useAutoResize';

/**
 * ProximityField Component (Phase 4A + Enhancements)
 * 
 * Purpose: Display and manage proximity/amenity data with automation
 * 
 * Phase 4A Features:
 * - Auto-run proximity calculation on page load
 * - Loading spinner during calculation
 * - Display calculated address
 * - Address override functionality
 * - Error handling with manual fallback
 * - Manual paste functionality (preserved from Phase 3)
 * 
 * Enhancements:
 * - Auto-growing textarea (expands with content)
 * - Early proximity loading (pre-fetched from Step 2)
 */

interface ProximityFieldProps {
  value: string;
  onChange: (value: string) => void;
  address?: string;
  disabled?: boolean;
  preFetchedData?: string; // Pre-fetched proximity data from Step 2
}

export function ProximityField({ value, onChange, address, disabled = false, preFetchedData }: ProximityFieldProps) {
  // Auto-resize textarea based on content
  const textareaRef = useAutoResize(value);
  
  // State management for automation features
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calculatedFor, setCalculatedFor] = useState<string | null>(null);
  const [overrideAddress, setOverrideAddress] = useState('');

  /**
   * Auto-run proximity calculation when component loads
   * Enhancement 2: Check for pre-fetched data first
   * Only runs if address is available and field is empty
   */
  useEffect(() => {
    // If we already have data (either in value or pre-fetched), mark as calculated
    if (value) {
      if (!calculatedFor) {
        setCalculatedFor(address || 'pre-loaded');
      }
      return;
    }
    
    // If we have pre-fetched data but it's not in value yet, use it
    if (preFetchedData && !value) {
      onChange(preFetchedData);
      setCalculatedFor(address || 'pre-loaded');
      return;
    }
    
    // Otherwise, fetch as normal if we have address
    if (address && !calculatedFor) {
      calculateProximity(address);
    }
  }, [address, value, preFetchedData]); // Depend on all relevant values

  /**
   * Calculate proximity using the API
   */
  const calculateProximity = async (addr: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/geoapify/proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyAddress: addr }),
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      
      if (data.success && data.proximity) {
        onChange(data.proximity);
        setCalculatedFor(addr);
      } else {
        throw new Error(data.error || 'Failed to calculate proximity');
      }
    } catch (err) {
      console.error('Proximity calculation error:', err);
      setError(
        'Google Maps could not be accessed to perform the check. ' +
        'Please calculate manually via Chat GPT and the amenity tool, ' +
        'then paste the results below.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle address override and recalculation
   */
  const handleOverride = async () => {
    if (overrideAddress.trim()) {
      await calculateProximity(overrideAddress.trim());
    }
  };

  /**
   * Retry calculation with original address
   */
  const handleRetry = async () => {
    if (address) {
      await calculateProximity(address);
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
        <label className="label-field mb-1">Proximity & Amenities *</label>
        
        {/* Loading State */}
        {loading && (
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">Calculating amenities...</span>
          </div>
        )}

        {/* Success State - Show calculated address */}
        {!loading && calculatedFor && !error && (
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">
              Amenities calculated for: <span className="font-medium">{calculatedFor}</span>
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-2">
            <div className="flex items-start gap-2">
              <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium underline"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !calculatedFor && !error && (
          <p className="text-sm text-gray-600 mb-2">
            Proximity/amenity data for: <span className="font-medium">{address || 'Property Address'}</span>
          </p>
        )}
      </div>

      {/* Main Text Area - Auto-growing */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        disabled={disabled || loading}
        className="input-field font-mono text-sm"
        style={{
          overflow: 'hidden',
          resize: 'none',
          minHeight: '100px'
        }}
        placeholder={`${address || 'Property Address'}&#10;• 0.5 km (5 mins), Local Kindergarten&#10;• 1.2 km (10 mins), Primary School&#10;• 2.0 km (15 mins), Shopping Centre...`}
        spellCheck={true}
        required
      />
      
      <p className="text-xs text-gray-500">
        You can edit the list above. Add or remove items as needed.
      </p>

      {/* Address Override Section */}
      <div className="border-t pt-4 space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Use different address for proximity calculation
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={overrideAddress}
            onChange={(e) => setOverrideAddress(e.target.value)}
            placeholder="Enter alternate address..."
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleOverride}
            disabled={!overrideAddress.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Update & Rerun
          </button>
        </div>
      </div>
    </div>
  );
}
