import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadSignups } from '@/lib/reviewOutcomes/signups';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Client sign-ups from GHL (opportunity "Date signed up"), read-only, cached for an hour; ?refresh=1 forces it.
export async function GET(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  try {
    return json(await loadSignups(access.viewer, request.nextUrl.searchParams.get('refresh') === '1'));
  } catch (e) {
    console.error('[review-outcomes] signups load failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
