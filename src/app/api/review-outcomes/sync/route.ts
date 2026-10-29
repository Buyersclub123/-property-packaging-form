import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import { saveLastSync } from '@/lib/reviewOutcomes/store';
import { syncRange } from '@/lib/reviewOutcomes/sync';
import { addDays, isYmd, MIN_YMD, sydYmd } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Review recorders only: refresh the whole cache (default 01/07/2024 to 90 days ahead) from GHL and Google. Read-only on both.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!access.viewer.recorder) return NextResponse.json({ error: 'Only Review recorders can run a full sync.' }, { status: 403 });
  const b = (await request.json().catch(() => ({}))) as { from?: string; to?: string };
  const from = isYmd(b.from) && b.from > MIN_YMD ? b.from : MIN_YMD;
  const to = isYmd(b.to) ? b.to : addDays(sydYmd(Date.now()), 90);
  try {
    const warnings = await syncRange(from, to, true);
    const v = { at: new Date().toISOString(), from, to };
    if (!warnings.length) await saveLastSync(access.viewer.email, v);
    return NextResponse.json({ warnings, lastSync: warnings.length ? null : v });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
