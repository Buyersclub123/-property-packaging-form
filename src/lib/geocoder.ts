// Geoscape Geocoder API Integration
// Used to validate addresses and get corrected suggestions

import axios from 'axios';

const GEOSCAPE_CONFIG = {
  apiUrl: 'https://api.psma.com.au/v2/addresses/geocoder',
  apiKey: process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY || 'VfqDRW796v5jGTfXcHgJXDdoGi7DENZA',
  timeout: 10000,
};

export interface GeocodeSuggestion {
  address: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  confidence?: number;
  matchType?: string;
  // Address components from Geoscape
  streetNumber?: string;
  streetName?: string;
  suburbName?: string;
  state?: string;
  postCode?: string;
  lga?: string; // Local Government Area
}

export interface GeocodeResponse {
  suggestions: GeocodeSuggestion[];
  exactMatch: boolean;
  bestMatch?: GeocodeSuggestion;
}

/**
 * Geocode an address and return suggestions
 */
export async function geocodeAddress(address: string): Promise<GeocodeResponse> {
  try {
    const response = await axios.get(GEOSCAPE_CONFIG.apiUrl, {
      params: {
        address: address,
      },
      headers: {
        'Authorization': GEOSCAPE_CONFIG.apiKey,
        'Accept': 'application/json',
      },
      timeout: GEOSCAPE_CONFIG.timeout,
    });

    console.log('Geoscape API Response:', response.data);

    // Parse Geoscape response
    const data = response.data;
    
    // Geoscape returns features array
    const features = data?.data?.features || data?.features || [];
    
    if (features.length === 0) {
      return {
        suggestions: [],
        exactMatch: false,
      };
    }

    // Extract suggestions from features
    const suggestions: GeocodeSuggestion[] = features.map((feature: any, index: number) => {
      const props = feature.properties || {};
      const coords = feature.geometry?.coordinates || [];
      
      // Try to get formatted address from various possible fields
      const formattedAddr = props.formattedAddress || 
                           props.fullAddress || 
                           props.address || 
                           props.name ||
                           address;
      
      // Extract address components from Geoscape response
      // Geoscape returns: localityName (suburb), stateTerritory (state), postcode, lgaName (LGA)
      const suburbName = props.localityName || props.locality_name || '';
      const state = props.stateTerritory || props.state_territory || '';
      const postCode = props.postcode || props.post_code || '';
      const lga = props.lgaName || props.lga_name || props.localGovernmentArea || props.local_government_area || '';
      
      // Try to extract street number, name, and type from formatted address or properties
      let streetNumber = '';
      let streetName = '';
      let streetType = '';
      
      // Check if street components are in properties
      if (props.streetNumber || props.street_number) {
        streetNumber = props.streetNumber || props.street_number;
      }
      if (props.streetName || props.street_name || props.street) {
        streetName = props.streetName || props.street_name || props.street;
      }
      if (props.streetType || props.street_type || props.streetSuffix) {
        streetType = props.streetType || props.street_type || props.streetSuffix;
      }
      
      // If not in properties, try parsing formatted address
      // Pattern: "123 Street Name ST Suburb State 1234" or "123 Street Name, Suburb State 1234"
      if (!streetNumber || !streetName) {
        // Common Australian street type abbreviations
        const streetTypePattern = /\b(ST|STREET|AVE|AVENUE|RD|ROAD|DR|DRIVE|CT|COURT|CCT|CIRCUIT|PL|PLACE|WAY|LN|LANE|CRES|CRESCENT|TERRACE|TCE|BLVD|BOULEVARD|CLOSE|CL|GROVE|GR|PDE|PARADE|SQ|SQUARE)\b/i;
        
        // Try comma-separated format first: "123 Street Name ST, Suburb State 1234"
        let addressMatch = formattedAddr.match(/^(\d+)\s+(.+?),\s*(.+?)(?:\s+([A-Z]{2,3}))?(?:\s+(\d+))?$/i);
        
        if (addressMatch) {
          streetNumber = streetNumber || addressMatch[1] || '';
          // Keep the full street name including type (e.g., "Osborne CCT")
          streetName = addressMatch[2].trim();
        } else {
          // Try space-separated format: "123 Street Name ST Suburb State 1234"
          // Need to find where suburb starts (before state)
          const parts = formattedAddr.split(/\s+/);
          if (parts.length >= 4) {
            streetNumber = streetNumber || parts[0] || '';
            // Find state (2-3 uppercase letters)
            let stateIndex = -1;
            for (let i = parts.length - 1; i >= 0; i--) {
              if (/^[A-Z]{2,3}$/.test(parts[i])) {
                stateIndex = i;
                break;
              }
            }
            if (stateIndex > 1) {
              // Everything between street number and state is street name (including type)
              streetName = parts.slice(1, stateIndex).join(' ');
            }
          }
        }
      }
      
      // Ensure street type is included in street name (don't separate them)
      // Street name should be like "Osborne Circuit" or "Barker Street"
      
      return {
        address: formattedAddr,
        formattedAddress: formattedAddr,
        latitude: coords[1] || null,
        longitude: coords[0] || null,
        confidence: props.confidence || props.matchScore || (index === 0 ? 100 : 80),
        matchType: props.matchType || (index === 0 ? 'exact' : 'fuzzy'),
        streetNumber,
        streetName,
        suburbName,
        state,
        postCode,
        lga,
      };
    });

    // Check if first result matches the input exactly (case-insensitive, normalized)
    const bestMatch = suggestions[0];
    const normalizedInput = address.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedMatch = bestMatch.formattedAddress.toLowerCase().trim().replace(/\s+/g, ' ');
    const exactMatch = normalizedInput === normalizedMatch;

    console.log('Address comparison:', {
      input: normalizedInput,
      match: normalizedMatch,
      exactMatch,
      suggestionsCount: suggestions.length,
    });

    return {
      suggestions,
      exactMatch,
      bestMatch,
    };
  } catch (error: any) {
    console.error('Geocoding error:', error);
    return {
      suggestions: [],
      exactMatch: false,
    };
  }
}

