import { NextResponse } from 'next/server';
import axios from 'axios';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || '61cf69f5359f4d5197a72214a78164c9';
const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY || 'VfqDRW796v5jGTfXcHgJXDdoGi7DENZA';

// All categories in one call (corrected based on Geoapify API error)
const ALL_CATEGORIES = [
  'childcare.kindergarten',
  'education.school',
  'commercial.supermarket',
  'healthcare.hospital',
  'public_transport.train',
  'railway.train',
  'public_transport.bus',
  'beach',
  'airport',
  'populated_place.city',
  'childcare',
].join(',');

// Required amenities with counts and category matching
const REQUIRED_AMENITIES = [
  { type: 'kindergarten', count: 1, categories: ['childcare.kindergarten'] },
  { type: 'schools', count: 3, categories: ['education.school'] },
  { type: 'supermarkets', count: 2, categories: ['commercial.supermarket'] },
  { type: 'hospitals', count: 2, categories: ['healthcare.hospital'] },
  { type: 'train_station', count: 1, categories: ['public_transport.train', 'railway.train'] },
  { type: 'bus_stop', count: 1, categories: ['public_transport.bus'] },
  { type: 'beach', count: 1, categories: ['beach'] },
  { type: 'airport', count: 1, categories: ['airport'] },
  { type: 'child_daycare', count: 3, categories: ['childcare'] },
];

