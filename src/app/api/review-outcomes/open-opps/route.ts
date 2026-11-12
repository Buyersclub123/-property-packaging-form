import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { loadOpenOpps, loadOpenOppsFor } from '@/lib/reviewOutcomes/openOpps';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const MAX_BATCH = 50;

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

// Body { contactIds: string[] } (max 50): open opps for just those contacts - one batch of the selected period.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  const b = (await request.json().catch(() => ({}))) as { contactIds?: unknown };
  const ids = Array.isArray(b.contactIds) ? b.contactIds.filter((x): x is string => typeof x === 'string' && !!x) : null;
  if (!ids || ids.length > MAX_BATCH) return json({ error: `contactIds must be a list of up to ${MAX_BATCH} ids` }, 400);
  try {
    return json(await loadOpenOppsFor(ids));
  } catch (e) {
    console.error('[review-outcomes] open opps batch failed:', e);
    return json({ error: (e as Error).message }, 500);
  }
}
