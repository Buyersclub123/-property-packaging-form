'use client';

import { useState } from 'react';

export default function TestAllCategoriesPage() {
  const [propertyAddress, setPropertyAddress] = useState('');
  const [combinedResult, setCombinedResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAllCategories = async () => {
    const currentAddress = propertyAddress.trim();
    if (!currentAddress) {
      return;
    }

    setLoading(true);
    setError(null);
    setCombinedResult(null);

    try {
      const response = await fetch('/api/geoapify/proximity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyAddress: currentAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCombinedResult(data.proximity || '');
      } else {
        setError(data.error || 'Failed to get proximity results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test proximity');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setCombinedResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Proximity Test Tool (Consolidated Endpoint)</h2>
            
            {/* Property Address Input */}
            <div className="mb-6 pb-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Address *
              </label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => {
                  setPropertyAddress(e.target.value);
                }}
                placeholder="15 Barker Street Lewisham NSW"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={testAllCategories}
                  disabled={loading || !propertyAddress.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    loading || !propertyAddress.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing Proximity...
                    </span>
                  ) : (
                    'Test All Categories'
                  )}
                </button>
                <button
                  type="button"
                  onClick={clearResults}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Clear Results
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">Error</h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Combined Results */}
            {combinedResult && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-3">Proximity Results (Sorted by Distance)</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {combinedResult}
                  </pre>
                </div>
                <div className="mt-2 text-xs text-gray-500 italic">
                  *Data provided by Geoapify Places API and Google Maps Distance Matrix API. Distances and times are estimates.
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (combinedResult) {
                      await navigator.clipboard.writeText(combinedResult);
                    }
                  }}
                  className="mt-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                >
                  Copy Results
                </button>
              </div>
            )}

            {!loading && !error && !combinedResult && (
              <div className="text-center py-8 text-gray-400">
                Enter an address and click "Test All Categories" to see proximity results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
