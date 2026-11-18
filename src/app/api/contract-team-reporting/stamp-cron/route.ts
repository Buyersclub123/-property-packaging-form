import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { backdateStamps, runStamp, stampApplyEnabled } from '@/lib/ctrStamp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Nightly change-date stamp (see src/lib/ctrStamp.ts and Admin > Automated updates). ?dry=1 forces a dry run.
// ?backdate=YYYY-MM-DD runs the one-off back-date from the dry-run log (dry run unless &write=1 and the switch is on).
export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const since = request.nextUrl.searchParams.get('backdate');
    if (since) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(since)) return NextResponse.json({ error: 'backdate must be YYYY-MM-DD' }, { status: 400 });
      const write = request.nextUrl.searchParams.get('write') === '1' && (await stampApplyEnabled());
      const summary = await backdateStamps({ since, write });
      return NextResponse.json({ ok: summary.counts.failed === 0, ...summary });
    }
    const summary = await runStamp({ forceDryRun: request.nextUrl.searchParams.get('dry') === '1' });
    return NextResponse.json({ ok: summary.failed === 0, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
