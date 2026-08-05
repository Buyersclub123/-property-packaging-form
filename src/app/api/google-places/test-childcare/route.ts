import { NextResponse } from 'next/server';
import axios from 'axios';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const ACTIVE_GOOGLE_PLACES_KEY = GOOGLE_PLACES_API_KEY || GOOGLE_MAPS_API_KEY;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type PlacesTextSearchResult = {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  rating?: number;
  user_ratings_total?: number;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
};

type PlacesNewSearchTextPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
};

export async function POST(request: Request) {
  try {
    if (!ACTIVE_GOOGLE_PLACES_KEY) {
      return NextResponse.json(
        { success: false, error: 'Google Places API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const latitude = typeof body?.latitude === 'number' ? body.latitude : undefined;
    const longitude = typeof body?.longitude === 'number' ? body.longitude : undefined;

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'latitude and longitude are required for this test endpoint' },
        { status: 400 }
      );
    }

    const radiusMeters = typeof body?.radiusMeters === 'number' ? body.radiusMeters : 5000;
    const limit = typeof body?.limit === 'number' ? body.limit : 10;

    // Mimic common human searches (we can tweak these later)
    const queries: string[] = Array.isArray(body?.queries) && body.queries.length > 0
      ? body.queries
      : [
          'childcare',
          'day care',
          'daycare',
          'kindergarten',
          'preschool',
          'early learning centre',
          'early learning center',
        ];

    const endpoint = 'https://places.googleapis.com/v1/places:searchText';
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
    ].join(',');

    const requests = queries.map(async (q) => {
      const payload = {
        textQuery: q,
        locationBias: {
          circle: {
            center: { latitude, longitude },
            radius: radiusMeters,
          },
        },
      };

      try {
        const resp = await axios.post(endpoint, payload, {
          timeout: 8000,
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': ACTIVE_GOOGLE_PLACES_KEY,
            'X-Goog-FieldMask': fieldMask,
          },
        });

        const places: PlacesNewSearchTextPlace[] = Array.isArray(resp.data?.places) ? resp.data.places : [];
        const results: PlacesTextSearchResult[] = places
          .map(p => {
            const loc = p.location;
            return {
              name: p.displayName?.text,
              formatted_address: p.formattedAddress,
              place_id: p.id,
              rating: p.rating,
              user_ratings_total: p.userRatingCount,
              geometry: loc
                ? { location: { lat: loc.latitude, lng: loc.longitude } }
                : undefined,
            };
          });

        return {
          query: q,
          status: String(resp.status),
          errorMessage: undefined,
          results,
        };
      } catch (error: any) {
        const status = error?.response?.status ? String(error.response.status) : 'ERROR';
        const errorMessage = error?.response?.data?.error?.message || error?.message || 'Request failed';
        return {
          query: q,
          status,
          errorMessage,
          results: [],
        };
      }
    });

    const settled = await Promise.all(requests);
    const allResults: PlacesTextSearchResult[] = settled.flatMap(r => r.results);
    const queryDiagnostics = settled.map(r => ({
      query: r.query,
      status: r.status,
      errorMessage: r.errorMessage,
      resultsCount: r.results.length,
    }));

    // Dedupe by place_id
    const byPlaceId = new Map<string, PlacesTextSearchResult>();
    for (const r of allResults) {
      if (!r.place_id) continue;
      if (!byPlaceId.has(r.place_id)) byPlaceId.set(r.place_id, r);
    }

    // Enforce radius using haversine to avoid odd placements
    const cleaned = Array.from(byPlaceId.values())
      .map(r => {
        const loc = r.geometry?.location;
        const distanceMeters = loc ? haversineMeters(latitude, longitude, loc.lat, loc.lng) : Number.POSITIVE_INFINITY;
        return { ...r, distanceMeters };
      })
      .filter(r => Number.isFinite(r.distanceMeters) && r.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      origin: { latitude, longitude },
      radiusMeters,
      queries,
      queryDiagnostics,
      keySource: GOOGLE_PLACES_API_KEY ? 'GOOGLE_PLACES_API_KEY' : 'GOOGLE_MAPS_API_KEY',
      count: cleaned.length,
      results: cleaned.map(r => ({
        name: r.name || '',
        address: r.formatted_address || '',
        placeId: r.place_id || '',
        rating: r.rating,
        userRatingsTotal: r.user_ratings_total,
        distanceMeters: Math.round((r as any).distanceMeters),
        location: r.geometry?.location,
      })),
    });
  } catch (error: any) {
    const message = error?.response?.data?.error_message || error?.message || 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
