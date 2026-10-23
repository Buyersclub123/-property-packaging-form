import { NextRequest, NextResponse } from 'next/server';
import { listUnacknowledged, listRecentAcknowledged, acknowledgeChanges, acknowledgeAll } from '@/lib/ghlMonitorStore';
import { getCfEmail } from '@/lib/cloudflareAuth';
import { getRedisClient } from '@/lib/redis';

// Backs the /admin/ghl-changes page. Portal auth (Cloudflare Access) applies.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [unacknowledged, acknowledged] = await Promise.all([listUnacknowledged(), listRecentAcknowledged()]);
    let lastCheckAt: string | null = null;
    try { lastCheckAt = await (await getRedisClient()).get('ghl-monitor:last-check'); } catch { /* best effort */ }
    return NextResponse.json({ unacknowledged, acknowledged, lastCheckAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load changes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const by = getCfEmail(request) || (typeof body.email === 'string' ? body.email : '') || 'unknown';
    const count = body.all === true
      ? await acknowledgeAll(by)
      : await acknowledgeChanges((Array.isArray(body.ids) ? body.ids : []).map(Number).filter(Number.isFinite), by);
    return NextResponse.json({ success: true, acknowledged: count, by });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to acknowledge' }, { status: 500 });
  }
}
