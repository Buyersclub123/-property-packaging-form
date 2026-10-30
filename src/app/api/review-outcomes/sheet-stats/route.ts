import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { readStatsSheet } from '@/lib/reviewOutcomes/statsSheet';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// GET: PR figures per weekly block from the team's STATS sheet (read-only), for the Stats tab's sheet check.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  try {
    return json(await readStatsSheet());
  } catch (e) {
    console.error('[review-outcomes] sheet stats failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
