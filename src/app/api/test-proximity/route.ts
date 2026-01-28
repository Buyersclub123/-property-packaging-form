import { NextResponse } from 'next/server';
import axios from 'axios';
import { geocodeAddress } from '@/lib/geocoder';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const GEOAPIFY_API_BASE_URL = process.env.GEOAPIFY_API_BASE_URL || 'https://api.geoapify.com/v2/places';

if (!GEOAPIFY_API_KEY) {
  throw new Error('GEOAPIFY_API_KEY environment variable is required');
}

/**
 * Haversine formula to calculate distance between two coordinates
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Categories we're looking for - each should get 10 results
 */
const REQUESTED_CATEGORIES = [
  'public_transport.train',
  'public_transport.tram',
  'public_transport.bus',
  'childcare.kindergarten',
  'childcare',
  'education.school',
  'commercial.supermarket',
  'healthcare.hospital',
];

const COMBINED_CATEGORIES = REQUESTED_CATEGORIES.join(',');

// Hardcoded lists for airports and cities (same as production)
interface Airport {
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  group: 1 | 2 | 3;
}

interface City {
  name: string;
  state: string;
  address: string;
  latitude: number;
  longitude: number;
  group: 1 | 2 | 3;
}

const AUSTRALIAN_AIRPORTS: Airport[] = [
  { name: 'Sydney Kingsford Smith Airport', code: 'SYD', address: 'Sydney Airport NSW 2020, Australia', latitude: -33.9399, longitude: 151.1753, group: 1 },
  { name: 'Melbourne Airport', code: 'MEL', address: 'Melbourne Airport VIC 3045, Australia', latitude: -37.6733, longitude: 144.8433, group: 1 },
  { name: 'Brisbane Airport', code: 'BNE', address: 'Brisbane Airport QLD 4008, Australia', latitude: -27.3842, longitude: 153.1171, group: 1 },
  { name: 'Perth Airport', code: 'PER', address: 'Perth Airport WA 6105, Australia', latitude: -31.9402, longitude: 115.9669, group: 1 },
  { name: 'Adelaide Airport', code: 'ADL', address: 'Adelaide Airport SA 5950, Australia', latitude: -34.9455, longitude: 138.5306, group: 1 },
  { name: 'Cairns Airport', code: 'CNS', address: 'Cairns Airport QLD 4870, Australia', latitude: -16.8858, longitude: 145.7553, group: 1 },
  { name: 'Darwin International Airport', code: 'DRW', address: 'Darwin Airport NT 0820, Australia', latitude: -12.4083, longitude: 130.8727, group: 1 },
  { name: 'Gold Coast Airport', code: 'OOL', address: 'Gold Coast Airport QLD 4218, Australia', latitude: -28.1644, longitude: 153.5047, group: 2 },
  { name: 'Sunshine Coast Airport', code: 'MCY', address: 'Sunshine Coast Airport QLD 4564, Australia', latitude: -26.6033, longitude: 153.0911, group: 2 },
  { name: 'Canberra Airport', code: 'CBR', address: 'Canberra Airport ACT 2609, Australia', latitude: -35.3069, longitude: 149.1950, group: 2 },
  { name: 'Hobart International Airport', code: 'HBA', address: 'Hobart Airport TAS 7170, Australia', latitude: -42.8361, longitude: 147.5103, group: 2 },
];

const AUSTRALIAN_CITIES: City[] = [
  { name: 'Melbourne', state: 'Victoria', address: 'Melbourne VIC, Australia', latitude: -37.8136, longitude: 144.9631, group: 1 },
  { name: 'Sydney', state: 'New South Wales', address: 'Sydney NSW, Australia', latitude: -33.8688, longitude: 151.2093, group: 1 },
  { name: 'Brisbane', state: 'Queensland', address: 'Brisbane QLD, Australia', latitude: -27.4698, longitude: 153.0251, group: 1 },
  { name: 'Perth', state: 'Western Australia', address: 'Perth WA, Australia', latitude: -31.9505, longitude: 115.8605, group: 1 },
  { name: 'Adelaide', state: 'South Australia', address: 'Adelaide SA, Australia', latitude: -34.9285, longitude: 138.6007, group: 1 },
  { name: 'Canberra', state: 'Australian Capital Territory', address: 'Canberra ACT, Australia', latitude: -35.2809, longitude: 149.1300, group: 1 },
  { name: 'Hobart', state: 'Tasmania', address: 'Hobart TAS, Australia', latitude: -42.8821, longitude: 147.3272, group: 1 },
  { name: 'Gold Coast', state: 'Queensland', address: 'Gold Coast QLD, Australia', latitude: -28.0167, longitude: 153.4000, group: 2 },
  { name: 'Sunshine Coast', state: 'Queensland', address: 'Sunshine Coast QLD, Australia', latitude: -26.6500, longitude: 153.0667, group: 2 },
];

