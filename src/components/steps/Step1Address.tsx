'use client';

import { useState } from 'react';
import { useFormStore } from '@/store/formStore';
import { getStashData } from '@/lib/stash';

function StashStatus() {
  const { stashLoading, stashError } = useFormStore();
  
  if (stashLoading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-700">Fetching property data from Stash...</p>
      </div>
    );
  }
  
  if (stashError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-700">Error: {stashError}</p>
        <p className="text-sm text-red-600 mt-2">
          You can continue manually - the form will work without Stash data.
        </p>
      </div>
    );
  }
  
  return null;
}

export function Step1Address() {
  const { formData, updateAddress, setStashData, setStashLoading, setStashError } = useFormStore();
  const { address } = formData;
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleAddressChange = (value: string) => {
    updateAddress({ propertyAddress: value });
  };

  const handleGeocode = async () => {
    if (!address.propertyAddress.trim()) {
      alert('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    setStashLoading(true);
    setStashError(null);

    try {
      // Call Stash API (which includes geocoding)
      const stashResponse = await getStashData(address.propertyAddress);
      
      setStashData(stashResponse);
      
      // Update address fields from Stash response
      if (stashResponse.latitude && stashResponse.longitude) {
        updateAddress({
          latitude: stashResponse.latitude,
          longitude: stashResponse.longitude,
        });
      }
      
      if (stashResponse.state) {
        updateAddress({ state: stashResponse.state });
      }
      
      // Generate Google Maps link
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.propertyAddress)}`;
      updateAddress({ googleMap: mapsLink });
      
      if (stashResponse.error) {
        setStashError(stashResponse.errorMessage || 'Failed to fetch property data');
      }
    } catch (error: any) {
      setStashError(error.message || 'Failed to geocode address');
    } finally {
      setIsGeocoding(false);
      setStashLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Property Address</h2>
      <p className="text-gray-600 mb-6">
        Enter the full property address. The system will automatically check risk overlays from Stash Property.
      </p>

      <div className="space-y-4">
        <div>
          <label className="label-field">Property Address *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={address.propertyAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              placeholder="e.g., 4 Osborne Circuit Maroochydore QLD 4558"
              className="input-field flex-1"
              required
            />
            <button
              onClick={handleGeocode}
              disabled={isGeocoding || !address.propertyAddress.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {isGeocoding ? 'Checking...' : 'Check Stash'}
            </button>
          </div>
        </div>

        {/* Stash Loading/Error */}
        <StashStatus />

        {/* Address Components (auto-populated or manual) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Street Number</label>
            <input
              type="text"
              value={address.streetNumber || ''}
              onChange={(e) => updateAddress({ streetNumber: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Street Name</label>
            <input
              type="text"
              value={address.streetName || ''}
              onChange={(e) => updateAddress({ streetName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Suburb</label>
            <input
              type="text"
              value={address.suburbName || ''}
              onChange={(e) => updateAddress({ suburbName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">State</label>
            <input
              type="text"
              value={address.state || ''}
              onChange={(e) => updateAddress({ state: e.target.value })}
              className="input-field"
              placeholder="e.g., QLD, NSW, VIC"
            />
          </div>
          <div>
            <label className="label-field">Post Code</label>
            <input
              type="text"
              value={address.postCode || ''}
              onChange={(e) => updateAddress({ postCode: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        {/* Google Maps Link */}
        {address.googleMap && (
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-semibold text-green-900 mb-2">Google Maps Link:</p>
            <a
              href={address.googleMap}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {address.googleMap}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

