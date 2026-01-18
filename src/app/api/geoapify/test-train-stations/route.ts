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

    // Get coordinates from address or provided coords
    if (latitude && longitude) {
      lat = latitude;
      lon = longitude;
    } else if (propertyAddress) {
      // Geocode using Geoscape
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

    // Search for train stations - start with 50km, expand to 100km if needed
    // Use both categories but prioritize public_transport.train (passenger stations)
    const categoryList = 'public_transport.train,railway.train';
    
    let trainStations: GeoapifyPlace[] = [];
    let allTrainPlaces: GeoapifyPlace[] = [];
    let searchRadius = 50000; // Start with 50km
    
    // First try: 50km radius
    const filterStr50 = `circle:${lon},${lat},${searchRadius}`;
    const biasStr = `proximity:${lon},${lat}`;
    
    const params50 = new URLSearchParams({
      categories: categoryList,
      limit: '50',
      apiKey: GEOAPIFY_API_KEY!,
    });
    const url50 = `https://api.geoapify.com/v2/places?${params50.toString()}&filter=${filterStr50}&bias=${biasStr}`;
    
    console.log('Train station search - coords:', { lat, lon });
    console.log('Train station search - Initial 50km URL:', GEOAPIFY_API_KEY ? url50.replace(GEOAPIFY_API_KEY, '***') : url50);
    
    try {
      const response50 = await axios.get(url50, {
        timeout: 30000,
      });

      const data50: GeoapifyResponse = response50.data;
      console.log('Train station search - 50km response features count:', data50.features?.length || 0);
      
      // Filter to only include places with train/railway category
      // Prefer public_transport.train over railway.train (railway.train can include freight sidings)
      allTrainPlaces = (data50.features || []).filter(place => 
        place.properties.categories?.some(cat => cat.includes('train') || cat.includes('railway'))
      );
      
      // Prioritize public_transport.train (passenger stations) over railway.train (can include freight)
      trainStations = allTrainPlaces.filter(place => 
        place.properties.categories?.some(cat => cat.includes('public_transport.train'))
      );
      
      // If no public transport stations found, fall back to railway.train but filter strictly
      if (trainStations.length === 0) {
        trainStations = allTrainPlaces.filter(place => {
          const name = (place.properties.name || '').toLowerCase();
          // Exclude places that sound like freight sidings or infrastructure
          const excludeTerms = ['siding', 'yard', 'depot', 'workshop', 'freight', 'koala'];
          // Prefer places with "station" in name, or known station patterns
          const hasStationTerm = name.includes('station') || name.includes('stop');
          return !excludeTerms.some(term => name.includes(term)) && (hasStationTerm || name.length > 5);
        });
      }
      console.log('Train station search - filtered train stations from 50km:', trainStations.length);
      
      // If no train stations found in 50km, search 100km
      if (trainStations.length === 0) {
        console.log('No train stations found in 50km, searching 100km...');
        searchRadius = 100000; // 100km
        
        const filterStr100 = `circle:${lon},${lat},${searchRadius}`;
        const params100 = new URLSearchParams({
          categories: categoryList,
          limit: '50',
          apiKey: GEOAPIFY_API_KEY!,
        });
        const url100 = `https://api.geoapify.com/v2/places?${params100.toString()}&filter=${filterStr100}&bias=${biasStr}`;
        
        console.log('Train station search - 100km URL:', GEOAPIFY_API_KEY ? url100.replace(GEOAPIFY_API_KEY, '***') : url100);
        
        const response100 = await axios.get(url100, {
          timeout: 30000,
        });
        
        const data100: GeoapifyResponse = response100.data;
        console.log('Train station search - 100km response features count:', data100.features?.length || 0);
        
        const allTrainPlaces100 = (data100.features || []).filter(place => 
          place.properties.categories?.some(cat => cat.includes('train') || cat.includes('railway'))
        );
        
        // Add to allTrainPlaces array
        allTrainPlaces.push(...allTrainPlaces100);
        
        // Prioritize public_transport.train
        trainStations = allTrainPlaces100.filter(place => 
          place.properties.categories?.some(cat => cat.includes('public_transport.train'))
        );
        
        // If no public transport stations found, fall back to railway.train but filter out obvious non-stations
        if (trainStations.length === 0) {
          trainStations = allTrainPlaces100.filter(place => {
            const name = (place.properties.name || '').toLowerCase();
            const excludeTerms = ['siding', 'yard', 'depot', 'workshop', 'freight'];
            return !excludeTerms.some(term => name.includes(term));
          });
        }
        console.log('Train station search - filtered train stations from 100km:', trainStations.length);
      }
      
      // Debug: log all train stations found
      if (trainStations.length > 0) {
        console.log('Train station search - all train stations found:', trainStations.map(f => ({
          name: f.properties.name,
          categories: f.properties.categories,
          distance: f.properties.distance,
          address_line1: f.properties.address_line1,
        })));
        // Log full details of first result for debugging
        if (trainStations[0]) {
          console.log('First train station full details:', JSON.stringify(trainStations[0], null, 2));
        }
      } else {
        console.log('Train station search - NO TRAIN STATIONS FOUND in either search');
      }
      
      // Additional validation: Filter out suspicious results
      // Known issue: "Koala" appears to be a railway feature, not a passenger station
      trainStations = trainStations.filter(place => {
        const name = (place.properties.name || '').toLowerCase();
        // Exclude known non-station railway features
        const excludeNames = ['koala'];
        return !excludeNames.some(exclude => name === exclude);
      });
      
      // Log all train places found for debugging
      console.log('All train-related places found:', allTrainPlaces.map(f => ({
        name: f.properties.name,
        categories: f.properties.categories,
        distance: f.properties.distance
      })));
      
      // Calculate distances for all train places to find the actual closest
      const allTrainPlacesWithDistance = allTrainPlaces.map(place => {
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
      
      // Filter out non-passenger railway features using generic rules
      // Must be public_transport.train category (passenger station) OR have "station" in name
      const validStations = allTrainPlacesWithDistance.filter(place => {
        const name = (place.properties.name || '').toLowerCase();
        const categories = place.properties.categories || [];
        
        // Must be a public_transport.train category (passenger station)
        const isPublicTransport = categories.some(cat => cat.includes('public_transport.train'));
        
        // OR have "station" in name (but exclude generic railway line names)
        const hasStationName = name.includes('station');
        const isGenericLineName = name.includes('line up') || name.includes('line down') || 
                                  name.includes('north coast line') || name.includes('south coast line') ||
                                  name.includes('east coast line') || name.includes('west coast line');
        
        // Exclude freight/infrastructure terms
        const excludeTerms = ['siding', 'yard', 'depot', 'workshop', 'freight', 'goods', 'cargo'];
        const hasExcludeTerm = excludeTerms.some(term => name.includes(term));
        
        // Valid if: public transport category OR (has station name AND not generic line name AND no exclude terms)
        return isPublicTransport || (hasStationName && !isGenericLineName && !hasExcludeTerm);
      });
      
      // Always use the closest valid station
      if (validStations.length > 0) {
        validStations.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));
        trainStations = [validStations[0]];
        console.log('Using closest valid passenger station:', validStations[0].properties.name, 'at', validStations[0].calculatedDistance, 'meters');
      }
      
      // Sort by distance and take the closest valid station
      validStations.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));
      
      console.log('Valid stations sorted by distance:', validStations.slice(0, 5).map(f => ({
        name: f.properties.name,
        distance: f.calculatedDistance,
        categories: f.properties.categories
      })));
      
      // Use the closest valid station
      if (validStations.length > 0) {
        trainStations = [validStations[0]];
        console.log('Selected closest station:', validStations[0].properties.name, 'at', validStations[0].calculatedDistance, 'meters');
      }
    } catch (error: any) {
      console.error('Error searching for train stations:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      throw error;
    }

    // Calculate distances
    const trainStationsWithDistance = trainStations.map(place => {
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
    trainStationsWithDistance.sort((a, b) => (a.calculatedDistance || 0) - (b.calculatedDistance || 0));

    // Take only the closest train station (required count: 1)
    const closestTrainStation = trainStationsWithDistance[0];
    
    if (!closestTrainStation) {
      return NextResponse.json({
        success: false,
        error: 'No train stations found',
        coordinates: { lat, lon },
      }, { status: 404 });
    }

    // Format output with distance and time
    const formattedLines: string[] = [];
    if (propertyAddress) {
      formattedLines.push(propertyAddress);
    }

    // Format the closest train station
    const trainStation = closestTrainStation;
    const distanceMeters = trainStation.calculatedDistance || 0;
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
    
    // Use name, or fallback to address_line1
    let trainStationName = (trainStation.properties.name || '').trim();
    if (!trainStationName) {
      trainStationName = trainStation.properties.address_line1 || 'Train Station';
    }
    
    formattedLines.push(`${distanceStr} (${timeStr}), ${trainStationName}`);

    return NextResponse.json({
      success: true,
      trainStation: formattedLines.join('\n'),
      count: 1,
      trainStationDetails: {
        name: trainStationName,
        originalName: trainStation.properties.name || trainStation.properties.address_line1 || 'N/A',
        distance: trainStation.calculatedDistance,
        coordinates: { lat, lon },
      },
      coordinates: { lat, lon },
    });
  } catch (error) {
    console.error('Error in train station test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get train stations';
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
