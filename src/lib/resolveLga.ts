import axios from 'axios';
import { geocodeAddress } from '@/lib/geocoder';
import { getStashData } from '@/lib/stash';

const GEOSCAPE_API_KEY = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY || '';
const ADMIN_BOUNDARIES_ENDPOINT = 'https://api.psma.com.au/v1/administrativeBoundaries/findByPoint';

/**
 * Geoscape Administrative Boundaries — LGA for a coordinate.
 * Returns the official LGA name (e.g. "Ipswich City", "Fraser Coast Regional") or null.
 */
export async function findLgaByPoint(latitude: number, longitude: number): Promise<string | null> {
  if (!GEOSCAPE_API_KEY) throw new Error('NEXT_PUBLIC_GEOSCAPE_API_KEY is not set');
  const response = await axios.get(ADMIN_BOUNDARIES_ENDPOINT, {
    params: { latitude, longitude, layers: 'localGovernmentAreas' },
    headers: { Authorization: GEOSCAPE_API_KEY, Accept: 'application/json' },
    timeout: 10000,
  });
  const features: Array<{ properties?: { lgaName?: string } }> = response.data?.features || [];
  const name = features.find((f) => f.properties?.lgaName)?.properties?.lgaName;
  return name ? name.trim() : null;
}

export interface ResolveLgaResult {
  lga: string | null;
  source: 'geoscape-boundary' | 'geoscape-address' | 'stash' | null;
}

/**
 * Resolve an LGA for a suburb (+ state, + optional postcode).
 * Order: Geoscape address → coordinates → Administrative Boundaries find-by-point (primary);
 * then the LGA on the Geoscape address match if present; then Stash. Never free text.
 */
export async function resolveLgaDetailed(suburb: string, state: string, postCode?: string): Promise<ResolveLgaResult> {
  const query = postCode?.trim()
    ? `${suburb.trim()} ${state.trim()} ${postCode.trim()}`
    : `${suburb.trim()}, ${state.trim()}`;

  let geocoded: Awaited<ReturnType<typeof geocodeAddress>> | null = null;
  try {
    geocoded = await geocodeAddress(query);
  } catch (geoErr) {
    console.log('[resolve-lga] Geoscape address lookup failed:', geoErr);
  }

  const match = geocoded?.bestMatch || geocoded?.suggestions?.[0];
  if (match && typeof match.latitude === 'number' && typeof match.longitude === 'number') {
    try {
      const lga = await findLgaByPoint(match.latitude, match.longitude);
      if (lga) {
        console.log('[resolve-lga] LGA from Geoscape boundaries:', lga);
        return { lga, source: 'geoscape-boundary' };
      }
    } catch (boundaryErr) {
      console.log('[resolve-lga] Geoscape boundaries lookup failed:', boundaryErr);
    }
  }
  if (match?.lga) {
    console.log('[resolve-lga] LGA from Geoscape address match:', match.lga);
    return { lga: match.lga.trim(), source: 'geoscape-address' };
  }

  try {
    const stashResult = await getStashData(query);
    if (stashResult?.lga && typeof stashResult.lga === 'string' && stashResult.lga.trim()) {
      console.log('[resolve-lga] LGA from Stash:', stashResult.lga);
      return { lga: stashResult.lga.trim(), source: 'stash' };
    }
  } catch (stashErr) {
    console.log('[resolve-lga] Stash lookup failed:', stashErr);
  }

  return { lga: null, source: null };
}

export async function resolveLga(suburb: string, state: string, postCode?: string): Promise<string | null> {
  return (await resolveLgaDetailed(suburb, state, postCode)).lga;
}
