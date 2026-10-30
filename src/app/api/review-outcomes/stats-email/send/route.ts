import { NextRequest, NextResponse } from 'next/server';
import { reviewAccess } from '@/lib/reviewOutcomes/access';
import type { Period } from '@/lib/reviewOutcomes/stats';
import { scheduledPeriod, sendStatsEmail } from '@/lib/reviewOutcomes/statsEmail';
import { loadStatsEmail } from '@/lib/reviewOutcomes/store';
import { isYmd, sydYmd, type StatsKind } from '@/lib/reviewOutcomes/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const KINDS: StatsKind[] = ['day', 'week', 'month', 'quarter', 'ytd', 'year', 'all'];

// Send now (Review recorders only) to the saved recipients. Body { periods?: [{ kind, anchor }] } sends those periods
// (the Stats tab's current view); without it, the saved periods as of today.
export async function POST(request: NextRequest) {
  const access = await reviewAccess(request.headers);
  if (!access.ok) return json({ error: access.error }, access.status);
  if (!access.viewer.recorder) return json({ error: 'Only Review recorders can send the stats email.' }, 403);
  const b = (await request.json().catch(() => null)) as { periods?: { kind?: string; anchor?: string }[] } | null;
  const cfg = await loadStatsEmail();
  const today = sydYmd(Date.now());
  const periods: Period[] = Array.isArray(b?.periods) && b.periods.length
    ? b.periods.filter((p) => KINDS.includes(p.kind as StatsKind)).slice(0, 7).map((p) => ({ kind: p.kind as StatsKind, anchor: isYmd(p.anchor) ? p.anchor! : today }))
    : cfg.periods.map((k) => scheduledPeriod(today, k));
  try {
    const res = await sendStatsEmail({ by: access.viewer.email, sender: cfg.sender, to: cfg.recipients, periods });
    return res.ok ? json({ ok: true, to: cfg.recipients }) : json({ error: res.error }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
}
