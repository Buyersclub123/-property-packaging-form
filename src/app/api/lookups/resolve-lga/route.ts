import { NextRequest, NextResponse } from 'next/server';
import { resolveLgaDetailed } from '@/lib/resolveLga';

/**
 * POST /api/lookups/resolve-lga
 * Body: { suburb, state, postCode }  — postCode must be 4 digits
 * Returns: { success, lga, source } or { success: false, error }
 * Geoscape Administrative Boundaries (primary) → Geoscape address LGA → Stash. No manual entry.
 */
export async function POST(request: NextRequest) {
  try {
    const { suburb, state, postCode } = await request.json();
    if (!suburb || !state) {
      return NextResponse.json({ success: false, error: 'suburb and state are required' }, { status: 400 });
    }
    if (!postCode || !/^\d{4}$/.test(String(postCode).trim())) {
      return NextResponse.json({ success: false, error: 'A 4-digit postCode is required' }, { status: 400 });
    }
    const { lga, source } = await resolveLgaDetailed(String(suburb), String(state), String(postCode));
    if (!lga) {
      return NextResponse.json({ success: false, error: `Could not resolve LGA for "${suburb} ${state} ${postCode}". Check the suburb and postcode.` });
    }
    return NextResponse.json({ success: true, lga, source });
  } catch (error) {
    console.error('[lookups/resolve-lga] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to resolve LGA' }, { status: 500 });
  }
}
