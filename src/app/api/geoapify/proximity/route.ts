import { NextResponse } from 'next/server';
import axios from 'axios';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { logRequest } from '@/lib/requestLogger';
import { sendRateLimitAlert, sendCostThresholdAlert, sendBurstActivityAlert } from '@/lib/emailAlerts';
import { logDistanceMatrixUsage } from '@/lib/distanceMatrixLogger';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY?.trim();
const GEOAPIFY_API_BASE_URL = process.env.GEOAPIFY_API_BASE_URL || 'https://api.geoapify.com/v2/places';
const PSMA_API_ENDPOINT = process.env.PSMA_API_ENDPOINT || 'https://api.psma.com.au/v2/addresses/geocoder';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_BASE_URL = process.env.GOOGLE_MAPS_API_BASE_URL || 'https://maps.googleapis.com/maps/api/distancematrix/json';

if (!GEOAPIFY_API_KEY || GEOAPIFY_API_KEY.length === 0) {
  console.error('❌ [GEOAPIFY] API key validation failed:', {
    exists: !!process.env.GEOAPIFY_API_KEY,
    length: process.env.GEOAPIFY_API_KEY?.length || 0,
    trimmedLength: GEOAPIFY_API_KEY?.length || 0,
  });
  throw new Error('GEOAPIFY_API_KEY environment variable is required and cannot be empty');
}

const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY;
if (!GEOSCAPE_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEOSCAPE_API_KEY environment variable is required');
}

// Hardcoded lists for airports and cities with coordinates
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

// PHASE 2: Reduced to top 11 airports (from 26) for batch optimization
// Added back Sunshine Coast Airport (MCY) - important for QLD properties
// Now includes hardcoded coordinates for Haversine distance calculation
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

// PHASE 2: Reduced to top 9 cities (from 30) for batch optimization
// Added back Sunshine Coast - important for QLD properties
// Now includes hardcoded coordinates for Haversine distance calculation
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

interface GeoapifyPlace {
  properties: {
    name: string;
    categories: string[];
    address_line1?: string;
    distance?: number;
    place_id?: string;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface GeoapifyResponse {
  type: string;
  features: GeoapifyPlace[];
}

interface ProximityResult {
  name: string;
  distance: number;
  category: string;
  formattedLine: string;
}

/**
 * Get next Wednesday 9 AM in seconds since epoch
 */
function getNextWednesday9AM(): number {
  const now = new Date();
  const currentDay = now.getDay();
  const daysUntilWednesday = (3 - currentDay + 7) % 7 || 7;
  const nextWednesday = new Date(now);
  nextWednesday.setDate(now.getDate() + daysUntilWednesday);
  nextWednesday.setHours(9, 0, 0, 0);
  return Math.floor(nextWednesday.getTime() / 1000);
}

/**
 * Geocode address using Geoscape
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await axios.get(PSMA_API_ENDPOINT, {
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

    return { lon: coords[0], lat: coords[1] };
  } catch (error) {
    console.error('Geoscape geocoding error:', error);
    return null;
  }
}

/**
 * Calculate Haversine distance between two coordinates
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance and time for display
 * Can use either Google Maps duration (in seconds) or estimated time from distance
 */
function formatDistanceTime(distanceMeters: number, durationSeconds?: number): { distance: string; time: string } {
  const km = distanceMeters / 1000;
  let distanceStr: string;
  if (km < 1) {
    distanceStr = `${Math.round(distanceMeters)} m`;
  } else {
    distanceStr = `${km.toFixed(1)} km`;
  }

  let timeStr: string;
  if (durationSeconds !== undefined) {
    // Use Google Maps duration (in seconds)
    const durationMinutes = Math.round(durationSeconds / 60);
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    if (hours > 0) {
      timeStr = `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    } else {
      timeStr = `${durationMinutes} min${durationMinutes !== 1 ? 's' : ''}`;
    }
  } else {
    // Fallback to estimated time (~1.2 km/min)
    const timeMins = Math.max(1, Math.round(km / 1.2));
    const hours = Math.floor(timeMins / 60);
    const mins = timeMins % 60;
    if (hours > 0) {
      timeStr = `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    } else {
      timeStr = `${timeMins} min${timeMins !== 1 ? 's' : ''}`;
    }
  }

  return { distance: distanceStr, time: timeStr };
}

/**
 * Get Google Maps distances from coordinates (for Geoapify places)
 */
async function getDistancesFromGoogleMapsCoordinates(
  originLat: number,
  originLon: number,
  destinations: Array<{ lat: number; lon: number }>
): Promise<Array<{ distance: number; duration: number }>> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const batchSize = 25;
  const results: Array<{ distance: number; duration: number }> = [];
  const departureTime = getNextWednesday9AM();
  const originStr = `${originLat},${originLon}`;

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const destStr = batch.map(d => `${d.lat},${d.lon}`).join('|');

    const url = `${GOOGLE_MAPS_API_BASE_URL}?` +
      `origins=${encodeURIComponent(originStr)}` +
      `&destinations=${encodeURIComponent(destStr)}` +
      `&departure_time=${departureTime}` +
      `&traffic_model=best_guess` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data.status !== 'OK') {
        console.error('Google Maps API error:', response.data.status);
        continue;
      }

