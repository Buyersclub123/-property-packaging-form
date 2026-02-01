import { NextResponse } from 'next/server';
import axios from 'axios';
import { checkRateLimit, getClientIP } from '@/lib/rateLimit';
import { logRequest } from '@/lib/requestLogger';
import { sendRateLimitAlert, sendCostThresholdAlert, sendBurstActivityAlert } from '@/lib/emailAlerts';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const GEOAPIFY_API_BASE_URL = process.env.GEOAPIFY_API_BASE_URL || 'https://api.geoapify.com/v2/places';
const PSMA_API_ENDPOINT = process.env.PSMA_API_ENDPOINT || 'https://api.psma.com.au/v2/addresses/geocoder';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_BASE_URL = process.env.GOOGLE_MAPS_API_BASE_URL || 'https://maps.googleapis.com/maps/api/distancematrix/json';

if (!GEOAPIFY_API_KEY) {
  throw new Error('GEOAPIFY_API_KEY environment variable is required');
}

const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY;
if (!GEOSCAPE_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEOSCAPE_API_KEY environment variable is required');
}

// Hardcoded lists for airports and cities
interface Airport {
  name: string;
  code: string;
  address: string;
  group: 1 | 2 | 3;
}

interface City {
  name: string;
  state: string;
  address: string;
  group: 1 | 2 | 3;
}

const AUSTRALIAN_AIRPORTS: Airport[] = [
  { name: 'Sydney Kingsford Smith Airport', code: 'SYD', address: 'Sydney Airport NSW 2020, Australia', group: 1 },
  { name: 'Melbourne Airport', code: 'MEL', address: 'Melbourne Airport VIC 3045, Australia', group: 1 },
  { name: 'Brisbane Airport', code: 'BNE', address: 'Brisbane Airport QLD 4008, Australia', group: 1 },
  { name: 'Perth Airport', code: 'PER', address: 'Perth Airport WA 6105, Australia', group: 1 },
  { name: 'Adelaide Airport', code: 'ADL', address: 'Adelaide Airport SA 5950, Australia', group: 1 },
  { name: 'Cairns Airport', code: 'CNS', address: 'Cairns Airport QLD 4870, Australia', group: 1 },
  { name: 'Darwin International Airport', code: 'DRW', address: 'Darwin Airport NT 0820, Australia', group: 1 },
  { name: 'Gold Coast Airport', code: 'OOL', address: 'Gold Coast Airport QLD 4218, Australia', group: 2 },
  { name: 'Canberra Airport', code: 'CBR', address: 'Canberra Airport ACT 2609, Australia', group: 2 },
  { name: 'Hobart International Airport', code: 'HBA', address: 'Hobart Airport TAS 7170, Australia', group: 2 },
  { name: 'Avalon Airport', code: 'AVV', address: 'Avalon Airport VIC 3214, Australia', group: 2 },
  { name: 'Sunshine Coast Airport', code: 'MCY', address: 'Sunshine Coast Airport QLD 4564, Australia', group: 2 },
  { name: 'Townsville Airport', code: 'TSV', address: 'Townsville Airport QLD 4810, Australia', group: 2 },
  { name: 'Newcastle Airport', code: 'NTL', address: 'Newcastle Airport NSW 2300, Australia', group: 2 },
  { name: 'Broome International Airport', code: 'BME', address: 'Broome Airport WA 6725, Australia', group: 2 },
  { name: 'Port Hedland International Airport', code: 'PHE', address: 'Port Hedland Airport WA 6721, Australia', group: 2 },
  { name: 'Toowoomba Wellcamp Airport', code: 'WTB', address: 'Toowoomba Wellcamp Airport QLD 4350, Australia', group: 2 },
  { name: 'Launceston Airport', code: 'LST', address: 'Launceston Airport TAS 7250, Australia', group: 3 },
  { name: 'Whitsunday Coast Airport', code: 'PPP', address: 'Proserpine Airport QLD 4800, Australia', group: 3 },
  { name: 'Alice Springs Airport', code: 'ASP', address: 'Alice Springs Airport NT 0870, Australia', group: 3 },
  { name: 'Rockhampton Airport', code: 'ROK', address: 'Rockhampton Airport QLD 4700, Australia', group: 3 },
  { name: 'Mackay Airport', code: 'MKY', address: 'Mackay Airport QLD 4740, Australia', group: 3 },
  { name: 'Ballina Byron Gateway Airport', code: 'BNK', address: 'Ballina Airport NSW 2478, Australia', group: 3 },
  { name: 'Hamilton Island Airport', code: 'HTI', address: 'Hamilton Island Airport QLD 4803, Australia', group: 3 },
  { name: 'Karratha Airport', code: 'KTA', address: 'Karratha Airport WA 6714, Australia', group: 3 },
  { name: 'Ayers Rock Airport', code: 'AYQ', address: 'Ayers Rock Airport NT 0872, Australia', group: 3 },
];

