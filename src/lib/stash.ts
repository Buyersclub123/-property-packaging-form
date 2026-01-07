// Flexible Stash Property API Integration
// This can be easily updated when we know the actual response structure

import axios from 'axios';
import { StashResponse, YesNo } from '@/types/form';

// Configuration - Easy to update after testing
const CONFIG = {
  webhookUrl: process.env.NEXT_PUBLIC_STASH_WEBHOOK_URL || 'https://hook.eu1.make.com/gsova3xd6kwrckiw3j5js2twfgu1i885',
  timeout: 30000, // 30 seconds
  retries: 2,
  // Field mapping - will be updated after testing actual response
  fieldMapping: {
    flood: ['floodRisk', 'floodingRisk', 'flood'],
    bushfire: ['bushfireRisk', 'bushfire'],
    zoning: ['zoning'],
    zone: ['zone'],
    zoneDesc: ['zoneDesc', 'zone_desc'],
    lga: ['lga', 'LGA'],
    state: ['state', 'State'],
    latitude: ['latitude', 'lat'],
    longitude: ['longitude', 'lon'],
  },
};

/**
 * Call Stash Property API webhook
 */
export async function getStashData(address: string): Promise<StashResponse> {
  try {
    const response = await axios.post(
      CONFIG.webhookUrl,
      { property_address: address },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: CONFIG.timeout,
      }
    );

    // Log full response for debugging
    console.log('=== STASH API RESPONSE ===');
    console.log('Status:', response.status);
    console.log('Data Type:', typeof response.data);
    console.log('Is Array:', Array.isArray(response.data));
    console.log('Raw Data:', JSON.stringify(response.data, null, 2));
    console.log('Full Response Object:', response);
    console.log('Response Headers:', response.headers);
    console.log('========================');
    
    // Parse response - flexible structure handling
    return parseStashResponse(response.data);
  } catch (error: any) {
    console.error('Stash API Error:', error);
    console.error('Error Response:', error.response?.data);
    console.error('Error Status:', error.response?.status);
    
    // Return error response - form can continue with manual entry
    return {
      error: true,
      errorMessage: 'Unable to retrieve property data. Please check the address and try again, or continue with manual entry.',
      floodRisk: '' as YesNo,
      bushfireRisk: '' as YesNo,
      rawStashData: error.response?.data || error.message, // Include error response for debugging
    };
  }
}

/**
 * Parse Stash API response - flexible structure handling
 * Can be easily updated when we know actual response structure
 */