/**
 * Look up LGA (Local Government Area) from suburb and state
 */
export async function lookupLGA(suburb: string, state: string): Promise<string | null> {
  try {
    if (!suburb || !state) {
      return null;
    }

    // Use Geoscape geocoder with suburb and state
    const query = `${suburb}, ${state}`;
    const response = await axios.get(GEOSCAPE_CONFIG.apiUrl, {
      params: {
        address: query,
      },
      headers: {
        'Authorization': GEOSCAPE_CONFIG.apiKey,
        'Accept': 'application/json',
      },
      timeout: GEOSCAPE_CONFIG.timeout,
    });

    console.log('LGA Lookup API Response (full):', JSON.stringify(response.data, null, 2));

    const data = response.data;
    const features = data?.data?.features || data?.features || [];
    
    if (features.length === 0) {
      console.log('No features found in LGA lookup response');
      return null;
    }

    // Get LGA from first result - check multiple possible field names
    const firstFeature = features[0];
    const props = firstFeature.properties || {};
    
    // Log all properties to see what's available
    console.log('LGA Lookup - All properties:', Object.keys(props));
    console.log('LGA Lookup - Feature properties:', props);
    
    // Try various possible LGA field names
    const lga = props.lgaName || 
                props.lga_name || 
                props.localGovernmentArea || 
                props.local_government_area ||
                props.lga ||
                props.localGovernment ||
                props.council ||
                props.councilName ||
                props.municipality ||
                null;

    console.log('LGA Lookup - Extracted LGA:', lga);

    if (!lga) {
      // If no LGA found, log the available properties for debugging
      console.warn('LGA not found in response. Available properties:', Object.keys(props));
      console.warn('Sample property values:', {
        localityName: props.localityName,
        stateTerritory: props.stateTerritory,
        postcode: props.postcode,
        // Check for any property that might contain LGA info
        allProps: props
      });
    }

    return lga;
  } catch (error: any) {
    console.error('LGA lookup error:', error);
    if (error.response) {
      console.error('LGA lookup API error response:', error.response.data);
    }
    return null;
  }
}

