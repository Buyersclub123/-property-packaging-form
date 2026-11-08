import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { checkLag } from '@/lib/inboxMining/lag';
import { geoscapePass } from '@/lib/inboxMining/lagSheet';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Nightly Vercel cron: the read-only GHL lag check (same as POST /api/inbox-mining/lag), then the Geoscape lot + plan pass.
export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const lag = await checkLag();
    const geoscape = await geoscapePass();
    return NextResponse.json({ ok: true, lag, geoscape });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
