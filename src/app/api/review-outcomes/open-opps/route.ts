import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadOpenOpps } from '@/lib/reviewOutcomes/openOpps';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Open GHL opportunities by contact (read-only, cached 10 min; ?refresh=1 forces it) for the Stats exception reports.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  try {
    return json(await loadOpenOpps(request.nextUrl.searchParams.get('refresh') === '1'));
  } catch (e) {
    console.error('[review-outcomes] open opps load failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