const AUSTRALIAN_CITIES: City[] = [
  { name: 'Melbourne', state: 'Victoria', address: 'Melbourne VIC, Australia', group: 1 },
  { name: 'Sydney', state: 'New South Wales', address: 'Sydney NSW, Australia', group: 1 },
  { name: 'Brisbane', state: 'Queensland', address: 'Brisbane QLD, Australia', group: 1 },
  { name: 'Perth', state: 'Western Australia', address: 'Perth WA, Australia', group: 1 },
  { name: 'Adelaide', state: 'South Australia', address: 'Adelaide SA, Australia', group: 1 },
  { name: 'Canberra', state: 'Australian Capital Territory', address: 'Canberra ACT, Australia', group: 1 },
  { name: 'Hobart', state: 'Tasmania', address: 'Hobart TAS, Australia', group: 1 },
  { name: 'Darwin', state: 'Northern Territory', address: 'Darwin NT, Australia', group: 1 },
  { name: 'Gold Coast', state: 'Queensland', address: 'Gold Coast QLD, Australia', group: 2 },
  { name: 'Newcastle', state: 'New South Wales', address: 'Newcastle NSW, Australia', group: 2 },
  { name: 'Sunshine Coast', state: 'Queensland', address: 'Sunshine Coast QLD, Australia', group: 2 },
  { name: 'Wollongong', state: 'New South Wales', address: 'Wollongong NSW, Australia', group: 2 },
  { name: 'Geelong', state: 'Victoria', address: 'Geelong VIC, Australia', group: 2 },
  { name: 'Townsville', state: 'Queensland', address: 'Townsville QLD, Australia', group: 2 },
  { name: 'Cairns', state: 'Queensland', address: 'Cairns QLD, Australia', group: 2 },
  { name: 'Toowoomba', state: 'Queensland', address: 'Toowoomba QLD, Australia', group: 2 },
  { name: 'Ballarat', state: 'Victoria', address: 'Ballarat VIC, Australia', group: 2 },
  { name: 'Bendigo', state: 'Victoria', address: 'Bendigo VIC, Australia', group: 2 },
  { name: 'Launceston', state: 'Tasmania', address: 'Launceston TAS, Australia', group: 3 },
  { name: 'Albury-Wodonga', state: 'New South Wales/Victoria', address: 'Albury NSW, Australia', group: 3 },
  { name: 'Wagga Wagga', state: 'New South Wales', address: 'Wagga Wagga NSW, Australia', group: 3 },
  { name: 'Mildura', state: 'Victoria', address: 'Mildura VIC, Australia', group: 3 },
  { name: 'Mackay', state: 'Queensland', address: 'Mackay QLD, Australia', group: 3 },
  { name: 'Bundaberg', state: 'Queensland', address: 'Bundaberg QLD, Australia', group: 3 },
  { name: 'Tamworth', state: 'New South Wales', address: 'Tamworth NSW, Australia', group: 3 },
  { name: 'Dubbo', state: 'New South Wales', address: 'Dubbo NSW, Australia', group: 3 },
  { name: 'Kalgoorlie-Boulder', state: 'Western Australia', address: 'Kalgoorlie WA, Australia', group: 3 },
  { name: 'Geraldton', state: 'Western Australia', address: 'Geraldton WA, Australia', group: 3 },
  { name: 'Port Macquarie', state: 'New South Wales', address: 'Port Macquarie NSW, Australia', group: 3 },
  { name: 'Coffs Harbour', state: 'New South Wales', address: 'Coffs Harbour NSW, Australia', group: 3 },
  { name: 'Gladstone', state: 'Queensland', address: 'Gladstone QLD, Australia', group: 3 },
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
 * Search Geoapify for places
 */
async function searchGeoapify(
  lon: number,
  lat: number,
  categories: string,
  radius: number = 50000,
  limit: number = 100
): Promise<GeoapifyPlace[]> {
  const filterStr = `circle:${lon},${lat},${radius}`;
  const biasStr = `proximity:${lon},${lat}`;
  
  const params = new URLSearchParams({
    categories,
    limit: String(limit),
    apiKey: GEOAPIFY_API_KEY!,
  });
  const url = `${GEOAPIFY_API_BASE_URL}?${params.toString()}&filter=${filterStr}&bias=${biasStr}`;
  
  try {
    const response = await axios.get(url, { timeout: 30000 });
    return response.data.features || [];
  } catch (error) {
    console.error('Geoapify API error:', error);
    return [];
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const clientIP = getClientIP(request);
  
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

    // 1. AIRPORTS - Use hardcoded list + Google Maps
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const distanceResults = await getDistancesFromGoogleMaps(
          addressForGoogleMaps,
          AUSTRALIAN_AIRPORTS.map(a => ({ address: a.address }))
        );

        const airportsWithDistance = AUSTRALIAN_AIRPORTS.map((airport, idx) => ({
          airport,
          distance: distanceResults[idx]?.distance || 0,
          duration: distanceResults[idx]?.duration || 0,
        })).filter(a => a.distance > 0);

        // Group by tier and find closest from each
        const closestByGroup: { [key: number]: typeof airportsWithDistance[0] } = {};
        airportsWithDistance.forEach(result => {
          const group = result.airport.group;
          if (!closestByGroup[group] || result.distance < closestByGroup[group].distance) {
            closestByGroup[group] = result;
          }
        });

        // Apply tier logic: Tier 3 closest → show Tier 3 + Tier 1, etc.
        const closestOverall = airportsWithDistance.sort((a, b) => a.distance - b.distance)[0];
        const closestGroup = closestOverall?.airport.group;

        const airportsToShow: typeof airportsWithDistance = [];
        if (closestGroup === 3) {
          // Tier 3 closest → show Tier 3 + Tier 1
          if (closestByGroup[3]) airportsToShow.push(closestByGroup[3]);
          if (closestByGroup[1]) airportsToShow.push(closestByGroup[1]);
        } else if (closestGroup === 2) {
          // Tier 2 closest → show Tier 2 + Tier 1
          if (closestByGroup[2]) airportsToShow.push(closestByGroup[2]);
          if (closestByGroup[1]) airportsToShow.push(closestByGroup[1]);
        } else {
          // Tier 1 closest → show Tier 1 + closest from Tier 2 & 3
          if (closestByGroup[1]) airportsToShow.push(closestByGroup[1]);
          const tier2And3 = [closestByGroup[2], closestByGroup[3]].filter(Boolean);
          if (tier2And3.length > 0) {
            tier2And3.sort((a, b) => a!.distance - b!.distance);
            airportsToShow.push(tier2And3[0]!);
          }
        }

        airportsToShow.forEach(result => {
          const { distance: distStr, time: timeStr } = formatDistanceTime(result.distance, result.duration);
          allResults.push({
            name: `${result.airport.name} (${result.airport.code})`,
            distance: result.distance,
            category: 'airport',
            formattedLine: `${distStr} (${timeStr}), ${result.airport.name} (${result.airport.code})`,
          });
        });
      } catch (error) {
        console.error('Error getting airports:', error);
      }
    }

    // 2. CAPITAL CITIES - Use hardcoded list + Google Maps (same logic as airports)
    if (GOOGLE_MAPS_API_KEY) {
      try {
        const distanceResults = await getDistancesFromGoogleMaps(
          addressForGoogleMaps,
          AUSTRALIAN_CITIES.map(c => ({ address: c.address }))
        );

        const citiesWithDistance = AUSTRALIAN_CITIES.map((city, idx) => ({
          city,
          distance: distanceResults[idx]?.distance || 0,
          duration: distanceResults[idx]?.duration || 0,
        })).filter(c => c.distance > 0);

        const closestByGroup: { [key: number]: typeof citiesWithDistance[0] } = {};
        citiesWithDistance.forEach(result => {
          const group = result.city.group;
          if (!closestByGroup[group] || result.distance < closestByGroup[group].distance) {
            closestByGroup[group] = result;
          }
        });

        const closestOverall = citiesWithDistance.sort((a, b) => a.distance - b.distance)[0];
        const closestGroup = closestOverall?.city.group;

        const citiesToShow: typeof citiesWithDistance = [];
        if (closestGroup === 3) {
          if (closestByGroup[3]) citiesToShow.push(closestByGroup[3]);
          if (closestByGroup[1]) citiesToShow.push(closestByGroup[1]);
        } else if (closestGroup === 2) {
          if (closestByGroup[2]) citiesToShow.push(closestByGroup[2]);
          if (closestByGroup[1]) citiesToShow.push(closestByGroup[1]);
        } else {
          if (closestByGroup[1]) citiesToShow.push(closestByGroup[1]);
          const tier2And3 = [closestByGroup[2], closestByGroup[3]].filter(Boolean);
          if (tier2And3.length > 0) {
            tier2And3.sort((a, b) => a!.distance - b!.distance);
            citiesToShow.push(tier2And3[0]!);
          }
        }

        citiesToShow.forEach(result => {
          const { distance: distStr, time: timeStr } = formatDistanceTime(result.distance, result.duration);
          allResults.push({
            name: `${result.city.name}, ${result.city.state}`,
            distance: result.distance,
            category: 'city',
            formattedLine: `${distStr} (${timeStr}), ${result.city.name}, ${result.city.state}`,
          });
        });
      } catch (error) {
        console.error('Error getting cities:', error);
      }
    }

    // 3. TRAIN STATIONS - Use only public_transport.train, include trams (max 10km), filter single-word names
    try {
      const trainPlaces = await searchGeoapify(lon, lat, 'public_transport.train', 100000, 50);
      const tramPlaces = await searchGeoapify(lon, lat, 'public_transport.tram', 10000, 20);

      const allTrainTram = [...trainPlaces, ...tramPlaces];

      // Filter out non-station railway features while preserving valid station names
      const validStations = allTrainTram.filter(place => {
        const name = (place.properties.name || '').trim().toLowerCase();
        const words = name.split(/\s+/);
        
        // Exclude railway societies, clubs, modellers, etc. (not actual stations)
        // These are the main false positives we want to exclude
        const excludeTerms = ['society', 'club', 'modellers', 'modeller', 'association', 'group', 'railway society'];
        if (excludeTerms.some(term => name.includes(term))) {
          return false;
        }
        
        // Exclude known problematic single-word names (like "Koala")
        // BUT trust the category for other single-word names - they might be valid stations (e.g., "Nambour", "Landsborough")
        if (words.length === 1) {
          const problematicNames = ['koala']; // Known false positives - add more as discovered
          if (problematicNames.includes(name)) {
            return false;
          }
          // Otherwise, trust the public_transport.train category - allow single-word names
        }
        
        // Trust the public_transport.train category - if it's in the category, it's likely a valid station
        // This allows valid station names like "Nambour", "Landsborough" even if they're single-word or don't contain "station"
        return true;
      });

      // Get Google Maps distances for valid stations
      if (validStations.length > 0 && GOOGLE_MAPS_API_KEY) {
        const stationsWithCoords = validStations
          .filter(place => place.geometry?.coordinates)
          .map(place => ({
            place,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }));

        if (stationsWithCoords.length > 0) {
          const distanceResults = await getDistancesFromGoogleMapsCoordinates(
            lat,
            lon,
            stationsWithCoords.map(s => ({ lat: s.lat, lon: s.lon }))
          );

          const stationsWithDistance = stationsWithCoords.map((station, idx) => ({
            ...station.place,
            calculatedDistance: distanceResults[idx]?.distance || 0,
            calculatedDuration: distanceResults[idx]?.duration || 0,
          })).filter(s => s.calculatedDistance > 0);

          stationsWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
          const closestStation = stationsWithDistance[0];

          if (closestStation) {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              closestStation.calculatedDistance,
              closestStation.calculatedDuration
            );
            let stationName = (closestStation.properties.name || '').trim();
            if (!stationName) {
              stationName = closestStation.properties.address_line1 || 'Train Station';
            }
            stationName = appendCategoryName(stationName, 'train_station');
            
            allResults.push({
              name: stationName,
              distance: closestStation.calculatedDistance,
              category: 'train_station',
              formattedLine: `${distStr} (${timeStr}), ${stationName}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting train stations:', error);
    }

    // 4. BUS STOPS
    try {
      const busPlaces = await searchGeoapify(lon, lat, 'public_transport.bus', 50000, 100);
      
      if (busPlaces.length > 0 && GOOGLE_MAPS_API_KEY) {
        const busesWithCoords = busPlaces
          .filter(place => place.geometry?.coordinates)
          .map(place => ({
            place,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }));

        if (busesWithCoords.length > 0) {
          const distanceResults = await getDistancesFromGoogleMapsCoordinates(
            lat,
            lon,
            busesWithCoords.map(b => ({ lat: b.lat, lon: b.lon }))
          );

          const busesWithDistance = busesWithCoords.map((bus, idx) => ({
            ...bus.place,
            calculatedDistance: distanceResults[idx]?.distance || 0,
            calculatedDuration: distanceResults[idx]?.duration || 0,
          })).filter(b => b.calculatedDistance > 0);

          busesWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
          const closestBus = busesWithDistance[0];

          if (closestBus) {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              closestBus.calculatedDistance,
              closestBus.calculatedDuration
            );
            let busName = (closestBus.properties.name || '').trim();
            if (!busName) {
              busName = closestBus.properties.address_line1 || 'Bus Stop';
            }
            busName = appendCategoryName(busName, 'bus_stop');
            
            allResults.push({
              name: busName,
              distance: closestBus.calculatedDistance,
              category: 'bus_stop',
              formattedLine: `${distStr} (${timeStr}), ${busName}`,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error getting bus stops:', error);
    }

    // 5. KINDERGARTEN & CHILDCARE - Combined (3-4 total)
    try {
      const kindergartenPlaces = await searchGeoapify(lon, lat, 'childcare.kindergarten', 50000, 50);
      const childcarePlaces = await searchGeoapify(lon, lat, 'childcare', 50000, 100);

      // Filter childcare to exclude kindergartens
      const childcareOnly = childcarePlaces.filter(place => {
        const categories = place.properties.categories || [];
        return !categories.some(cat => cat.includes('kindergarten'));
      });

      const combined = [
        ...kindergartenPlaces.map(p => ({ ...p, type: 'kindergarten' as const })),
        ...childcareOnly.map(p => ({ ...p, type: 'childcare' as const })),
      ];

      if (combined.length > 0 && GOOGLE_MAPS_API_KEY) {
        const placesWithCoords = combined
          .filter(place => place.geometry?.coordinates)
          .map(place => ({
            place,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }));

        if (placesWithCoords.length > 0) {
          const distanceResults = await getDistancesFromGoogleMapsCoordinates(
            lat,
            lon,
            placesWithCoords.map(p => ({ lat: p.lat, lon: p.lon }))
          );

          const placesWithDistance = placesWithCoords.map((item, idx) => ({
            ...item.place,
            calculatedDistance: distanceResults[idx]?.distance || 0,
            calculatedDuration: distanceResults[idx]?.duration || 0,
          })).filter(p => p.calculatedDistance > 0);

          placesWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
          const top3to4 = placesWithDistance.slice(0, 4);

          top3to4.forEach(place => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              place.calculatedDistance,
              place.calculatedDuration
            );
            let placeName = (place.properties.name || '').trim();
            if (!placeName) {
              placeName = place.properties.address_line1 || (place.type === 'kindergarten' ? 'Kindergarten' : 'Childcare');
            }
            placeName = appendCategoryName(placeName, place.type);
            
            allResults.push({
              name: placeName,
              distance: place.calculatedDistance,
              category: place.type,
              formattedLine: `${distStr} (${timeStr}), ${placeName}`,
            });
          });
        }
      }
    } catch (error) {
      console.error('Error getting kindergarten/childcare:', error);
    }

    // 6. SCHOOLS
    try {
      const schoolPlaces = await searchGeoapify(lon, lat, 'education.school', 50000, 100);
      
      if (schoolPlaces.length > 0 && GOOGLE_MAPS_API_KEY) {
        const schoolsWithCoords = schoolPlaces
          .filter(place => place.geometry?.coordinates)
          .map(place => ({
            place,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }));

        if (schoolsWithCoords.length > 0) {
          const distanceResults = await getDistancesFromGoogleMapsCoordinates(
            lat,
            lon,
            schoolsWithCoords.map(s => ({ lat: s.lat, lon: s.lon }))
          );

          const schoolsWithDistance = schoolsWithCoords.map((school, idx) => ({
            ...school.place,
            calculatedDistance: distanceResults[idx]?.distance || 0,
            calculatedDuration: distanceResults[idx]?.duration || 0,
          })).filter(s => s.calculatedDistance > 0);

          schoolsWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
          const top3Schools = schoolsWithDistance.slice(0, 3);

          top3Schools.forEach(school => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              school.calculatedDistance,
              school.calculatedDuration
            );
            let schoolName = (school.properties.name || '').trim();
            if (!schoolName) {
              schoolName = school.properties.address_line1 || 'School';
            }
            schoolName = appendCategoryName(schoolName, 'school');
            
            allResults.push({
              name: schoolName,
              distance: school.calculatedDistance,
              category: 'school',
              formattedLine: `${distStr} (${timeStr}), ${schoolName}`,
            });
          });
        }
      }
    } catch (error) {
      console.error('Error getting schools:', error);
    }

    // 7. SUPERMARKETS - Closest + all 4 chains
    try {
      const supermarketPlaces = await searchGeoapify(lon, lat, 'commercial.supermarket', 50000, 100);
      
      if (supermarketPlaces.length > 0 && GOOGLE_MAPS_API_KEY) {
        const supermarketsWithCoords = supermarketPlaces
          .filter(place => place.geometry?.coordinates)
          .map(place => ({
            place,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }));

        if (supermarketsWithCoords.length > 0) {
          const distanceResults = await getDistancesFromGoogleMapsCoordinates(
            lat,
            lon,
            supermarketsWithCoords.map(s => ({ lat: s.lat, lon: s.lon }))
          );

          const supermarketsWithDistance = supermarketsWithCoords.map((supermarket, idx) => ({
            ...supermarket.place,
            calculatedDistance: distanceResults[idx]?.distance || 0,
            calculatedDuration: distanceResults[idx]?.duration || 0,
          })).filter(s => s.calculatedDistance > 0);

          supermarketsWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);

          const chains = [
            { name: 'Woolworths', keywords: ['woolworths', 'woolies'] },
            { name: 'Coles', keywords: ['coles'] },
            { name: 'IGA', keywords: ['iga'] },
            { name: 'Aldi', keywords: ['aldi'] },
          ];

          const foundChains: typeof supermarketsWithDistance = [];
          const chainNames = new Set<string>();

          // Find closest of each chain
          for (const chain of chains) {
            const chainStore = supermarketsWithDistance.find(store => {
              const storeName = (store.properties.name || '').toLowerCase();
              return chain.keywords.some(keyword => storeName.includes(keyword));
            });
            if (chainStore) {
              foundChains.push(chainStore);
              chainNames.add(chain.name.toLowerCase());
            }
          }

          // Always include closest (even if not one of the big 4)
          const closestOverall = supermarketsWithDistance[0];
          if (closestOverall) {
            const closestName = (closestOverall.properties.name || '').toLowerCase();
            const isChain = chains.some(chain => 
              chain.keywords.some(keyword => closestName.includes(keyword))
            );
            
            if (!isChain || !foundChains.includes(closestOverall)) {
              foundChains.unshift(closestOverall);
            }
          }

          foundChains.forEach(store => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              store.calculatedDistance,
              store.calculatedDuration
            );
            let storeName = (store.properties.name || '').trim();
            if (!storeName) {
              storeName = store.properties.address_line1 || 'Supermarket';
            }
            // Append "Supermarket" if missing
            storeName = appendCategoryName(storeName, 'supermarket');
            
            allResults.push({
              name: storeName,
              distance: store.calculatedDistance,
              category: 'supermarket',
              formattedLine: `${distStr} (${timeStr}), ${storeName}`,
            });
          });
        }
      }
    } catch (error) {
      console.error('Error getting supermarkets:', error);
    }

    // 8. HOSPITALS - Prioritize ED hospitals
    try {
      const hospitalPlaces = await searchGeoapify(lon, lat, 'healthcare.hospital', 50000, 50);
      
      if (hospitalPlaces.length > 0 && GOOGLE_MAPS_API_KEY) {
        const hospitalsWithCoords = hospitalPlaces
          .filter(place => place.geometry?.coordinates)
          .map(place => ({
            place,
            lat: place.geometry.coordinates[1],
            lon: place.geometry.coordinates[0],
          }));

        if (hospitalsWithCoords.length > 0) {
          const distanceResults = await getDistancesFromGoogleMapsCoordinates(
            lat,
            lon,
            hospitalsWithCoords.map(h => ({ lat: h.lat, lon: h.lon }))
          );

          const hospitalsWithDistance = hospitalsWithCoords.map((hospital, idx) => ({
            ...hospital.place,
            calculatedDistance: distanceResults[idx]?.distance || 0,
            calculatedDuration: distanceResults[idx]?.duration || 0,
          })).filter(h => h.calculatedDistance > 0);

          // Identify ED hospitals
          const emergencyKeywords = ['emergency', 'ed ', 'emergency department', 'a&e', 'accident', 'casualty'];
          const publicHospitalKeywords = ['public hospital', 'general hospital', 'base hospital', 'district hospital'];
          const majorHospitalIndicators = ['prince', 'royal', 'queen', 'king', 'university hospital'];

          const hospitalsWithED = hospitalsWithDistance.filter(hospital => {
            const name = (hospital.properties.name || '').toLowerCase();
            const hasEDKeyword = emergencyKeywords.some(keyword => name.includes(keyword));
            const isSpecialtyOnly = name.includes('rehab') || name.includes('rehabilitation') ||
                                   name.includes('psychiatric') || name.includes('mental health') ||
                                   name.includes('psychology') || (name.includes('private') && name.includes('rehab'));
            
            if (isSpecialtyOnly) return false;
            
            const isPublicHospital = publicHospitalKeywords.some(keyword => name.includes(keyword));
            const isMajorHospital = majorHospitalIndicators.some(keyword => name.includes(keyword)) && 
                                   !name.includes('private');
            
            return hasEDKeyword || isPublicHospital || isMajorHospital;
          });

          hospitalsWithED.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
          hospitalsWithDistance.sort((a, b) => a.calculatedDistance - b.calculatedDistance);

          const selectedHospitals: typeof hospitalsWithDistance = [];
          const selectedPlaceIds = new Set<string>();

          // Always include closest ED hospital if available
          if (hospitalsWithED.length > 0) {
            selectedHospitals.push(hospitalsWithED[0]);
            if (hospitalsWithED[0].properties.place_id) {
              selectedPlaceIds.add(hospitalsWithED[0].properties.place_id);
            }
          }

          // Fill remaining slots with closest hospitals
          for (const hospital of hospitalsWithDistance) {
            if (selectedHospitals.length >= 2) break;
            const placeId = hospital.properties.place_id || '';
            if (!selectedPlaceIds.has(placeId)) {
              selectedHospitals.push(hospital);
              if (placeId) selectedPlaceIds.add(placeId);
            }
          }

          selectedHospitals.forEach(hospital => {
            const { distance: distStr, time: timeStr } = formatDistanceTime(
              hospital.calculatedDistance,
              hospital.calculatedDuration
            );
            let hospitalName = (hospital.properties.name || '').trim();
            if (!hospitalName) {
              hospitalName = hospital.properties.address_line1 || 'Hospital';
            }
            
            allResults.push({
              name: hospitalName,
              distance: hospital.calculatedDistance,
              category: 'hospital',
              formattedLine: `${distStr} (${timeStr}), ${hospitalName}`,
            });
          });
        }
      }
    } catch (error) {
      console.error('Error getting hospitals:', error);
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
    
    // Check cost threshold (rough estimate: ~26 Distance Matrix calls per proximity request)
    // $5 per 1000 Distance Matrix calls
    const estimatedCost = (26 / 1000) * 5; // ~$0.13 per request
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
    });
    
    // Add CORS headers
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    
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
