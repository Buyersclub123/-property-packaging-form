import type { GeoscapeCheck } from './inboxMining/types';

// Geoscape parcelId formats per state (Requirements & Rules v40, Geoscape findings).
export function parcelIdFor(state: string, lot: string, planType: string, planNumber: string): string | null {
  const st = state.toUpperCase();
  const pt = planType.toUpperCase();
  switch (st) {
    case 'QLD':
      return `${lot}/${pt}${planNumber}`;
    case 'NSW':
      return `${lot}/${planNumber}`;
    case 'WA':
      return `P${planNumber}/${lot}`;
    case 'VIC':
      // Check letter omitted.
      return `${lot}\\${pt}${planNumber.replace(/[A-Z]$/i, '')}`;
    case 'SA':
      return `${pt.charAt(0) || 'D'}/${planNumber}/A/${lot}`;
    default:
      return null;
  }
}

export async function findByParcel(parcelId: string): Promise<GeoscapeCheck> {
  const key = process.env.NEXT_PUBLIC_GEOSCAPE_API_KEY;
  if (!key) return { status: 'error', parcelId, reason: 'NEXT_PUBLIC_GEOSCAPE_API_KEY is not set' };
  const url = `https://api.psma.com.au/v2/addresses/findByParcel?${new URLSearchParams({ parcelId, limit: '10' })}`;
  try {
    const res = await fetch(url, { headers: { Authorization: key, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(30_000) });
    if (res.status === 404) return { status: 'not_found', parcelId };
    if (!res.ok) return { status: 'error', parcelId, reason: `Geoscape HTTP ${res.status}` };
    const data = await res.json();
    const feats: { properties?: { formattedAddress?: string } }[] = data?.features || [];
    if (feats.length === 0) return { status: 'not_found', parcelId };
    const address = feats[0].properties?.formattedAddress || '';
    return {
      status: 'found',
      parcelId,
      address: feats.length > 1 ? `${address} (+${feats.length - 1} more on parcel)` : address,
    };
  } catch (e) {
    return { status: 'error', parcelId, reason: e instanceof Error ? e.message : String(e) };
  }
}
