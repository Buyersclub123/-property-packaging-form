'use client';

import { useState } from 'react';

interface AmenityResult {
  name: string;
  address?: string;
  distance: number;
  distanceKm: string;
  coordinates: { lat: number; lon: number };
  place_id?: string;
  categories: string[];
}

export default function TestProximityPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    coordinates: { lat: number; lon: number };
    address: string;
    rawResults: Record<string, AmenityResult[]>;
    filteredResults?: Record<string, AmenityResult[]>;
    allAirportsAndCities?: {
      airports: Array<{ name: string; address: string; distance: number; distanceKm: string; coordinates: { lat: number; lon: number }; group: number; type: string }>;
      cities: Array<{ name: string; address: string; distance: number; distanceKm: string; coordinates: { lat: number; lon: number }; group: number; type: string }>;
    };
    airportsAndCities?: {
      airports: Array<{ name: string; address: string; distance: number; distanceKm: string; coordinates: { lat: number; lon: number }; type: string }>;
      cities: Array<{ name: string; address: string; distance: number; distanceKm: string; coordinates: { lat: number; lon: number }; type: string }>;
    };
    finalList?: Array<{ name: string; address?: string; distance: number; distanceKm: string; coordinates: { lat: number; lon: number }; type: string; category?: string }>;
    totalResults: number;
    categoryCounts: Record<string, number>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!address.trim()) return;
    
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/test-proximity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyAddress: address,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
      } else {
        setError(data.error || 'API call failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCategoryName = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'public_transport.train': 'Train Stations',
      'public_transport.tram': 'Tram Stops',
      'public_transport.bus': 'Bus Stops',
      'childcare.kindergarten': 'Kindergartens',
      'childcare': 'Childcare',
      'education.school': 'Schools',
      'commercial.supermarket': 'Supermarkets',
      'healthcare.hospital': 'Hospitals',
    };
    return categoryMap[category] || category.replace(/_/g, ' ').replace(/\./g, ' ');
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Proximity API Test Tool</h1>
        
        {/* Address Input */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
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

        {results && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm"><strong>Geocoded Coordinates:</strong></p>
            <p className="text-sm">Lat: {results.coordinates.lat.toFixed(6)}, Lon: {results.coordinates.lon.toFixed(6)}</p>
            <p className="text-sm mt-2"><strong>Total Results from Geoapify:</strong> {results.totalResults}</p>
            {results.debug && (
              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-sm font-semibold">Debug Info:</p>
                <p className="text-xs mt-1"><strong>All Categories from Geoapify:</strong> {results.debug.allCategoriesFromGeoapify?.join(', ') || 'None'}</p>
                {results.debug.tramFeaturesFound && results.debug.tramFeaturesFound.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Tram Features Found ({results.debug.tramFeaturesFound.length}):</p>
                    {results.debug.tramFeaturesFound.map((tram: any, idx: number) => (
                      <p key={idx} className="text-xs ml-2">
                        {tram.name} - Categories: {tram.categories.join(', ')} - Distance: {(tram.distance / 1000).toFixed(2)} km
                      </p>
                    ))}
                  </div>
                )}
                {results.debug.publicTransportOnlyFeatures && results.debug.publicTransportOnlyFeatures.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Public Transport Only (No Subtype) Within 100m ({results.debug.publicTransportOnlyFeatures.length}):</p>
                    {results.debug.publicTransportOnlyFeatures.map((pt: any, idx: number) => (
                      <p key={idx} className="text-xs ml-2">
                        {pt.name} - Categories: {pt.categories.join(', ')} - Distance: {(pt.distance / 1000).toFixed(2)} km
                      </p>
                    ))}
                  </div>
                )}
                {results.debug.featuresWithin50m && results.debug.featuresWithin50m.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">All Features Within 50m ({results.debug.featuresWithin50m.length}):</p>
                    {results.debug.featuresWithin50m.map((f: any, idx: number) => (
                      <p key={idx} className="text-xs ml-2">
                        {f.name} - Categories: {f.categories.join(', ')} - Distance: {f.distance.toFixed(0)} m
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-5 gap-4">
          {/* Left: Full List by Category (10 amenities each) with Haversine distances */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Raw Results (Top 10 per Category)</h2>
            {results ? (
              <div className="space-y-6 max-h-[800px] overflow-y-auto">
                {Object.keys(results.rawResults).map(category => (
                  <div key={category} className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {formatCategoryName(category)} ({results.rawResults[category].length})
                    </h3>
                    <div className="space-y-2">
                      {results.rawResults[category].map((amenity, idx) => (
                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{amenity.name}</div>
                          {amenity.address && (
                            <div className="text-gray-600 text-xs">{amenity.address}</div>
                          )}
                          <div className="text-blue-600 font-semibold mt-1">
                            Haversine Distance: {amenity.distanceKm} ({amenity.distance.toFixed(0)} m)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Enter address and click Test</p>
            )}
          </div>

          {/* Right: Filtered List After Logic Applied */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Filtered Results (After Logic)</h2>
            {results && results.filteredResults ? (
              <div className="space-y-6 max-h-[800px] overflow-y-auto">
                {Object.keys(results.filteredResults).map(category => (
                  <div key={category} className="border-b pb-4">
                    <h3 className="font-semibold text-lg mb-2">
                      {formatCategoryName(category)} ({results.filteredResults![category].length})
                    </h3>
                    <div className="space-y-2">
                      {results.filteredResults![category].map((amenity, idx) => (
                        <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                          <div className="font-medium">{amenity.name}</div>
                          {amenity.address && (
                            <div className="text-gray-600 text-xs">{amenity.address}</div>
                          )}
                          <div className="text-blue-600 font-semibold mt-1">
                            Haversine Distance: {amenity.distanceKm} ({amenity.distance.toFixed(0)} m)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Enter address and click Test</p>
            )}
          </div>

          {/* Third: All Airports and Cities (Full List) */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">All Airports & Cities</h2>
            {results && results.allAirportsAndCities ? (
              <div className="space-y-6 max-h-[800px] overflow-y-auto">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">
                    Airports ({results.allAirportsAndCities.airports.length})
                  </h3>
                  <div className="space-y-2">
                    {results.allAirportsAndCities.airports.map((airport, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="font-medium">{airport.name}</div>
                        <div className="text-gray-600 text-xs">{airport.address}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Group {airport.group}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            Haversine: {airport.distanceKm} ({airport.distance.toFixed(0)} m)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">
                    Cities ({results.allAirportsAndCities.cities.length})
                  </h3>
                  <div className="space-y-2">
                    {results.allAirportsAndCities.cities.map((city, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="font-medium">{city.name}</div>
                        <div className="text-gray-600 text-xs">{city.address}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Group {city.group}
                          </span>
                          <span className="text-blue-600 font-semibold">
                            Haversine: {city.distanceKm} ({city.distance.toFixed(0)} m)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Enter address and click Test</p>
            )}
          </div>

          {/* Fourth: Airports and Cities Filtered */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Airports & Cities (Filtered)</h2>
            {results && results.airportsAndCities ? (
              <div className="space-y-6 max-h-[800px] overflow-y-auto">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">
                    Airports ({results.airportsAndCities.airports.length})
                  </h3>
                  <div className="space-y-2">
                    {results.airportsAndCities.airports.map((airport, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="font-medium">{airport.name}</div>
                        <div className="text-gray-600 text-xs">{airport.address}</div>
                        <div className="text-blue-600 font-semibold mt-1">
                          Haversine Distance: {airport.distanceKm} ({airport.distance.toFixed(0)} m)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-lg mb-2">
                    Cities ({results.airportsAndCities.cities.length})
                  </h3>
                  <div className="space-y-2">
                    {results.airportsAndCities.cities.map((city, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        <div className="font-medium">{city.name}</div>
                        <div className="text-gray-600 text-xs">{city.address}</div>
                        <div className="text-blue-600 font-semibold mt-1">
                          Haversine Distance: {city.distanceKm} ({city.distance.toFixed(0)} m)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Enter address and click Test</p>
            )}
          </div>

          {/* Fifth: Final Combined List for Google Maps */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Final List (Google Maps)</h2>
            {results && results.finalList ? (
              <div className="space-y-2 max-h-[800px] overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">
                  Total: {results.finalList.length} destinations
                </p>
                {results.finalList.map((item, idx) => (
                  <div key={idx} className="text-sm p-2 bg-gray-50 rounded border-l-4 border-blue-500">
                    <div className="font-medium">{item.name}</div>
                    {item.address && (
                      <div className="text-gray-600 text-xs">{item.address}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {item.category || item.type}
                      </span>
                      <span className="text-blue-600 font-semibold">
                        {item.distanceKm} ({item.distance.toFixed(0)} m)
                      </span>
                    </div>
                  </div>
                ))}
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
