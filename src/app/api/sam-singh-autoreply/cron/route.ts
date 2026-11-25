import { NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { runSamSinghAutoReply } from '@/lib/samSinghAutoReply';

// Timer in vercel.json: Luca's one-off reply to clients who reply to
// Ali's "Sam Singh has moved on" email. ?dry=1 reports what it would do without sending.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dryRun = new URL(request.url).searchParams.get('dry') === '1';
  try {
    const results = await runSamSinghAutoReply({ dryRun });
    const failed = results.filter(r => r.action === 'failed');
    if (failed.length) console.error('Sam Singh auto-reply failures:', failed);
    return NextResponse.json({ ok: failed.length === 0, dryRun, results }, { status: failed.length ? 500 : 200 });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('Sam Singh auto-reply failed:', error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