      const elements = response.data.rows[0]?.elements || [];
      elements.forEach((element: any) => {
        if (element.status === 'OK') {
          results.push({
            distance: element.distance.value,
            duration: element.duration_in_traffic?.value || element.duration.value,
          });
        } else {
          // If Google Maps fails, push null to maintain array alignment
          results.push({ distance: 0, duration: 0 });
        }
      });
    } catch (error) {
      console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
      // Push nulls for failed batch to maintain alignment
      for (let j = 0; j < batch.length; j++) {
        results.push({ distance: 0, duration: 0 });
      }
    }
  }

  return results;
}

/**
 * Append category name to place name if missing
 */
function appendCategoryName(name: string, category: string): string {
  const lowerName = name.toLowerCase();
  const categoryLower = category.toLowerCase();
  
  // Check if category word already exists in name
  const categoryWords: Record<string, string[]> = {
    'train_station': ['train', 'station'],
    'bus_stop': ['bus stop', 'busstop'],
    'kindergarten': ['kindergarten'],
    'childcare': ['childcare', 'child care', 'daycare', 'day care'],
    'school': ['school'],
    'supermarket': ['supermarket'], // Only check for "supermarket" - don't use "store" or "shop" as they're too generic
    'hospital': ['hospital'],
  };

  const words = categoryWords[category] || [categoryLower];
  const hasCategoryWord = words.some(word => lowerName.includes(word));
  
  if (hasCategoryWord) {
    return name; // Already has category word
  }

  // Append category name
  const categoryDisplay: Record<string, string> = {
    'train_station': 'Train Station',
    'bus_stop': 'Bus Stop',
    'kindergarten': 'Kindergarten',
    'childcare': 'Childcare',
    'school': 'School',
    'supermarket': 'Supermarket',
    'hospital': 'Hospital',
  };

  const displayName = categoryDisplay[category] || category;
  return `${name} ${displayName}`;
}

/**
 * Call Google Maps Distance Matrix API
 */
async function getDistancesFromGoogleMaps(
  originAddress: string,
  destinations: Array<{ address: string }>
): Promise<Array<{ distance: number; duration: number }>> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  const batchSize = 25;
  const results: Array<{ distance: number; duration: number }> = [];
  const departureTime = getNextWednesday9AM();

  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    const destStr = batch.map(d => d.address).join('|');

    const url = `${GOOGLE_MAPS_API_BASE_URL}?` +
      `origins=${encodeURIComponent(originAddress)}` +
      `&destinations=${encodeURIComponent(destStr)}` +
      `&departure_time=${departureTime}` +
      `&traffic_model=best_guess` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data.status !== 'OK') {
        console.error('Google Maps API error:', response.data.status);
        continue;
      }

      const elements = response.data.rows[0]?.elements || [];
      elements.forEach((element: any) => {
        if (element.status === 'OK') {
          results.push({
            distance: element.distance.value,
            duration: element.duration_in_traffic?.value || element.duration.value,
          });
        }
      });
    } catch (error) {
      console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
    }
  }

  return results;
}

/**
 * PHASE 2: Consolidated batching function - handles both addresses and coordinates
 * This allows us to batch airports/cities (addresses) with amenities (coordinates) in one call
 */
interface ConsolidatedDestination {
  address?: string;  // For airports/cities
  lat?: number;      // For Geoapify places
  lon?: number;      // For Geoapify places
  metadata?: any;    // Store original data for later use
}

