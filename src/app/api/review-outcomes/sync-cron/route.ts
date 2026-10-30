import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorised } from '@/lib/ghlMonitorStore';
import { syncRange } from '@/lib/reviewOutcomes/sync';
import { addDays, sydYmd } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

// Hourly read-only refresh of GHL appointments (and Google invites) for the last 7 days to 60 days ahead, so moved
// appointments are recorded in review_meeting_moves (counted as Rescheduled) even when nobody opens the tool.
export async function GET(request: NextRequest) {
  if (!isCronAuthorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const today = sydYmd(Date.now());
  const warnings = await syncRange(addDays(today, -7), addDays(today, 60), true);
  return NextResponse.json({ ok: warnings.length === 0, warnings });
}
