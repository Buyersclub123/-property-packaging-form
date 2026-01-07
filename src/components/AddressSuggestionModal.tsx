'use client';

import { GeocodeSuggestion } from '@/lib/geocoder';

interface AddressSuggestionModalProps {
  isOpen: boolean;
  enteredAddress: string;
  suggestions: GeocodeSuggestion[];
  onSelect: (suggestion: GeocodeSuggestion) => void;
  onProceedWithOriginal: () => void;
  onCancel: () => void;
}

export function AddressSuggestionModal({
  isOpen,
  enteredAddress,
  suggestions,
  onSelect,
  onProceedWithOriginal,
  onCancel,
}: AddressSuggestionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-bold mb-3">⚠️ Address Match Warning</h3>
          
          {suggestions.length > 0 ? (
            <>
              <p className="text-sm text-gray-700 mb-2">
                The address you entered may have spelling errors:
              </p>
              <p className="font-semibold text-gray-900 mb-3 bg-yellow-50 p-2 rounded border border-yellow-200">
                {enteredAddress}
              </p>
              
              <p className="text-sm font-semibold text-gray-700 mb-2">Did you mean (corrected address):</p>
              <div className="space-y-2 mb-4">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <div
                    key={index}
                    className="border border-green-200 rounded p-3 hover:border-green-400 hover:bg-green-50 transition-colors bg-green-50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 flex-1">
                        {suggestion.formattedAddress || suggestion.address}
                      </p>
                      <button
                        onClick={() => onSelect(suggestion)}
                        className="btn-primary ml-3 text-sm whitespace-nowrap"
                      >
                        Yes, use this address
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-4 italic">
                ⚠️ Selecting "Proceed with this address" below will continue with the potentially incorrect address above.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-3">
                Address not found, are you ok to progress using this address:
              </p>
              <p className="font-semibold text-gray-900 mb-3 bg-yellow-50 p-2 rounded border border-yellow-200">
                {enteredAddress}
              </p>
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-800 font-semibold mb-1">Possible reasons:</p>
                <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                  <li>Spelling errors in the address</li>
                  <li>Address not found in database</li>
                  <li>Incomplete address information</li>
                </ul>
              </div>
            </>
          )}

          <div className="flex gap-3 justify-end pt-3 border-t">
            <button
              onClick={onCancel}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onProceedWithOriginal}
              className="btn-primary text-sm"
            >
              Proceed with this address
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

