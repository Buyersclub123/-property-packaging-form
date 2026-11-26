import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { refreshDirtyCcPays } from '@/lib/reviewOutcomes/ccPays';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// POST: called by the Meetings page after an outcome or TLC is saved. Rewrites only the AUTOMATED tabs that save flagged.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  try {
    return NextResponse.json(await refreshDirtyCcPays(access.viewer.email), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
