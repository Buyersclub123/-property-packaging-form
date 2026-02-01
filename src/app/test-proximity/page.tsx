'use client';

import { useState } from 'react';

export default function TestProximityPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [geoapifyResults, setGeoapifyResults] = useState<any>(null);
  const [processedResults, setProcessedResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!address.trim()) return;
    
    setLoading(true);
    setError(null);
    setGeoapifyResults(null);
    setProcessedResults(null);

    try {
      const response = await fetch('/api/geoapify/proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAddress: address,
          userEmail: 'test@buyersclub.com.au',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setGeoapifyResults(data.debug);
        setProcessedResults({
          count: data.count,
          results: data.results,
          proximity: data.proximity,
        });
      } else {
        setError(data.error || 'API call failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Proximity API Test</h1>
        
        <div className="mb-6">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address (e.g., 4 Osborne Circuit Maroochydore QLD 4558)"
            className="w-full p-3 border rounded-lg mb-3"
            onKeyPress={(e) => e.key === 'Enter' && handleTest()}
          />
          <button
            onClick={handleTest}
            disabled={loading || !address.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Geoapify Raw Results */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Geoapify Raw Results</h2>
            {geoapifyResults ? (
              <div>
                <p className="mb-2"><strong>Total Results:</strong> {geoapifyResults.geoapifyTotalResults}</p>
                <div className="mb-4">
                  <strong>Category Breakdown:</strong>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
                    {JSON.stringify(geoapifyResults.geoapifyCategoryBreakdown, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Enter address and click Test</p>
            )}
          </div>

          {/* Right: Processed Results */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Processed Results (After Logic)</h2>
            {processedResults ? (
              <div>
                <p className="mb-2"><strong>Final Count:</strong> {processedResults.count}</p>
                <div className="mb-4">
                  <strong>Results by Category:</strong>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(
                      processedResults.results.reduce((acc: any, r: any) => {
                        acc[r.category] = (acc[r.category] || 0) + 1;
                        return acc;
                      }, {}),
                      null,
                      2
                    )}
                  </pre>
                </div>
                <div className="mt-4">
                  <strong>Full Proximity Text:</strong>
                  <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                    {processedResults.proximity}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Enter address and click Test</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