interface GeoapifyPlace {
  properties: {
    name: string;
    categories: string[];
    address_line1?: string;
    address_line2?: string;
    distance?: number;
    place_id?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
}

interface GeoapifyResponse {
  type: string;
  features: GeoapifyPlace[];
}

/**
 * Geocode address using Geoscape
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await axios.get('https://api.psma.com.au/v2/addresses/geocoder', {
      params: { address },
      headers: {
        'Authorization': GEOSCAPE_API_KEY,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const features = response.data?.data?.features || response.data?.features || [];
    if (features.length === 0) return null;

    const coords = features[0].geometry?.coordinates;
    if (!coords || coords.length < 2) return null;

    // Geoscape returns [lon, lat]
    return { lon: coords[0], lat: coords[1] };
  } catch (error) {
    console.error('Geoscape geocoding error:', error);
    return null;
  }
}

/**
 * Call Geoapify Places API - single call with all categories
 */
async function searchAllPlaces(
  lon: number,
  lat: number,
  radius: number = 50000,
  limit: number = 100
): Promise<GeoapifyPlace[]> {
  try {
    const filterStr = `circle:${lon},${lat},${radius}`;
    const biasStr = `proximity:${lon},${lat}`;
    const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(ALL_CATEGORIES)}&filter=${encodeURIComponent(filterStr)}&bias=${encodeURIComponent(biasStr)}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;
    
    console.log('Calling Geoapify API:', url.replace(GEOAPIFY_API_KEY, '***'));
    
    const response = await axios.get(url, {
      timeout: 15000,
    });

    const data: GeoapifyResponse = response.data;
    console.log(`Geoapify API call successful: ${data.features?.length || 0} features returned`);
    return data.features || [];
  } catch (error: any) {
    if (error.response?.status === 429) {
      // Rate limited - wait and retry once
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const filterStr = `circle:${lon},${lat},${radius}`;
        const biasStr = `proximity:${lon},${lat}`;
        const url = `https://api.geoapify.com/v2/places?categories=${encodeURIComponent(ALL_CATEGORIES)}&filter=${encodeURIComponent(filterStr)}&bias=${encodeURIComponent(biasStr)}&limit=${limit}&apiKey=${GEOAPIFY_API_KEY}`;
        const retryResponse = await axios.get(url, {
          timeout: 15000,
        });
        const retryData: GeoapifyResponse = retryResponse.data;
        return retryData.features || [];
      } catch (retryError) {
        console.error('Geoapify retry failed:', retryError);
        return [];
      }
    }
    console.error('Geoapify API error:', error);
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
      // Return error details in response for debugging
      throw new Error(`Geoapify API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Get property state from Geoscape geocoding result
 * This is a helper to determine which state the property is in
 */
async function getPropertyState(address: string): Promise<string | null> {
  try {
    const response = await axios.get('https://api.psma.com.au/v2/addresses/geocoder', {
      params: { address },
      headers: {
        'Authorization': GEOSCAPE_API_KEY,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const features = response.data?.data?.features || response.data?.features || [];
    if (features.length === 0) return null;

    const props = features[0].properties || {};
    return props.state || null;
  } catch (error) {
    console.error('Error getting property state:', error);
    return null;
  }
}

/**
 * Find capital cities from place.city results
 * Returns: closest overall + closest in same state
 */
function findCapitalCities(
  cityPlaces: GeoapifyPlace[],
  propertyState: string | null
): GeoapifyPlace[] {
  // Australian capital cities (for matching)
  const capitalCityNames = [
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 
    'Hobart', 'Darwin', 'Canberra'
  ];

  // Filter to capital cities only
  const capitalCities = cityPlaces.filter(place => {
    const name = place.properties.name?.toLowerCase() || '';
    return capitalCityNames.some(capital => name.includes(capital.toLowerCase()));
  });

  if (capitalCities.length === 0) return [];

  // Sort by distance
  const sorted = capitalCities
    .filter(p => p.properties.distance !== undefined)
    .sort((a, b) => (a.properties.distance || 0) - (b.properties.distance || 0));

  const results: GeoapifyPlace[] = [];

  // Always include closest overall
  if (sorted.length > 0) {
    results.push(sorted[0]);
  }

  // If we have state info, find closest in same state
  if (propertyState && sorted.length > 1) {
    // Try to match state (rough matching - may need refinement)
    const stateAbbrev = propertyState.toUpperCase().substring(0, 2);
    const stateMap: Record<string, string[]> = {
      'NS': ['sydney'],
      'VI': ['melbourne'],
      'QL': ['brisbane'],
      'WA': ['perth'],
      'SA': ['adelaide'],
      'TA': ['hobart'],
      'NT': ['darwin'],
      'AC': ['canberra'],
    };

    const stateCities = stateMap[stateAbbrev] || [];
    if (stateCities.length > 0) {
      const sameStateCity = sorted.find(place => {
        const name = place.properties.name?.toLowerCase() || '';
        return stateCities.some(city => name.includes(city));
      });
      if (sameStateCity && sameStateCity !== results[0]) {
        results.push(sameStateCity);
      }
    }
  }

  return results;
}

/**
 * Format distance and time for display
 */
function formatDistance(distanceMeters: number): { distance: string; time: string } {
  const km = distanceMeters / 1000;
  if (km < 1) {
    const meters = Math.round(distanceMeters);
    // Driving: ~50 km/h average in city = ~833 m/min
    const timeMins = Math.max(1, Math.round(meters / 833));
    return {
      distance: `${meters} m`,
      time: `${timeMins} min${timeMins !== 1 ? 's' : ''}`,
    };
  } else {
    const distanceStr = km.toFixed(1);
    // Driving time estimate: 
    // - City/suburban: ~50 km/h = 0.83 km/min
    // - Highway: ~100 km/h = 1.67 km/min
    // Use weighted average: 60% city (0.83), 40% highway (1.67) = ~1.2 km/min average
    const timeMins = Math.max(1, Math.round(km / 1.2));
    const hours = Math.floor(timeMins / 60);
    const mins = timeMins % 60;
    if (hours > 0) {
      return {
        distance: `${distanceStr} km`,
        time: `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`,
      };
    }
    return {
      distance: `${distanceStr} km`,
      time: `${timeMins} min${timeMins !== 1 ? 's' : ''}`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const { propertyAddress, latitude, longitude } = await request.json();

    let lat: number;
    let lon: number;

    // Get coordinates
    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
      console.log('Using provided coordinates:', lat, lon);
    } else if (propertyAddress) {
      console.log('Geocoding address:', propertyAddress);
      const coords = await geocodeAddress(propertyAddress);
      if (!coords) {
        console.error('Geocoding failed for:', propertyAddress);
        return NextResponse.json(
          { success: false, error: 'Could not geocode address' },
          { status: 400 }
        );
      }
      lat = coords.lat;
      lon = coords.lon;
      console.log('Geocoded to:', lat, lon);
    } else {
      return NextResponse.json(
        { success: false, error: 'Property address or coordinates required' },
        { status: 400 }
      );
    }

    // Get property state for capital city filtering
    const propertyState = propertyAddress ? await getPropertyState(propertyAddress) : null;

    // Single API call to get all places (50km radius for distant amenities like airports)
    const allPlaces = await searchAllPlaces(lon, lat, 50000, 100);
    console.log(`Geoapify returned ${allPlaces.length} places`);
    
    // Check for airports and train stations - search wider if not found
    const airportsFound = allPlaces.filter(p => p.properties.categories?.some((cat: string) => cat.includes('airport')));
    const trainsFound = allPlaces.filter(p => p.properties.categories?.some((cat: string) => cat.includes('train') || cat.includes('railway')));
    
    console.log(`Airports found: ${airportsFound.length}, Train stations found: ${trainsFound.length}`);
    if (airportsFound.length > 0) {
      console.log('Airport names:', airportsFound.map(p => p.properties.name).join(', '));
      console.log('Airport categories:', airportsFound[0].properties.categories);
    }
    
    // Search wider radius for airports if none found
    if (airportsFound.length === 0) {
      console.log('No airports found in 50km, searching 200km...');
      // Search ONLY for airports with larger radius
      const airportUrl = `https://api.geoapify.com/v2/places`;
      const airportParams = {
        categories: 'airport',
        filter: `circle:${lon},${lat},200000`,
        bias: `proximity:${lon},${lat}`,
        limit: 20,
        apiKey: GEOAPIFY_API_KEY,
      };
      try {
        const airportResponse = await axios.get(airportUrl, {
          params: airportParams,
          timeout: 15000,
        });
        const airportData: GeoapifyResponse = airportResponse.data;
        const distantAirports = airportData.features || [];
        allPlaces.push(...distantAirports);
        console.log(`Found ${distantAirports.length} airports in wider search:`, distantAirports.map(p => p.properties.name));
      } catch (error) {
        console.error('Error searching for airports:', error);
      }
    } else {
      console.log(`Airports already found in initial search: ${airportsFound.map(p => p.properties.name).join(', ')}`);
    }
    
