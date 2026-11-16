import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { runLinkSweep } from '@/lib/linkSweep';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Nightly full link reconciliation sweep: every record with linked_opportunity_id (see src/lib/linkSweep.ts). ?dry=1 forces a dry run.
export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const summary = await runLinkSweep({ full: true, forceDryRun: request.nextUrl.searchParams.get('dry') === '1' });
    return NextResponse.json({ ok: summary.failed === 0, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
