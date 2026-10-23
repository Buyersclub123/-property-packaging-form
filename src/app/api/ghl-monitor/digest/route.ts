import { NextResponse } from 'next/server';
import { listUnacknowledged, isCronAuthorised } from '@/lib/ghlMonitorStore';
import { sendDigest } from '@/lib/ghlMonitorEmail';
import { getRedisClient } from '@/lib/redis';

// Daily cron (vercel.json). Emails every change not yet acknowledged, plus
// the time of the last successful hourly check (heartbeat).
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const unacked = await listUnacknowledged();
    let lastCheckAt: string | null = null;
    try { lastCheckAt = await (await getRedisClient()).get('ghl-monitor:last-check'); } catch { /* best effort */ }
    const sent = await sendDigest(unacked, lastCheckAt);
    return NextResponse.json({ ok: true, sent, unacknowledged: unacked.length, lastCheckAt });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('GHL monitor digest failed:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