    // Search wider for train stations if none found
    if (trainsFound.length === 0) {
      console.log('No train stations found in 50km, searching 100km...');
      const widerPlaces = await searchAllPlaces(lon, lat, 100000, 30);
      const distantTrains = widerPlaces.filter(p => p.properties.categories?.some((cat: string) => cat.includes('train') || cat.includes('railway')));
      allPlaces.push(...distantTrains);
      console.log(`Found ${distantTrains.length} train stations in wider search`);
    }

    // Group places by category (including airports/trains from wider search)
    const placesByCategory: Record<string, GeoapifyPlace[]> = {};
    const cityPlaces: GeoapifyPlace[] = [];

    for (const place of allPlaces) {
      const categories = place.properties.categories || [];
      
      // Check if it's a city (for capital city handling)
      if (categories.includes('populated_place.city')) {
        cityPlaces.push(place);
      }

      // Group by matching category
      for (const amenity of REQUIRED_AMENITIES) {
        for (const cat of amenity.categories) {
          // Check if any category matches (exact match or category contains the search term)
          const matches = categories.some((placeCat: string) => 
            placeCat === cat || 
            placeCat.includes(cat) || 
            cat.includes(placeCat)
          );
          if (matches) {
            if (!placesByCategory[amenity.type]) {
              placesByCategory[amenity.type] = [];
            }
            placesByCategory[amenity.type].push(place);
            break; // Only add once per place
          }
        }
      }
    }

