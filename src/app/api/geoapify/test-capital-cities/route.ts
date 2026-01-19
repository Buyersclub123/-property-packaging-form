import { NextResponse } from 'next/server';
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_API_BASE_URL = process.env.GOOGLE_MAPS_API_BASE_URL || 'https://maps.googleapis.com/maps/api/distancematrix/json';
const PSMA_API_ENDPOINT = process.env.PSMA_API_ENDPOINT || 'https://api.psma.com.au/v2/addresses/geocoder';

if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
}

const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY;
if (!GEOSCAPE_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEOSCAPE_API_KEY environment variable is required');
}

// Hardcoded list of major Australian cities organized by group
// Based on: property-review-system/docs/City-List.txt

interface City {
  name: string;
  state: string;
  address: string; // Full address for Google Maps geocoding
  group: 1 | 2 | 3; // 1 = Primary Gateways, 2 = Secondary/Satellite, 3 = Regional Service Hubs
}

const AUSTRALIAN_CITIES: City[] = [
  // Group 1: Primary Gateways (Capital Cities & Major Metropolises)
  { name: 'Melbourne', state: 'Victoria', address: 'Melbourne VIC, Australia', group: 1 },
  { name: 'Sydney', state: 'New South Wales', address: 'Sydney NSW, Australia', group: 1 },
  { name: 'Brisbane', state: 'Queensland', address: 'Brisbane QLD, Australia', group: 1 },
  { name: 'Perth', state: 'Western Australia', address: 'Perth WA, Australia', group: 1 },
  { name: 'Adelaide', state: 'South Australia', address: 'Adelaide SA, Australia', group: 1 },
  { name: 'Canberra', state: 'Australian Capital Territory', address: 'Canberra ACT, Australia', group: 1 },
  { name: 'Hobart', state: 'Tasmania', address: 'Hobart TAS, Australia', group: 1 },
  { name: 'Darwin', state: 'Northern Territory', address: 'Darwin NT, Australia', group: 1 },
  
  // Group 2: Secondary & Satellite Cities (Significant Urban Areas)
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
  
  // Group 3: Regional Service Hubs (Major Regional Centers)
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

interface DistanceMatrixResult {
  city: City;
  distance: {
    text: string;
    value: number; // meters
  };
  duration: {
    text: string;
    value: number; // seconds
  };
}

/**
 * Get next Wednesday 9 AM in seconds since epoch
 * Used for Google Maps Distance Matrix API departure_time parameter
 */
function getNextWednesday9AM(): number {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 3 = Wednesday
  const daysUntilWednesday = (3 - currentDay + 7) % 7 || 7; // Days until next Wednesday
  
  const nextWednesday = new Date(now);
  nextWednesday.setDate(now.getDate() + daysUntilWednesday);
  nextWednesday.setHours(9, 0, 0, 0); // 9 AM
  
  return Math.floor(nextWednesday.getTime() / 1000); // Convert to seconds
}

/**
 * Call Google Maps Distance Matrix API to get distances/times from origin to all cities
 */
async function getDistancesFromGoogleMaps(
  originAddress: string,
  cities: City[]
): Promise<DistanceMatrixResult[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured. Please add it to your .env.local file.');
  }

  // Google Maps Distance Matrix API allows up to 25 destinations per request
  // We have 31 cities, so we'll need to batch them
  const batchSize = 25;
  const results: DistanceMatrixResult[] = [];
  const departureTime = getNextWednesday9AM();

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    const destinations = batch.map(c => c.address).join('|');

    const url = `${GOOGLE_MAPS_API_BASE_URL}?` +
      `origins=${encodeURIComponent(originAddress)}` +
      `&destinations=${encodeURIComponent(destinations)}` +
      `&departure_time=${departureTime}` +
      `&traffic_model=best_guess` +
      `&mode=driving` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await axios.get(url, { timeout: 30000 });
      
      if (response.data.status !== 'OK') {
        console.error('Google Maps Distance Matrix API error:', response.data.status, response.data.error_message);
        throw new Error(`Google Maps API error: ${response.data.status} - ${response.data.error_message || 'Unknown error'}`);
      }

      const rows = response.data.rows;
      if (!rows || rows.length === 0) {
        console.warn('No rows returned from Google Maps API');
        continue;
      }

      const elements = rows[0].elements;
      batch.forEach((city, index) => {
        const element = elements[index];
        if (element.status === 'OK') {
          results.push({
            city,
            distance: element.distance,
            duration: element.duration_in_traffic || element.duration, // Prefer traffic-adjusted duration
          });
        } else {
          console.warn(`Failed to get distance for ${city.name}: ${element.status}`);
        }
      });
    } catch (error) {
      console.error(`Error fetching distances for batch ${i}-${i + batchSize}:`, error);
      throw error;
    }
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const { propertyAddress, latitude, longitude } = await request.json();

    let lat: number;
    let lon: number;
    let addressForGoogleMaps: string;

    // Get coordinates and address for Google Maps
    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
      // Use coordinates as origin if address not provided
      addressForGoogleMaps = propertyAddress || `${lat},${lon}`;
    } else if (propertyAddress) {
      // Geocode using Geoscape to get coordinates
      const geocodeResponse = await axios.get(PSMA_API_ENDPOINT, {
        params: { address: propertyAddress },
        headers: {
          'Authorization': GEOSCAPE_API_KEY,
          'Accept': 'application/json',
        },
        timeout: 10000,
      });

      const features = geocodeResponse.data?.data?.features || geocodeResponse.data?.features || [];
      if (features.length === 0) {
        return NextResponse.json({ success: false, error: 'Could not geocode address' }, { status: 400 });
      }

      const coords = features[0].geometry?.coordinates;
      lon = coords[0];
      lat = coords[1];
      addressForGoogleMaps = propertyAddress;
    } else {
      return NextResponse.json({ success: false, error: 'Property address or coordinates required' }, { status: 400 });
    }

    console.log('City search - origin:', { address: addressForGoogleMaps, lat, lon });

    // Get distances to all cities using Google Maps Distance Matrix API
    const distanceResults = await getDistancesFromGoogleMaps(addressForGoogleMaps, AUSTRALIAN_CITIES);

    if (distanceResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not calculate distances to cities',
        coordinates: { lat, lon },
      }, { status: 500 });
    }

    // Find 2 closest cities from each group
    const closestByGroup: { [key: number]: DistanceMatrixResult[] } = {
      1: [],
      2: [],
      3: [],
    };

    // Sort all results by distance
    distanceResults.sort((a, b) => a.distance.value - b.distance.value);

    // Group results by category
    distanceResults.forEach(result => {
      const group = result.city.group;
      if (closestByGroup[group].length < 2) {
        closestByGroup[group].push(result);
      }
    });

    // Format output - 2 cities from each group
    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    // Add 2 closest cities from each group (sorted by group number)
    [1, 2, 3].forEach(groupNum => {
      const groupResults = closestByGroup[groupNum];
      groupResults.forEach(result => {
        const distanceKm = result.distance.value / 1000;
        const distanceStr = distanceKm < 1 
          ? `${Math.round(result.distance.value)} m`
          : `${distanceKm.toFixed(1)} km`;
        
        const durationMinutes = Math.round(result.duration.value / 60);
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        const timeStr = hours > 0
          ? `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`
          : `${durationMinutes} min${durationMinutes !== 1 ? 's' : ''}`;

        formattedLines.push(`${distanceStr} (${timeStr}), ${result.city.name}, ${result.city.state}`);
      });
    });

    return NextResponse.json({
      success: true,
      capitalCities: formattedLines.join('\n'),
      count: closestByGroup[1].length + closestByGroup[2].length + closestByGroup[3].length,
      citiesByGroup: {
        group1: closestByGroup[1].map(r => ({
          name: r.city.name,
          state: r.city.state,
          distance: r.distance.value,
          duration: r.duration.value,
        })),
        group2: closestByGroup[2].map(r => ({
          name: r.city.name,
          state: r.city.state,
          distance: r.distance.value,
          duration: r.duration.value,
        })),
        group3: closestByGroup[3].map(r => ({
          name: r.city.name,
          state: r.city.state,
          distance: r.distance.value,
          duration: r.duration.value,
        })),
      },
      coordinates: { lat, lon },
    });
  } catch (error) {
    console.error('Error in capital cities test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get capital cities';
    const errorDetails = axios.isAxiosError(error) ? {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    } : null;
    return NextResponse.json(
      { success: false, error: errorMessage, details: errorDetails },
      { status: 500 }
    );
  }
}
