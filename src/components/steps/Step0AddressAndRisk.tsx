'use client';

/**
 * VERSION HISTORY:
 * - v1.0 (Current Working): Address validation via Geoscape, Stash risk overlays, proper capitalization
 * - v1.1 (In Progress): Two-address system, new development checkbox, lot number field, edit address button
 * 
 * To revert: Check git history or restore from backup
 */

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';
import { getStashData } from '@/lib/stash';
import { geocodeAddress } from '@/lib/geocoder';
import { YesNo } from '@/types/form';
import { getSourcerNames } from '@/lib/sourcerList';
// TODO: Address validation with suggestions - to be implemented later

function StashStatus() {
  const { stashLoading, stashError, stashData } = useFormStore();
  
  if (stashLoading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg mb-4">
        <p className="text-blue-700">Fetching property data from Stash...</p>
      </div>
    );
  }
  
  if (stashError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg mb-4">
        <p className="text-red-700 font-semibold">Error: {stashError}</p>
        <p className="text-sm text-red-600 mt-2">
          You can continue manually - the form will work without Stash data.
        </p>
      </div>
    );
  }
  
  if (stashData && !stashData.error) {
    // Check if we actually have data (not just empty fields)
    const hasData = stashData.zoning || stashData.lga || stashData.floodRisk || stashData.bushfireRisk || stashData.state;
    
    return (
      <div className="p-4 bg-green-50 rounded-lg mb-4">
        {hasData ? (
          <>
            <p className="text-green-700 font-semibold">✓ Stash data retrieved successfully</p>
            {stashData.zoning && (
              <p className="text-sm text-green-600 mt-1">Zoning: {stashData.zoning}</p>
            )}
            {stashData.lga && (
              <p className="text-sm text-green-600">LGA: {stashData.lga}</p>
            )}
          </>
        ) : (
          <div>
            <p className="text-yellow-700 font-semibold">⚠️ Make.com returned "Accepted" but no data</p>
            <p className="text-sm text-yellow-600 mt-1">
              This usually means Module 8 Body in Make.com is set to "Accepted" instead of <code className="bg-yellow-100 px-1 rounded">{'{'}{'{'}7.result{'}'}{'}'}</code>
            </p>
            <p className="text-sm text-yellow-600 mt-1">
              You can continue manually - the form will work without Stash data.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return null;
}

function PropertyInfoFromStash() {
  const { stashData } = useFormStore();
  
  if (!stashData || stashData.error) {
    return null;
  }
  
  // Build property info string
  const infoParts: string[] = [];
  
  if (stashData.bedrooms) infoParts.push(`${stashData.bedrooms} bed${stashData.bedrooms !== '1' ? 's' : ''}`);
  if (stashData.bathrooms) infoParts.push(`${stashData.bathrooms} bath${stashData.bathrooms !== '1' ? 's' : ''}`);
  if (stashData.carSpaces) infoParts.push(`${stashData.carSpaces} car${stashData.carSpaces !== '1' ? 's' : ''}`);
  if (stashData.landSize) infoParts.push(`Land: ${stashData.landSize}`);
  if (stashData.yearBuilt) infoParts.push(`Built: ${stashData.yearBuilt}`);
  if (stashData.title) infoParts.push(`Title: ${stashData.title}`);
  
  // If no property info, don't show anything
  if (infoParts.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
      <p className="text-xs font-semibold text-gray-700 mb-1">Property Info from Stash:</p>
      <p className="text-sm text-gray-800">{infoParts.join(' • ')}</p>
    </div>
  );
}

function LGADisplay() {
  const { stashData, formData, updateAddress } = useFormStore();
  const { address } = formData;
  const [isLookingUpLGA, setIsLookingUpLGA] = useState(false);
  
  // Store LGA in address data for later use
  useEffect(() => {
    if (stashData?.lga && !formData.address.lga) {
      console.log('LGADisplay: Setting LGA from Stash:', stashData.lga);
      updateAddress({ lga: stashData.lga });
    }
  }, [stashData?.lga, formData.address.lga, updateAddress]);
  
  const lgaValue = formData.address.lga || stashData?.lga || '';
  const isEditable = address.addressFieldsEditable || !address.addressVerified;
  
  const handleLookupLGA = async () => {
    if (!address.suburbName || !address.state) {
      alert('Please enter Suburb and State first');
      return;
    }

    setIsLookingUpLGA(true);
    try {
      const addressUpdates: any = {};
      
      // First, check if we have Stash data with LGA
      if (stashData?.lga) {
        addressUpdates.lga = stashData.lga;
        // Also populate postcode if missing
        if (!address.postCode && stashData.postCode) {
          addressUpdates.postCode = stashData.postCode;
        }
        updateAddress(addressUpdates);
        setIsLookingUpLGA(false);
        return;
      }

      // Try Stash API with suburb/state - Stash API returns LGA (but may not return postcode for suburb-only queries)
      let stashLGA = null;
      try {
        const { getStashData } = await import('@/lib/stash');
        // Try with suburb and state - Stash might be able to find LGA
        const stashQuery = `${address.suburbName}, ${address.state}`;
        const stashResult = await getStashData(stashQuery);
        if (stashResult?.lga) {
          stashLGA = stashResult.lga;
          addressUpdates.lga = stashResult.lga;
          // Also populate postcode if Stash provides it
          if (!address.postCode && stashResult.postCode) {
            addressUpdates.postCode = stashResult.postCode;
          }
          // Also fix suburb capitalization if needed
          if (stashResult.suburbName && stashResult.suburbName !== address.suburbName) {
            addressUpdates.suburbName = stashResult.suburbName
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          }
          // Don't return early - continue to Geoscape to get postcode if Stash didn't provide it
        }
      } catch (stashError) {
        console.log('Stash API lookup failed, trying Geoscape:', stashError);
      }

      // Fallback: Try Geoscape with suburb/state to get postcode
      const { geocodeAddress } = await import('@/lib/geocoder');
      const geocodeQuery = `${address.suburbName}, ${address.state}`;
      console.log('LGA Lookup: Calling Geoscape with:', geocodeQuery);
      const geocodeResult = await geocodeAddress(geocodeQuery);
      console.log('LGA Lookup: Geoscape result:', geocodeResult);
      console.log('LGA Lookup: Best match postcode:', geocodeResult.bestMatch?.postCode);
      console.log('LGA Lookup: All suggestions:', geocodeResult.suggestions);
      
      // Try to get postcode from best match or first suggestion
      let foundPostcode = null;
      let foundSuburb = null;
      
      if (geocodeResult.bestMatch?.postCode) {
        foundPostcode = geocodeResult.bestMatch.postCode;
      } else if (geocodeResult.suggestions && geocodeResult.suggestions.length > 0) {
        // Check all suggestions for postcode
        for (const suggestion of geocodeResult.suggestions) {
          if (suggestion.postCode) {
            foundPostcode = suggestion.postCode;
            break;
          }
        }
      }
      
      if (geocodeResult.bestMatch?.suburbName) {
        foundSuburb = geocodeResult.bestMatch.suburbName;
      } else if (geocodeResult.suggestions && geocodeResult.suggestions.length > 0) {
        foundSuburb = geocodeResult.suggestions[0]?.suburbName;
      }
      
      if (foundPostcode && !address.postCode) {
        console.log('LGA Lookup: Populating postcode:', foundPostcode);
        addressUpdates.postCode = foundPostcode;
      } else if (!address.postCode) {
        console.log('LGA Lookup: Postcode not found in any Geoscape suggestions');
      }
      
      // Fix suburb capitalization if needed
      if (foundSuburb) {
        const correctedSuburb = foundSuburb
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        if (correctedSuburb !== address.suburbName) {
          addressUpdates.suburbName = correctedSuburb;
        }
      }

      // If we got LGA from Stash but still need postcode, try Geoscape with full address
      if (stashLGA && !address.postCode && address.streetNumber && address.streetName) {
        const fullAddress = `${address.streetNumber} ${address.streetName}, ${address.suburbName} ${address.state}`;
        const fullGeocodeResult = await geocodeAddress(fullAddress);
        if (fullGeocodeResult.bestMatch?.postCode) {
          addressUpdates.postCode = fullGeocodeResult.bestMatch.postCode;
        }
      }

      // Try Geoscape with full address if available (more likely to have LGA)
      let lga = null;
      if (!stashLGA && address.streetNumber && address.streetName) {
        const fullAddress = `${address.streetNumber} ${address.streetName}, ${address.suburbName} ${address.state}`;
        const fullGeocodeResult = await geocodeAddress(fullAddress);
        if (fullGeocodeResult.bestMatch?.lga) {
          lga = fullGeocodeResult.bestMatch.lga;
          addressUpdates.lga = lga;
          // Also get postcode from full address if still missing
          if (!address.postCode && fullGeocodeResult.bestMatch.postCode) {
            addressUpdates.postCode = fullGeocodeResult.bestMatch.postCode;
          }
        }
      }

      // Update all fields at once
      console.log('LGA Lookup: Address updates to apply:', addressUpdates);
      if (Object.keys(addressUpdates).length > 0) {
        updateAddress(addressUpdates);
        console.log('LGA Lookup: Address updated successfully');
      } else {
        // No updates found
        console.log('LGA Lookup: No updates to apply');
        if (!stashLGA && !lga) {
          alert('LGA lookup unavailable for suburb/state only. Please:\n1. Click "Check Stash" with a full address, OR\n2. Enter LGA manually');
        }
      }
    } catch (error) {
      console.error('Error looking up LGA:', error);
      alert('Error looking up LGA. Please use "Check Stash" with a full address, or enter manually.');
    } finally {
      setIsLookingUpLGA(false);
    }
  };
  
  // Always show LGA field (even if empty) so user can see it and enter manually if needed
  return (
    <div>
      <label className="label-field">LGA (Local Government Area):</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={lgaValue}
          onChange={(e) => updateAddress({ lga: e.target.value })}
          className="input-field flex-1"
          placeholder={stashData?.lga ? "Auto-populated from Stash" : "Enter LGA manually"}
          readOnly={!isEditable}
        />
        {isEditable && address.suburbName && address.state && (
          <button
            type="button"
            onClick={handleLookupLGA}
            disabled={isLookingUpLGA}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            {isLookingUpLGA ? 'Looking up...' : 'Lookup LGA'}
          </button>
        )}
      </div>
      {stashData?.lga && (
        <p className="text-xs text-green-600 mt-1">✓ LGA from Stash: {stashData.lga}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">This will be used for Investment Highlights lookup</p>
    </div>
  );
}

function ZoningDisplay() {
  const { formData, updateRiskOverlays, stashData } = useFormStore();
  const { riskOverlays } = formData;
  
  // Get zoning value - prefer zone + zoneDesc format: "R2 (Low Density Residential)"
  let zoningValue = riskOverlays.zoning || '';
  if (!zoningValue && stashData) {
    // Always prefer zone + zoneDesc if available (more accurate)
    if (stashData.zone && stashData.zoneDesc) {
      // Only combine if they're different (avoid duplicates like "Emerging Community Zone (Emerging Community Zone)")
      if (stashData.zone.trim() !== stashData.zoneDesc.trim()) {
        zoningValue = `${stashData.zone} (${stashData.zoneDesc})`;
      } else {
        // If they're the same, just use one
        zoningValue = stashData.zone;
      }
    } else if (stashData.zone) {
      zoningValue = stashData.zone;
    } else if (stashData.zoning) {
      // Fallback to zoning field if zone is not available
      zoningValue = stashData.zoning;
    }
  }
  
  // Check if zone and zoneDesc are the same (duplicate)
  const isDuplicate = stashData?.zone && stashData?.zoneDesc && 
    stashData.zone.trim() === stashData.zoneDesc.trim();
  
  // Check if Stash was checked but doesn't have zoning information
  const stashCheckedButNoZoning = stashData && 
    !stashData.zone && 
    !stashData.zoneDesc && 
    !stashData.zoning && 
    !zoningValue;

  return (
    <div>
      <label className="label-field" htmlFor="zoning-input">Zoning *</label>
      <input
        id="zoning-input"
        type="text"
        value={zoningValue}
        onChange={(e) => updateRiskOverlays({ zoning: e.target.value })}
        className="input-field"
        placeholder="Auto-populated from Stash"
        required
      />
      {isDuplicate && (
        <p className="text-xs text-gray-500 mt-1">
          Note: Zone code and description are identical, showing single value to avoid duplication.
        </p>
      )}
      {stashCheckedButNoZoning && (
        <p className="text-xs text-yellow-600 mt-1 font-medium">
          ⚠️ Stash did not return zoning information for this address. Please enter zoning manually if known.
        </p>
      )}
      {stashData?.zone && !zoningValue && (
        <p className="text-xs text-gray-500 mt-1">
          Stash data available but not parsed correctly. Check console for details.
        </p>
      )}
    </div>
  );
}

function StashFieldDisplay({ field }: { field: 'floodRisk' | 'bushfireRisk' }) {
  const { stashData } = useFormStore();
  
  if (!stashData) {
    return null;
  }
  
  const textField = field === 'floodRisk' ? 'flooding' : 'bushfire';
  const text = stashData[textField as keyof typeof stashData] as string;
  const riskValue = stashData[field];
  
  // If Stash says "not available", show that text prominently with yellow background
  if (text && text.toLowerCase().includes('not available')) {
    return (
      <div className="mt-2 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
        <p className="text-sm font-semibold text-yellow-800">
          ⚠️ Stash: {text}
        </p>
      </div>
    );
  }
  
  // Otherwise show Yes/No with any additional text
  if (riskValue || text) {
    return (
      <p className="text-xs text-gray-500 mt-1">
        Stash: {riskValue || 'N/A'} {text && `- ${text}`}
      </p>
    );
  }
  
  return null;
}

export function Step0AddressAndRisk() {
  const { formData, updateAddress, updateRiskOverlays, updateFormData, setStashData, setStashLoading, setStashError, setCurrentStep } = useFormStore();
  const { address, riskOverlays, sourcer, sellingAgentName, sellingAgentEmail, sellingAgentMobile } = formData;
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [packagingEnabled, setPackagingEnabled] = useState(false);
  const [addressFieldsEditable, setAddressFieldsEditable] = useState(address.addressFieldsEditable || false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sourcerOptions, setSourcerOptions] = useState<string[]>([]);
  
  useEffect(() => {
    console.log('Step0AddressAndRisk component mounted');
    console.log('address:', address);
    // Sync state from address data
    if (address.addressFieldsEditable !== undefined) {
      setAddressFieldsEditable(address.addressFieldsEditable);
    }
    // Also sync verified state
    if (address.addressVerified === false) {
      setAddressFieldsEditable(true);
    }
    
    // If sourcer exists, show the fields (user has already clicked "Continue with Packaging")
    if (sourcer && sourcer.trim() !== '') {
      setPackagingEnabled(true);
    }
  }, [address.addressFieldsEditable, address.addressVerified, sourcer]);

  // Load sourcer options on mount
  useEffect(() => {
    getSourcerNames().then(names => {
      setSourcerOptions(names);
    }).catch(error => {
      console.error('Failed to load sourcer options:', error);
      // Fallback to empty array or default list
      setSourcerOptions(['Adi', 'Ali', 'James', 'Jess', 'John', 'Josh', 'Mohit', 'Sachin', 'Shay', 'Will']);
    });
  }, []);

  // Close clear confirmation dialog when clicking outside
  useEffect(() => {
    if (showClearConfirm && typeof window !== 'undefined') {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.clear-confirm-dialog')) {
          setShowClearConfirm(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showClearConfirm]);


  const handleAddressChange = (value: string) => {
    // ONLY update the property address field - do NOT parse or populate anything
    // Individual fields will ONLY be populated after "Check Stash" validates the address
    // If address is cleared, clear ALL fields including LGA and Stash data
    if (!value || value.trim() === '') {
      updateAddress({ 
        propertyAddress: '',
        stashPropertyAddress: '',
        streetNumber: '',
        streetName: '',
        suburbName: '',
        state: '',
        postCode: '',
        lga: '',
        googleMap: '',
        addressSource: undefined,
      });
      // Also clear Stash data and risk overlays when address is cleared
      setStashData(null);
      setStashError(null);
      updateRiskOverlays({
        zoning: '',
        flood: '' as YesNo,
        bushfire: '' as YesNo,
        mining: '' as YesNo,
        otherOverlay: '' as YesNo,
        specialInfrastructure: '' as YesNo,
        dueDiligenceAcceptance: '' as YesNo,
      });
    } else {
      // Address has content - clear individual fields but keep property address
      updateAddress({ 
        propertyAddress: value,
        streetNumber: '',
        streetName: '',
        suburbName: '',
        state: '',
        postCode: '',
        lga: '',
        googleMap: '',
      });
    }
  };

  // Parse address string and populate separate fields
  // Uses state from Stash if provided (for addresses without state in the string)
  const parseAndPopulateAddress = (fullAddress: string, stateFromStash?: string) => {
    if (!fullAddress) {
      console.log('parseAndPopulateAddress: No address provided');
      return;
    }
    
    console.log('=== Parsing address ===');
    console.log('Full address:', fullAddress);
    console.log('State from Stash:', stateFromStash);
    
    // Build address object to update all fields at once
    const addressUpdate: any = {};
    
    // Try comma-separated format: "123 Main St, Suburb State 1234" or "123 Main St, Suburb, State 1234"
    const addressParts = fullAddress.split(',').map(p => p.trim());
    
    if (addressParts.length >= 2) {
      console.log('Address has comma, using comma-separated parsing');
      const streetPart = addressParts[0];
      const locationPart = addressParts.slice(1).join(' '); // Join remaining parts
      
      // Extract street number and name from first part
      const streetMatch = streetPart.match(/^(\d+)\s+(.+)$/);
      if (streetMatch) {
        addressUpdate.streetNumber = streetMatch[1];
        addressUpdate.streetName = streetMatch[2].toLowerCase();
        console.log('Parsed street:', streetMatch[1], streetMatch[2]);
      }
      
      // Extract suburb, state, postcode from location part
      // Pattern: "Suburb State 1234" or "Suburb State"
      const locationMatch = locationPart.match(/^(.+?)\s+([A-Z]{2,3})(?:\s+(\d+))?$/i);
      if (locationMatch) {
        addressUpdate.suburbName = locationMatch[1].trim().toLowerCase();
        addressUpdate.state = locationMatch[2].toUpperCase();
        addressUpdate.postCode = locationMatch[3] || '';
        console.log('Parsed location:', locationMatch[1], locationMatch[2], locationMatch[3]);
      } else {
        // Fallback: try splitting by spaces
        const parts = locationPart.split(/\s+/);
        if (parts.length >= 2) {
          const state = parts[parts.length - 1].toUpperCase();
          const postCode = parts.length >= 3 && /^\d+$/.test(parts[parts.length - 2]) ? parts[parts.length - 2] : '';
          const suburb = postCode 
            ? parts.slice(0, -2).join(' ')
            : parts.slice(0, -1).join(' ');
          
          addressUpdate.suburbName = suburb.toLowerCase();
          addressUpdate.state = state;
          addressUpdate.postCode = postCode;
          console.log('Parsed location (fallback):', suburb, state, postCode);
        }
      }
    } else {
      // No comma - try to parse as single string
      // Pattern: "123 Main St Suburb State 1234" or "123 Main St Suburb State"
      console.log('Address has no comma, using space-separated parsing');
      const parts = fullAddress.split(/\s+/);
      console.log('Address parts:', parts);
      
      if (parts.length >= 3) {
        // Assume first part is street number
        addressUpdate.streetNumber = parts[0];
        console.log('Street number:', parts[0]);
        
        // Find where state starts (2-3 letter, case-insensitive)
        // Common Australian states: QLD, NSW, VIC, SA, WA, TAS, NT, ACT
        let stateIndex = -1;
        const statePattern = /^(QLD|NSW|VIC|SA|WA|TAS|NT|ACT)$/i;
        for (let i = parts.length - 1; i >= 0; i--) {
          if (statePattern.test(parts[i])) {
            stateIndex = i;
            break;
          }
        }
        
        // If no state found in address, use state from Stash
        if (stateIndex === -1 && stateFromStash) {
          console.log('No state in address, using state from Stash:', stateFromStash);
          addressUpdate.state = stateFromStash.toUpperCase();
          // Last part before state is suburb, everything between street number and suburb is street name
          const postCodeIndex = parts.length - 1;
          const postCode = /^\d+$/.test(parts[postCodeIndex]) ? parts[postCodeIndex] : '';
          const suburbIndex = postCode ? postCodeIndex - 1 : postCodeIndex;
          addressUpdate.suburbName = parts[suburbIndex].toLowerCase();
          addressUpdate.streetName = parts.slice(1, suburbIndex).join(' ').toLowerCase();
          addressUpdate.postCode = postCode;
          console.log('Parsed using Stash state:', addressUpdate);
        } else if (stateIndex > 0) {
          addressUpdate.state = parts[stateIndex].toUpperCase();
          addressUpdate.postCode = stateIndex < parts.length - 1 && /^\d+$/.test(parts[stateIndex + 1]) ? parts[stateIndex + 1] : '';
          const streetNameEnd = stateIndex - (addressUpdate.postCode ? 2 : 1);
          addressUpdate.streetName = parts.slice(1, streetNameEnd).join(' ').toLowerCase();
          addressUpdate.suburbName = parts[streetNameEnd].toLowerCase();
          console.log('Parsed values:', addressUpdate);
        } else {
          console.log('Could not find state in address and no state from Stash');
        }
      } else {
        console.log('Address has less than 3 parts, cannot parse');
      }
    }
    
    // Update all address fields at once
    if (Object.keys(addressUpdate).length > 0) {
      console.log('Updating address fields:', addressUpdate);
      updateAddress(addressUpdate);
      console.log('Address fields updated successfully');
    } else {
      console.log('No address fields to update');
    }
    
    console.log('=== Parsing complete ===');
  };

  const handleGeocode = async () => {
    console.log('handleGeocode called');
    console.log('address:', address?.propertyAddress);
    
    if (!address?.propertyAddress?.trim()) {
      alert('Please enter an address first');
      return;
    }

    console.log('Starting Stash check...');
    setIsGeocoding(true);
    setStashLoading(true);
    setStashError(null);
    
    // Clear previous Stash data FIRST to prevent useEffect from repopulating overlays
    setStashData(null);
    
    // Clear previous verified state and overlays when checking a new address
    // This ensures old data doesn't persist when checking a different address
    // Clear overlays FIRST, then address state
    updateRiskOverlays({
      flood: '' as YesNo,
      bushfire: '' as YesNo,
      mining: '' as YesNo,
      otherOverlay: '' as YesNo,
      specialInfrastructure: '' as YesNo,
      zoning: '',
      dueDiligenceAcceptance: '' as YesNo,
    });
    
    // Clear verified state AFTER overlays to ensure UI updates properly
    updateAddress({ 
      addressVerified: false, 
      addressFieldsEditable: true 
    });
    setAddressFieldsEditable(true); // Sync local state
    
    // Force a small delay to ensure state updates are applied before API calls
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      // Build query address - use propertyAddress if available, otherwise combine individual fields
      let queryAddress = address.propertyAddress;
      if (!queryAddress || queryAddress.trim() === '') {
        // If no main address, try to build from individual fields
        const parts: string[] = [];
        if (address.streetNumber) parts.push(address.streetNumber);
        if (address.streetName) parts.push(address.streetName);
        if (address.suburbName) parts.push(address.suburbName);
        if (address.state) parts.push(address.state);
        if (address.postCode) parts.push(address.postCode);
        queryAddress = parts.join(' ');
      }
      
      if (!queryAddress || queryAddress.trim() === '') {
        alert('Please enter an address first');
        setIsGeocoding(false);
        setStashLoading(false);
        return;
      }
      
      // Store the original address BEFORE validation (for restoration when switching back)
      const originalAddress = address.propertyAddress || queryAddress;
      
      // Step 1: Call Geoscape directly to get validated address components
      console.log('Calling Geoscape API to validate address:', queryAddress);
      const geocodeResult = await geocodeAddress(queryAddress);
      console.log('Geoscape response:', geocodeResult);
      
      // Step 2: Call Stash API for planning/risk data (use validated address if available)
      const stashQueryAddress = geocodeResult.bestMatch?.formattedAddress || queryAddress;
      console.log('Calling getStashData with:', stashQueryAddress);
      const stashResponse = await getStashData(stashQueryAddress);
      console.log('Stash response received:', stashResponse);
      
      setStashData(stashResponse);
      
      // Step 3: Populate address fields from Geoscape validated data
      // ALWAYS overwrite with validated data to fix capitalization, missing postcodes, etc.
      const addressUpdates: any = {};
      
      // Store the validated Stash address for restoration
      const validatedAddress = geocodeResult.bestMatch?.formattedAddress || stashQueryAddress;
      addressUpdates.stashPropertyAddress = validatedAddress;
      
      // Use Geoscape's validated address components (most reliable)
      // Always overwrite to ensure correct capitalization and completeness
      if (geocodeResult.bestMatch) {
        const geocoded = geocodeResult.bestMatch;
        
        // Always update these fields if Geoscape provides them (even if user already entered them)
        if (geocoded.streetNumber) {
          addressUpdates.streetNumber = geocoded.streetNumber;
        }
        if (geocoded.streetName) {
          // Capitalize street name properly (Title Case)
          addressUpdates.streetName = geocoded.streetName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
        if (geocoded.suburbName) {
          // Capitalize suburb name properly (Title Case) - ALWAYS overwrite to fix capitalization
          addressUpdates.suburbName = geocoded.suburbName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
        if (geocoded.state) {
          addressUpdates.state = geocoded.state.toUpperCase();
        }
        // ALWAYS populate postcode if Geoscape provides it (even if user didn't enter it)
        if (geocoded.postCode) {
          addressUpdates.postCode = geocoded.postCode;
        }
        if (geocoded.latitude && geocoded.longitude) {
          addressUpdates.latitude = geocoded.latitude;
          addressUpdates.longitude = geocoded.longitude;
        }
        
        // Update property address with corrected version if different
        if (geocoded.formattedAddress) {
          console.log('Updating property address with Geoscape corrected version:', geocoded.formattedAddress);
          addressUpdates.propertyAddress = geocoded.formattedAddress;
          // stashPropertyAddress already set above
        }
      }
      
      // Also use Stash data if available (LGA, etc.)
      if (stashResponse.lga) {
        addressUpdates.lga = stashResponse.lga;
      }
      // Use Stash state if Geoscape didn't provide it
      if (!addressUpdates.state && stashResponse.state) {
        addressUpdates.state = stashResponse.state;
      }
      // Use Stash postcode if Geoscape didn't provide it
      if (!addressUpdates.postCode && stashResponse.postCode) {
        addressUpdates.postCode = stashResponse.postCode;
      }
      
      // Ensure stashPropertyAddress is always set (fallback to original if no formatted address)
      if (!addressUpdates.stashPropertyAddress) {
        addressUpdates.stashPropertyAddress = validatedAddress || originalAddress;
      }
      
      // Update address fields with validated data
      if (Object.keys(addressUpdates).length > 0) {
        console.log('Populating address fields from Geoscape validated data:', addressUpdates);
        // Mark address as verified if we got data from Geoscape
        addressUpdates.addressVerified = true;
        addressUpdates.addressFieldsEditable = false; // Lock fields after verification
        addressUpdates.addressSource = 'stash'; // Set default to Stash address
        updateAddress(addressUpdates);
        
        // Check GHL for existing address at the same time
        const verifiedAddress = addressUpdates.propertyAddress || address.propertyAddress;
        if (verifiedAddress) {
          console.log('Starting GHL address check for:', verifiedAddress);
          try {
            const checkResponse = await fetch('/api/ghl/check-address', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ propertyAddress: verifiedAddress }),
            });
            
            console.log('GHL check response status:', checkResponse.status);
            
            if (!checkResponse.ok) {
              console.error('GHL check failed with status:', checkResponse.status);
              const errorText = await checkResponse.text();
              console.error('GHL check error response:', errorText);
              return; // Don't block, just log
            }
            
            const checkResult = await checkResponse.json();
            console.log('GHL check result:', checkResult);
            
            if (checkResult.exists && checkResult.matchingRecords && checkResult.matchingRecords.length > 0) {
              const matches = checkResult.matchingRecords;
              const matchInfo = matches.map((m: any) => 
                `Address: ${m.address}\nPackager: ${m.packager || 'N/A'}\nSourcer: ${m.sourcer || 'N/A'}`
              ).join('\n\n');
              
              alert(`⚠️ This address already exists in GHL:\n\n${matchInfo}\n\nYou can still proceed, but this may be a duplicate.`);
            } else {
              console.log('GHL check: No matching addresses found');
            }
          } catch (ghlError) {
            // Don't block the flow if GHL check fails - just log it
            console.error('GHL address check error (non-blocking):', ghlError);
          }
        } else {
          console.log('GHL check skipped: No verified address available');
        }
      } else {
        console.log('WARNING: No address components returned from Geoscape. Address may be invalid.');
        setStashError('Address not found. Please check the address and try again.');
      }
      
      // Auto-populate risk overlays from Stash
      // Check if Stash says "not available" - if so, use the text, not Yes/No
      let floodValue: YesNo = '';
      if (stashResponse.flooding && stashResponse.flooding.toLowerCase().includes('not available')) {
        // Stash says "not available" - don't set to "No", leave empty or use the text
        // We'll display the text separately
        floodValue = '' as YesNo;
      } else {
        floodValue = (stashResponse.floodRisk || stashResponse.floodingRisk || '') as YesNo;
      }
      if (floodValue) {
        updateRiskOverlays({ flood: floodValue });
      }
      
      let bushfireValue: YesNo = '';
      if (stashResponse.bushfire && stashResponse.bushfire.toLowerCase().includes('not available')) {
        // Stash says "not available" - don't set to "No"
        bushfireValue = '' as YesNo;
      } else {
        bushfireValue = (stashResponse.bushfireRisk || '') as YesNo;
      }
      if (bushfireValue) {
        updateRiskOverlays({ bushfire: bushfireValue });
      }
      
      // Format zoning as "Zone (Description)" - prefer zone + zoneDesc over zoning field
      if (stashResponse.zone && stashResponse.zoneDesc) {
        // Only combine if they're different (avoid duplicates)
        const zoneText = stashResponse.zone.trim() !== stashResponse.zoneDesc.trim()
          ? `${stashResponse.zone} (${stashResponse.zoneDesc})`
          : stashResponse.zone;
        updateRiskOverlays({ zoning: zoneText });
      } else if (stashResponse.zone) {
        updateRiskOverlays({ zoning: stashResponse.zone });
      } else if (stashResponse.zoning) {
        // Fallback to zoning field if zone is not available
        updateRiskOverlays({ zoning: stashResponse.zoning });
      }
      
      if (stashResponse.lga) {
        updateAddress({ lga: stashResponse.lga });
      }
      
      // Generate Google Maps link
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.propertyAddress)}`;
      updateAddress({ googleMap: mapsLink });
    } catch (error: any) {
      setStashError('Unable to retrieve property data. Please check the address and try again, or continue with manual entry.');
    } finally {
      setIsGeocoding(false);
      setStashLoading(false);
    }
  };

  const handleOverlayChange = (field: keyof typeof riskOverlays, value: YesNo) => {
    updateRiskOverlays({ [field]: value });
    checkDialogueWarning(field, value);
  };

  const handleDialogueChange = (field: keyof typeof riskOverlays, value: string) => {
    updateRiskOverlays({ [field]: value });
  };

  const checkDialogueWarning = (field: string, value: YesNo) => {
    // Warning logic handled in render
  };

  const setAllOverlaysToNo = () => {
    updateRiskOverlays({
      flood: 'No',
      bushfire: 'No',
      mining: 'No',
      otherOverlay: 'No',
      specialInfrastructure: 'No',
    });
  };

  const handleContinueWithPackaging = async () => {
    // If already enabled, just return
    if (packagingEnabled) {
      return;
    }

    // Check if address exists (for GHL duplicate check - informational only)
    const propertyAddress = address.propertyAddress || address.stashPropertyAddress;
    if (!propertyAddress) {
      alert('Please enter and verify an address first');
      return;
    }

    try {
      // Check address in GHL (informational - don't block if duplicate found)
      const checkResponse = await fetch('/api/ghl/check-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyAddress }),
      });

      const checkResult = await checkResponse.json();

      if (checkResult.exists && checkResult.matchingRecords && checkResult.matchingRecords.length > 0) {
        // Address already exists - show warning but don't block
        const matches = checkResult.matchingRecords;
        const matchInfo = matches.map((m: any) => 
          `Address: ${m.address}\nPackager: ${m.packager || 'N/A'}\nSourcer: ${m.sourcer || 'N/A'}`
        ).join('\n\n');
        
        alert(
          `Note: This address already exists in GHL:\n\n${matchInfo}\n\nYou can continue. Folder will be created when you submit the form.`
        );
      }

      // Show Sourcer and Selling Agent fields
      // Folder will be created at final submission (Step 5) when address is complete
      setPackagingEnabled(true);
    } catch (error) {
      console.error('Error checking address:', error);
      // Don't block progression if check fails - just show fields
      setPackagingEnabled(true);
    }
  };

  const handleProceedToStep2 = () => {
    // Validate that Address is filled (required)
    if (!address?.propertyAddress || address.propertyAddress.trim() === '') {
      alert('Please enter a property address before proceeding.');
      return;
    }
    
    // Validate that all risk overlay fields are filled (required)
    if (!riskOverlays?.zoning || riskOverlays.zoning.trim() === '') {
      alert('Please enter the Zoning field before proceeding.');
      // Focus on zoning input
      const zoningInput = document.getElementById('zoning-input') as HTMLInputElement;
      if (zoningInput) {
        zoningInput.focus();
        zoningInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    if (!riskOverlays?.flood || !riskOverlays?.bushfire || !riskOverlays?.mining || 
        !riskOverlays?.otherOverlay || !riskOverlays?.specialInfrastructure || 
        !riskOverlays?.dueDiligenceAcceptance) {
      alert('Please fill in all Risk Overlay fields (Flood, Bushfire, Mining, Other Overlay, Special Infrastructure, and Due Diligence Acceptance) before proceeding.');
      return;
    }
    
    // Validate that Sourcer is filled (required)
    if (!sourcer || sourcer.trim() === '') {
      alert('Please enter the Sourcer name before proceeding.');
      return;
    }
    
    // Move to next step after all validations pass
    setCurrentStep(2);
  };

  // Auto-populate risk overlays from Stash data when it becomes available
  // NOTE: Address fields are populated in handleGeocode, not here
  // IMPORTANT: Only populate if fields are empty - don't overwrite user changes
  const { stashData, stashLoading } = useFormStore();
  
  useEffect(() => {
    // Only update overlays if we have stash data AND we're not currently loading (to prevent stale data)
    if (stashData && !stashData.error && !stashLoading) {
      // Get current risk overlay values to check if they're already set by user
      const currentOverlays = useFormStore.getState().formData.riskOverlays;
      
      console.log('=== useEffect: Auto-populating risk overlays from Stash (only if empty) ===');
      
      const updates: Partial<import('@/types/form').RiskOverlays> = {};
      
      // Only update flood if it's currently empty
      if (!currentOverlays?.flood) {
        let floodValue: YesNo = '';
        if (stashData.flooding && stashData.flooding.toLowerCase().includes('not available')) {
          floodValue = '' as YesNo;
        } else {
          floodValue = (stashData.floodRisk || stashData.floodingRisk || '') as YesNo;
        }
        if (floodValue) {
          updates.flood = floodValue;
        }
      }
      
      // Only update bushfire if it's currently empty
      if (!currentOverlays?.bushfire) {
        let bushfireValue: YesNo = '';
        if (stashData.bushfire && stashData.bushfire.toLowerCase().includes('not available')) {
          bushfireValue = '' as YesNo;
        } else {
          bushfireValue = (stashData.bushfireRisk || '') as YesNo;
        }
        if (bushfireValue) {
          updates.bushfire = bushfireValue;
        }
      }
      
      // Only update zoning if it's currently empty
      if (!currentOverlays?.zoning) {
        // Format zoning as "Zone (Description)" - prefer zone + zoneDesc over zoning field
        if (stashData.zone && stashData.zoneDesc) {
          // Only combine if they're different (avoid duplicates)
          const zoneText = stashData.zone.trim() !== stashData.zoneDesc.trim()
            ? `${stashData.zone} (${stashData.zoneDesc})`
            : stashData.zone;
          updates.zoning = zoneText;
        } else if (stashData.zone) {
          updates.zoning = stashData.zone;
        } else if (stashData.zoning) {
          // Fallback to zoning field if zone is not available
          updates.zoning = stashData.zoning;
        }
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        updateRiskOverlays(updates);
      }
    } else if (stashData === null && !stashLoading) {
      // If stashData is explicitly null and we're not loading, preserve user values
      console.log('=== useEffect: Stash data cleared, but preserving user values ===');
    } else if (stashData?.error) {
      console.log('useEffect: Stash data has error:', stashData.errorMessage);
    }
  }, [stashData, stashLoading, updateRiskOverlays]); // Only run when stashData changes, not when user changes overlays

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Property Address & Risk Assessment</h2>
      <p className="text-gray-600 mb-6">
        Enter the property address to check risk overlays from Stash Property.
      </p>
      

      {/* Address Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Property Address</h3>
        <div className="space-y-4">
          <div>
            <label className="label-field">Property Address (Street Number Only - No Unit Numbers) *</label>
            <p className="text-xs text-gray-500 mb-2">Enter street address only. Unit numbers will be captured in Property Details step.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={address?.propertyAddress || ''}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="e.g., 4 Osborne Circuit Maroochydore QLD 4558"
                className="input-field flex-1"
                required
              />
              <button
                type="button"
                onClick={handleGeocode}
                disabled={isGeocoding || !address.propertyAddress}
                className="btn-primary whitespace-nowrap"
                style={{ pointerEvents: 'auto', zIndex: 999 }}
              >
                {isGeocoding ? 'Checking...' : 'Check Stash'}
              </button>
            </div>
            
            <div className="mt-2 relative">
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="btn-secondary text-sm"
              >
                Clear Form
              </button>
              
              {/* Custom confirmation dialog - appears near button */}
              {showClearConfirm && (
                <div className="clear-confirm-dialog absolute top-full left-0 mt-2 z-50 bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 min-w-[300px]">
                  <p className="font-semibold text-gray-900 mb-3">
                    Are you sure you want to clear all fields?
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    All data will be lost.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Clear only address and risk overlay fields (not Decision Tree)
                        updateAddress({ 
                          propertyAddress: '',
                          stashPropertyAddress: '',
                          streetNumber: '',
                          streetName: '',
                          suburbName: '',
                          state: '',
                          postCode: '',
                          lga: '',
                          googleMap: '',
                          addressFieldsEditable: false,
                          addressVerified: false,
                          addressSource: undefined,
                        });
                        updateRiskOverlays({
                          zoning: '',
                          flood: '' as YesNo,
                          bushfire: '' as YesNo,
                          mining: '' as YesNo,
                          otherOverlay: '' as YesNo,
                          specialInfrastructure: '' as YesNo,
                          dueDiligenceAcceptance: '' as YesNo,
                        });
                        setStashData(null);
                        setStashError(null);
                        setAddressFieldsEditable(false);
                        setShowClearConfirm(false);
                      }}
                      className="btn-primary text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stash Status */}
          <StashStatus />
          
          {/* Property Info from Stash */}
          <PropertyInfoFromStash />

          {/* Verified Badge - Below Stash Status */}
          {address.addressVerified && !addressFieldsEditable && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                ✓ Verified
              </span>
            </div>
          )}

          {/* Property Address - Used for Risk Overlays & Google Maps */}
          <div className="mt-4">
            <h4 className="font-semibold text-gray-900 mb-3">Property Address</h4>
            
            {/* Address Source Selection */}
            {address.addressVerified && address.propertyAddress && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">Choose which address to use:</p>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-start gap-2 cursor-pointer p-3 bg-white rounded border-2 border-transparent hover:border-blue-300 transition-colors" style={{ borderColor: address.addressSource !== 'individual' ? '#3b82f6' : 'transparent' }}>
                    <input
                      type="radio"
                      name="addressSource"
                      value="stash"
                      checked={address.addressSource !== 'individual'}
                      onChange={() => {
                        // Restore original Stash address
                        const stashAddress = address.stashPropertyAddress || address.propertyAddress;
                        updateAddress({ 
                          addressSource: 'stash',
                          propertyAddress: stashAddress
                        });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">Stash Address (Validated)</span>
                      <p className="text-xs text-gray-600 mt-1">{address.stashPropertyAddress || address.propertyAddress}</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer p-3 bg-white rounded border-2 border-transparent hover:border-blue-300 transition-colors" style={{ borderColor: address.addressSource === 'individual' ? '#3b82f6' : 'transparent' }}>
                    <input
                      type="radio"
                      name="addressSource"
                      value="individual"
                      checked={address.addressSource === 'individual'}
                      onChange={() => {
                        // Build address from individual fields
                        const individualAddress = [
                          address.streetNumber,
                          address.streetName,
                          address.suburbName,
                          address.state,
                          address.postCode
                        ].filter(Boolean).join(', ');
                        updateAddress({ 
                          addressSource: 'individual',
                          propertyAddress: individualAddress || address.propertyAddress
                        });
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">Individual Fields Address</span>
                      <p className="text-xs text-gray-600 mt-1">
                        {[address.streetNumber, address.streetName, address.suburbName, address.state, address.postCode]
                          .filter(Boolean).join(', ') || 'Edit fields below'}
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Street Number</label>
              <input
                type="text"
                value={address.streetNumber || ''}
                onChange={(e) => {
                  const updates: any = { streetNumber: e.target.value };
                  // If using individual fields, rebuild propertyAddress
                  if (address.addressSource === 'individual') {
                    const individualAddress = [
                      e.target.value,
                      address.streetName,
                      address.suburbName,
                      address.state,
                      address.postCode
                    ].filter(Boolean).join(', ');
                    updates.propertyAddress = individualAddress || address.propertyAddress;
                  }
                  updateAddress(updates);
                }}
                className="input-field"
                readOnly={!addressFieldsEditable}
              />
            </div>
            <div>
              <label className="label-field">Street Name</label>
              <input
                type="text"
                value={address.streetName || ''}
                onChange={(e) => {
                  const updates: any = { streetName: e.target.value };
                  // If using individual fields, rebuild propertyAddress
                  if (address.addressSource === 'individual') {
                    const individualAddress = [
                      address.streetNumber,
                      e.target.value,
                      address.suburbName,
                      address.state,
                      address.postCode
                    ].filter(Boolean).join(', ');
                    updates.propertyAddress = individualAddress || address.propertyAddress;
                  }
                  updateAddress(updates);
                }}
                className="input-field"
                readOnly={!addressFieldsEditable}
              />
            </div>
            <div>
              <label className="label-field">Suburb</label>
              <input
                type="text"
                value={address.suburbName || ''}
                onChange={(e) => {
                  const updates: any = { suburbName: e.target.value };
                  // If using individual fields, rebuild propertyAddress
                  if (address.addressSource === 'individual') {
                    const individualAddress = [
                      address.streetNumber,
                      address.streetName,
                      e.target.value,
                      address.state,
                      address.postCode
                    ].filter(Boolean).join(', ');
                    updates.propertyAddress = individualAddress || address.propertyAddress;
                  }
                  updateAddress(updates);
                }}
                className="input-field"
                readOnly={!addressFieldsEditable}
              />
            </div>
            <div>
              <label className="label-field">State</label>
              <input
                type="text"
                value={address.state || ''}
                onChange={(e) => {
                  const updates: any = { state: e.target.value };
                  // If using individual fields, rebuild propertyAddress
                  if (address.addressSource === 'individual') {
                    const individualAddress = [
                      address.streetNumber,
                      address.streetName,
                      address.suburbName,
                      e.target.value,
                      address.postCode
                    ].filter(Boolean).join(', ');
                    updates.propertyAddress = individualAddress || address.propertyAddress;
                  }
                  updateAddress(updates);
                }}
                className="input-field"
                placeholder="e.g., QLD, NSW, VIC"
                readOnly={!addressFieldsEditable}
              />
            </div>
            <div>
              <label className="label-field">Post Code</label>
              <input
                type="text"
                value={address.postCode || ''}
                onChange={(e) => {
                  const updates: any = { postCode: e.target.value };
                  // If using individual fields, rebuild propertyAddress
                  if (address.addressSource === 'individual') {
                    const individualAddress = [
                      address.streetNumber,
                      address.streetName,
                      address.suburbName,
                      address.state,
                      e.target.value
                    ].filter(Boolean).join(', ');
                    updates.propertyAddress = individualAddress || address.propertyAddress;
                  }
                  updateAddress(updates);
                }}
                className="input-field"
                readOnly={!addressFieldsEditable}
              />
            </div>
            {/* LGA - Show with address fields in same row as Post Code */}
            <div>
              <LGADisplay />
            </div>
            </div>
            
            {/* Edit Address Fields button - below the grid */}
            <div className="mt-2 flex justify-start">
              <button
                type="button"
                onClick={() => {
                  if (address.addressVerified && !addressFieldsEditable) {
                    if (confirm('You are about to edit a verified address. Continue?')) {
                      setAddressFieldsEditable(true);
                      updateAddress({ addressFieldsEditable: true });
                    }
                  } else {
                    setAddressFieldsEditable(!addressFieldsEditable);
                    updateAddress({ addressFieldsEditable: !addressFieldsEditable });
                  }
                }}
                className="btn-secondary text-sm"
              >
                {addressFieldsEditable ? 'Lock Address Fields' : 'Edit Address Fields'}
              </button>
            </div>
          </div>

          {/* Google Maps Link */}
          {address.googleMap && (
            <div className="mt-4">
              <label className="label-field">Google Maps Link</label>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 font-medium">Click to check link →</span>
                  <a
                    href={address.googleMap}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-base"
                  >
                    {address.propertyAddress || 'View on Google Maps'}
                  </a>
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    value={address.googleMap}
                    onChange={(e) => updateAddress({ googleMap: e.target.value })}
                    className="input-field w-full text-xs"
                    placeholder="https://www.google.com/maps/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">The link above will display as the property address in the email template.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Risk Overlays Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Property Risk Overlays</h3>
        <p className="text-gray-600 mb-4 text-sm">
          Review risk overlays from Stash Property. You can override any values if further analysis indicates otherwise.
        </p>

        {/* Bulk Actions */}
        <div className="mb-6 flex justify-end gap-2">
          <button
            onClick={() => updateRiskOverlays({ flood: '' as YesNo, bushfire: '' as YesNo })}
            className="btn-secondary text-sm"
          >
            Clear Flood/Bushfire
          </button>
          <button
            onClick={setAllOverlaysToNo}
            className="btn-secondary text-sm"
          >
            Set All Overlays to No
          </button>
        </div>

        <div className="space-y-6">
          {/* Zoning */}
          <ZoningDisplay />

          {/* Flood */}
          <div>
            <label className="label-field">Flood *</label>
            <div className="flex gap-4 items-start">
              <select
                value={riskOverlays.flood}
                onChange={(e) => handleOverlayChange('flood', e.target.value as YesNo)}
                className="input-field w-32"
                required
              >
                <option value="">-- Select --</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
              {riskOverlays.flood === 'Yes' && (
                <div className="flex-1">
                  <textarea
                    value={riskOverlays.floodDialogue || ''}
                    onChange={(e) => handleDialogueChange('floodDialogue', e.target.value)}
                    placeholder="Dialogue text (appears after 'Yes - ')"
                    className="input-field min-h-[80px] resize-y"
                    rows={3}
                    spellCheck={true}
                  />
                  {!riskOverlays.floodDialogue && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Warning: Flood is Yes but no dialogue provided. Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
            </div>
            <StashFieldDisplay field="floodRisk" />
          </div>

          {/* Bushfire */}
          <div>
            <label className="label-field">Bushfire *</label>
            <div className="flex gap-4 items-start">
              <select
                value={riskOverlays.bushfire}
                onChange={(e) => handleOverlayChange('bushfire', e.target.value as YesNo)}
                className="input-field w-32"
                required
              >
                <option value="">-- Select --</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
              {riskOverlays.bushfire === 'Yes' && (
                <div className="flex-1">
                  <textarea
                    value={riskOverlays.bushfireDialogue || ''}
                    onChange={(e) => handleDialogueChange('bushfireDialogue', e.target.value)}
                    placeholder="Dialogue text (appears after 'Yes - ')"
                    className="input-field min-h-[80px] resize-y"
                    rows={3}
                    spellCheck={true}
                  />
                  {!riskOverlays.bushfireDialogue && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Warning: Bushfire is Yes but no dialogue provided. Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
            </div>
            <StashFieldDisplay field="bushfireRisk" />
          </div>

          {/* Mining (Manual) */}
          <div>
            <label className="label-field">Mining (Manual Identification) *</label>
            <div className="flex gap-4 items-start">
              <select
                value={riskOverlays.mining}
                onChange={(e) => handleOverlayChange('mining', e.target.value as YesNo)}
                className="input-field w-32"
                required
              >
                <option value="">-- Select --</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
              {riskOverlays.mining === 'Yes' && (
                <div className="flex-1">
                  <textarea
                    value={riskOverlays.miningDialogue || ''}
                    onChange={(e) => handleDialogueChange('miningDialogue', e.target.value)}
                    placeholder="Dialogue text (appears after 'Yes - ')"
                    className="input-field min-h-[80px] resize-y"
                    rows={3}
                    spellCheck={true}
                  />
                  {!riskOverlays.miningDialogue && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Warning: Mining is Yes but no dialogue provided. Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Other Overlay (Manual) */}
          <div>
            <label className="label-field">Other (Overlay) (Manual Identification) *</label>
            <div className="flex gap-4 items-start">
              <select
                value={riskOverlays.otherOverlay}
                onChange={(e) => handleOverlayChange('otherOverlay', e.target.value as YesNo)}
                className="input-field w-32"
                required
              >
                <option value="">-- Select --</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
              {riskOverlays.otherOverlay === 'Yes' && (
                <div className="flex-1">
                  <textarea
                    value={riskOverlays.otherOverlayDialogue || ''}
                    onChange={(e) => handleDialogueChange('otherOverlayDialogue', e.target.value)}
                    placeholder="Dialogue text (appears after 'Yes - ')"
                    className="input-field min-h-[80px] resize-y"
                    rows={3}
                    spellCheck={true}
                  />
                  {!riskOverlays.otherOverlayDialogue && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Warning: Other Overlay is Yes but no dialogue provided. Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Special Infrastructure (Manual) */}
          <div>
            <label className="label-field">Special Infrastructure (Manual Identification) *</label>
            <div className="flex gap-4 items-start">
              <select
                value={riskOverlays.specialInfrastructure}
                onChange={(e) => handleOverlayChange('specialInfrastructure', e.target.value as YesNo)}
                className="input-field w-32"
                required
              >
                <option value="">-- Select --</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
              {riskOverlays.specialInfrastructure === 'Yes' && (
                <div className="flex-1">
                  <textarea
                    value={riskOverlays.specialInfrastructureDialogue || ''}
                    onChange={(e) => handleDialogueChange('specialInfrastructureDialogue', e.target.value)}
                    placeholder="Dialogue text (appears after 'Yes - ')"
                    className="input-field min-h-[80px] resize-y"
                    rows={3}
                    spellCheck={true}
                  />
                  {!riskOverlays.specialInfrastructureDialogue && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ Warning: Special Infrastructure is Yes but no dialogue provided. Are you sure you want to continue?
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Due Diligence Acceptance */}
          <div className="pt-4 border-t">
            <label className="label-field">Due Diligence Acceptance *</label>
            <select
              value={riskOverlays.dueDiligenceAcceptance}
              onChange={(e) => handleOverlayChange('dueDiligenceAcceptance', e.target.value as YesNo)}
              className="input-field"
              required
            >
              <option value="">-- Select --</option>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            {riskOverlays.dueDiligenceAcceptance === 'No' && (
              <p className="text-red-600 text-sm mt-2 font-semibold">
                ⚠️ Submission will be blocked if Due Diligence Acceptance is No
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Continue with Packaging Button - Show before fields */}
      {!packagingEnabled && (
        <div className="pt-6 border-t">
          <button
            onClick={handleContinueWithPackaging}
            disabled={!address.propertyAddress.trim() || riskOverlays.dueDiligenceAcceptance === 'No' || packagingEnabled}
            className="btn-primary w-full text-lg py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {packagingEnabled ? 'Fields Shown Below' : 'Continue with Packaging'}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            "Continue with Packaging" will enable the Sourcer and Selling Agent fields below
          </p>
        </div>
      )}

      {/* Sourcer and Selling Agent Fields - Show after clicking "Continue with Packaging" */}
      {packagingEnabled && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Deal Information</h3>
          <div className="space-y-4">
            {/* Sourcer Field */}
            <div>
              <label className="label-field">Sourcer *</label>
              <p className="text-xs text-gray-500 mb-2">Who found this deal?</p>
              <select
                value={sourcer || ''}
                onChange={(e) => updateFormData({ sourcer: e.target.value })}
                className="input-field"
                required
              >
                <option value="">-- Select Sourcer --</option>
                {sourcerOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selling Agent Fields */}
            <div>
              <label className="label-field">Selling Agent</label>
              <p className="text-xs text-gray-500 mb-2">
                Enter agent details (all fields optional - people are often unable to get this information)
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={sellingAgentName || ''}
                    onChange={(e) => updateFormData({ sellingAgentName: e.target.value })}
                    className="input-field"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={sellingAgentEmail || ''}
                    onChange={(e) => updateFormData({ sellingAgentEmail: e.target.value })}
                    className="input-field"
                    placeholder="john.smith@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Mobile</label>
                  <input
                    type="tel"
                    value={sellingAgentMobile || ''}
                    onChange={(e) => updateFormData({ sellingAgentMobile: e.target.value })}
                    className="input-field"
                    placeholder="0412 345 678"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Form and Proceed Buttons - Show below fields when packaging enabled */}
      {packagingEnabled && (
        <div className="pt-6 border-t flex gap-4">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
                const store = useFormStore.getState();
                store.resetForm();
                // Also clear Step 2 data
                store.clearStep2Data();
                setPackagingEnabled(false);
                if (typeof window !== 'undefined') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }
            }}
            className="btn-secondary flex-1"
          >
            Reset Form
          </button>
          <button
            onClick={handleProceedToStep2}
            className="btn-primary flex-1 text-lg py-3"
          >
            Proceed to Step 2
          </button>
        </div>
      )}
      
      {/* CMI Reports Notice */}
      {packagingEnabled && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>📁 CMI Reports:</strong> Please save CMI reports in the property folder. The folder will be created when you submit the form at the end.
          </p>
        </div>
      )}
    </div>
  );
}