async function getConsolidatedDistances(
  originAddress: string,
  originLat: number,
  originLon: number,
  destinations: ConsolidatedDestination[]
): Promise<{ results: Array<{ distance: number; duration: number }>; apiCallCount: number }> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured');
  }

  // PHASE 2: Track API calls
  let apiCallCount = 0;
  const batchSize = 25;
  const results: Array<{ distance: number; duration: number }> = [];
  const departureTime = getNextWednesday9AM();

  // Split destinations into batches
  for (let i = 0; i < destinations.length; i += batchSize) {
    const batch = destinations.slice(i, i + batchSize);
    
    // Build destination string - use address if available, otherwise use coordinates
    const destStr = batch.map(d => {
      if (d.address) {
        return d.address;
      } else if (d.lat !== undefined && d.lon !== undefined) {
        return `${d.lat},${d.lon}`;
      }
      return '';
    }).filter(Boolean).join('|');

    if (!destStr) continue;

    // Use coordinates for origin if we have them (more accurate)
    const originStr = `${originLat},${originLon}`;

    const url = `${GOOGLE_MAPS_API_BASE_URL}?` +
      `origins=${encodeURIComponent(originStr)}` +
      `&destinations=${encodeURIComponent(destStr)}` +
      `&departure_time=${departureTime}` +
      `&traffic_model=best_guess` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      apiCallCount++;
      console.log(`🚨 [PHASE 2] Google Maps API call #${apiCallCount} - ${batch.length} destinations`);
      
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data.status !== 'OK') {
        console.error('Google Maps API error:', response.data.status);
        // Push zeros to maintain alignment
        for (let j = 0; j < batch.length; j++) {
          results.push({ distance: 0, duration: 0 });
        }
        continue;
      }

      const elements = response.data.rows[0]?.elements || [];
      elements.forEach((element: any) => {
        if (element.status === 'OK') {
          results.push({
            distance: element.distance.value,
            duration: element.duration_in_traffic?.value || element.duration.value,
          });
        } else {
          results.push({ distance: 0, duration: 0 });
        }
      });
    } catch (error) {
      console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
      // Push zeros for failed batch to maintain alignment
      for (let j = 0; j < batch.length; j++) {
        results.push({ distance: 0, duration: 0 });
      }
    }
  }

  console.log(`📊 [PHASE 2] Total Google Maps API calls: ${apiCallCount}`);
  return { results, apiCallCount };
}

/**
 * Search Geoapify for places
 * OPTIMIZED: Uses bias only (no filter) and limit 500 for maximum results
 */
