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

    const categoryList = 'healthcare.hospital';
    const filterStr = `circle:${lon},${lat},50000`;
    const biasStr = `proximity:${lon},${lat}`;
    
    const params = new URLSearchParams({
      categories: categoryList,
      limit: '50',
      apiKey: GEOAPIFY_API_KEY!,
    });
    const url = `https://api.geoapify.com/v2/places?${params.toString()}&filter=${filterStr}&bias=${biasStr}`;
    
    const response = await axios.get(url, { timeout: 30000 });
    const data: GeoapifyResponse = response.data;
    
    const hospitals = (data.features || []).filter(place => 
      place.properties.categories?.some(cat => cat.includes('hospital'))
    );

    const hospitalsWithDistance = hospitals.map(place => {
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

    // Identify hospitals with emergency departments
    // Check by name keywords (generic for all Australian hospitals)
    // Major public hospitals typically have EDs even if not in name
    const emergencyKeywords = ['emergency', 'ed ', 'emergency department', 'a&e', 'accident', 'casualty'];
    const publicHospitalKeywords = ['public hospital', 'general hospital', 'base hospital', 'district hospital'];
    const majorHospitalIndicators = ['prince', 'royal', 'queen', 'king', 'university hospital'];
    
    const hospitalsWithED = hospitalsWithDistance.filter(hospital => {
      const name = (hospital.properties.name || '').toLowerCase();
      // Check for explicit ED keywords
      const hasEDKeyword = emergencyKeywords.some(keyword => name.includes(keyword));
      
      // Exclude specialty hospitals that typically don't have EDs
      const isSpecialtyOnly = name.includes('rehab') || 
                             name.includes('rehabilitation') ||
                             name.includes('psychiatric') || 
                             name.includes('mental health') ||
                             name.includes('psychology') ||
                             (name.includes('private') && name.includes('rehab'));
      
      if (isSpecialtyOnly) return false;
      
      // Check for major public hospital indicators (these typically have EDs)
      const isPublicHospital = publicHospitalKeywords.some(keyword => name.includes(keyword));
      const isMajorHospital = majorHospitalIndicators.some(keyword => name.includes(keyword)) && 
                             !name.includes('private');
      
      return hasEDKeyword || isPublicHospital || isMajorHospital;
    });
    
    // Sort all hospitals by distance
    hospitalsWithDistance.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));
    
    // Sort ED hospitals by distance
    hospitalsWithED.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));
    
    // Build result: ensure at least one ED hospital, then fill with closest hospitals
    const selectedHospitals: typeof hospitalsWithDistance = [];
    const selectedPlaceIds = new Set<string>();
    
    // Always include closest ED hospital if available
    if (hospitalsWithED.length > 0) {
      const edHospital = hospitalsWithED[0];
      selectedHospitals.push(edHospital);
      if (edHospital.properties.place_id) {
        selectedPlaceIds.add(edHospital.properties.place_id);
      }
      console.log('Including ED hospital:', edHospital.properties.name);
    }
    
    // Fill remaining slots with closest hospitals (excluding already selected)
    for (const hospital of hospitalsWithDistance) {
      if (selectedHospitals.length >= 2) break;
      const placeId = hospital.properties.place_id || '';
      if (!selectedPlaceIds.has(placeId)) {
        selectedHospitals.push(hospital);
        if (placeId) selectedPlaceIds.add(placeId);
      }
    }
    
    // If we still don't have 2 and have ED hospitals, prefer ED hospitals
    if (selectedHospitals.length < 2 && hospitalsWithED.length > 1) {
      for (const edHospital of hospitalsWithED.slice(1)) {
        if (selectedHospitals.length >= 2) break;
        const placeId = edHospital.properties.place_id || '';
        if (!selectedPlaceIds.has(placeId)) {
          selectedHospitals.push(edHospital);
          if (placeId) selectedPlaceIds.add(placeId);
        }
      }
    }
    
    const closestHospitals = selectedHospitals.slice(0, 2);
    
    if (closestHospitals.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hospitals found',
        coordinates: { lat, lon },
      }, { status: 404 });
    }

    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    for (const hospital of closestHospitals) {
      const distanceMeters = hospital.calculatedDistance || 0;
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
      
      let hospitalName = (hospital.properties.name || '').trim();
      if (!hospitalName) {
        hospitalName = hospital.properties.address_line1 || 'Hospital';
      }
      
      formattedLines.push(`${distanceStr} (${timeStr}), ${hospitalName}`);
    }

    return NextResponse.json({
      success: true,
      hospitals: formattedLines.join('\n'),
      count: closestHospitals.length,
      hospitalDetails: closestHospitals.map(h => ({
        name: (h.properties.name || h.properties.address_line1 || 'Hospital').trim(),
        distance: h.calculatedDistance,
      })),
      coordinates: { lat, lon },
    });
  } catch (error) {
    console.error('Error in hospitals test:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get hospitals' },
      { status: 500 }
    );
  }
}
