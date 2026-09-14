'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PropertiesListPage() {
  const router = useRouter();
  const [searchAddress, setSearchAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Array<{ id: string; address: string }>>([]);

  const handleSearch = async () => {
    if (!searchAddress.trim()) {
      setError('Please enter a property address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Search via API endpoint (which calls Make.com webhook)
      const response = await fetch('/api/properties/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: searchAddress }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      if (result.properties && result.properties.length > 0) {
        setProperties(result.properties);
      } else {
        setError('No properties found matching that address');
        setProperties([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search properties');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (recordId: string) => {
    router.push(`/properties/${recordId}/edit`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Property</h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Property Address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter property address (e.g., 123 Main St, City QLD 4000)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
              <p className="font-semibold">Note:</p>
              <p>{error}</p>
              <p className="text-sm mt-2">
                For now, you can edit a property directly by using the URL format:
                <br />
                <code className="bg-gray-100 px-2 py-1 rounded">
                  /properties/[RECORD_ID]/edit
                </code>
              </p>
            </div>
          )}

          {properties.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">Search Results</h2>
              <div className="space-y-2">
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{property.address}</p>
                      <p className="text-sm text-gray-500">ID: {property.id}</p>
                    </div>
                    <button
                      onClick={() => handleEdit(property.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">How to Edit a Property</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Get the GHL Record ID from your GHL dashboard</li>
              <li>Navigate to: <code className="bg-white px-2 py-1 rounded">/properties/[RECORD_ID]/edit</code></li>
              <li>Or use the search above (once implemented with Make.com webhook)</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