async function searchGeoapify(
  lon: number,
  lat: number,
  categories: string,
  limit: number = 500
): Promise<GeoapifyPlace[]> {
  const biasStr = `proximity:${lon},${lat}`;
  
  // Check if API key is available
  if (!GEOAPIFY_API_KEY || GEOAPIFY_API_KEY.length === 0) {
    console.error('❌ [GEOAPIFY] API key is missing or empty!', {
      keyExists: !!GEOAPIFY_API_KEY,
      keyLength: GEOAPIFY_API_KEY?.length || 0,
    });
    throw new Error('GEOAPIFY_API_KEY is not configured or is empty');
  }
  
  const params = new URLSearchParams({
    categories,
    limit: String(limit),
    apiKey: GEOAPIFY_API_KEY,
  });
  const url = `${GEOAPIFY_API_BASE_URL}?${params.toString()}&bias=${biasStr}`;
  
  console.log(`🔍 [GEOAPIFY] Calling API for categories: ${categories}, limit: ${limit}`);
  console.log(`🔍 [GEOAPIFY] URL: ${url.replace(GEOAPIFY_API_KEY, '***REDACTED***')}`);
  
  try {
    const response = await axios.get(url, { timeout: 30000 });
    const features = response.data.features || [];
    console.log(`✅ [GEOAPIFY] Successfully retrieved ${features.length} places for categories: ${categories}`);
    return features;
  } catch (error: any) {
    console.error('❌ [GEOAPIFY] API error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: url.replace(GEOAPIFY_API_KEY, '***REDACTED***'),
    });
    // Re-throw the error so it can be handled upstream
    throw new Error(`Geoapify API error: ${error.response?.status || 'Unknown'} - ${error.message}`);
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  
  // Store request body for logging (read once)
  let requestBody: {
    propertyAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    userEmail: string | null;
  } = {
    propertyAddress: null,
    latitude: null,
    longitude: null,
    userEmail: null,
  };
  
  // CORS configuration
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://property-packaging-form.vercel.app',
  ];
  
  try {
    // Rate Limiting
    const rateLimitResult = checkRateLimit(clientIP);
    if (!rateLimitResult.allowed) {
      // Log rate limit violation
      await logRequest({
        timestamp: new Date().toISOString(),
        ip: clientIP,
        endpoint: '/api/geoapify/proximity',
        method: 'POST',
        status: 429,
        duration: Date.now() - startTime,
        error: rateLimitResult.reason,
      });
      
      // Send alert email
      await sendRateLimitAlert(clientIP, rateLimitResult.reason || 'Rate limit exceeded');
      
      // Check if it's a burst violation
      if (rateLimitResult.reason?.includes('burst')) {
        await sendBurstActivityAlert(clientIP, 10); // Assuming burst limit is 10
      }
      
      const response = NextResponse.json(
        { 
          success: false, 
          error: rateLimitResult.reason || 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
      
      // Add CORS headers
      const origin = request.headers.get('origin');
      if (origin && allowedOrigins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      }
      
      if (rateLimitResult.retryAfter) {
        response.headers.set('Retry-After', String(rateLimitResult.retryAfter));
      }
      
      return response;
    }
    
    // Email Authentication - Extract and validate user email
    const body = await request.json();
    const { propertyAddress, latitude, longitude, userEmail } = body;
    
    // Store for logging
    requestBody = {
      propertyAddress: propertyAddress || null,
      latitude: latitude || null,
      longitude: longitude || null,
      userEmail: userEmail || null,
    };
    
    console.log('🔐 Email validation - Received email:', userEmail);
    
    // Validate email is provided and matches allowed domain
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email is required' },
        { status: 401 }
      );
    }
    
    // Check if email is from allowed domain or is the specific allowed email
    const allowedDomain = '@buyersclub.com.au';
    const allowedSpecificEmail = 'johntruscott1971@gmail.com';
    
    const isValidEmail = userEmail.endsWith(allowedDomain) || userEmail === allowedSpecificEmail;
    
    if (!isValidEmail) {
      await logRequest({
        timestamp: new Date().toISOString(),
        ip: clientIP,
        endpoint: '/api/geoapify/proximity',
        method: 'POST',
        status: 401,
        duration: Date.now() - startTime,
        error: `Unauthorized email: ${userEmail}`,
      });
      
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid email domain' },
        { status: 401 }
      );
    }

    let lat: number;
    let lon: number;
    let addressForGoogleMaps: string;

    // Get coordinates
    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
      addressForGoogleMaps = propertyAddress || `${lat},${lon}`;
    } else if (propertyAddress) {
      const coords = await geocodeAddress(propertyAddress);
      if (!coords) {
        return NextResponse.json(
          { success: false, error: 'Could not geocode address' },
          { status: 400 }
        );
      }
      lat = coords.lat;
      lon = coords.lon;
      addressForGoogleMaps = propertyAddress;
    } else {
      return NextResponse.json(
        { success: false, error: 'Property address or coordinates required' },
        { status: 400 }
      );
    }

    const allResults: ProximityResult[] = [];
    let geoapifyDebug: { geoapifyTotalResults: number; geoapifyCategoryBreakdown: any } | null = null;
    let distanceMatrixApiCallCount = 0;
    let destinationsCount = 0;

    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // OPTIMIZED: Use Haversine for airports/cities, apply tier logic, then combine with amenities for single Google Maps call
    console.log('🚀 [OPTIMIZED] Processing airports and cities with Haversine distance');
    
    // Calculate Haversine distances for airports
    const airportsWithDistance = AUSTRALIAN_AIRPORTS.map(airport => ({
      airport,
      distance: calculateDistance(lat, lon, airport.latitude, airport.longitude),
    }));

    // Apply tier logic for airports using Haversine distances
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

    // Calculate Haversine distances for cities
    const citiesWithDistance = AUSTRALIAN_CITIES.map(city => ({
      city,
      distance: calculateDistance(lat, lon, city.latitude, city.longitude),
    }));

    // Apply tier logic for cities using Haversine distances
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

    console.log(`✅ [OPTIMIZED] Selected ${filteredAirports.length} airports and ${filteredCities.length} cities using Haversine + tier logic`);

    // OPTIMIZED: Get all Geoapify results, use Haversine to sort, apply logic, then combine with airports/cities for single Google Maps call
    console.log('🚀 [OPTIMIZED] Starting amenities processing with Haversine sorting');
    console.log(`🔍 [GEOAPIFY] API Key configured: ${GEOAPIFY_API_KEY ? 'YES' : 'NO'}`);
    console.log(`🔍 [GEOAPIFY] API Key length: ${GEOAPIFY_API_KEY?.length || 0} characters`);
    console.log(`🔍 [GEOAPIFY] API Key starts with: ${GEOAPIFY_API_KEY ? GEOAPIFY_API_KEY.substring(0, 8) + '...' : 'N/A'}`);
    console.log(`🔍 [GEOAPIFY] API Base URL: ${GEOAPIFY_API_BASE_URL}`);
    
    let allPlaces: GeoapifyPlace[] = [];
    try {
      // Step 1: Split into multiple calls - Geoapify may not handle all categories in one request
      // OPTIMIZED: Run all 5 calls in parallel for much faster performance
      console.log(`🔍 [GEOAPIFY] Starting multiple category calls in parallel...`);
      
      const startTime = Date.now();
      const [transportPlaces, childcarePlaces, schoolPlaces, supermarketPlaces, hospitalPlaces] = await Promise.all([
        searchGeoapify(lon, lat, 'public_transport.train,public_transport.tram,public_transport.bus', 500),
        searchGeoapify(lon, lat, 'childcare.kindergarten,childcare', 500),
        searchGeoapify(lon, lat, 'education.school', 500),
        searchGeoapify(lon, lat, 'commercial.supermarket', 500),
        searchGeoapify(lon, lat, 'healthcare.hospital', 500),
      ]);
      
      const duration = Date.now() - startTime;
      console.log(`📊 [GEOAPIFY] All 5 calls completed in ${duration}ms`);
      console.log(`📊 [GEOAPIFY] Transport: ${transportPlaces.length}, Childcare: ${childcarePlaces.length}, School: ${schoolPlaces.length}, Supermarket: ${supermarketPlaces.length}, Hospital: ${hospitalPlaces.length}`);
      
      allPlaces.push(...transportPlaces, ...childcarePlaces, ...schoolPlaces, ...supermarketPlaces, ...hospitalPlaces);
      
      console.log(`📊 [OPTIMIZED] Total places from all calls: ${allPlaces.length}`);
      
      // Deduplicate by place_id
      const existingPlaceIds = new Set<string>();
      const deduplicatedPlaces: GeoapifyPlace[] = [];
      allPlaces.forEach(place => {
        const placeId = place.properties?.place_id;
        if (placeId && !existingPlaceIds.has(placeId)) {
          existingPlaceIds.add(placeId);
          deduplicatedPlaces.push(place);
        } else if (!placeId) {
          // Include places without place_id (shouldn't happen but handle it)
          deduplicatedPlaces.push(place);
        }
      });
      allPlaces = deduplicatedPlaces;
      console.log(`📊 [OPTIMIZED] Total places after deduplication: ${allPlaces.length}`);
    } catch (geoapifyError: any) {
      console.error('❌ [GEOAPIFY] Critical error - Geoapify API calls failed:', {
        error: geoapifyError.message,
        stack: geoapifyError.stack,
        coordinates: { lat, lon },
      });
      // Continue with empty results - will only process airports/cities
      console.warn('⚠️ [GEOAPIFY] Continuing without amenities - only airports/cities will be processed');
      allPlaces = [];
    }
    
    // Step 2: Separate results by category and calculate Haversine distances, then sort
    if (allPlaces.length === 0) {
      console.warn('⚠️ [GEOAPIFY] No places returned from Geoapify - amenities will be empty');
    }
    
    const trainPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('public_transport.train')));
      const tramPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('public_transport.tram')));
      const busPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('public_transport.bus')));
      const kindergartenPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('childcare.kindergarten')));
      const childcarePlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('childcare')) && !p.properties.categories?.some(c => c.includes('kindergarten')));
      const schoolPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('education.school')));
      const supermarketPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('commercial.supermarket')));
      const hospitalPlaces = allPlaces.filter(p => p.properties.categories?.some(c => c.includes('healthcare.hospital')));
      
      // Helper function to calculate Haversine distance and sort
      const sortByHaversine = (places: GeoapifyPlace[]) => {
        return places
          .map(place => {
            const coords = place.geometry?.coordinates;
            if (!coords || coords.length < 2) return null;
            const placeLat = coords[1];
            const placeLon = coords[0];
            const distance = calculateDistance(lat, lon, placeLat, placeLon);
            return { place, distance };
          })
          .filter((item): item is { place: GeoapifyPlace; distance: number } => item !== null)
          .sort((a, b) => a.distance - b.distance);
      };

      // Sort each category by Haversine distance
      const trainSorted = sortByHaversine(trainPlaces);
      const tramSorted = sortByHaversine(tramPlaces);
      const busSorted = sortByHaversine(busPlaces);
      const kindergartenSorted = sortByHaversine(kindergartenPlaces);
      const childcareSorted = sortByHaversine(childcarePlaces);
      const schoolSorted = sortByHaversine(schoolPlaces);
      const supermarketSorted = sortByHaversine(supermarketPlaces);
      const hospitalSorted = sortByHaversine(hospitalPlaces);
      
      const categoryBreakdown = {
        train: trainPlaces.length,
        tram: tramPlaces.length,
        bus: busPlaces.length,
        kindergarten: kindergartenPlaces.length,
        childcare: childcarePlaces.length,
        school: schoolPlaces.length,
        supermarket: supermarketPlaces.length,
        hospital: hospitalPlaces.length,
      };
      
      console.log(`📊 [OPTIMIZED] Category breakdown: Train=${trainPlaces.length}, Tram=${tramPlaces.length}, Bus=${busPlaces.length}, Kindergarten=${kindergartenPlaces.length}, Childcare=${childcarePlaces.length}, School=${schoolPlaces.length}, Supermarket=${supermarketPlaces.length}, Hospital=${hospitalPlaces.length}`);
      
      // Store for response
      geoapifyDebug = {
        geoapifyTotalResults: allPlaces.length,
        geoapifyCategoryBreakdown: categoryBreakdown,
      };

      // Step 3: Apply production logic to filter and prepare destinations
      const batch2Destinations: ConsolidatedDestination[] = [];
      const batch2Metadata: Array<{ type: string; place: any; category?: string; haversineDistance?: number }> = [];

      // Train stations (filter and take top 1 from up to 10, sorted by Haversine)
      const allTrainTram = [...trainSorted.slice(0, 10), ...tramSorted.slice(0, 10)];
      const validStations = allTrainTram.filter(item => {
        const name = (item.place.properties.name || '').trim().toLowerCase();
        const excludeTerms = ['society', 'club', 'modellers', 'modeller', 'association', 'group', 'railway society'];
        if (excludeTerms.some(term => name.includes(term))) return false;
        if (name.split(/\s+/).length === 1 && name === 'koala') return false;
        return true;
      });
      validStations.slice(0, 1).forEach(item => {
        const place = item.place;
        if (place.geometry?.coordinates) {
          batch2Destinations.push({
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
            metadata: { type: 'train_station', place },
          });
          batch2Metadata.push({ type: 'train_station', place, haversineDistance: item.distance });
        }
      });

      // Bus stops (take top 1 from up to 10, sorted by Haversine)
      busSorted.slice(0, 10).slice(0, 1).forEach(item => {
        const place = item.place;
        if (place.geometry?.coordinates) {
          batch2Destinations.push({
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
            metadata: { type: 'bus_stop', place },
          });
          batch2Metadata.push({ type: 'bus_stop', place });
        }
      });

      // Kindergarten & Childcare (take top 4 from up to 10 each, sorted by Haversine)
      const childcareOnly = childcareSorted.slice(0, 10).filter(item => {
        const categories = item.place.properties.categories || [];
        return !categories.some(cat => cat.includes('kindergarten'));
      });
      const combined = [
        ...kindergartenSorted.slice(0, 10).map(item => ({ ...item, type: 'kindergarten' as const })),
        ...childcareOnly.map(item => ({ ...item, type: 'childcare' as const })),
      ].sort((a, b) => a.distance - b.distance);
      combined.slice(0, 4).forEach(item => {
        const place = item.place;
        if (place.geometry?.coordinates) {
          batch2Destinations.push({
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
            metadata: { type: item.type, place },
          });
          batch2Metadata.push({ type: item.type, place });
        }
      });

      // Schools (take top 3 from up to 10, sorted by Haversine)
      schoolSorted.slice(0, 10).slice(0, 3).forEach(item => {
        const place = item.place;
        if (place.geometry?.coordinates) {
          batch2Destinations.push({
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
            metadata: { type: 'school', place },
          });
          batch2Metadata.push({ type: 'school', place });
        }
      });

      // Supermarkets (take top 5 from up to 10, sorted by Haversine)
      supermarketSorted.slice(0, 10).slice(0, 5).forEach(item => {
        const place = item.place;
        if (place.geometry?.coordinates) {
          batch2Destinations.push({
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
            metadata: { type: 'supermarket', place },
          });
          batch2Metadata.push({ type: 'supermarket', place });
        }
      });

      // Hospitals (take top 2 from up to 10, sorted by Haversine)
      hospitalSorted.slice(0, 10).slice(0, 2).forEach(item => {
        const place = item.place;
        if (place.geometry?.coordinates) {
          batch2Destinations.push({
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
            metadata: { type: 'hospital', place },
          });
          batch2Metadata.push({ type: 'hospital', place });
        }
      });

      // Step 4: Combine airports, cities, and amenities for single Google Maps call
      const allDestinations: ConsolidatedDestination[] = [];
      const allMetadata: Array<{ type: string; place?: any; airport?: Airport; city?: City; category?: string }> = [];

      // Add filtered airports
      filteredAirports.forEach(result => {
        allDestinations.push({
          address: result.airport.address,
          metadata: { type: 'airport', airport: result.airport },
        });
        allMetadata.push({ type: 'airport', airport: result.airport });
      });

      // Add filtered cities
      filteredCities.forEach(result => {
        allDestinations.push({
          address: result.city.address,
          metadata: { type: 'city', city: result.city },
        });
        allMetadata.push({ type: 'city', city: result.city });
      });

      // Add filtered amenities
      batch2Destinations.forEach((dest, idx) => {
        allDestinations.push(dest);
        allMetadata.push(batch2Metadata[idx]);
      });

      console.log(`📊 [OPTIMIZED] Total destinations for Google Maps: ${allDestinations.length} (${filteredAirports.length} airports + ${filteredCities.length} cities + ${batch2Destinations.length} amenities)`);

      // Step 5: Single Google Maps call for all destinations (up to 25)
      let allResults_gm: Array<{ distance: number; duration: number }> = [];
      if (allDestinations.length > 0) {
        const distanceResult = await getConsolidatedDistances(
          addressForGoogleMaps,
          lat,
          lon,
          allDestinations.slice(0, 25) // Limit to 25 for Google Maps
        );
        allResults_gm = distanceResult.results;
        distanceMatrixApiCallCount = distanceResult.apiCallCount;
        destinationsCount = allDestinations.length;

        // Step 6: Process results by category (airports, cities, and amenities)
        // Process results sequentially - metadata array is aligned with results array
        const airportResults: Array<{ airport: Airport; distance: number; duration: number }> = [];
        const cityResults: Array<{ city: City; distance: number; duration: number }> = [];
        const trainStationResults: Array<{ place: any; distance: number; duration: number }> = [];
        const busStopResults: Array<{ place: any; distance: number; duration: number }> = [];
        const childcareResults: Array<{ place: any; distance: number; duration: number; type: string }> = [];
        const schoolResults: Array<{ place: any; distance: number; duration: number }> = [];
        const supermarketResults: Array<{ place: any; distance: number; duration: number }> = [];
        const hospitalResults: Array<{ place: any; distance: number; duration: number }> = [];

        // Process all results sequentially - metadata and results are aligned
        for (let i = 0; i < allResults_gm.length && i < allMetadata.length; i++) {
          const metadata = allMetadata[i];
          const result = allResults_gm[i];
          if (!metadata || !result || result.distance === 0) continue;

          const distance = result.distance;
          const duration = result.duration;
          const type = metadata.type;

          // Group by category for processing
          switch (type) {
            case 'airport':
              if (metadata.airport) {
                airportResults.push({ airport: metadata.airport, distance, duration });
              }
              break;
            case 'city':
              if (metadata.city) {
                cityResults.push({ city: metadata.city, distance, duration });
              }
              break;
            case 'train_station':
              if (metadata.place) {
                trainStationResults.push({ place: metadata.place, distance, duration });
              }
              break;
            case 'bus_stop':
              if (metadata.place) {
                busStopResults.push({ place: metadata.place, distance, duration });
              }
              break;
            case 'kindergarten':
            case 'childcare':
              if (metadata.place) {
                childcareResults.push({ place: metadata.place, distance, duration, type });
              }
              break;
            case 'school':
              if (metadata.place) {
                schoolResults.push({ place: metadata.place, distance, duration });
              }
              break;
            case 'supermarket':
              if (metadata.place) {
                supermarketResults.push({ place: metadata.place, distance, duration });
              }
              break;
            case 'hospital':
              if (metadata.place) {
                hospitalResults.push({ place: metadata.place, distance, duration });
              }
              break;
          }
        }

        // Process airports
        if (airportResults.length > 0) {
          airportResults.sort((a, b) => a.distance - b.distance);
          airportResults.forEach(result => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(result.distance, result.duration);
            allResults.push({
              name: `${result.airport.name} (${result.airport.code})`,
              distance: result.distance,
              category: 'airport',
              formattedLine: `${distStr} (${timeStr}), ${result.airport.name} (${result.airport.code})`,
            });
          });
        }

        // Process cities
        if (cityResults.length > 0) {
          cityResults.sort((a, b) => a.distance - b.distance);
          cityResults.forEach(result => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(result.distance, result.duration);
            allResults.push({
              name: `${result.city.name}, ${result.city.state}`,
              distance: result.distance,
              category: 'city',
              formattedLine: `${distStr} (${timeStr}), ${result.city.name}, ${result.city.state}`,
            });
          });
        }

        // Process train stations (closest 1)
        if (trainStationResults.length > 0) {
          trainStationResults.sort((a, b) => a.distance - b.distance);
          const closest = trainStationResults[0];
          const { distance: distStr, time: timeStr } = formatDistanceTime(closest.distance, closest.duration);
          let stationName = (closest.place.properties.name || '').trim();
          if (!stationName) stationName = closest.place.properties.address_line1 || 'Train Station';
          stationName = appendCategoryName(stationName, 'train_station');
          allResults.push({
            name: stationName,
            distance: closest.distance,
            category: 'train_station',
            formattedLine: `${distStr} (${timeStr}), ${stationName}`,
          });
        }

        // Process bus stops (closest 1)
        if (busStopResults.length > 0) {
          busStopResults.sort((a, b) => a.distance - b.distance);
          const closest = busStopResults[0];
          const { distance: distStr, time: timeStr } = formatDistanceTime(closest.distance, closest.duration);
          let busName = (closest.place.properties.name || '').trim();
          if (!busName) busName = closest.place.properties.address_line1 || 'Bus Stop';
          busName = appendCategoryName(busName, 'bus_stop');
          allResults.push({
            name: busName,
            distance: closest.distance,
            category: 'bus_stop',
            formattedLine: `${distStr} (${timeStr}), ${busName}`,
          });
        }

        // Process kindergarten & childcare (top 4)
        if (childcareResults.length > 0) {
          childcareResults.sort((a, b) => a.distance - b.distance);
          const top4 = childcareResults.slice(0, 4);
          top4.forEach(item => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(item.distance, item.duration);
            let placeName = (item.place.properties.name || '').trim();
            if (!placeName) placeName = item.place.properties.address_line1 || (item.type === 'kindergarten' ? 'Kindergarten' : 'Childcare');
            placeName = appendCategoryName(placeName, item.type);
            allResults.push({
              name: placeName,
              distance: item.distance,
              category: item.type,
              formattedLine: `${distStr} (${timeStr}), ${placeName}`,
            });
          });
        }

        // Process schools (top 3)
        if (schoolResults.length > 0) {
          schoolResults.sort((a, b) => a.distance - b.distance);
          const top3 = schoolResults.slice(0, 3);
          top3.forEach(school => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(school.distance, school.duration);
            let schoolName = (school.place.properties.name || '').trim();
            if (!schoolName) schoolName = school.place.properties.address_line1 || 'School';
            schoolName = appendCategoryName(schoolName, 'school');
            allResults.push({
              name: schoolName,
              distance: school.distance,
              category: 'school',
              formattedLine: `${distStr} (${timeStr}), ${schoolName}`,
            });
          });
        }

        // Process supermarkets (top 5, sorted by Google Maps distance)
        if (supermarketResults.length > 0) {
          supermarketResults.sort((a, b) => a.distance - b.distance);
          const top5 = supermarketResults.slice(0, 5);
          top5.forEach(store => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(store.distance, store.duration);
            let storeName = (store.place.properties.name || '').trim();
            if (!storeName) storeName = store.place.properties.address_line1 || 'Supermarket';
            storeName = appendCategoryName(storeName, 'supermarket');
            allResults.push({
              name: storeName,
              distance: store.distance,
              category: 'supermarket',
              formattedLine: `${distStr} (${timeStr}), ${storeName}`,
            });
          });
        }

        // Process hospitals (top 2, sorted by Google Maps distance)
        if (hospitalResults.length > 0) {
          hospitalResults.sort((a, b) => a.distance - b.distance);
          const top2 = hospitalResults.slice(0, 2);
          top2.forEach(hospital => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(hospital.distance, hospital.duration);
            let hospitalName = (hospital.place.properties.name || '').trim();
            if (!hospitalName) hospitalName = hospital.place.properties.address_line1 || 'Hospital';
            allResults.push({
              name: hospitalName,
              distance: hospital.distance,
              category: 'hospital',
              formattedLine: `${distStr} (${timeStr}), ${hospitalName}`,
            });
          });
        }

        console.log('✅ [OPTIMIZED] Complete: All destinations processed in single Google Maps call');
      } else {
        console.warn('⚠️ [GEOAPIFY] No destinations to process - allDestinations array is empty');
      }

    // Sort all results by distance
    allResults.sort((a, b) => a.distance - b.distance);

    // Format output - NO starting address, just the results
    const formattedLines = allResults.map(r => r.formattedLine);
    
    // Log successful request
    const duration = Date.now() - startTime;
    await logRequest({
      timestamp: new Date().toISOString(),
      ip: clientIP,
      endpoint: '/api/geoapify/proximity',
      method: 'POST',
      status: 200,
      duration,
    });
    
    // PHASE 2: Check cost threshold (reduced from ~26 to 2 Distance Matrix calls per proximity request)
    // $5 per 1000 Distance Matrix calls
    const estimatedCost = (2 / 1000) * 5; // ~$0.01 per request (85-92% cost reduction)
    const DAILY_COST_THRESHOLD = parseFloat(process.env.ALERT_DAILY_COST_THRESHOLD || '5');
    
    // Get today's request count from rate limit store
    // If we've exceeded cost threshold, send alert (this is a rough check)
    // A more accurate check would sum all proximity requests from logs
    
    const response = NextResponse.json({
      success: true,
      proximity: formattedLines.join('\n'),
      results: allResults,
      count: allResults.length,
      coordinates: { lat, lon },
      debug: geoapifyDebug || {
        geoapifyTotalResults: 0,
        geoapifyCategoryBreakdown: {},
      },
    });
    
    // Add CORS headers
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    
    // Log Distance Matrix API usage (observational, non-blocking)
    await logDistanceMatrixUsage(
      request,
      clientIP,
      {
        propertyAddress,
        latitude: lat,
        longitude: lon,
        userEmail,
      },
      distanceMatrixApiCallCount,
      destinationsCount,
      duration,
      true
    );
    
    return response;
  } catch (error) {
    console.error('Error in proximity API:', error);
    
    // Log error
    await logRequest({
      timestamp: new Date().toISOString(),
      ip: clientIP,
      endpoint: '/api/geoapify/proximity',
      method: 'POST',
      status: 500,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    const response = NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get proximity data',
      },
      { status: 500 }
    );
    
    // Add CORS headers even for errors
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    
    // Log Distance Matrix API usage error (observational, non-blocking)
    await logDistanceMatrixUsage(
      request,
      clientIP,
      requestBody,
      0,
      0,
      Date.now() - startTime,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return response;
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: Request) {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://property-packaging-form.vercel.app',
  ];
  
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  return response;
}
