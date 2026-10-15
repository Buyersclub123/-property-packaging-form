import { NextResponse } from 'next/server';

/**
 * API route to check if an address already exists in GHL custom objects.
 * Queries GHL directly (the former Make.com "GHL Check Address Webhook" is gone — returned 410).
 *
 * Response: { success, exists, matchingRecords: [{ id, address, packager, sourcer, status }], totalRecordsChecked }
 * On failure: { success: false, error } with HTTP 502 — callers decide how to surface it.
 */
const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '692d04e3662599ed0c29edfa';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

interface GhlRecord { id: string; properties?: Record<string, unknown> }

// Normalise for comparison: lower-case, strip punctuation, collapse spaces, expand common street abbreviations.
const ABBREV: Record<string, string> = {
  st: 'street', rd: 'road', ave: 'avenue', av: 'avenue', dr: 'drive', ct: 'court', cres: 'crescent', cr: 'crescent',
  pl: 'place', cct: 'circuit', cir: 'circuit', tce: 'terrace', bvd: 'boulevard', blvd: 'boulevard', hwy: 'highway',
  pde: 'parade', ln: 'lane', wy: 'way', cl: 'close', esp: 'esplanade', gr: 'grove', hts: 'heights',
};
function normaliseAddress(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ABBREV[w] || w)
    .join(' ');
}
// Lot/unit prefixes are compared separately: "Lot 999, Units A,B, Evi Cct ..." -> { lotUnit: "lot 999 units a b", core: "evi circuit ..." }.
// Rule: a different lot/unit is never a duplicate; a bare street address (no lot/unit) matches any lot/unit at that address.
const LOT_UNIT_RE = /\b(lot|units?)\s+[a-z0-9]+(?:\s*-\s*[a-z0-9]+|,(?=[a-z0-9])[a-z0-9]+)*/g;
function splitAddress(input: string): { lotUnit: string; core: string } {
  const lower = input.toLowerCase().replace(/[^a-z0-9,\-\s]/g, ' ');
  const lotUnit = (lower.match(LOT_UNIT_RE) || []).join(' ').replace(/[,\-]/g, ' ').replace(/\s+/g, ' ').trim();
  const core = normaliseAddress(lower.replace(LOT_UNIT_RE, ' '));
  return { lotUnit, core };
}

async function fetchPage(page: number): Promise<{ records: GhlRecord[]; total?: number }> {
  const res = await fetch(`${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GHL_BEARER_TOKEN}`, Version: GHL_API_VERSION, 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId: GHL_LOCATION_ID, page, pageLimit: 100 }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GHL search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { records: data.records || [], total: data.meta?.total ?? data.total };
}

// First page gives the total; remaining pages are fetched in parallel (sequential paging took ~20s for 1,300+ records).
async function fetchAllRecords(): Promise<GhlRecord[]> {
  const first = await fetchPage(1);
  const all: GhlRecord[] = [...first.records];
  const total = typeof first.total === 'number' ? first.total : null;
  const pageCount = total !== null ? Math.min(Math.ceil(total / 100), 50) : null;
  if (pageCount !== null) {
    const rest = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => fetchPage(i + 2)));
    rest.forEach((r) => all.push(...r.records));
    return all;
  }
  // No total reported — fall back to sequential paging
  let page = 2;
  let last = first.records.length;
  while (last === 100 && page <= 50) {
    const r = await fetchPage(page++);
    all.push(...r.records);
    last = r.records.length;
  }
  return all;
}

export async function POST(request: Request) {
  try {
    const { propertyAddress } = await request.json();
    if (!propertyAddress || typeof propertyAddress !== 'string') {
      return NextResponse.json({ success: false, error: 'Property address is required' }, { status: 400 });
    }
    if (!GHL_BEARER_TOKEN || !GHL_LOCATION_ID) {
      return NextResponse.json({ success: false, error: 'GHL configuration missing' }, { status: 500 });
    }

    const target = splitAddress(propertyAddress);
    const records = await fetchAllRecords();

    const matchingRecords = records
      .filter((r) => {
        const addr = String(r.properties?.property_address || '');
        if (!addr) return false;
        const cand = splitAddress(addr);
        if (!target.core || cand.core !== target.core) return false;
        if (!target.lotUnit) return true;            // bare street address matches any lot/unit at that address
        return cand.lotUnit === target.lotUnit;      // otherwise lot/unit must be identical
      })
      .map((r) => ({
        id: r.id,
        address: String(r.properties?.property_address || ''),
        packager: String(r.properties?.packager || ''),
        sourcer: String(r.properties?.sourcer || ''),
        status: String(r.properties?.status || ''),
      }));

    return NextResponse.json({ success: true, exists: matchingRecords.length > 0, matchingRecords, totalRecordsChecked: records.length });
  } catch (error) {
    console.error('[check-address] error:', error);
    return NextResponse.json(
      { success: false, exists: false, matchingRecords: [], error: error instanceof Error ? error.message : 'Address check failed' },
      { status: 502 },
    );
  }
}
