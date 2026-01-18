import { NextResponse } from 'next/server';
import axios from 'axios';

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY;
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

    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
    } else if (propertyAddress) {
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
    } else {
      return NextResponse.json({ success: false, error: 'Property address or coordinates required' }, { status: 400 });
    }

    const categoryList = 'education.school';
    const filterStr = `circle:${lon},${lat},50000`;
    const biasStr = `proximity:${lon},${lat}`;
    
    const params = new URLSearchParams({
      categories: categoryList,
      limit: '100',
      apiKey: GEOAPIFY_API_KEY!,
    });
    const url = `https://api.geoapify.com/v2/places?${params.toString()}&filter=${filterStr}&bias=${biasStr}`;
    
    const response = await axios.get(url, { timeout: 30000 });
    const data: GeoapifyResponse = response.data;
    
    const schools = (data.features || []).filter(place => 
      place.properties.categories?.some(cat => cat.includes('school'))
    );

    const schoolsWithDistance = schools.map(place => {
      let distance = place.properties.distance;
      if (!distance && place.geometry?.coordinates) {
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

    schoolsWithDistance.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));
    
    // Take closest 3 schools (required count: 3)
    const closestSchools = schoolsWithDistance.slice(0, 3);
    
    if (closestSchools.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No schools found',
        coordinates: { lat, lon },
      }, { status: 404 });
    }

    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    for (const school of closestSchools) {
      const distanceMeters = school.calculatedDistance || 0;
      const km = distanceMeters / 1000;
      
      let distanceStr: string;
      if (km < 1) {
        distanceStr = `${Math.round(distanceMeters)} m`;
      } else {
        distanceStr = `${km.toFixed(1)} km`;
      }
      
      const timeMins = Math.max(1, Math.round(km / 1.2));
      const hours = Math.floor(timeMins / 60);
      const mins = timeMins % 60;
      let timeStr: string;
      if (hours > 0) {
        timeStr = `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
      } else {
        timeStr = `${timeMins} min${timeMins !== 1 ? 's' : ''}`;
      }
      
      let schoolName = (school.properties.name || '').trim();
      if (!schoolName) {
        schoolName = school.properties.address_line1 || 'School';
      }
      
      formattedLines.push(`${distanceStr} (${timeStr}), ${schoolName}`);
    }

    return NextResponse.json({
      success: true,
      schools: formattedLines.join('\n'),
      count: closestSchools.length,
      schoolDetails: closestSchools.map(s => ({
        name: (s.properties.name || s.properties.address_line1 || 'School').trim(),
        distance: s.calculatedDistance,
      })),
      coordinates: { lat, lon },
    });
  } catch (error) {
    console.error('Error in schools test:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get schools' },
      { status: 500 }
    );
  }
}