    // Collect required amenities
    const allAmenities: Array<{
      name: string;
      distance: number;
      category: string;
      address?: string;
    }> = [];
    
    // Track road-named places for verification
    const roadNamedPlaces: Array<{name: string, categories: string[], amenityType: string}> = [];

    // Process each required amenity type
    for (const amenity of REQUIRED_AMENITIES) {
      const places = placesByCategory[amenity.type] || [];
      console.log(`${amenity.type}: found ${places.length} places in placesByCategory, need ${amenity.count}`);
      if (amenity.type === 'airport' && places.length === 0) {
        console.log('DEBUG: No airports in placesByCategory. Checking allPlaces for airports...');
        const allAirports = allPlaces.filter(p => p.properties.categories?.some((cat: string) => cat.includes('airport')));
        console.log(`DEBUG: Found ${allAirports.length} airports in allPlaces:`, allAirports.map(p => ({name: p.properties.name, categories: p.properties.categories})));
      }
      
      // If we don't have enough, log a warning
      if (places.length < amenity.count) {
        console.warn(`Warning: Only found ${places.length} ${amenity.type}, need ${amenity.count}`);
      }
      
      // Debug: log first few places if any found
      if (places.length > 0) {
        console.log(`Sample places for ${amenity.type}:`, places.slice(0, 3).map(p => ({
          name: p.properties.name,
          categories: p.properties.categories,
          distance: p.properties.distance
        })));
      }
      
      // Calculate distance if not provided by Geoapify
      const placesWithDistance = places.map(place => {
        let distance = place.properties.distance;
        if (!distance && place.geometry?.coordinates) {
          // Calculate distance using Haversine formula
          const R = 6371000; // Earth radius in meters
          const [lon1, lat1] = [lon, lat];
          const [lon2, lat2] = place.geometry.coordinates;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }
        return { ...place, calculatedDistance: distance || 0 };
      });
      
      // For supermarkets: prioritize major chains (Coles, Woolworths, ALDI, IGA)
      if (amenity.type === 'supermarkets') {
        const majorChains = ['coles', 'woolworths', 'aldi', 'iga'];
        placesWithDistance.sort((a, b) => {
          const aName = (a.properties.name || '').toLowerCase();
          const bName = (b.properties.name || '').toLowerCase();
          const aIsMajor = majorChains.some(chain => aName.includes(chain));
          const bIsMajor = majorChains.some(chain => bName.includes(chain));
          
          // Major chains first, then by distance
          if (aIsMajor && !bIsMajor) return -1;
          if (!aIsMajor && bIsMajor) return 1;
          return (a.calculatedDistance || 0) - (b.calculatedDistance || 0);
        });
      } else {
        // Sort by distance for other amenities
        placesWithDistance.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));
      }
      
      // Take required count
      const sorted = placesWithDistance.slice(0, amenity.count);

      for (const place of sorted) {
        let name = place.properties.name || '';
        const lowerName = name.toLowerCase();
        
        // Track road-named places to verify if they're bus stops
        const roadEndings = [' road', ' street', ' way', ' avenue', ' drive', ' circuit', ' lane', ' place', ' boulevard', ' crescent', ' close', ' court', ' terrace'];
        const looksLikeRoad = roadEndings.some(ending => lowerName.endsWith(ending)) && lowerName.length < 25;
        
        if (looksLikeRoad) {
          roadNamedPlaces.push({
            name: name,
            categories: place.properties.categories || [],
            amenityType: amenity.type
          });
        }
        
        // TEMPORARILY DISABLED: Skip if it's clearly just a road name (not a business/place)
        // BUT don't filter out bus stops or train stations (they're often named after roads)
        // const isBusOrTrain = place.properties.categories?.some((cat: string) => 
        //   cat.includes('bus') || cat.includes('train') || cat.includes('railway')
        // );
        // 
        // const isJustRoad = !isBusOrTrain && // Don't filter if it's a bus/train stop
        //                   roadEndings.some(ending => lowerName.endsWith(ending)) &&
        //                   lowerName.length < 25 && // Short names are more likely to be just roads
        //                   !lowerName.includes('school') &&
        //                   !lowerName.includes('hospital') &&
        //                   !lowerName.includes('shop') &&
        //                   !lowerName.includes('store') &&
        //                   !lowerName.includes('centre') &&
        //                   !lowerName.includes('center') &&
        //                   !lowerName.includes('academy') &&
        //                   !lowerName.includes('clinic') &&
        //                   !lowerName.includes('medical') &&
        //                   !lowerName.includes('supermarket') &&
        //                   !lowerName.includes('aldi') &&
        //                   !lowerName.includes('coles') &&
        //                   !lowerName.includes('woolworths');
        // 
        // if (isJustRoad) {
        //   // Skip this - it's just a road, not a place
        //   continue;
        // }
        
        // Use name, or fallback to address, or category
        if (!name || name.trim() === '') {
          name = place.properties.address_line1 || 
                 place.properties.address_line2 ||
                 `${amenity.type} (${place.properties.categories?.[0] || 'unknown'})`;
        }
        
        // Clean up fallback names like "beach (beach)" - just use the category
        if (name.includes(`(${amenity.type})`)) {
          name = amenity.type.charAt(0).toUpperCase() + amenity.type.slice(1).replace('_', ' ');
        }
        
        allAmenities.push({
          name: name.trim(),
          distance: place.calculatedDistance || 0,
          category: amenity.type,
          address: place.properties.address_line1,
        });
      }
    }
    
    console.log(`Total amenities collected: ${allAmenities.length}`);

    // Handle capital cities (closest overall + closest in same state)
    const capitalCities = findCapitalCities(cityPlaces, propertyState);
    for (const city of capitalCities) {
      const cityName = city.properties.name || 
                      city.properties.address_line1 || 
                      'City';
      allAmenities.push({
        name: cityName,
        distance: city.properties.distance || 0,
        category: 'capital_city',
        address: city.properties.address_line1,
      });
    }

    // Sort all amenities by distance
    allAmenities.sort((a, b) => a.distance - b.distance);

    // Format output
    const formattedLines: string[] = [];
    
    // Add property address if provided
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    // Add amenities with distance and time
    for (const amenity of allAmenities) {
      const { distance, time } = formatDistance(amenity.distance);
      formattedLines.push(`${distance} (${time}), ${amenity.name}`);
    }

    // If no amenities found, return error instead of empty result
    if (allAmenities.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No amenities found',
        debug: {
          totalPlacesFromGeoapify: allPlaces.length,
          amenitiesByType: Object.keys(placesByCategory).reduce((acc, key) => {
            acc[key] = placesByCategory[key].length;
            return acc;
          }, {} as Record<string, number>),
          samplePlaces: allPlaces.slice(0, 5).map(p => ({
            name: p.properties.name,
            categories: p.properties.categories
          }))
        }
      }, { status: 500 });
    }

    // Debug: Include filtered road names to verify if they were bus stops
    const filteredRoads = allPlaces.filter(place => {
      const name = (place.properties.name || '').toLowerCase();
      const roadEndings = [' road', ' street', ' way', ' avenue', ' drive', ' circuit', ' lane', ' place', ' boulevard', ' crescent', ' close', ' court', ' terrace'];
      return roadEndings.some(ending => name.endsWith(ending)) && name.length < 25;
    }).map(p => ({
      name: p.properties.name,
      categories: p.properties.categories,
      wasFiltered: true
    }));

    return NextResponse.json({
      success: true,
      proximity: formattedLines.join('\n'),
      amenities: allAmenities,
      coordinates: { lat, lon },
      debug: process.env.NODE_ENV === 'development' ? {
        roadNamedPlaces: roadNamedPlaces // Show road-named places with their categories
      } : undefined,
    });
  } catch (error) {
    console.error('Error in Geoapify proximity API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get proximity data';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}
