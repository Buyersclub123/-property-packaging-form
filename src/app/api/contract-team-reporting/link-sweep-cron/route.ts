import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { runLinkSweep } from '@/lib/linkSweep';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Link reconciliation sweep, every 15 min: records and opps updated since the last run (see src/lib/linkSweep.ts).
// ?full=1 runs the full sweep; ?dry=1 forces a dry run.
export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const q = request.nextUrl.searchParams;
    const summary = await runLinkSweep({ full: q.get('full') === '1', forceDryRun: q.get('dry') === '1' });
    return NextResponse.json({ ok: summary.failed === 0, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
