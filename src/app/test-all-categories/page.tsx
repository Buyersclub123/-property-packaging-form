'use client';

import { useState } from 'react';

interface CategoryResult {
  name: string;
  endpoint: string;
  key: string;
  loading: boolean;
  result: string | null;
  error: string | null;
}

export default function TestAllCategoriesPage() {
  const [propertyAddress, setPropertyAddress] = useState('');
  const [results, setResults] = useState<CategoryResult[]>([
    { name: 'Airport', endpoint: 'test-airports', key: 'airports', loading: false, result: null, error: null },
    { name: 'Bus Stop', endpoint: 'test-bus-stops', key: 'busStop', loading: false, result: null, error: null },
    { name: 'Train Station', endpoint: 'test-train-stations', key: 'trainStation', loading: false, result: null, error: null },
    { name: 'Kindergarten', endpoint: 'test-kindergarten', key: 'kindergarten', loading: false, result: null, error: null },
    { name: 'Schools', endpoint: 'test-schools', key: 'schools', loading: false, result: null, error: null },
    { name: 'Supermarkets', endpoint: 'test-supermarkets', key: 'supermarkets', loading: false, result: null, error: null },
    { name: 'Hospitals', endpoint: 'test-hospitals', key: 'hospitals', loading: false, result: null, error: null },
    { name: 'Childcare', endpoint: 'test-childcare', key: 'childcare', loading: false, result: null, error: null },
    { name: 'Capital Cities', endpoint: 'test-capital-cities', key: 'capitalCities', loading: false, result: null, error: null },
  ]);
  const [testingAll, setTestingAll] = useState(false);

  const testCategory = async (category: CategoryResult) => {
    if (!propertyAddress.trim()) {
      return;
    }

    const updatedResults = results.map(r => 
      r.name === category.name 
        ? { ...r, loading: true, error: null, result: null }
        : r
    );
    setResults(updatedResults);

    try {
      const response = await fetch(`/api/geoapify/${category.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyAddress: propertyAddress.trim(),
        }),
      });

      const data = await response.json();

      setResults(prevResults => prevResults.map(r => {
        if (r.name === category.name) {
          if (data.success) {
            return { ...r, loading: false, result: data[category.key] || '', error: null };
          } else {
            return { ...r, loading: false, result: null, error: data.error || 'Failed to get results' };
          }
        }
        return r;
      }));
    } catch (err) {
      setResults(prevResults => prevResults.map(r => {
        if (r.name === category.name) {
          return { ...r, loading: false, result: null, error: err instanceof Error ? err.message : 'Failed to test' };
        }
        return r;
      }));
    }
  };

  const testAllCategories = async () => {
    if (!propertyAddress.trim()) {
      return;
    }

    setTestingAll(true);
    
    // Test all categories sequentially
    for (const category of results) {
      await testCategory(category);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTestingAll(false);
  };

  const clearResults = () => {
    setResults(results.map(r => ({ ...r, result: null, error: null })));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Geoapify Categories Test Tool</h2>
            
            {/* Property Address Input */}
            <div className="mb-6 pb-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Address *
              </label>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('Address changed:', value, 'Trimmed:', value.trim(), 'Has value:', !!value.trim());
                  setPropertyAddress(value);
                }}
                placeholder="15 BArker Street LEwisahm NSW"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-3"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={testAllCategories}
                  disabled={testingAll || !propertyAddress.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    testingAll || !propertyAddress.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {testingAll ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing All Categories...
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

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((category) => (
                <div key={category.name} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{category.name}</h3>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Button clicked for:', category.name, 'Address:', propertyAddress);
                        testCategory(category);
                      }}
                      disabled={category.loading || !propertyAddress.trim()}
                      className={`px-3 py-1 text-sm rounded ${
                        category.loading || !propertyAddress.trim()
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {category.loading ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  
                  {category.loading && (
                    <div className="text-sm text-gray-500">Loading...</div>
                  )}
                  
                  {category.error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Error: {category.error}
                    </div>
                  )}
                  
                  {category.result && (
                    <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded font-mono whitespace-pre-wrap">
                      {category.result}
                    </div>
                  )}
                  
                  {!category.loading && !category.error && !category.result && (
                    <div className="text-sm text-gray-400 italic">No results yet</div>
                  )}
                </div>
              ))}
            </div>

            {/* Combined Results */}
            {results.some(r => r.result) && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold text-lg mb-3">Combined Results</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {results
                      .filter(r => r.result)
                      .map(r => r.result)
                      .join('\n\n')}
                  </pre>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const combined = results
                      .filter(r => r.result)
                      .map(r => r.result)
                      .join('\n\n');
                    await navigator.clipboard.writeText(combined);
                  }}
                  className="mt-3 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                >
                  Copy Combined Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
