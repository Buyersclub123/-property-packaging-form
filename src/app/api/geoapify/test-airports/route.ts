import { NextResponse } from 'next/server';
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!GOOGLE_MAPS_API_KEY) {
  throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
}

// Hardcoded list of major Australian airports organized by group
// Based on: property-review-system/docs/Airport-List.txt

interface Airport {
  name: string;
  code: string;
  address: string; // Full address for Google Maps geocoding
  group: 1 | 2 | 3; // 1 = Primary Gateways, 2 = Secondary/Restricted International, 3 = Major Domestic/Regional
}

const AUSTRALIAN_AIRPORTS: Airport[] = [
  // Group 1: Primary Gateways (Major International Hubs)
  { name: 'Sydney Kingsford Smith Airport', code: 'SYD', address: 'Sydney Airport NSW 2020, Australia', group: 1 },
  { name: 'Melbourne Airport', code: 'MEL', address: 'Melbourne Airport VIC 3045, Australia', group: 1 },
  { name: 'Brisbane Airport', code: 'BNE', address: 'Brisbane Airport QLD 4008, Australia', group: 1 },
  { name: 'Perth Airport', code: 'PER', address: 'Perth Airport WA 6105, Australia', group: 1 },
  { name: 'Adelaide Airport', code: 'ADL', address: 'Adelaide Airport SA 5950, Australia', group: 1 },
  { name: 'Cairns Airport', code: 'CNS', address: 'Cairns Airport QLD 4870, Australia', group: 1 },
  { name: 'Darwin International Airport', code: 'DRW', address: 'Darwin Airport NT 0820, Australia', group: 1 },
  
  // Group 2: Secondary & Restricted International Airports
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
  
  // Group 3: Major Domestic & Regional Hubs
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

interface DistanceMatrixResult {
  airport: Airport;
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
 * Call Google Maps Distance Matrix API to get distances/times from origin to all airports
 */
async function getDistancesFromGoogleMaps(
  originAddress: string,
  airports: Airport[]
): Promise<DistanceMatrixResult[]> {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('GOOGLE_MAPS_API_KEY not configured. Please add it to your .env.local file.');
  }

  // Google Maps Distance Matrix API allows up to 25 destinations per request
  // We have 26 airports, so we'll need to batch them
  const batchSize = 25;
  const results: DistanceMatrixResult[] = [];
  const departureTime = getNextWednesday9AM();

  for (let i = 0; i < airports.length; i += batchSize) {
    const batch = airports.slice(i, i + batchSize);
    const destinations = batch.map(a => a.address).join('|');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?` +
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
      batch.forEach((airport, index) => {
        const element = elements[index];
        if (element.status === 'OK') {
          results.push({
            airport,
            distance: element.distance,
            duration: element.duration_in_traffic || element.duration, // Prefer traffic-adjusted duration
          });
        } else {
          console.warn(`Failed to get distance for ${airport.name}: ${element.status}`);
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
      const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY;
      if (!GEOSCAPE_API_KEY) {
        throw new Error('NEXT_PUBLIC_GEOSCAPE_API_KEY environment variable is required');
      }
      
      const geocodeResponse = await axios.get('https://api.psma.com.au/v2/addresses/geocoder', {
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

    console.log('Airport search - origin:', { address: addressForGoogleMaps, lat, lon });

    // Get distances to all airports using Google Maps Distance Matrix API
    const distanceResults = await getDistancesFromGoogleMaps(addressForGoogleMaps, AUSTRALIAN_AIRPORTS);

    if (distanceResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Could not calculate distances to airports',
        coordinates: { lat, lon },
      }, { status: 500 });
    }

    // Find closest airport from each group
    const closestByGroup: { [key: number]: DistanceMatrixResult } = {};

    distanceResults.forEach(result => {
      const group = result.airport.group;
      if (!closestByGroup[group] || result.distance.value < closestByGroup[group].distance.value) {
        closestByGroup[group] = result;
      }
    });

    // Format output - one airport from each group
    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    // Add closest airport from each group (sorted by group number)
    [1, 2, 3].forEach(groupNum => {
      const result = closestByGroup[groupNum];
      if (result) {
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

        formattedLines.push(`${distanceStr} (${timeStr}), ${result.airport.name} (${result.airport.code})`);
      }
    });

    return NextResponse.json({
      success: true,
      airports: formattedLines.join('\n'),
      count: Object.keys(closestByGroup).length,
      airportsByGroup: {
        group1: closestByGroup[1] ? {
          name: closestByGroup[1].airport.name,
          code: closestByGroup[1].airport.code,
          distance: closestByGroup[1].distance.value,
          duration: closestByGroup[1].duration.value,
        } : null,
        group2: closestByGroup[2] ? {
          name: closestByGroup[2].airport.name,
          code: closestByGroup[2].airport.code,
          distance: closestByGroup[2].distance.value,
          duration: closestByGroup[2].duration.value,
        } : null,
        group3: closestByGroup[3] ? {
          name: closestByGroup[3].airport.name,
          code: closestByGroup[3].airport.code,
          distance: closestByGroup[3].distance.value,
          duration: closestByGroup[3].duration.value,
        } : null,
      },
      coordinates: { lat, lon },
    });
  } catch (error) {
    console.error('Error in airport test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get airports';
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
