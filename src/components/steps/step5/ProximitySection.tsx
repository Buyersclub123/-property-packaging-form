'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFormStore } from '@/store/formStore';

export function ProximitySection() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address } = formData;
  
  const [proximity, setProximity] = useState(contentSections?.proximity || '');
  const [overrideAddress, setOverrideAddress] = useState(address?.propertyAddress || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoRun, setHasAutoRun] = useState(false);

  // Sync local state with store changes
  useEffect(() => {
    if (contentSections?.proximity !== undefined) {
      setProximity(contentSections.proximity);
    }
  }, [contentSections?.proximity]);

  // Initial address sync
  useEffect(() => {
    if (address?.propertyAddress && !overrideAddress) {
      setOverrideAddress(address.propertyAddress);
    }
  }, [address?.propertyAddress]);

  const handleProximityChange = (value: string) => {
    setProximity(value);
    updateFormData({
      contentSections: {
        ...contentSections,
        proximity: value,
      },
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    let cleaned = pastedText.trim();
    cleaned = cleaned.replace(/^["""''']+/, '');
    cleaned = cleaned.replace(/["""''']+$/, '');
    cleaned = cleaned.trim();
    handleProximityChange(cleaned);
  };

  const runProximityCheck = useCallback(async (addressToUse: string) => {
    if (!addressToUse) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/geoapify/proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyAddress: addressToUse }),
      });

      const data = await response.json();

      if (data.success) {
        handleProximityChange(data.proximity || '');
      } else {
        setError(data.error || 'Failed to calculate proximity');
      }
    } catch (err) {
      setError('Failed to connect to proximity service. Please try manually.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount if empty and address exists
  useEffect(() => {
    if (!hasAutoRun && !proximity && address?.propertyAddress) {
      setHasAutoRun(true);
      setOverrideAddress(address.propertyAddress);
      runProximityCheck(address.propertyAddress);
    }
  }, [hasAutoRun, proximity, address?.propertyAddress, runProximityCheck]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Proximity *</h3>
          <p className="text-sm text-gray-600">
            List nearby amenities with distance and travel time.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Address used for calculation
        </label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={overrideAddress}
            onChange={(e) => setOverrideAddress(e.target.value)}
            className="input-field flex-1 text-sm"
            placeholder="Address for proximity check"
          />
          <button 
            type="button"
            onClick={() => runProximityCheck(overrideAddress)}
            disabled={loading || !overrideAddress}
            className="btn-secondary whitespace-nowrap text-sm px-3 py-2 h-[42px]"
          >
            {loading ? 'Calculating...' : 'Update & Rerun'}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-xs mt-2 bg-red-50 p-2 rounded">
            ⚠️ {error} - Please enter amenities manually below.
          </p>
        )}
      </div>

      <textarea
        value={proximity}
        onChange={(e) => handleProximityChange(e.target.value)}
        onPaste={handlePaste}
        className="input-field min-h-[200px] font-mono text-sm"
        placeholder={`• 0.5 km (5 mins), Local Kindergarten\n• 1.2 km (10 mins), Primary School`}
        required
      />
    </div>
  );
}
