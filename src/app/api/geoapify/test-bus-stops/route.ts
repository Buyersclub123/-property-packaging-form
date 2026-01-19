import { NextResponse } from 'next/server';
import axios from 'axios';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
const GEOAPIFY_API_BASE_URL = process.env.GEOAPIFY_API_BASE_URL || 'https://api.geoapify.com/v2/places';
const PSMA_API_ENDPOINT = process.env.PSMA_API_ENDPOINT || 'https://api.psma.com.au/v2/addresses/geocoder';

if (!GEOAPIFY_API_KEY) {
  throw new Error('GEOAPIFY_API_KEY environment variable is required');
}

const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY;
if (!GEOSCAPE_API_KEY) {
  throw new Error('NEXT_PUBLIC_GEOSCAPE_API_KEY environment variable is required');
}

interface GeoapifyPlace {
  properties: {
    name: string;
    categories: string[];
    address_line1?: string;
    distance?: number;
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface GeoapifyResponse {
  type: string;
  features: GeoapifyPlace[];
}

export async function POST(request: Request) {
  try {
    const { propertyAddress, latitude, longitude } = await request.json();

    let lat: number;
    let lon: number;

    // Get coordinates from address or provided coords
    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
    } else if (propertyAddress) {
      // Geocode using Geoscape
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
    } else {
      return NextResponse.json({ success: false, error: 'Property address or coordinates required' }, { status: 400 });
    }

    // Search for bus stops - 50km radius
    const categoryList = 'public_transport.bus';
    const filterStr = `circle:${lon},${lat},50000`;
    const biasStr = `proximity:${lon},${lat}`;
    
    const params = new URLSearchParams({
      categories: categoryList,
      limit: '100',
      apiKey: GEOAPIFY_API_KEY!,
    });
    const url = `${GEOAPIFY_API_BASE_URL}?${params.toString()}&filter=${filterStr}&bias=${biasStr}`;
    
    console.log('Bus stop search - coords:', { lat, lon });
    console.log('Bus stop search - URL:', GEOAPIFY_API_KEY ? url.replace(GEOAPIFY_API_KEY, '***') : url);
    
    let busStops: GeoapifyPlace[] = [];
    
    try {
      const response = await axios.get(url, {
        timeout: 30000,
      });

      const data: GeoapifyResponse = response.data;
      console.log('Bus stop search - response features count:', data.features?.length || 0);
      
      // Filter to only include places with bus category
      busStops = (data.features || []).filter(place => 
        place.properties.categories?.some(cat => cat.includes('bus'))
      );
      console.log('Bus stop search - filtered bus stops:', busStops.length);
      
      // Debug: log all bus stops found
      if (busStops.length > 0) {
        console.log('Bus stop search - sample bus stops:', busStops.slice(0, 5).map(f => ({
          name: f.properties.name,
          categories: f.properties.categories,
          distance: f.properties.distance
        })));
      } else {
        console.log('Bus stop search - NO BUS STOPS FOUND');
      }
    } catch (error: any) {
      console.error('Error searching for bus stops:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }

    // Calculate distances
    const busStopsWithDistance = busStops.map(place => {
      let distance = place.properties.distance;
      if (!distance && place.geometry?.coordinates) {
        // Haversine distance
        const R = 6371000;
        const [lon1, lat1] = [lon, lat];
        const [lon2, lat2] = place.geometry.coordinates;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;
      }
      return { ...place, calculatedDistance: distance || 0 };
    });

    // Sort by distance
    busStopsWithDistance.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));

    // Take only the closest bus stop (required count: 1)
    const closestBusStop = busStopsWithDistance[0];
    
    if (!closestBusStop) {
      return NextResponse.json({
        success: false,
        error: 'No bus stops found',
        coordinates: { lat, lon },
      }, { status: 404 });
    }

    // Format output with distance and time
    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    // Format the closest bus stop
    const busStop = closestBusStop;
    const distanceMeters = busStop.calculatedDistance || 0;
    const km = distanceMeters / 1000;
    
    // Format distance
    let distanceStr: string;
    if (km < 1) {
      const meters = Math.round(distanceMeters);
      distanceStr = `${meters} m`;
    } else {
      distanceStr = `${km.toFixed(1)} km`;
    }
    
    // Estimate travel time (driving)
    // Average speed: ~60% city (0.83 km/min), 40% highway (1.67 km/min) = ~1.2 km/min
    const timeMins = Math.max(1, Math.round(km / 1.2));
    const hours = Math.floor(timeMins / 60);
    const mins = timeMins % 60;
    let timeStr: string;
    if (hours > 0) {
      timeStr = `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
    } else {
      timeStr = `${timeMins} min${timeMins !== 1 ? 's' : ''}`;
    }
    
    // CRITICAL: Ensure name includes "Bus Stop" suffix
    // If name is just a road name (e.g., "Sunshine Cove Way"), add "Bus Stop"
    // Use name, or fallback to address_line1, or generic "Bus Stop"
    let busStopName = (busStop.properties.name || '').trim();
    if (!busStopName) {
      busStopName = busStop.properties.address_line1 || 'Bus Stop';
    }
    
    const lowerName = busStopName.toLowerCase();
    
    // Check if name already includes bus stop indicators
    const hasBusStopIndicator = 
      lowerName.includes('bus stop') || 
      lowerName.includes('busstop') ||
      (lowerName.includes('bus') && lowerName.includes('stop'));
    
    // If name looks like just a road name (ends with road suffix, short, no bus indicator)
    const roadEndings = [' road', ' street', ' way', ' avenue', ' drive', ' circuit', ' lane', ' place', ' boulevard', ' crescent', ' close', ' court', ' terrace'];
    const looksLikeRoadOnly = roadEndings.some(ending => lowerName.endsWith(ending)) && 
                              lowerName.length < 30 && 
                              !hasBusStopIndicator;
    
    if (looksLikeRoadOnly || !hasBusStopIndicator) {
      // Add "Bus Stop" suffix (only if it doesn't already have it)
      if (!lowerName.endsWith(' bus stop') && !lowerName.endsWith('bus stop')) {
        busStopName = `${busStopName} Bus Stop`;
      }
    }
    
    formattedLines.push(`${distanceStr} (${timeStr}), ${busStopName}`);

    return NextResponse.json({
      success: true,
      busStop: formattedLines.join('\n'),
      count: 1,
      busStopDetails: {
        name: busStopName,
        originalName: busStop.properties.name || busStop.properties.address_line1 || 'N/A',
        distance: busStop.calculatedDistance,
        coordinates: { lat, lon },
      },
      coordinates: { lat, lon },
    });
  } catch (error) {
    console.error('Error in bus stop test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get bus stops';
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
