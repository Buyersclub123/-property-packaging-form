import { NextResponse } from 'next/server';
import axios from 'axios';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY || '61cf69f5359f4d5197a72214a78164c9';

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
      const geocodeResponse = await axios.get('https://api.psma.com.au/v2/addresses/geocoder', {
        params: { address: propertyAddress },
        headers: {
          'Authorization': process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY || 'VfqDRW796v5jGTfXcHgJXDdoGi7DENZA',
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

    // Search ONLY for airports - 100km radius
    // Use URLSearchParams for standard params, but append filter/bias manually (not encoded)
    const categoryList = 'airport'; // Use broader 'airport' to catch all airports
    const filterStr = `circle:${lon},${lat},100000`;
    const biasStr = `proximity:${lon},${lat}`;
    
    // Build query string with URLSearchParams for standard params
    const params = new URLSearchParams({
      categories: categoryList,
      limit: '100',
      apiKey: GEOAPIFY_API_KEY,
    });
    // Append filter and bias manually (NOT encoded - Geoapify expects : and , as-is)
    const url = `https://api.geoapify.com/v2/places?${params.toString()}&filter=${filterStr}&bias=${biasStr}`;
    
    console.log('Airport search - coords:', { lat, lon });
    console.log('Airport search - URL:', url.replace(GEOAPIFY_API_KEY, '***'));
    
    const response = await axios.get(url, {
      timeout: 30000,
    });

    const data: GeoapifyResponse = response.data;
    console.log('Airport search - response features count:', data.features?.length || 0);
    
    // Debug: log all features and their categories
    if (data.features && data.features.length > 0) {
      console.log('Airport search - all features:', JSON.stringify(data.features.slice(0, 5).map(f => ({
        name: f.properties.name,
        categories: f.properties.categories
      })), null, 2));
    } else {
      console.log('Airport search - NO FEATURES RETURNED FROM API');
    }
    
    // Filter to only include places with airport category
    const airports = (data.features || []).filter(place => 
      place.properties.categories?.some(cat => cat.includes('airport'))
    );
    console.log('Airport search - filtered airports count:', airports.length);
    
    if (airports.length === 0 && data.features?.length > 0) {
      console.log('No airports found, but got results. Sample categories:', data.features[0]?.properties.categories);
    }

    // Calculate distances
    const airportsWithDistance = airports.map(place => {
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
    airportsWithDistance.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));

    // Format output
    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    for (const airport of airportsWithDistance) {
      const km = (airport.calculatedDistance || 0) / 1000;
      const distanceStr = km.toFixed(1);
      formattedLines.push(`${distanceStr} km, ${airport.properties.name}`);
    }

    return NextResponse.json({
      success: true,
      airports: formattedLines.join('\n'),
      count: airportsWithDistance.length,
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
