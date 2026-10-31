import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { runStamp } from '@/lib/ctrStamp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Nightly change-date stamp (see src/lib/ctrStamp.ts and Admin > Automated updates). ?dry=1 forces a dry run.
export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const summary = await runStamp({ forceDryRun: request.nextUrl.searchParams.get('dry') === '1' });
    return NextResponse.json({ ok: summary.failed === 0, ...summary });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