function parseStashResponse(data: any): StashResponse {
  // Log the raw response for debugging
  console.log('=== STASH PARSER DEBUG ===');
  console.log('Raw Response Type:', typeof data);
  console.log('Is Array:', Array.isArray(data));
  console.log('Raw Response:', JSON.stringify(data, null, 2));
  console.log('==========================');
  
  // Handle different response structures
  // Response might be direct object, wrapped in array, or nested
  
  let responseData = data;
  
    // If response is just a number or string "7" (module reference), return error
    if (typeof data === 'number' || (typeof data === 'string' && data.trim() === '7')) {
      return {
        error: true,
        errorMessage: 'Unable to retrieve property data. Please check the address and try again, or continue with manual entry.',
        floodRisk: '' as YesNo,
        bushfireRisk: '' as YesNo,
        rawStashData: data, // Include raw data for debugging
      };
    }
  
  // Handle string responses that might be JSON
  if (typeof data === 'string') {
    // Try to parse as JSON
    try {
      responseData = JSON.parse(data);
      console.log('Parsed JSON string:', responseData);
    } catch (e) {
      // Not JSON - keep as string, extraction logic will handle it
      console.log('String is not JSON, keeping as string for extraction');
      responseData = data;
    }
  }
  
  // Handle array responses - Make.com webhook might return array
  if (Array.isArray(data) && data.length > 0) {
    console.log('Response is array, using first element');
    const firstElement = data[0];
    
    // Make.com Code modules return data in a "result" property
    if (firstElement?.result) {
      console.log('Found result property in first element');
      responseData = firstElement.result;
    } else {
      responseData = firstElement;
    }
  }
  
  // Handle Make.com webhook response - Module 8 might wrap Module 7 output
  // Check if data is wrapped in common Make.com structures
  if (responseData && typeof responseData === 'object') {
    // Try common Make.com response wrappers
    if (responseData.body) {
      console.log('Found body wrapper, unwrapping');
      const bodyData = typeof responseData.body === 'string' ? JSON.parse(responseData.body) : responseData.body;
      responseData = bodyData;
    } else if (responseData.data) {
      console.log('Found data wrapper, unwrapping');
      if (Array.isArray(responseData.data) && responseData.data.length > 0) {
        responseData = responseData.data[0];
      } else {
        responseData = responseData.data;
      }
    }
  }
  
  // Handle nested data structures (duplicate check removed, but keep one)
  if (responseData?.data && typeof responseData.data === 'object') {
    console.log('Found nested data structure, unwrapping');
    if (Array.isArray(responseData.data) && responseData.data.length > 0) {
      responseData = responseData.data[0];
    } else {
      responseData = responseData.data;
    }
  }
  
  console.log('Final responseData structure:', {
    hasFloodRisk: !!responseData?.floodRisk,
    hasBushfireRisk: !!responseData?.bushfireRisk,
    hasZoning: !!responseData?.zoning,
    hasZone: !!responseData?.zone,
    hasLGA: !!responseData?.lga,
    keys: Object.keys(responseData || {}),
    fullResponse: responseData,
  });
  
  // Check for property info fields
  const propertyInfoKeys = ['bedrooms', 'beds', 'bathrooms', 'baths', 'carSpaces', 'car', 'garage', 'carport', 
                            'landSize', 'lotSize', 'yearBuilt', 'year', 'title', 'propertyType'];
  const foundPropertyInfo = propertyInfoKeys.filter(key => 
    responseData && (responseData[key] !== undefined || responseData[key.toLowerCase()] !== undefined)
  );
  if (foundPropertyInfo.length > 0 || responseData?.property) {
    console.log('=== PROPERTY INFO FOUND IN STASH ===');
    console.log('Property info keys found:', foundPropertyInfo);
    if (responseData?.property) {
      console.log('Property object:', responseData.property);
      console.log('Property object keys:', Object.keys(responseData.property || {}));
    }
    // Log all keys that might contain property info
    const allKeys = Object.keys(responseData || {});
    const propertyRelatedKeys = allKeys.filter(key => 
      /bed|bath|car|garage|land|lot|year|title|property|size|built/i.test(key)
    );
    console.log('All property-related keys:', propertyRelatedKeys);
    propertyRelatedKeys.forEach(key => {
      console.log(`  ${key}:`, responseData[key]);
    });
    console.log('=====================================');
  }
  
  // Make.com Module 7 returns fields directly at top level
  // Extract fields directly from responseData (Make.com format)
  // If responseData is invalid/empty, return empty fields (not error) - allows form to continue
  const result: StashResponse = {
    // Always set error to false - form can continue without Stash data
    error: false,
    // Risk overlays - Make.com returns these as "Yes"/"No" strings
    // Return empty string if no data (not "No") - allows form to work without Stash data
    floodRisk: (responseData?.floodRisk || responseData?.floodingRisk || '') as YesNo,
    floodingRisk: (responseData?.floodRisk || responseData?.floodingRisk || '') as YesNo,
    flooding: responseData?.flooding || '',
    bushfireRisk: (responseData?.bushfireRisk || '') as YesNo,
    bushfire: responseData?.bushfire || '',
    
    // Zoning - Make.com returns zone, zoneDesc, and formatted zoning
    zone: responseData?.zone || '',
    zoneDesc: responseData?.zoneDesc || '',
    zoning: responseData?.zoning || (responseData?.zone && responseData?.zoneDesc 
      ? `${responseData.zone} (${responseData.zoneDesc})`
      : responseData?.zone || responseData?.zoneDesc || ''),
    
    // Location - Make.com returns these directly
    lga: responseData?.lga || '',
    state: responseData?.state || '',
    lgaPid: responseData?.lgaPid || '',
    
    // Geocoded address components (from Module 4 geocoding - should be passed through by Module 7)
    streetNumber: responseData?.streetNumber || responseData?.street_number || '',
    streetName: responseData?.streetName || responseData?.street_name || '',
    suburbName: responseData?.suburbName || responseData?.suburb_name || responseData?.localityName || responseData?.locality_name || '',
    suburb: responseData?.suburbName || responseData?.suburb_name || responseData?.localityName || responseData?.locality_name || '',
    postCode: responseData?.postCode || responseData?.postcode || responseData?.post_code || '',
    postcode: responseData?.postCode || responseData?.postcode || responseData?.post_code || '',
    
    // Coordinates - from Module 4/9 (geocoder)
    latitude: responseData?.latitude as number | undefined,
    longitude: responseData?.longitude as number | undefined,
    coordinates: responseData?.coordinates,
    
    // Geocoded address (corrected/validated address from geocoding)
    geocodedAddress: responseData?.geocodedAddress || responseData?.formattedAddress || responseData?.address,
    
    // Other fields
    lotSizeMin: responseData?.lotSizeMin || '',
    lotSizeAvg: responseData?.lotSizeAvg || '',
    planningLinks: responseData?.planningLinks || [],
    
    // Property Info (from Stash)
    bedrooms: responseData?.bedrooms || '',
    bathrooms: responseData?.bathrooms || '',
    carSpaces: responseData?.carSpaces || '',
    landSize: responseData?.landSize || '',
    yearBuilt: responseData?.yearBuilt || '',
    title: responseData?.title || '',
    
    // Raw data for debugging and future use
    rawStashData: responseData,
    rawHazards: responseData?.rawHazards || responseData?.hazards,
    rawSources: responseData?.rawSources || responseData?.sources,
  };
  
  // Normalize Yes/No values - Make.com already returns "Yes"/"No" but ensure consistency
  // Only normalize if we have a value - keep empty string if no data
  if (result.floodRisk && typeof result.floodRisk === 'string' && result.floodRisk.trim() !== '') {
    const normalized = result.floodRisk.charAt(0).toUpperCase() + result.floodRisk.slice(1).toLowerCase();
    result.floodRisk = (normalized === 'Yes' || normalized === 'No') ? normalized as YesNo : '';
  } else if (!result.floodRisk) {
    result.floodRisk = '';
  }
  
  if (result.bushfireRisk && typeof result.bushfireRisk === 'string' && result.bushfireRisk.trim() !== '') {
    const normalized = result.bushfireRisk.charAt(0).toUpperCase() + result.bushfireRisk.slice(1).toLowerCase();
    result.bushfireRisk = (normalized === 'Yes' || normalized === 'No') ? normalized as YesNo : '';
  } else if (!result.bushfireRisk) {
    result.bushfireRisk = '';
  }
  
  // Only set error if we truly have no useful data
  // If we got "Accepted" or empty response, don't set error - just return empty fields
  if (typeof data === 'string' && (data.trim() === 'Accepted' || data.trim() === 'OK' || data.trim() === 'Success')) {
    // Don't set error - just return empty fields so form can continue
    result.error = false;
  } else if (!responseData || (typeof responseData === 'object' && Object.keys(responseData).length === 0)) {
    // Empty response - don't set error, just return empty fields
    result.error = false;
  }
  
  // Log what we extracted for debugging
  console.log('Parsed Stash Response:', {
    floodRisk: result.floodRisk,
    bushfireRisk: result.bushfireRisk,
    zoning: result.zoning,
    lga: result.lga,
    state: result.state,
  });
  
  return result;
}

/**
 * Extract field from response using multiple possible field names
 */
function extractField(data: any, fieldNames: string[]): any {
  if (!data || typeof data !== 'object') {
    return undefined;
  }
  
  for (const fieldName of fieldNames) {
    // Handle nested paths (e.g., "data.features[0].geometry")
    const parts = fieldName.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value === null || value === undefined) {
        break;
      }
      
      // Handle array indices
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        value = value[arrayName]?.[parseInt(index)];
      } else {
        value = value[part];
      }
    }
    
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  
  return undefined;
}

/**
 * Update field mapping configuration
 * Call this after testing to update with actual field names
 */
export function updateFieldMapping(mapping: Partial<typeof CONFIG.fieldMapping>) {
  Object.assign(CONFIG.fieldMapping, mapping);
}

