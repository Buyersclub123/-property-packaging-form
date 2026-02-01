'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface PropertyData {
  propertyDescription: {
    bedsPrimary?: string;
    bathPrimary?: string;
    garagePrimary?: string;
    carportPrimary?: string;
    carspacePrimary?: string;
    yearBuilt?: string;
    landSize?: string;
  };
  purchasePrice: {
    landPrice?: string;
    buildPrice?: string;
    totalPrice?: string;
    acceptableAcquisitionFrom?: string;
    acceptableAcquisitionTo?: string;
  };
  rentalAssessment: {
    occupancyPrimary?: string;
    currentRentPrimary?: string;
    rentAppraisalPrimaryFrom?: string;
    rentAppraisalPrimaryTo?: string;
    yield?: string;
    appraisedYield?: string;
  };
  address: {
    propertyAddress?: string;
  };
  decisionTree: {
    propertyType?: string;
    lotType?: string;
  };
}

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const recordId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);

  // Format number as currency ($640,000)
  const formatCurrency = (value: string | undefined): string => {
    if (!value || value === '' || value.toUpperCase() === 'TBC') return value || '';
    const numValue = value.replace(/,/g, '');
    if (isNaN(Number(numValue))) return value;
    return '$' + Number(numValue).toLocaleString('en-US');
  };

  // Parse formatted currency back to number string
  const parseCurrency = (value: string): string => {
    if (!value) return '';
    const upperValue = value.toUpperCase();
    if (upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC') return upperValue;
    // Remove $ and commas, keep only digits
    return value.replace(/[$,]/g, '');
  };

  // Calculate Property Price for yield calculations
  const propertyPrice = useMemo(() => {
    if (!propertyData) return null;

    const isEstablished = propertyData.decisionTree?.propertyType === 'Established';
    const isHAndL = propertyData.decisionTree?.propertyType === 'New';

    if (isEstablished && propertyData.purchasePrice?.acceptableAcquisitionTo) {
      const priceStr = parseCurrency(propertyData.purchasePrice.acceptableAcquisitionTo);
      if (priceStr.toUpperCase() === 'TBC') return null;
      const price = parseFloat(priceStr);
      return isNaN(price) ? null : price;
    }

    if (isHAndL) {
      const landPriceStr = propertyData.purchasePrice?.landPrice || '';
      const buildPriceStr = propertyData.purchasePrice?.buildPrice || '';
      const totalPriceStr = propertyData.purchasePrice?.totalPrice || '';

      // For Single Contract, use totalPrice
      if (totalPriceStr) {
        const totalStr = parseCurrency(totalPriceStr);
        if (totalStr.toUpperCase() === 'TBC') return null;
        const total = parseFloat(totalStr);
        return isNaN(total) ? null : total;
      }

      // Otherwise, calculate Land + Build
      if (!landPriceStr || !buildPriceStr) return null;
      const landStr = parseCurrency(landPriceStr);
      const buildStr = parseCurrency(buildPriceStr);
      if (landStr.toUpperCase() === 'TBC' || buildStr.toUpperCase() === 'TBC') return null;
      const land = parseFloat(landStr);
      const build = parseFloat(buildStr);
      if (isNaN(land) || isNaN(build)) return null;
      return land + build;
    }

    return null;
  }, [propertyData]);

  // Calculate Current Yield
  const currentYield = useMemo(() => {
    if (!propertyData || !propertyPrice) return null;

    const isPrimaryTenanted = propertyData.rentalAssessment?.occupancyPrimary === 'tenanted';
    if (!isPrimaryTenanted) return null;

    const rentPrimaryStr = propertyData.rentalAssessment?.currentRentPrimary || '';
    if (!rentPrimaryStr) return null;

    const rentStr = parseCurrency(rentPrimaryStr);
    if (rentStr.toUpperCase() === 'TBC') return null;

    const weeklyRent = parseFloat(rentStr);
    if (isNaN(weeklyRent) || weeklyRent <= 0) return null;

    const annualRent = weeklyRent * 52;
    const yieldValue = (annualRent / propertyPrice) * 100;
    return yieldValue.toFixed(2);
  }, [propertyData, propertyPrice]);

  // Calculate Appraised Yield
  const appraisedYield = useMemo(() => {
    if (!propertyData || !propertyPrice) return null;

    const rentAppraisalTo = propertyData.rentalAssessment?.rentAppraisalPrimaryTo || '';
    if (!rentAppraisalTo) return null;

    const rentStr = parseCurrency(rentAppraisalTo);
    if (rentStr.toUpperCase() === 'TBC') return null;

    const weeklyRent = parseFloat(rentStr);
    if (isNaN(weeklyRent) || weeklyRent <= 0) return null;

    const annualRent = weeklyRent * 52;
    const yieldValue = (annualRent / propertyPrice) * 100;
    return yieldValue.toFixed(2);
  }, [propertyData, propertyPrice]);

  // Update yield fields when calculated values change
  useEffect(() => {
    if (!propertyData) return;

    const updates: Partial<PropertyData['rentalAssessment']> = {};

    if (currentYield !== null) {
      const newValue = `~ ${currentYield}%`;
      if (propertyData.rentalAssessment?.yield !== newValue) {
        updates.yield = newValue;
      }
    } else {
      if (propertyData.rentalAssessment?.yield) {
        updates.yield = '';
      }
    }

    if (appraisedYield !== null) {
      const newValue = `~ ${appraisedYield}%`;
      if (propertyData.rentalAssessment?.appraisedYield !== newValue) {
        updates.appraisedYield = newValue;
      }
    } else {
      if (propertyData.rentalAssessment?.appraisedYield) {
        updates.appraisedYield = '';
      }
    }

    if (Object.keys(updates).length > 0) {
      setPropertyData({
        ...propertyData,
        rentalAssessment: {
          ...propertyData.rentalAssessment,
          ...updates,
        },
      });
    }
  }, [currentYield, appraisedYield]);

  // Load property data
  useEffect(() => {
    const loadProperty = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!recordId) {
          throw new Error('Record ID is missing from URL');
        }

        console.log('Loading property with recordId:', recordId);
        const response = await fetch(`/api/properties/${recordId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API response error:', response.status, errorText);
          throw new Error(`Failed to load property: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('API response:', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to load property');
        }

        if (!result.data) {
          throw new Error('No data returned from API');
        }

        setPropertyData(result.data);
      } catch (err) {
        console.error('Error loading property:', err);
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (recordId) {
      loadProperty();
    } else {
      setError('Record ID is missing from URL. Please include a record ID in the URL path.');
      setLoading(false);
    }
  }, [recordId]);

  // Handle save
  const handleSave = async () => {
    if (!propertyData) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/properties/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(propertyData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save property');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  // Update field helper
  const updateField = (section: keyof PropertyData, field: string, value: string) => {
    if (!propertyData) return;

    setPropertyData({
      ...propertyData,
      [section]: {
        ...propertyData[section],
        [field]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property...</p>
          <p className="text-sm text-gray-500 mt-2">Record ID: {recordId || 'Missing'}</p>
        </div>
      </div>
    );
  }

  if (error && !propertyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Property</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500 mb-4">Record ID: {recordId || 'Missing'}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Go Back
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Check browser console (F12) for more details
          </p>
        </div>
      </div>
    );
  }

  if (!propertyData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Property</h1>
            <p className="text-gray-600">{propertyData.address?.propertyAddress || 'Property'}</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
              Property updated successfully!
            </div>
          )}

          <div className="space-y-8">
            {/* Property Description */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Property Details</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beds (Primary)
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.bedsPrimary || ''}
                    onChange={(e) => updateField('propertyDescription', 'bedsPrimary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bath (Primary)
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.bathPrimary || ''}
                    onChange={(e) => updateField('propertyDescription', 'bathPrimary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Garage (Primary)
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.garagePrimary || ''}
                    onChange={(e) => updateField('propertyDescription', 'garagePrimary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carport (Primary)
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.carportPrimary || ''}
                    onChange={(e) => updateField('propertyDescription', 'carportPrimary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Carspace (Primary)
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.carspacePrimary || ''}
                    onChange={(e) => updateField('propertyDescription', 'carspacePrimary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year Built
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.yearBuilt || ''}
                    onChange={(e) => updateField('propertyDescription', 'yearBuilt', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Land Size (sqm)
                  </label>
                  <input
                    type="text"
                    value={propertyData.propertyDescription?.landSize || ''}
                    onChange={(e) => updateField('propertyDescription', 'landSize', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </section>

            {/* Purchase Price */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Purchase Price</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Land Price ($)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.purchasePrice?.landPrice)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('purchasePrice', 'landPrice', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('purchasePrice', 'landPrice', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $300,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Build Price ($)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.purchasePrice?.buildPrice)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('purchasePrice', 'buildPrice', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('purchasePrice', 'buildPrice', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $250,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Price ($)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.purchasePrice?.totalPrice)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('purchasePrice', 'totalPrice', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('purchasePrice', 'totalPrice', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $550,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acceptable Acquisition From ($)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.purchasePrice?.acceptableAcquisitionFrom)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('purchasePrice', 'acceptableAcquisitionFrom', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('purchasePrice', 'acceptableAcquisitionFrom', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $500,000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Acceptable Acquisition To ($)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.purchasePrice?.acceptableAcquisitionTo)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('purchasePrice', 'acceptableAcquisitionTo', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('purchasePrice', 'acceptableAcquisitionTo', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $550,000"
                  />
                </div>
              </div>
            </section>

            {/* Rental Assessment */}
            <section>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Rental Assessment</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Occupancy (Primary)
                  </label>
                  <select
                    value={propertyData.rentalAssessment?.occupancyPrimary || ''}
                    onChange={(e) => updateField('rentalAssessment', 'occupancyPrimary', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    <option value="owner_occupied">Owner Occupied</option>
                    <option value="tenanted">Tenanted</option>
                    <option value="vacant">Vacant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Rent Primary ($ per week)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.rentalAssessment?.currentRentPrimary)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('rentalAssessment', 'currentRentPrimary', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('rentalAssessment', 'currentRentPrimary', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $550 or TBC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Appraisal From ($ per week)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.rentalAssessment?.rentAppraisalPrimaryFrom)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('rentalAssessment', 'rentAppraisalPrimaryFrom', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('rentalAssessment', 'rentAppraisalPrimaryFrom', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Appraisal To ($ per week)
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(propertyData.rentalAssessment?.rentAppraisalPrimaryTo)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      updateField('rentalAssessment', 'rentAppraisalPrimaryTo', rawValue);
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateField('rentalAssessment', 'rentAppraisalPrimaryTo', rawValue);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Yield (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={propertyData.rentalAssessment?.yield || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formula: (Current Rent × 52 / Property Price) × 100
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Appraised Yield (Auto-calculated)
                  </label>
                  <input
                    type="text"
                    value={propertyData.rentalAssessment?.appraisedYield || ''}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formula: (Rent Appraisal To × 52 / Property Price) × 100
                  </p>
                </div>
              </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