export async function POST(request: Request) {
  try {
    const { propertyAddress } = await request.json();

    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    // Step 1: Geocode address using Geoscape
    const geocodeResult = await geocodeAddress(propertyAddress);
    
    if (!geocodeResult.bestMatch) {
      return NextResponse.json(
        { success: false, error: 'Could not geocode address' },
        { status: 400 }
      );
    }

    const lat = geocodeResult.bestMatch.latitude;
    const lon = geocodeResult.bestMatch.longitude;

    // Step 2: Single Geoapify call combining all categories
    // NO FILTERS - using bias only for location (not a filter, just tells Geoapify where to search)
    const params = new URLSearchParams({
      categories: COMBINED_CATEGORIES,
      limit: '500', // Maximum results per call (Geoapify allows up to 500)
      apiKey: GEOAPIFY_API_KEY!,
    });
    
    // Use bias to specify location (required by Geoapify) - this is not a filter, just location context
    const biasStr = `proximity:${lon},${lat}`;
    const url = `${GEOAPIFY_API_BASE_URL}?${params.toString()}&bias=${biasStr}`;
    
    let geoapifyResponse;
    try {
      geoapifyResponse = await axios.get(url, { timeout: 30000 });
    } catch (error: any) {
      console.error('Geoapify API error:', error.response?.data || error.message);
      throw new Error(`Geoapify API error: ${error.response?.status} - ${JSON.stringify(error.response?.data || error.message)}`);
    }
    let features = geoapifyResponse.data.features || [];
    
    // Second API call JUST for hospitals to get more results
    const hospitalParams = new URLSearchParams({
      categories: 'healthcare.hospital',
      limit: '500',
      apiKey: GEOAPIFY_API_KEY!,
    });
    const hospitalBiasStr = `proximity:${lon},${lat}`;
    const hospitalUrl = `${GEOAPIFY_API_BASE_URL}?${hospitalParams.toString()}&bias=${hospitalBiasStr}`;
    
    let hospitalCount = 0;
    let hospitalAdded = 0;
    try {
      const hospitalResponse = await axios.get(hospitalUrl, { timeout: 30000 });
      const hospitalFeatures = hospitalResponse.data.features || [];
      hospitalCount = hospitalFeatures.length;
      
      // Merge hospital results with main results (deduplicate by place_id)
      const existingPlaceIds = new Set(features.map((f: any) => f.properties?.place_id).filter(Boolean));
      hospitalFeatures.forEach((f: any) => {
        if (!existingPlaceIds.has(f.properties?.place_id)) {
          features.push(f);
          existingPlaceIds.add(f.properties?.place_id);
          hospitalAdded++;
        }
      });
      
      console.log(`Second API call (hospitals only): ${hospitalCount} total features, ${hospitalAdded} new features added`);
    } catch (error: any) {
      console.error('Hospital API call error:', error.response?.data || error.message);
      // Continue with main results if hospital call fails
    }

    // Step 3: Calculate Haversine distances and organize by category
    // Initialize all requested categories
    const resultsByCategory: Record<string, Array<{
      name: string;
      address?: string;
      distance: number; // Haversine distance in meters
      coordinates: { lat: number; lon: number };
      place_id?: string;
      categories: string[];
    }>> = {};

    REQUESTED_CATEGORIES.forEach(cat => {
      resultsByCategory[cat] = [];
    });

    // Debug: Collect all unique categories from Geoapify to see what we're getting
    const allCategories = new Set<string>();
    const tramFeatures: Array<{name: string, categories: string[], distance: number}> = [];
    const publicTransportOnlyFeatures: Array<{name: string, categories: string[], distance: number}> = [];
    
    features.forEach((feature: any) => {
      const cats = feature.properties?.categories || [];
      cats.forEach((cat: string) => allCategories.add(cat));
    });

    features.forEach((feature: any) => {
      const coords = feature.geometry?.coordinates;
      if (!coords || coords.length < 2) return;

      const placeLat = coords[1];
      const placeLon = coords[0];
      
      // Calculate Haversine distance
      const distance = haversineDistance(lat, lon, placeLat, placeLon);
      
      // Get categories from feature
      const featureCategories = feature.properties?.categories || [];
      const name = feature.properties?.name || feature.properties?.address_line1 || 'Unknown';
      const address = feature.properties?.address_line1 || feature.properties?.formatted || '';
      
      // Debug: Collect tram-related features
      if (featureCategories.some((cat: string) => cat.toLowerCase().includes('tram'))) {
        tramFeatures.push({ name, categories: featureCategories, distance });
      }
      
      // Debug: Check for features with only "public_transport" (no subtype) - might be trams
      const hasPublicTransport = featureCategories.includes('public_transport');
      const hasSubtype = featureCategories.some((cat: string) => 
        cat.startsWith('public_transport.') && cat !== 'public_transport'
      );
      if (hasPublicTransport && !hasSubtype && distance < 100) {
        publicTransportOnlyFeatures.push({ name, categories: featureCategories, distance });
      }
      
      // Check which of our requested categories this feature matches
      // A feature can match multiple categories, so add it to each matching bucket
      REQUESTED_CATEGORIES.forEach(requestedCat => {
        // Check if feature matches this category (exact match or starts with)
        const matches = featureCategories.some((fc: string) => {
          // Exact match
          if (fc === requestedCat) return true;
          // For childcare.kindergarten, also match if it's just "childcare" but has kindergarten
          if (requestedCat === 'childcare.kindergarten' && fc.includes('kindergarten')) return true;
          // For general "childcare", match if it's childcare but not kindergarten
          if (requestedCat === 'childcare' && fc.includes('childcare') && !fc.includes('kindergarten')) return true;
          // Category starts with requested category (e.g., "public_transport.train" matches "public_transport.train")
          if (fc.startsWith(requestedCat + '.')) return true;
          return false;
        });
        
        if (matches) {
          if (!resultsByCategory[requestedCat]) {
            resultsByCategory[requestedCat] = [];
          }
          
          resultsByCategory[requestedCat].push({
            name,
            address,
            distance,
            coordinates: { lat: placeLat, lon: placeLon },
            place_id: feature.properties?.place_id,
            categories: featureCategories,
          });
        }
      });
    });

    // Step 4: Sort each category by Haversine distance and take top 10
    const sortedByCategory: Record<string, Array<{
      name: string;
      address?: string;
      distance: number;
      distanceKm: string;
      coordinates: { lat: number; lon: number };
      place_id?: string;
      categories: string[];
    }>> = {};

    Object.keys(resultsByCategory).forEach(category => {
      const sorted = resultsByCategory[category]
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10) // Top 10 per category
        .map(item => ({
          ...item,
          distanceKm: (item.distance / 1000).toFixed(2) + ' km',
        }));
      
      sortedByCategory[category] = sorted;
    });

    // Step 5: Apply production logic to reduce results (right-hand column)
    const filteredResults: Record<string, Array<{
      name: string;
      address?: string;
      distance: number;
      distanceKm: string;
      coordinates: { lat: number; lon: number };
      place_id?: string;
      categories: string[];
    }>> = {};

    // Train stations: top 1 from up to 10 (with filtering)
    const trainStations = sortedByCategory['public_transport.train'] || [];
    const validTrainStations = trainStations.filter(item => {
      const name = (item.name || '').trim().toLowerCase();
      const excludeTerms = ['society', 'club', 'modellers', 'modeller', 'association', 'group', 'railway society'];
      if (excludeTerms.some(term => name.includes(term))) return false;
      if (name.split(/\s+/).length === 1 && name === 'koala') return false;
      return true;
    });
    filteredResults['public_transport.train'] = validTrainStations.slice(0, 1).map(item => ({
      ...item,
      distanceKm: (item.distance / 1000).toFixed(2) + ' km',
    }));

    // Tram stops: top 1 from up to 10 (with same filtering)
    const tramStops = sortedByCategory['public_transport.tram'] || [];
    const validTramStops = tramStops.filter(item => {
      const name = (item.name || '').trim().toLowerCase();
      const excludeTerms = ['society', 'club', 'modellers', 'modeller', 'association', 'group', 'railway society'];
      if (excludeTerms.some(term => name.includes(term))) return false;
      if (name.split(/\s+/).length === 1 && name === 'koala') return false;
      return true;
    });
    filteredResults['public_transport.tram'] = validTramStops.slice(0, 1).map(item => ({
      ...item,
      distanceKm: (item.distance / 1000).toFixed(2) + ' km',
    }));

    // Bus stops: top 1 from up to 10
    const busStops = sortedByCategory['public_transport.bus'] || [];
    filteredResults['public_transport.bus'] = busStops.slice(0, 1).map(item => ({
      ...item,
      distanceKm: (item.distance / 1000).toFixed(2) + ' km',
    }));

    // Kindergarten & Childcare: top 4 from up to 10 each
    const kindergartens = sortedByCategory['childcare.kindergarten'] || [];
    const childcareOnly = (sortedByCategory['childcare'] || []).filter(item => {
      const cats = item.categories || [];
      return !cats.some(cat => cat.includes('kindergarten'));
    });
    const combinedChildcare = [
      ...kindergartens,
      ...childcareOnly,
    ].sort((a, b) => a.distance - b.distance);
    filteredResults['childcare'] = combinedChildcare.slice(0, 4).map(item => ({
      ...item,
      distanceKm: (item.distance / 1000).toFixed(2) + ' km',
    }));

    // Schools: top 3 from up to 10
    const schools = sortedByCategory['education.school'] || [];
    filteredResults['education.school'] = schools.slice(0, 3).map(item => ({
      ...item,
      distanceKm: (item.distance / 1000).toFixed(2) + ' km',
    }));

    // Supermarkets: Apply chain logic (same as production)
    const supermarkets = sortedByCategory['commercial.supermarket'] || [];
    const supermarketWithDistance = supermarkets.slice(0, 5).map(item => ({
      place: { properties: { name: item.name, address_line1: item.address } },
      distance: item.distance,
    }));
    
    // Apply production chain logic
    const chains = [
      { name: 'Woolworths', keywords: ['woolworths', 'woolies'] },
      { name: 'Coles', keywords: ['coles'] },
      { name: 'IGA', keywords: ['iga'] },
      { name: 'Aldi', keywords: ['aldi'] },
    ];
    const foundChains: typeof supermarketWithDistance = [];
    for (const chain of chains) {
      const chainStore = supermarketWithDistance.find(store => {
        const storeName = (store.place.properties.name || '').toLowerCase();
        return chain.keywords.some(keyword => storeName.includes(keyword));
      });
      if (chainStore) foundChains.push(chainStore);
    }
    const closestOverall = supermarketWithDistance[0];
    if (closestOverall) {
      const closestName = (closestOverall.place.properties.name || '').toLowerCase();
      const isChain = chains.some(chain => chain.keywords.some(keyword => closestName.includes(keyword)));
      if (!isChain || !foundChains.includes(closestOverall)) {
        foundChains.unshift(closestOverall);
      }
    }
    
    // Map back to filtered results format
    filteredResults['commercial.supermarket'] = foundChains.map(item => {
      const original = supermarkets.find(s => s.name === item.place.properties.name);
      if (!original) return null;
      return {
        ...original,
        distanceKm: (item.distance / 1000).toFixed(2) + ' km',
      };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Hospitals: top 2 from up to 10
    const hospitals = sortedByCategory['healthcare.hospital'] || [];
    filteredResults['healthcare.hospital'] = hospitals.slice(0, 2).map(item => ({
      ...item,
      distanceKm: (item.distance / 1000).toFixed(2) + ' km',
    }));

    // Step 6: Process airports and cities with Haversine distance and tier logic
    // Use hardcoded coordinates - no geocoding needed
    const airportsWithDistance: Array<{ airport: Airport; distance: number; coordinates: { lat: number; lon: number } }> = [];
    const citiesWithDistance: Array<{ city: City; distance: number; coordinates: { lat: number; lon: number } }> = [];

    // Calculate Haversine distances for airports using hardcoded coordinates
    for (const airport of AUSTRALIAN_AIRPORTS) {
      const distance = haversineDistance(lat, lon, airport.latitude, airport.longitude);
      airportsWithDistance.push({
        airport,
        distance,
        coordinates: { lat: airport.latitude, lon: airport.longitude },
      });
    }

    // Calculate Haversine distances for cities using hardcoded coordinates
    for (const city of AUSTRALIAN_CITIES) {
      const distance = haversineDistance(lat, lon, city.latitude, city.longitude);
      citiesWithDistance.push({
        city,
        distance,
        coordinates: { lat: city.latitude, lon: city.longitude },
      });
    }

    // Apply tier logic for airports (same as production)
    const closestAirportByGroup: { [key: number]: typeof airportsWithDistance[0] } = {};
    airportsWithDistance.forEach(result => {
      const group = result.airport.group;
      if (!closestAirportByGroup[group] || result.distance < closestAirportByGroup[group].distance) {
        closestAirportByGroup[group] = result;
      }
    });

    const closestOverallAirport = airportsWithDistance.sort((a, b) => a.distance - b.distance)[0];
    const closestAirportGroup = closestOverallAirport?.airport.group;

    const filteredAirports: typeof airportsWithDistance = [];
    if (closestAirportGroup === 3) {
      if (closestAirportByGroup[3]) filteredAirports.push(closestAirportByGroup[3]);
      if (closestAirportByGroup[1]) filteredAirports.push(closestAirportByGroup[1]);
    } else if (closestAirportGroup === 2) {
      if (closestAirportByGroup[2]) filteredAirports.push(closestAirportByGroup[2]);
      if (closestAirportByGroup[1]) filteredAirports.push(closestAirportByGroup[1]);
    } else {
      if (closestAirportByGroup[1]) filteredAirports.push(closestAirportByGroup[1]);
      const tier2And3 = [closestAirportByGroup[2], closestAirportByGroup[3]].filter(Boolean);
      if (tier2And3.length > 0) {
        tier2And3.sort((a, b) => a!.distance - b!.distance);
        filteredAirports.push(tier2And3[0]!);
      }
    }

    // Apply tier logic for cities (same as production)
    const closestCityByGroup: { [key: number]: typeof citiesWithDistance[0] } = {};
    citiesWithDistance.forEach(result => {
      const group = result.city.group;
      if (!closestCityByGroup[group] || result.distance < closestCityByGroup[group].distance) {
        closestCityByGroup[group] = result;
      }
    });

    const closestOverallCity = citiesWithDistance.sort((a, b) => a.distance - b.distance)[0];
    const closestCityGroup = closestOverallCity?.city.group;

    const filteredCities: typeof citiesWithDistance = [];
    if (closestCityGroup === 3) {
      if (closestCityByGroup[3]) filteredCities.push(closestCityByGroup[3]);
      if (closestCityByGroup[1]) filteredCities.push(closestCityByGroup[1]);
    } else if (closestCityGroup === 2) {
      if (closestCityByGroup[2]) filteredCities.push(closestCityByGroup[2]);
      if (closestCityByGroup[1]) filteredCities.push(closestCityByGroup[1]);
    } else {
      if (closestCityByGroup[1]) filteredCities.push(closestCityByGroup[1]);
      const tier2And3 = [closestCityByGroup[2], closestCityByGroup[3]].filter(Boolean);
      if (tier2And3.length > 0) {
        tier2And3.sort((a, b) => a!.distance - b!.distance);
        filteredCities.push(tier2And3[0]!);
      }
    }

    // Format ALL airports and cities for display (before filtering)
    const allFormattedAirports = airportsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .map(result => ({
        name: `${result.airport.name} (${result.airport.code})`,
        address: result.airport.address,
        distance: result.distance,
        distanceKm: (result.distance / 1000).toFixed(2) + ' km',
        coordinates: result.coordinates || { lat: 0, lon: 0 },
        group: result.airport.group,
        type: 'airport' as const,
      }));

    const allFormattedCities = citiesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .map(result => ({
        name: result.city.name,
        address: result.city.address,
        distance: result.distance,
        distanceKm: (result.distance / 1000).toFixed(2) + ' km',
        coordinates: result.coordinates || { lat: 0, lon: 0 },
        group: result.city.group,
        type: 'city' as const,
      }));

    // Format filtered airports and cities for display
    const formattedAirports = filteredAirports.map(result => ({
      name: `${result.airport.name} (${result.airport.code})`,
      address: result.airport.address,
      distance: result.distance,
      distanceKm: (result.distance / 1000).toFixed(2) + ' km',
      coordinates: result.coordinates || { lat: 0, lon: 0 },
      type: 'airport' as const,
    }));

    const formattedCities = filteredCities.map(result => ({
      name: result.city.name,
      address: result.city.address,
      distance: result.distance,
      distanceKm: (result.distance / 1000).toFixed(2) + ' km',
      coordinates: result.coordinates || { lat: 0, lon: 0 },
      type: 'city' as const,
    }));

    // Step 7: Create final combined list for Google Maps (airports + cities + filtered amenities)
    const finalList: Array<{
      name: string;
      address?: string;
      distance: number;
      distanceKm: string;
      coordinates: { lat: number; lon: number };
      type: string;
      category?: string;
    }> = [];

    // Add airports
    formattedAirports.forEach(airport => {
      finalList.push({
        ...airport,
        category: 'airport',
      });
    });

    // Add cities
    formattedCities.forEach(city => {
      finalList.push({
        ...city,
        category: 'city',
      });
    });

    // Add filtered amenities
    Object.keys(filteredResults).forEach(category => {
      filteredResults[category].forEach(amenity => {
        finalList.push({
          name: amenity.name,
          address: amenity.address,
          distance: amenity.distance,
          distanceKm: amenity.distanceKm,
          coordinates: amenity.coordinates,
          type: 'amenity',
          category: category,
        });
      });
    });

    return NextResponse.json({
      success: true,
      coordinates: { lat, lon },
      address: propertyAddress,
      rawResults: sortedByCategory,
      filteredResults: filteredResults,
      allAirportsAndCities: {
        airports: allFormattedAirports,
        cities: allFormattedCities,
      },
      airportsAndCities: {
        airports: formattedAirports,
        cities: formattedCities,
      },
      finalList: finalList,
      totalResults: features.length,
      categoryCounts: Object.keys(sortedByCategory).reduce((acc, cat) => {
        acc[cat] = sortedByCategory[cat].length;
        return acc;
      }, {} as Record<string, number>),
      debug: {
        allCategoriesFromGeoapify: Array.from(allCategories).sort(),
        tramFeaturesFound: tramFeatures,
        publicTransportOnlyFeatures: publicTransportOnlyFeatures,
        secondApiCall: {
          totalFeatures: hospitalCount,
          newFeaturesAdded: hospitalAdded,
        },
        allAirportsWithDistance: airportsWithDistance.map(a => ({
          name: a.airport.name,
          code: a.airport.code,
          group: a.airport.group,
          distance: a.distance,
        })),
        allCitiesWithDistance: citiesWithDistance.map(c => ({
          name: c.city.name,
          group: c.city.group,
          distance: c.distance,
        })),
        featuresWithin50m: features
          .filter((f: any) => {
            const coords = f.geometry?.coordinates;
            if (!coords || coords.length < 2) return false;
            const placeLat = coords[1];
            const placeLon = coords[0];
            const dist = haversineDistance(lat, lon, placeLat, placeLon);
            return dist <= 50;
          })
          .map((f: any) => ({
            name: f.properties?.name || f.properties?.address_line1 || 'Unknown',
            categories: f.properties?.categories || [],
            distance: haversineDistance(lat, lon, f.geometry.coordinates[1], f.geometry.coordinates[0]),
          })),
      },
    });
  } catch (error) {
    console.error('Error in test proximity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
