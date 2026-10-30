import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadSales } from '@/lib/reviewOutcomes/sales';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Sales from the Buyers Club Tracking sheet (read-only copy, refreshed hourly; ?refresh=1 forces it).
// Review recorders see every sale; everyone else only sales where they are the consultant.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  try {
    return json(await loadSales(access.viewer, request.nextUrl.searchParams.get('refresh') === '1'));
  } catch (e) {
    console.error('[review-outcomes] sales load failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
